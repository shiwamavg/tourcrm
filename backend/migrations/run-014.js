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
        const [rows] = await conn.query("SHOW TABLES LIKE 'daywise_itinenary'");
        if (rows.length > 0) {
            console.log('daywise_itinenary table already exists, skipping');
            return;
        }

        await conn.query(`
            CREATE TABLE daywise_itinenary (
                id INT AUTO_INCREMENT PRIMARY KEY,
                quote_id INT NOT NULL,
                company_id INT NOT NULL,
                itenary_name VARCHAR(100) NOT NULL,
                date DATETIME NOT NULL,
                day INT NOT NULL,
                day_name VARCHAR(15) NOT NULL,
                vehicle_type VARCHAR(25) NOT NULL,
                lead_id INT NOT NULL,
                amt FLOAT NOT NULL,
                details TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_quote (quote_id),
                INDEX idx_company (company_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci
        `);

        console.log('Migration 014 completed: daywise_itinenary table created');
    } catch (e) {
        console.error('Migration failed:', e.message);
    } finally {
        await conn.end();
    }
}

run();
