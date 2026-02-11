const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Get all departments
router.get('/', auth, async (req, res) => {
    try {
        const result = await db.query(`
      SELECT d.*, 
             COUNT(e.id) as employee_count,
             mu.first_name as manager_first_name,
             mu.last_name as manager_last_name,
             mu.email as manager_email
      FROM departments d
      LEFT JOIN employees e ON e.department_id = d.id
      LEFT JOIN users mu ON d.manager_id = mu.id
      GROUP BY d.id, mu.first_name, mu.last_name, mu.email
      ORDER BY d.name
    `);

        res.json(result.rows.map(d => ({
            id: d.id,
            name: d.name,
            description: d.description,
            headId: d.head_id,
            managerId: d.manager_id,
            managerName: d.manager_first_name ? `${d.manager_first_name} ${d.manager_last_name}` : null,
            managerEmail: d.manager_email,
            employeeCount: parseInt(d.employee_count),
            createdAt: d.created_at,
        })));
    } catch (err) {
        console.error('Get departments error:', err);
        res.status(500).json({ error: 'Failed to fetch departments' });
    }
});

// Create department (admin/hr only)
router.post('/', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'hr') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { name, description } = req.body;
        const result = await db.query(
            'INSERT INTO departments (name, description) VALUES ($1, $2) RETURNING *',
            [name, description]
        );

        await db.query(
            'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'CREATE_DEPARTMENT', 'department', result.rows[0].id, JSON.stringify({ name })]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Create department error:', err);
        res.status(500).json({ error: 'Failed to create department' });
    }
});

// Assign manager to department (admin only)
router.put('/:id/manager', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admin can assign managers' });
        }

        const { managerId } = req.body;

        // Verify the user exists and update their role to manager
        if (managerId) {
            const userCheck = await db.query('SELECT id, role FROM users WHERE id = $1', [managerId]);
            if (userCheck.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            // Promote to manager if currently employee
            if (userCheck.rows[0].role === 'employee') {
                await db.query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', ['manager', managerId]);
            }

            // Remove from any other department manager assignment
            await db.query('UPDATE departments SET manager_id = NULL WHERE manager_id = $1', [managerId]);
        }

        const result = await db.query(
            'UPDATE departments SET manager_id = $1 WHERE id = $2 RETURNING *',
            [managerId || null, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Department not found' });
        }

        await db.query(
            'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'ASSIGN_MANAGER', 'department', req.params.id, JSON.stringify({ managerId })]
        );

        res.json({ message: 'Manager assigned successfully', department: result.rows[0] });
    } catch (err) {
        console.error('Assign manager error:', err);
        res.status(500).json({ error: 'Failed to assign manager' });
    }
});

// Delete department (admin only)
router.delete('/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await db.query('DELETE FROM departments WHERE id = $1', [req.params.id]);
        res.json({ message: 'Department deleted' });
    } catch (err) {
        console.error('Delete department error:', err);
        res.status(500).json({ error: 'Failed to delete department' });
    }
});

module.exports = router;
