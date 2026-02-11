const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Helper: check if user is manager of a department
async function getManagerDeptId(userId) {
    const result = await db.query('SELECT id FROM departments WHERE manager_id = $1', [userId]);
    return result.rows.length > 0 ? result.rows[0].id : null;
}

// Get all employees
router.get('/', auth, async (req, res) => {
    try {
        const { search, department, status } = req.query;
        let query = `
      SELECT e.*, u.email, u.first_name, u.last_name, u.role, u.avatar,
             d.name as department_name
      FROM employees e
      JOIN users u ON e.user_id = u.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE 1=1
    `;
        const params = [];

        if (search) {
            params.push(`%${search}%`);
            query += ` AND (u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length} OR e.employee_id ILIKE $${params.length} OR e.designation ILIKE $${params.length})`;
        }
        if (department) {
            params.push(department);
            query += ` AND e.department_id = $${params.length}`;
        }
        if (status) {
            params.push(status);
            query += ` AND e.status = $${params.length}`;
        }

        query += ' ORDER BY e.created_at DESC';
        const result = await db.query(query, params);

        const isAdmin = req.user.role === 'admin' || req.user.role === 'hr';
        const managerDeptId = req.user.role === 'manager' ? await getManagerDeptId(req.user.id) : null;

        const employees = result.rows.map(emp => {
            const base = {
                id: emp.id,
                userId: emp.user_id,
                employeeId: emp.employee_id,
                firstName: emp.first_name,
                lastName: emp.last_name,
                email: emp.email,
                role: emp.role,
                avatar: emp.avatar,
                departmentId: emp.department_id,
                departmentName: emp.department_name,
                designation: emp.designation,
                dateOfJoining: emp.date_of_joining,
                status: emp.status,
            };

            // Admin/HR see everything; Manager sees their dept; self sees own
            const isOwnDept = managerDeptId && emp.department_id === managerDeptId;
            if (isAdmin || isOwnDept || emp.user_id === req.user.id) {
                base.phone = emp.phone;
                base.address = emp.address;
                base.dateOfBirth = emp.date_of_birth;
                base.salary = emp.salary;
            }

            return base;
        });

        res.json(employees);
    } catch (err) {
        console.error('Get employees error:', err);
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});

// Get single employee
router.get('/:id', auth, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT e.*, u.email, u.first_name, u.last_name, u.role, u.avatar,
              d.name as department_name
       FROM employees e
       JOIN users u ON e.user_id = u.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE e.id = $1`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        const emp = result.rows[0];
        const isAdmin = req.user.role === 'admin' || req.user.role === 'hr';
        const managerDeptId = req.user.role === 'manager' ? await getManagerDeptId(req.user.id) : null;
        const isSelf = emp.user_id === req.user.id;
        const isOwnDept = managerDeptId && emp.department_id === managerDeptId;

        const data = {
            id: emp.id,
            userId: emp.user_id,
            employeeId: emp.employee_id,
            firstName: emp.first_name,
            lastName: emp.last_name,
            email: emp.email,
            role: emp.role,
            avatar: emp.avatar,
            departmentId: emp.department_id,
            departmentName: emp.department_name,
            designation: emp.designation,
            dateOfJoining: emp.date_of_joining,
            status: emp.status,
        };

        if (isAdmin || isOwnDept || isSelf) {
            data.phone = emp.phone;
            data.address = emp.address;
            data.dateOfBirth = emp.date_of_birth;
            data.salary = emp.salary;
        }

        res.json(data);
    } catch (err) {
        console.error('Get employee error:', err);
        res.status(500).json({ error: 'Failed to fetch employee' });
    }
});

// Create employee (admin, hr, or manager for own dept)
router.post('/', auth, async (req, res) => {
    try {
        const isAdmin = req.user.role === 'admin' || req.user.role === 'hr';
        const managerDeptId = req.user.role === 'manager' ? await getManagerDeptId(req.user.id) : null;

        if (!isAdmin && !managerDeptId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { email, password, firstName, lastName, departmentId, designation, phone, salary, role } = req.body;

        // Manager can only add to their department
        if (managerDeptId && !isAdmin) {
            if (departmentId && departmentId !== managerDeptId) {
                return res.status(403).json({ error: 'You can only add employees to your department' });
            }
        }

        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password || 'password123', 10);
        const assignedRole = isAdmin ? (role || 'employee') : 'employee';
        const assignedDept = managerDeptId && !isAdmin ? managerDeptId : (departmentId || null);

        const userResult = await db.query(
            `INSERT INTO users (email, password, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [email, hashedPassword, firstName, lastName, assignedRole]
        );

        const userId = userResult.rows[0].id;
        const empCount = await db.query('SELECT COUNT(*) FROM employees');
        const empId = `EMP${String(parseInt(empCount.rows[0].count) + 1).padStart(3, '0')}`;

        const empResult = await db.query(
            `INSERT INTO employees (user_id, employee_id, department_id, designation, phone, salary)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [userId, empId, assignedDept, designation, phone, salary || 0]
        );

        // Create leave balance for current year
        await db.query(
            'INSERT INTO leave_balances (employee_id, user_id, year) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
            [empResult.rows[0].id, userId, new Date().getFullYear()]
        );

        // Audit log
        await db.query(
            'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'CREATE_EMPLOYEE', 'employee', empResult.rows[0].id, JSON.stringify({ name: `${firstName} ${lastName}`, email })]
        );

        res.status(201).json({ ...empResult.rows[0], firstName, lastName, email });
    } catch (err) {
        console.error('Create employee error:', err);
        res.status(500).json({ error: 'Failed to create employee' });
    }
});

// Update employee (admin, hr, or manager for own dept)
router.put('/:id', auth, async (req, res) => {
    try {
        const isAdmin = req.user.role === 'admin' || req.user.role === 'hr';
        const managerDeptId = req.user.role === 'manager' ? await getManagerDeptId(req.user.id) : null;

        const empResult = await db.query('SELECT user_id, department_id FROM employees WHERE id = $1', [req.params.id]);
        if (empResult.rows.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Manager can only edit employees in their department
        if (!isAdmin) {
            if (!managerDeptId || empResult.rows[0].department_id !== managerDeptId) {
                return res.status(403).json({ error: 'Not authorized to edit this employee' });
            }
        }

        const { firstName, lastName, departmentId, designation, phone, salary, status } = req.body;
        const userId = empResult.rows[0].user_id;

        if (firstName || lastName) {
            await db.query(
                'UPDATE users SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name), updated_at = NOW() WHERE id = $3',
                [firstName, lastName, userId]
            );
        }

        // Manager cannot change department (only admin/HR can)
        const newDeptId = isAdmin ? departmentId : undefined;

        const result = await db.query(
            `UPDATE employees SET 
        department_id = COALESCE($1, department_id),
        designation = COALESCE($2, designation),
        phone = COALESCE($3, phone),
        salary = COALESCE($4, salary),
        status = COALESCE($5, status),
        updated_at = NOW()
       WHERE id = $6 RETURNING *`,
            [newDeptId, designation, phone, salary, status, req.params.id]
        );

        // Audit log
        await db.query(
            'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'UPDATE_EMPLOYEE', 'employee', req.params.id, JSON.stringify({ changes: req.body })]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Update employee error:', err);
        res.status(500).json({ error: 'Failed to update employee' });
    }
});

// Delete employee (admin only)
router.delete('/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const empResult = await db.query('SELECT user_id, employee_id FROM employees WHERE id = $1', [req.params.id]);
        if (empResult.rows.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Audit log
        await db.query(
            'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'DELETE_EMPLOYEE', 'employee', req.params.id, JSON.stringify({ employeeId: empResult.rows[0].employee_id })]
        );

        await db.query('DELETE FROM users WHERE id = $1', [empResult.rows[0].user_id]);
        res.json({ message: 'Employee deleted successfully' });
    } catch (err) {
        console.error('Delete employee error:', err);
        res.status(500).json({ error: 'Failed to delete employee' });
    }
});

module.exports = router;
