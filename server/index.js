const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const db = require('./db');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true,
    },
});

// Make io accessible from routes
app.set('io', io);

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/leaves', require('./routes/leaves'));
app.use('/api/payroll', require('./routes/payroll'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/leave-balances', require('./routes/leave-balances'));
app.use('/api/audit-log', require('./routes/audit'));

// Dashboard stats endpoint
app.get('/api/dashboard/stats', require('./middleware/auth'), async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const [totalEmp, presentToday, pendingLeaves, totalPayroll] = await Promise.all([
            db.query("SELECT COUNT(*) FROM employees WHERE status = 'active'"),
            db.query('SELECT COUNT(*) FROM attendance WHERE date = $1', [today]),
            db.query("SELECT COUNT(*) FROM leaves WHERE status = 'pending' OR status = 'manager_approved'"),
            db.query("SELECT COALESCE(SUM(net_salary), 0) as total FROM payroll WHERE status = 'processed'"),
        ]);

        const recentActivity = await db.query(`
      (SELECT 'leave' as type, l.created_at, u.first_name || ' ' || u.last_name as name, 
        'Applied for ' || l.leave_type || ' leave' as description
       FROM leaves l JOIN users u ON l.user_id = u.id ORDER BY l.created_at DESC LIMIT 3)
      UNION ALL
      (SELECT 'attendance' as type, a.clock_in as created_at, u.first_name || ' ' || u.last_name as name,
        'Clocked in' as description
       FROM attendance a JOIN users u ON a.user_id = u.id WHERE a.date = $1 ORDER BY a.clock_in DESC LIMIT 3)
      ORDER BY created_at DESC LIMIT 8
    `, [today]);

        res.json({
            totalEmployees: parseInt(totalEmp.rows[0].count),
            presentToday: parseInt(presentToday.rows[0].count),
            pendingLeaves: parseInt(pendingLeaves.rows[0].count),
            totalPayroll: parseFloat(totalPayroll.rows[0].total),
            recentActivity: recentActivity.rows,
        });
    } catch (err) {
        console.error('Dashboard stats error:', err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Socket.IO handler
require('./socket/handler')(io);

// Initialize database
async function initDB() {
    try {
        const fs = require('fs');
        const path = require('path');
        const schema = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
        await db.query(schema);
        console.log('Database schema initialized');

        // Check if seed data is needed
        const users = await db.query('SELECT COUNT(*) FROM users');
        if (parseInt(users.rows[0].count) === 0) {
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('admin123', 10);

            await db.query(`
        INSERT INTO users (id, email, password, first_name, last_name, role) VALUES
          ('a0000000-0000-0000-0000-000000000001', 'admin@hrm.com', $1, 'Admin', 'User', 'admin'),
          ('a0000000-0000-0000-0000-000000000002', 'hr@hrm.com', $1, 'Sarah', 'Johnson', 'hr'),
          ('a0000000-0000-0000-0000-000000000006', 'manager@hrm.com', $1, 'Robert', 'Chen', 'manager'),
          ('a0000000-0000-0000-0000-000000000003', 'john@hrm.com', $1, 'John', 'Smith', 'employee'),
          ('a0000000-0000-0000-0000-000000000004', 'jane@hrm.com', $1, 'Jane', 'Doe', 'employee'),
          ('a0000000-0000-0000-0000-000000000005', 'mike@hrm.com', $1, 'Mike', 'Wilson', 'employee')
        ON CONFLICT (email) DO NOTHING
      `, [hashedPassword]);

            await db.query(`
        INSERT INTO departments (id, name, description, manager_id) VALUES
          ('d0000000-0000-0000-0000-000000000001', 'Engineering', 'Software development and architecture', 'a0000000-0000-0000-0000-000000000006'),
          ('d0000000-0000-0000-0000-000000000002', 'Human Resources', 'People operations and talent management', NULL),
          ('d0000000-0000-0000-0000-000000000003', 'Marketing', 'Brand management and growth', NULL),
          ('d0000000-0000-0000-0000-000000000004', 'Finance', 'Financial planning and accounting', NULL),
          ('d0000000-0000-0000-0000-000000000005', 'Operations', 'Business operations and logistics', NULL)
        ON CONFLICT (name) DO NOTHING
      `);

            await db.query(`
        INSERT INTO employees (id, user_id, employee_id, department_id, designation, phone, salary, date_of_joining) VALUES
          ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'EMP001', 'd0000000-0000-0000-0000-000000000001', 'CTO', '+1-555-0101', 150000, '2020-01-15'),
          ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'EMP002', 'd0000000-0000-0000-0000-000000000002', 'HR Manager', '+1-555-0102', 95000, '2020-03-10'),
          ('e0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000006', 'EMP006', 'd0000000-0000-0000-0000-000000000001', 'Engineering Manager', '+1-555-0106', 130000, '2020-06-01'),
          ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'EMP003', 'd0000000-0000-0000-0000-000000000001', 'Senior Developer', '+1-555-0103', 120000, '2021-06-01'),
          ('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 'EMP004', 'd0000000-0000-0000-0000-000000000003', 'Marketing Lead', '+1-555-0104', 85000, '2022-01-20'),
          ('e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000005', 'EMP005', 'd0000000-0000-0000-0000-000000000004', 'Financial Analyst', '+1-555-0105', 80000, '2023-04-12')
        ON CONFLICT (employee_id) DO NOTHING
      `);

            // Create leave balances
            await db.query(`
        INSERT INTO leave_balances (employee_id, user_id, year)
        SELECT e.id, e.user_id, 2026 FROM employees e
        ON CONFLICT (employee_id, year) DO NOTHING
      `);

            console.log('Seed data inserted');
        } else {
            // Run migrations for existing databases
            try {
                await db.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
                await db.query("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'hr', 'manager', 'employee'))");
            } catch (e) { /* constraint already exists */ }
            try {
                await db.query('ALTER TABLE departments ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users(id) ON DELETE SET NULL');
            } catch (e) { /* column already exists */ }
            try {
                await db.query('ALTER TABLE leaves ADD COLUMN IF NOT EXISTS manager_status VARCHAR(20) DEFAULT \'pending\'');
                await db.query('ALTER TABLE leaves ADD COLUMN IF NOT EXISTS hr_status VARCHAR(20) DEFAULT \'pending\'');
                await db.query('ALTER TABLE leaves ADD COLUMN IF NOT EXISTS manager_approved_by UUID REFERENCES users(id) ON DELETE SET NULL');
                await db.query('ALTER TABLE leaves ADD COLUMN IF NOT EXISTS hr_approved_by UUID REFERENCES users(id) ON DELETE SET NULL');
                await db.query('ALTER TABLE leaves DROP CONSTRAINT IF EXISTS leaves_status_check');
                await db.query("ALTER TABLE leaves ADD CONSTRAINT leaves_status_check CHECK (status IN ('pending', 'manager_approved', 'approved', 'rejected'))");
            } catch (e) { /* columns already exist */ }
            console.log('Schema migrations applied');
        }
    } catch (err) {
        console.error('DB init error:', err.message);
    }
}

// Serve static files in production
if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'deployment') {
    const path = require('path');
    app.use(express.static(path.join(__dirname, '../client/dist')));

    app.get('*', (req, res) => {
        // Skip API routes
        if (req.path.startsWith('/api')) {
            return res.status(404).json({ error: 'API route not found' });
        }
        res.sendFile(path.resolve(__dirname, '../client/dist', 'index.html'));
    });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await initDB();
});
