const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Helper: get manager's department
async function getManagerDeptId(userId) {
    const result = await db.query('SELECT id FROM departments WHERE manager_id = $1', [userId]);
    return result.rows.length > 0 ? result.rows[0].id : null;
}

// Get leaves (filtered by role)
router.get('/', auth, async (req, res) => {
    try {
        const isAdmin = req.user.role === 'admin' || req.user.role === 'hr';
        const managerDeptId = req.user.role === 'manager' ? await getManagerDeptId(req.user.id) : null;

        let query = `
      SELECT l.*, u.first_name, u.last_name,
             e.department_id, e.employee_id as emp_code,
             d.name as department_name,
             mu.first_name as mgr_first, mu.last_name as mgr_last,
             hu.first_name as hr_first, hu.last_name as hr_last
      FROM leaves l
      JOIN users u ON l.user_id = u.id
      JOIN employees e ON l.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN users mu ON l.manager_approved_by = mu.id
      LEFT JOIN users hu ON l.hr_approved_by = hu.id
    `;

        const params = [];
        if (!isAdmin && !managerDeptId) {
            // Regular employee: own leaves only
            params.push(req.user.id);
            query += ` WHERE l.user_id = $${params.length}`;
        } else if (managerDeptId && !isAdmin) {
            // Manager: own leaves + department leaves
            params.push(req.user.id, managerDeptId);
            query += ` WHERE (l.user_id = $1 OR e.department_id = $2)`;
        }
        // Admin/HR see all

        query += ' ORDER BY l.created_at DESC';
        const result = await db.query(query, params);

        res.json(result.rows.map(l => ({
            id: l.id,
            userId: l.user_id,
            employeeId: l.employee_id,
            empCode: l.emp_code,
            name: `${l.first_name} ${l.last_name}`,
            departmentId: l.department_id,
            departmentName: l.department_name,
            leaveType: l.leave_type,
            startDate: l.start_date,
            endDate: l.end_date,
            reason: l.reason,
            status: l.status,
            managerStatus: l.manager_status,
            hrStatus: l.hr_status,
            managerApprovedBy: l.manager_approved_by,
            managerApproverName: l.mgr_first ? `${l.mgr_first} ${l.mgr_last}` : null,
            hrApprovedBy: l.hr_approved_by,
            hrApproverName: l.hr_first ? `${l.hr_first} ${l.hr_last}` : null,
            createdAt: l.created_at,
        })));
    } catch (err) {
        console.error('Get leaves error:', err);
        res.status(500).json({ error: 'Failed to fetch leaves' });
    }
});

// Apply for leave
router.post('/', auth, async (req, res) => {
    try {
        const { leaveType, startDate, endDate, reason } = req.body;

        // Get employee record
        const empResult = await db.query('SELECT id, department_id FROM employees WHERE user_id = $1', [req.user.id]);
        if (empResult.rows.length === 0) {
            return res.status(400).json({ error: 'Employee record not found' });
        }
        const emp = empResult.rows[0];

        // Check leave balance
        const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
        if (leaveType !== 'unpaid') {
            const balance = await db.query(
                'SELECT * FROM leave_balances WHERE employee_id = $1 AND year = $2',
                [emp.id, new Date().getFullYear()]
            );
            if (balance.rows.length > 0) {
                const b = balance.rows[0];
                const total = b[`${leaveType}_total`] || 0;
                const used = b[`${leaveType}_used`] || 0;
                if (used + days > total) {
                    return res.status(400).json({
                        error: `Insufficient ${leaveType} leave balance. Available: ${total - used} days, Requested: ${days} days`
                    });
                }
            }
        }

        const result = await db.query(
            `INSERT INTO leaves (user_id, employee_id, leave_type, start_date, end_date, reason, status, manager_status, hr_status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'pending', 'pending') RETURNING *`,
            [req.user.id, emp.id, leaveType, startDate, endDate, reason]
        );

        // Notify department manager
        const deptManager = await db.query('SELECT manager_id FROM departments WHERE id = $1', [emp.department_id]);
        if (deptManager.rows.length > 0 && deptManager.rows[0].manager_id) {
            await db.query(
                `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, 'leave')`,
                [deptManager.rows[0].manager_id, 'New Leave Request',
                `${req.user.firstName || 'An employee'} applied for ${leaveType} leave (${days} days). Awaiting your approval.`]
            );
            const io = req.app.get('io');
            if (io) io.to(deptManager.rows[0].manager_id).emit('notification', { type: 'leave', message: 'New leave request needs your approval' });
        }

        // Also notify HR
        const hrUsers = await db.query("SELECT id FROM users WHERE role IN ('hr', 'admin')");
        for (const hr of hrUsers.rows) {
            await db.query(
                `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, 'leave')`,
                [hr.id, 'New Leave Request',
                `${req.user.firstName || 'An employee'} applied for ${leaveType} leave (${days} days). Pending manager approval first.`]
            );
        }

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Apply leave error:', err);
        res.status(500).json({ error: 'Failed to apply for leave' });
    }
});

// Manager approve/reject leave
router.put('/:id/manager-approve', auth, async (req, res) => {
    try {
        if (req.user.role !== 'manager' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only managers can perform this action' });
        }

        const leave = await db.query(
            `SELECT l.*, e.department_id FROM leaves l JOIN employees e ON l.employee_id = e.id WHERE l.id = $1`,
            [req.params.id]
        );
        if (leave.rows.length === 0) return res.status(404).json({ error: 'Leave not found' });

        const leaveData = leave.rows[0];

        // Manager can only approve their department's leaves
        if (req.user.role === 'manager') {
            const managerDeptId = await getManagerDeptId(req.user.id);
            if (leaveData.department_id !== managerDeptId) {
                return res.status(403).json({ error: 'You can only approve leaves for your department' });
            }
        }

        if (leaveData.manager_status !== 'pending') {
            return res.status(400).json({ error: 'Leave already reviewed by manager' });
        }

        const newStatus = leaveData.hr_status === 'approved' ? 'approved' : 'manager_approved';

        await db.query(
            `UPDATE leaves SET manager_status = 'approved', manager_approved_by = $1, status = $2, updated_at = NOW() WHERE id = $3`,
            [req.user.id, newStatus, req.params.id]
        );

        // Notify employee
        await db.query(
            `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, 'leave')`,
            [leaveData.user_id, 'Leave Approved by Manager', 'Your leave request has been approved by your manager. Awaiting HR approval.']
        );

        // Notify HR for final approval
        const hrUsers = await db.query("SELECT id FROM users WHERE role IN ('hr', 'admin')");
        for (const hr of hrUsers.rows) {
            await db.query(
                `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, 'leave')`,
                [hr.id, 'Leave Awaiting HR Approval', 'A leave request has been approved by manager and needs your final approval.']
            );
        }

        const io = req.app.get('io');
        if (io) io.to(leaveData.user_id).emit('notification', { type: 'leave', message: 'Manager approved your leave' });

        // Audit
        await db.query(
            'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'MANAGER_APPROVE_LEAVE', 'leave', req.params.id, JSON.stringify({ employeeUserId: leaveData.user_id })]
        );

        res.json({ message: 'Leave approved by manager' });
    } catch (err) {
        console.error('Manager approve error:', err);
        res.status(500).json({ error: 'Failed to approve leave' });
    }
});

// Manager reject leave
router.put('/:id/manager-reject', auth, async (req, res) => {
    try {
        if (req.user.role !== 'manager' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only managers can perform this action' });
        }

        const leave = await db.query(
            `SELECT l.*, e.department_id FROM leaves l JOIN employees e ON l.employee_id = e.id WHERE l.id = $1`,
            [req.params.id]
        );
        if (leave.rows.length === 0) return res.status(404).json({ error: 'Leave not found' });

        const leaveData = leave.rows[0];
        if (req.user.role === 'manager') {
            const managerDeptId = await getManagerDeptId(req.user.id);
            if (leaveData.department_id !== managerDeptId) {
                return res.status(403).json({ error: 'You can only reject leaves for your department' });
            }
        }

        await db.query(
            `UPDATE leaves SET manager_status = 'rejected', manager_approved_by = $1, status = 'rejected', updated_at = NOW() WHERE id = $2`,
            [req.user.id, req.params.id]
        );

        await db.query(
            `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, 'leave')`,
            [leaveData.user_id, 'Leave Rejected by Manager', 'Your leave request has been rejected by your manager.']
        );

        const io = req.app.get('io');
        if (io) io.to(leaveData.user_id).emit('notification', { type: 'leave', message: 'Manager rejected your leave' });

        await db.query(
            'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'MANAGER_REJECT_LEAVE', 'leave', req.params.id, JSON.stringify({ employeeUserId: leaveData.user_id })]
        );

        res.json({ message: 'Leave rejected by manager' });
    } catch (err) {
        console.error('Manager reject error:', err);
        res.status(500).json({ error: 'Failed to reject leave' });
    }
});

// HR approve leave (final approval)
router.put('/:id/hr-approve', auth, async (req, res) => {
    try {
        if (req.user.role !== 'hr' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only HR can perform final approval' });
        }

        const leave = await db.query('SELECT * FROM leaves WHERE id = $1', [req.params.id]);
        if (leave.rows.length === 0) return res.status(404).json({ error: 'Leave not found' });

        const leaveData = leave.rows[0];
        if (leaveData.manager_status !== 'approved') {
            return res.status(400).json({ error: 'Leave must be approved by manager first' });
        }
        if (leaveData.hr_status !== 'pending') {
            return res.status(400).json({ error: 'Leave already reviewed by HR' });
        }

        await db.query(
            `UPDATE leaves SET hr_status = 'approved', hr_approved_by = $1, status = 'approved', approved_by = $1, updated_at = NOW() WHERE id = $2`,
            [req.user.id, req.params.id]
        );

        // Update leave balance
        const days = Math.ceil((new Date(leaveData.end_date) - new Date(leaveData.start_date)) / (1000 * 60 * 60 * 24)) + 1;
        if (leaveData.leave_type !== 'unpaid') {
            const col = `${leaveData.leave_type}_used`;
            await db.query(
                `UPDATE leave_balances SET ${col} = ${col} + $1 WHERE employee_id = $2 AND year = $3`,
                [days, leaveData.employee_id, new Date().getFullYear()]
            );
        }

        await db.query(
            `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, 'leave')`,
            [leaveData.user_id, 'Leave Fully Approved! ✅', 'Your leave request has been approved by both manager and HR. Enjoy your time off!']
        );

        const io = req.app.get('io');
        if (io) io.to(leaveData.user_id).emit('notification', { type: 'leave', message: 'HR approved your leave — fully approved!' });

        await db.query(
            'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'HR_APPROVE_LEAVE', 'leave', req.params.id, JSON.stringify({ days, leaveType: leaveData.leave_type })]
        );

        res.json({ message: 'Leave fully approved' });
    } catch (err) {
        console.error('HR approve error:', err);
        res.status(500).json({ error: 'Failed to approve leave' });
    }
});

// HR reject leave
router.put('/:id/hr-reject', auth, async (req, res) => {
    try {
        if (req.user.role !== 'hr' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only HR can perform this action' });
        }

        const leave = await db.query('SELECT * FROM leaves WHERE id = $1', [req.params.id]);
        if (leave.rows.length === 0) return res.status(404).json({ error: 'Leave not found' });

        await db.query(
            `UPDATE leaves SET hr_status = 'rejected', hr_approved_by = $1, status = 'rejected', updated_at = NOW() WHERE id = $2`,
            [req.user.id, req.params.id]
        );

        await db.query(
            `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, 'leave')`,
            [leave.rows[0].user_id, 'Leave Rejected by HR', 'Your leave request has been rejected by HR.']
        );

        const io = req.app.get('io');
        if (io) io.to(leave.rows[0].user_id).emit('notification', { type: 'leave', message: 'HR rejected your leave' });

        await db.query(
            'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'HR_REJECT_LEAVE', 'leave', req.params.id, JSON.stringify({ employeeUserId: leave.rows[0].user_id })]
        );

        res.json({ message: 'Leave rejected by HR' });
    } catch (err) {
        console.error('HR reject error:', err);
        res.status(500).json({ error: 'Failed to reject leave' });
    }
});

module.exports = router;
