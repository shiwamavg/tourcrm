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

        const [cols] = await conn.query("SHOW COLUMNS FROM daywise_itinenary LIKE 'hotel_name'");
        if (cols.length === 0) {
            await conn.query("ALTER TABLE daywise_itinenary ADD COLUMN hotel_name VARCHAR(200) DEFAULT NULL AFTER itenary_name");
            altered = true;
        }

        if (altered) {
            console.log('Migration 017 completed: added hotel_name to daywise_itinenary');
        } else {
            console.log('Migration 017: hotel_name column already exists, no changes needed');
        }
    } catch (e) {
        console.error('Migration failed:', e.message);
    } finally {
        await conn.end();
    }
}

run();
