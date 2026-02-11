const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Get payroll records
router.get('/', auth, async (req, res) => {
    try {
        let query, params = [];

        if (req.user.role === 'admin' || req.user.role === 'hr') {
            query = `
        SELECT p.*, u.first_name, u.last_name, e.employee_id as emp_code, e.designation, d.name as department_name
        FROM payroll p
        JOIN employees e ON p.employee_id = e.id
        JOIN users u ON p.user_id = u.id
        LEFT JOIN departments d ON e.department_id = d.id
        ORDER BY p.year DESC, p.month DESC
      `;
        } else {
            const empResult = await db.query('SELECT id FROM employees WHERE user_id = $1', [req.user.id]);
            if (empResult.rows.length === 0) return res.json([]);
            params = [empResult.rows[0].id];
            query = `
        SELECT p.*, u.first_name, u.last_name, e.employee_id as emp_code, e.designation
        FROM payroll p
        JOIN employees e ON p.employee_id = e.id
        JOIN users u ON p.user_id = u.id
        WHERE p.employee_id = $1
        ORDER BY p.year DESC, p.month DESC
      `;
        }

        const result = await db.query(query, params);
        res.json(result.rows.map(p => ({
            id: p.id,
            employeeId: p.employee_id,
            empCode: p.emp_code,
            name: `${p.first_name} ${p.last_name}`,
            designation: p.designation,
            departmentName: p.department_name,
            month: p.month,
            year: p.year,
            basicSalary: p.basic_salary,
            allowances: p.allowances,
            deductions: p.deductions,
            netSalary: p.net_salary,
            status: p.status,
            createdAt: p.created_at,
        })));
    } catch (err) {
        console.error('Get payroll error:', err);
        res.status(500).json({ error: 'Failed to fetch payroll' });
    }
});

// Generate payroll
router.post('/generate', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'hr') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { month, year } = req.body;
        const employees = await db.query(
            "SELECT e.id, e.user_id, e.salary FROM employees e WHERE e.status = 'active'"
        );

        let generated = 0;
        const io = req.app.get('io');

        for (const emp of employees.rows) {
            const existing = await db.query(
                'SELECT id FROM payroll WHERE employee_id = $1 AND month = $2 AND year = $3',
                [emp.id, month, year]
            );
            if (existing.rows.length > 0) continue;

            const basic = parseFloat(emp.salary) || 0;
            const allowances = basic * 0.15;
            const deductions = basic * 0.1;
            const net = basic + allowances - deductions;

            await db.query(
                `INSERT INTO payroll (employee_id, user_id, month, year, basic_salary, allowances, deductions, net_salary, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'processed')`,
                [emp.id, emp.user_id, month, year, basic, allowances, deductions, net]
            );

            await db.query(
                `INSERT INTO notifications (user_id, title, message, type, link)
         VALUES ($1, 'Payroll Generated', 'Your payroll for ${month}/${year} has been generated', 'payroll', '/payroll')`,
                [emp.user_id]
            );
            if (io) io.to(emp.user_id).emit('notification', { title: 'Payroll Generated', type: 'payroll' });
            generated++;
        }

        res.json({ message: `Payroll generated for ${generated} employees` });
    } catch (err) {
        console.error('Generate payroll error:', err);
        res.status(500).json({ error: 'Failed to generate payroll' });
    }
});

module.exports = router;
