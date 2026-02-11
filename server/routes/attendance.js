const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Clock in
router.post('/clock-in', auth, async (req, res) => {
    try {
        const empResult = await db.query('SELECT id FROM employees WHERE user_id = $1', [req.user.id]);
        if (empResult.rows.length === 0) return res.status(404).json({ error: 'Employee profile not found' });

        const employeeId = empResult.rows[0].id;
        const today = new Date().toISOString().split('T')[0];

        const existing = await db.query(
            'SELECT id FROM attendance WHERE employee_id = $1 AND date = $2',
            [employeeId, today]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Already clocked in today' });
        }

        const result = await db.query(
            `INSERT INTO attendance (employee_id, user_id, date, clock_in, status)
       VALUES ($1, $2, $3, NOW(), 'present') RETURNING *`,
            [employeeId, req.user.id, today]
        );

        const io = req.app.get('io');
        if (io) {
            const userInfo = await db.query('SELECT first_name, last_name FROM users WHERE id = $1', [req.user.id]);
            io.emit('attendance_update', {
                type: 'clock_in',
                userId: req.user.id,
                employeeId,
                name: `${userInfo.rows[0].first_name} ${userInfo.rows[0].last_name}`,
                time: result.rows[0].clock_in,
            });
        }

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Clock in error:', err);
        res.status(500).json({ error: 'Clock in failed' });
    }
});

// Clock out
router.post('/clock-out', auth, async (req, res) => {
    try {
        const empResult = await db.query('SELECT id FROM employees WHERE user_id = $1', [req.user.id]);
        if (empResult.rows.length === 0) return res.status(404).json({ error: 'Employee profile not found' });

        const employeeId = empResult.rows[0].id;
        const today = new Date().toISOString().split('T')[0];

        const existing = await db.query(
            'SELECT * FROM attendance WHERE employee_id = $1 AND date = $2',
            [employeeId, today]
        );

        if (existing.rows.length === 0) {
            return res.status(400).json({ error: 'Not clocked in today' });
        }
        if (existing.rows[0].clock_out) {
            return res.status(400).json({ error: 'Already clocked out today' });
        }

        const clockIn = new Date(existing.rows[0].clock_in);
        const clockOut = new Date();
        const hoursWorked = ((clockOut - clockIn) / (1000 * 60 * 60)).toFixed(2);

        const result = await db.query(
            `UPDATE attendance SET clock_out = NOW(), hours_worked = $1 WHERE id = $2 RETURNING *`,
            [hoursWorked, existing.rows[0].id]
        );

        const io = req.app.get('io');
        if (io) {
            const userInfo = await db.query('SELECT first_name, last_name FROM users WHERE id = $1', [req.user.id]);
            io.emit('attendance_update', {
                type: 'clock_out',
                userId: req.user.id,
                employeeId,
                name: `${userInfo.rows[0].first_name} ${userInfo.rows[0].last_name}`,
                time: result.rows[0].clock_out,
                hoursWorked,
            });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Clock out error:', err);
        res.status(500).json({ error: 'Clock out failed' });
    }
});

// Get today's attendance
router.get('/today', auth, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const result = await db.query(`
      SELECT a.*, u.first_name, u.last_name, e.employee_id as emp_code, e.designation, d.name as department_name
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE a.date = $1
      ORDER BY a.clock_in DESC
    `, [today]);

        res.json(result.rows.map(r => ({
            id: r.id,
            employeeId: r.employee_id,
            empCode: r.emp_code,
            name: `${r.first_name} ${r.last_name}`,
            designation: r.designation,
            department: r.department_name,
            clockIn: r.clock_in,
            clockOut: r.clock_out,
            hoursWorked: r.hours_worked,
            status: r.status,
        })));
    } catch (err) {
        console.error('Get today attendance error:', err);
        res.status(500).json({ error: 'Failed to fetch attendance' });
    }
});

// Get my attendance
router.get('/my', auth, async (req, res) => {
    try {
        const empResult = await db.query('SELECT id FROM employees WHERE user_id = $1', [req.user.id]);
        if (empResult.rows.length === 0) return res.json([]);

        const result = await db.query(
            `SELECT * FROM attendance WHERE employee_id = $1 ORDER BY date DESC LIMIT 30`,
            [empResult.rows[0].id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Get my attendance error:', err);
        res.status(500).json({ error: 'Failed to fetch attendance' });
    }
});

// Get my today's status
router.get('/my-today', auth, async (req, res) => {
    try {
        const empResult = await db.query('SELECT id FROM employees WHERE user_id = $1', [req.user.id]);
        if (empResult.rows.length === 0) return res.json({ status: 'no_profile' });

        const today = new Date().toISOString().split('T')[0];
        const result = await db.query(
            'SELECT * FROM attendance WHERE employee_id = $1 AND date = $2',
            [empResult.rows[0].id, today]
        );

        if (result.rows.length === 0) {
            return res.json({ status: 'not_clocked_in' });
        }

        res.json({
            status: result.rows[0].clock_out ? 'clocked_out' : 'clocked_in',
            ...result.rows[0],
        });
    } catch (err) {
        console.error('Get my today status error:', err);
        res.status(500).json({ error: 'Failed to fetch status' });
    }
});

module.exports = router;
