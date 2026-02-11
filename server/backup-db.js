require('dotenv').config({ path: __dirname + '/.env' });
const db = require('./db');
const fs = require('fs');
const path = require('path');

const TABLES = [
    'users',
    'departments',
    'employees',
    'attendance',
    'leaves',
    'leave_balances',
    'payroll',
    'messages',
    'notifications',
    'audit_log'
];

async function backup() {
    try {
        console.log('Starting backup...');
        let sql = '-- HRM Portal Database Backup\n';
        sql += `-- Generated at ${new Date().toISOString()}\n\n`;

        // Disable constraint checks temporarily for bulk restore
        sql += 'SET session_replication_role = \'replica\';\n\n';

        for (const table of TABLES) {
            console.log(`Backing up ${table}...`);
            const rows = await db.query(`SELECT * FROM ${table}`);

            if (rows.rows.length > 0) {
                sql += `-- Data for ${table}\n`;
                for (const row of rows.rows) {
                    const columns = Object.keys(row).join(', ');
                    const values = Object.values(row).map(val => {
                        if (val === null) return 'NULL';
                        if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`; // Escape single quotes
                        if (val instanceof Date) return `'${val.toISOString()}'`;
                        if (typeof val === 'object') return `'${JSON.stringify(val)}'`; // JSONB
                        return val;
                    }).join(', ');

                    sql += `INSERT INTO ${table} (${columns}) VALUES (${values}) ON CONFLICT DO NOTHING;\n`;
                }
                sql += '\n';
            }
        }

        sql += 'SET session_replication_role = \'origin\';\n';

        const backupPath = path.join(__dirname, 'backup.sql');
        fs.writeFileSync(backupPath, sql);

        console.log(`Backup completed successfully!`);
        console.log(`File saved to: ${backupPath}`);
        process.exit(0);
    } catch (err) {
        console.error('Backup failed:', err);
        process.exit(1);
    }
}

backup();
