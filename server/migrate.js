const db = require('./db');
require('dotenv').config();

async function migrate() {
    try {
        console.log('Starting migration...');

        // 1. Add manager role
        try {
            await db.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
            await db.query("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'hr', 'manager', 'employee'))");
            console.log('Updated users role check constraint');
        } catch (e) { console.error('Error updating users role constraint:', e.message); }

        // 2. Add manager_id to departments
        try {
            await db.query('ALTER TABLE departments ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users(id) ON DELETE SET NULL');
            console.log('Added manager_id to departments');
        } catch (e) { console.error('Error adding manager_id to departments:', e.message); }

        // 3. Add columns to leaves
        try {
            await db.query("ALTER TABLE leaves ADD COLUMN IF NOT EXISTS manager_status VARCHAR(20) DEFAULT 'pending'");
            await db.query("ALTER TABLE leaves ADD COLUMN IF NOT EXISTS hr_status VARCHAR(20) DEFAULT 'pending'");
            await db.query('ALTER TABLE leaves ADD COLUMN IF NOT EXISTS manager_approved_by UUID REFERENCES users(id) ON DELETE SET NULL');
            await db.query('ALTER TABLE leaves ADD COLUMN IF NOT EXISTS hr_approved_by UUID REFERENCES users(id) ON DELETE SET NULL');
            console.log('Added columns to leaves');
        } catch (e) { console.error('Error adding columns to leaves:', e.message); }

        // 4. Update leaves status constraint
        try {
            await db.query('ALTER TABLE leaves DROP CONSTRAINT IF EXISTS leaves_status_check');
            await db.query("ALTER TABLE leaves ADD CONSTRAINT leaves_status_check CHECK (status IN ('pending', 'manager_approved', 'approved', 'rejected'))");
            console.log('Updated leaves status check constraint');
        } catch (e) { console.error('Error updating leaves status constraint:', e.message); }

        // 5. Create new tables
        try {
            await db.query(`
                CREATE TABLE IF NOT EXISTS leave_balances (
                  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
                  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
                  casual_total INTEGER DEFAULT 12,
                  casual_used INTEGER DEFAULT 0,
                  sick_total INTEGER DEFAULT 10,
                  sick_used INTEGER DEFAULT 0,
                  annual_total INTEGER DEFAULT 15,
                  annual_used INTEGER DEFAULT 0,
                  maternity_total INTEGER DEFAULT 90,
                  maternity_used INTEGER DEFAULT 0,
                  paternity_total INTEGER DEFAULT 15,
                  paternity_used INTEGER DEFAULT 0,
                  unpaid_used INTEGER DEFAULT 0,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  UNIQUE(employee_id, year)
                )
            `);
            console.log('Created leave_balances table');
        } catch (e) { console.error('Error creating leave_balances:', e.message); }

        try {
            await db.query(`
                CREATE TABLE IF NOT EXISTS audit_log (
                  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
                  action VARCHAR(100) NOT NULL,
                  entity_type VARCHAR(50) NOT NULL,
                  entity_id UUID,
                  details JSONB,
                  ip_address VARCHAR(45),
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('Created audit_log table');
        } catch (e) { console.error('Error creating audit_log:', e.message); }

        console.log('Migration complete');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
