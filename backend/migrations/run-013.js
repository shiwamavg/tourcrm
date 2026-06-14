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
        // Check if is_active column already exists
        const [rows] = await conn.query("SHOW COLUMNS FROM itineraries LIKE 'is_active'");
        if (rows.length > 0) {
            console.log('is_active column already exists, skipping migration');
            return;
        }

        await conn.query(`ALTER TABLE itineraries ADD COLUMN is_active TINYINT(1) DEFAULT 1 AFTER total_days`);
        await conn.query(`UPDATE itineraries SET is_active = 1 WHERE status IN ('draft','confirmed','in_progress') OR status IS NULL`);
        await conn.query(`UPDATE itineraries SET is_active = 0 WHERE status IN ('completed','cancelled')`);
        await conn.query(`ALTER TABLE itineraries DROP INDEX idx_status`);
        await conn.query(`ALTER TABLE itineraries DROP COLUMN status`);
        await conn.query(`ALTER TABLE itineraries ADD INDEX idx_active (is_active)`);

        console.log('Migration 013 completed: status → is_active');
    } catch (e) {
        console.error('Migration failed:', e.message);
    } finally {
        await conn.end();
    }
}

run();
