const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Get audit log (admin only)
router.get('/', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admin can view audit log' });
        }

        const { limit = 50, offset = 0 } = req.query;

        const result = await db.query(`
      SELECT al.*, u.first_name, u.last_name, u.email, u.role
      FROM audit_log al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT $1 OFFSET $2
    `, [parseInt(limit), parseInt(offset)]);

        const countResult = await db.query('SELECT COUNT(*) FROM audit_log');

        res.json({
            total: parseInt(countResult.rows[0].count),
            logs: result.rows.map(l => ({
                id: l.id,
                userId: l.user_id,
                userName: l.first_name ? `${l.first_name} ${l.last_name}` : 'System',
                userEmail: l.email,
                userRole: l.role,
                action: l.action,
                entityType: l.entity_type,
                entityId: l.entity_id,
                details: l.details,
                createdAt: l.created_at,
            })),
        });
    } catch (err) {
        console.error('Get audit log error:', err);
        res.status(500).json({ error: 'Failed to fetch audit log' });
    }
});

module.exports = router;
