require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

async function run() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'tour_crm',
        multipleStatements: true
    });

    try {
        let altered = false;

        const [p] = await conn.query("SHOW COLUMNS FROM reminders LIKE 'priority'");
        if (p.length === 0) {
            await conn.query("ALTER TABLE reminders ADD COLUMN priority ENUM('low','medium','high','urgent') DEFAULT 'medium' AFTER remind_at");
            altered = true;
        }

        const [f] = await conn.query("SHOW COLUMNS FROM reminders LIKE 'followup_type'");
        if (f.length === 0) {
            await conn.query("ALTER TABLE reminders ADD COLUMN followup_type VARCHAR(50) DEFAULT 'general' AFTER priority");
            altered = true;
        }

        const [a] = await conn.query("SHOW COLUMNS FROM reminders LIKE 'assigned_to'");
        if (a.length === 0) {
            await conn.query("ALTER TABLE reminders ADD COLUMN assigned_to INT AFTER user_id");
            altered = true;
        }

        if (altered) console.log('Migration 015 completed: added priority, followup_type, assigned_to to reminders');
        else console.log('No changes needed');
    } catch (e) {
        console.error('Migration failed:', e.message);
    } finally {
        await conn.end();
    }
}

run();
