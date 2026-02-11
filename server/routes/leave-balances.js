const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Get leave balances
router.get('/', auth, async (req, res) => {
    try {
        const isAdmin = req.user.role === 'admin' || req.user.role === 'hr';
        const year = parseInt(req.query.year) || new Date().getFullYear();

        let query = `
      SELECT lb.*, u.first_name, u.last_name, e.employee_id as emp_code, d.name as department_name
      FROM leave_balances lb
      JOIN employees e ON lb.employee_id = e.id
      JOIN users u ON lb.user_id = u.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE lb.year = $1
    `;
        const params = [year];

        if (!isAdmin) {
            params.push(req.user.id);
            query += ` AND lb.user_id = $${params.length}`;
        }

        query += ' ORDER BY u.first_name, u.last_name';
        const result = await db.query(query, params);

        res.json(result.rows.map(b => ({
            id: b.id,
            employeeId: b.employee_id,
            userId: b.user_id,
            empCode: b.emp_code,
            name: `${b.first_name} ${b.last_name}`,
            departmentName: b.department_name,
            year: b.year,
            casual: { total: b.casual_total, used: b.casual_used, remaining: b.casual_total - b.casual_used },
            sick: { total: b.sick_total, used: b.sick_used, remaining: b.sick_total - b.sick_used },
            annual: { total: b.annual_total, used: b.annual_used, remaining: b.annual_total - b.annual_used },
            maternity: { total: b.maternity_total, used: b.maternity_used, remaining: b.maternity_total - b.maternity_used },
            paternity: { total: b.paternity_total, used: b.paternity_used, remaining: b.paternity_total - b.paternity_used },
            unpaidUsed: b.unpaid_used,
        })));
    } catch (err) {
        console.error('Get leave balances error:', err);
        res.status(500).json({ error: 'Failed to fetch leave balances' });
    }
});

// Update leave balance (admin/HR only)
router.put('/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'hr') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { casualTotal, sickTotal, annualTotal, maternityTotal, paternityTotal } = req.body;

        const result = await db.query(
            `UPDATE leave_balances SET
        casual_total = COALESCE($1, casual_total),
        sick_total = COALESCE($2, sick_total),
        annual_total = COALESCE($3, annual_total),
        maternity_total = COALESCE($4, maternity_total),
        paternity_total = COALESCE($5, paternity_total)
      WHERE id = $6 RETURNING *`,
            [casualTotal, sickTotal, annualTotal, maternityTotal, paternityTotal, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Leave balance not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Update leave balance error:', err);
        res.status(500).json({ error: 'Failed to update leave balance' });
    }
});

module.exports = router;
