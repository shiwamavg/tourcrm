// run-migration-027.js - Adds category column to packages
const db = require('./src/config/db');

async function run() {
    try {
        console.log('Adding category column to packages...');
        try {
            await db.query("ALTER TABLE packages ADD COLUMN category VARCHAR(50) NOT NULL DEFAULT 'Individual / Family' AFTER title");
            console.log('Added category column successfully.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('category column already exists.');
            } else {
                throw e;
            }
        }
        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

run();
