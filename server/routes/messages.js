const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Get total unread messages count
router.get('/unread', auth, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT COUNT(*) FROM messages WHERE receiver_id = $1 AND is_read = false',
            [req.user.id]
        );
        res.json({ count: parseInt(result.rows[0].count) });
    } catch (err) {
        console.error('Get unread count error:', err);
        res.status(500).json({ error: 'Failed to fetch unread count' });
    }
});

// Get conversation with a user
router.get('/:userId', auth, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT m.*, 
        su.first_name as sender_first, su.last_name as sender_last, su.avatar as sender_avatar,
        ru.first_name as receiver_first, ru.last_name as receiver_last
       FROM messages m
       JOIN users su ON m.sender_id = su.id
       JOIN users ru ON m.receiver_id = ru.id
       WHERE (m.sender_id = $1 AND m.receiver_id = $2)
          OR (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.created_at ASC
       LIMIT 100`,
            [req.user.id, req.params.userId]
        );

        // Mark messages as read
        await db.query(
            'UPDATE messages SET is_read = true WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false',
            [req.params.userId, req.user.id]
        );

        res.json(result.rows.map(m => ({
            id: m.id,
            senderId: m.sender_id,
            receiverId: m.receiver_id,
            senderName: `${m.sender_first} ${m.sender_last}`,
            senderAvatar: m.sender_avatar,
            content: m.content,
            isRead: m.is_read,
            createdAt: m.created_at,
        })));
    } catch (err) {
        console.error('Get messages error:', err);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Get chat contacts (users with conversations)
router.get('/', auth, async (req, res) => {
    try {
        const result = await db.query(`
      SELECT DISTINCT u.id, u.first_name, u.last_name, u.avatar, u.role,
        e.designation,
        (SELECT COUNT(*) FROM messages WHERE sender_id = u.id AND receiver_id = $1 AND is_read = false) as unread_count,
        (SELECT content FROM messages 
         WHERE (sender_id = u.id AND receiver_id = $1) OR (sender_id = $1 AND receiver_id = u.id) 
         ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages 
         WHERE (sender_id = u.id AND receiver_id = $1) OR (sender_id = $1 AND receiver_id = u.id) 
         ORDER BY created_at DESC LIMIT 1) as last_message_time
      FROM users u
      LEFT JOIN employees e ON u.id = e.user_id
      WHERE u.id != $1
      ORDER BY last_message_time DESC NULLS LAST, u.first_name ASC
    `, [req.user.id]);

        res.json(result.rows.map(u => ({
            id: u.id,
            firstName: u.first_name,
            lastName: u.last_name,
            avatar: u.avatar,
            role: u.role,
            designation: u.designation,
            unreadCount: parseInt(u.unread_count),
            lastMessage: u.last_message,
            lastMessageTime: u.last_message_time,
        })));
    } catch (err) {
        console.error('Get contacts error:', err);
        res.status(500).json({ error: 'Failed to fetch contacts' });
    }
});

// Send message (also handled by socket, this is fallback)
router.post('/', auth, async (req, res) => {
    try {
        const { receiverId, content } = req.body;
        const result = await db.query(
            `INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING *`,
            [req.user.id, receiverId, content]
        );

        const sender = await db.query('SELECT first_name, last_name, avatar FROM users WHERE id = $1', [req.user.id]);

        const message = {
            id: result.rows[0].id,
            senderId: req.user.id,
            receiverId,
            senderName: `${sender.rows[0].first_name} ${sender.rows[0].last_name}`,
            senderAvatar: sender.rows[0].avatar,
            content,
            isRead: false,
            createdAt: result.rows[0].created_at,
        };

        const io = req.app.get('io');
        if (io) {
            io.to(receiverId).emit('new_message', message);
        }

        res.status(201).json(message);
    } catch (err) {
        console.error('Send message error:', err);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

module.exports = router;
