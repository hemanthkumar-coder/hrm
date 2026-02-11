const jwt = require('jsonwebtoken');
const db = require('../db');

module.exports = (io) => {
    // Auth middleware for sockets
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication error'));

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id;
            socket.userEmail = decoded.email;
            socket.userRole = decoded.role;
            next();
        } catch (err) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.userId}`);

        // Join personal room for targeted notifications
        socket.join(socket.userId);

        // Broadcast online status
        io.emit('user_online', { userId: socket.userId });

        // Handle chat messages
        socket.on('send_message', async (data) => {
            try {
                const { receiverId, content } = data;
                const result = await db.query(
                    'INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING *',
                    [socket.userId, receiverId, content]
                );

                const sender = await db.query(
                    'SELECT first_name, last_name, avatar FROM users WHERE id = $1',
                    [socket.userId]
                );

                const message = {
                    id: result.rows[0].id,
                    senderId: socket.userId,
                    receiverId,
                    senderName: `${sender.rows[0].first_name} ${sender.rows[0].last_name}`,
                    senderAvatar: sender.rows[0].avatar,
                    content,
                    isRead: false,
                    createdAt: result.rows[0].created_at,
                };

                // Send to receiver
                io.to(receiverId).emit('new_message', message);
                // Send confirmation back to sender
                socket.emit('message_sent', message);
            } catch (err) {
                console.error('Socket send_message error:', err);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        // Typing indicator
        socket.on('typing', (data) => {
            io.to(data.receiverId).emit('user_typing', {
                userId: socket.userId,
                isTyping: data.isTyping,
            });
        });

        // Mark messages as read
        socket.on('mark_read', async (data) => {
            try {
                await db.query(
                    'UPDATE messages SET is_read = true WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false',
                    [data.senderId, socket.userId]
                );
                io.to(data.senderId).emit('messages_read', { readBy: socket.userId });
            } catch (err) {
                console.error('Socket mark_read error:', err);
            }
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.userId}`);
            io.emit('user_offline', { userId: socket.userId });
        });
    });
};
