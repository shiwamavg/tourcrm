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
        console.log('Starting migration 018...');

        // 1. Add 'rating' (temperature) to leads
        const [ratingCol] = await conn.query("SHOW COLUMNS FROM leads LIKE 'rating'");
        if (ratingCol.length === 0) {
            await conn.query("ALTER TABLE leads ADD COLUMN rating ENUM('hot', 'warm', 'cold') DEFAULT NULL AFTER status");
            console.log('Added column "rating" to leads table.');
        } else {
            console.log('Column "rating" already exists in leads table.');
        }

        // 2. Modify 'status' of leads to include 'junk'
        // Let's inspect the current column type first
        const [statusCol] = await conn.query("SHOW COLUMNS FROM leads LIKE 'status'");
        const typeStr = statusCol[0]?.Type || '';
        if (!typeStr.includes('junk')) {
            await conn.query("ALTER TABLE leads MODIFY COLUMN status ENUM('new', 'contacted', 'qualified', 'converted', 'lost', 'junk') NOT NULL DEFAULT 'new'");
            console.log('Modified column "status" in leads table to support "junk".');
        } else {
            console.log('Column "status" in leads table already supports "junk".');
        }

        // 3. Create followups table
        await conn.query(`
            CREATE TABLE IF NOT EXISTS followups (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                company_id INT NOT NULL,
                lead_id INT UNSIGNED NULL,
                quotation_id INT UNSIGNED NULL,
                booking_id INT UNSIGNED NULL,
                user_id INT UNSIGNED NOT NULL,
                followup_type ENUM('call', 'email', 'whatsapp', 'meeting', 'site_visit', 'other') NOT NULL DEFAULT 'call',
                notes TEXT NOT NULL,
                rating ENUM('hot', 'warm', 'cold') NULL DEFAULT NULL,
                next_remind_at DATETIME NULL DEFAULT NULL,
                next_reminder_id INT NULL DEFAULT NULL,
                is_system TINYINT(1) NOT NULL DEFAULT 0,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_followups_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON UPDATE CASCADE ON DELETE SET NULL,
                CONSTRAINT fk_followups_quotation FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON UPDATE CASCADE ON DELETE SET NULL,
                CONSTRAINT fk_followups_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON UPDATE CASCADE ON DELETE SET NULL,
                CONSTRAINT fk_followups_user FOREIGN KEY (user_id) REFERENCES staff_users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
                INDEX idx_followups_company (company_id),
                INDEX idx_followups_lead (lead_id),
                INDEX idx_followups_quotation (quotation_id),
                INDEX idx_followups_booking (booking_id)
            ) ENGINE=InnoDB;
        `);
        console.log('Ensured followups table exists.');

        console.log('Migration 018 completed successfully.');
    } catch (e) {
        console.error('Migration failed:', e.message);
        process.exit(1);
    } finally {
        await conn.end();
    }
}

run();
