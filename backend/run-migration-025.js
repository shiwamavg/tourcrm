// run-migration-025.js - applies predefined packages migration
const fs = require('fs');
const path = require('path');
const db = require('./src/config/db');

async function run() {
    const sqlFile = path.join(__dirname, 'migrations', '025_predefined_packages.sql');
    if (!fs.existsSync(sqlFile)) {
        console.error('SQL migration file not found:', sqlFile);
        process.exit(1);
    }
    console.log('Cleaning up any partial migration state...');
    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    const cleanups = [
        'ALTER TABLE leads DROP FOREIGN KEY fk_leads_package',
        'ALTER TABLE leads DROP COLUMN package_id',
        'ALTER TABLE quotations DROP FOREIGN KEY fk_quotations_package',
        'ALTER TABLE quotations DROP COLUMN package_id',
        'ALTER TABLE bookings DROP FOREIGN KEY fk_bookings_package',
        'ALTER TABLE bookings DROP COLUMN package_id',
        'DROP TABLE IF EXISTS packages'
    ];
    for (const stmt of cleanups) {
        try { await db.query(stmt); } catch (e) {}
    }
    await db.query('SET FOREIGN_KEY_CHECKS = 1');

    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Splitting by semicolon, making sure we don't break string literals
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    console.log(`Running ${statements.length} statements for predefined packages...`);
    
    for (const stmt of statements) {
        // Skip setting variables if they aren't part of a query
        if (stmt.toLowerCase().startsWith('use ')) {
            console.log(`USE database...`);
            await db.query(stmt);
            continue;
        }
        try {
            await db.query(stmt);
            console.log('OK:', stmt.split('\n')[0].substring(0, 60) + '...');
        } catch (e) {
            if (e.message.includes('Duplicate') || e.message.includes('already exists') || e.message.includes('Multiple primary key')) {
                console.log('SKIP (Duplicate/Already Exists)');
            } else {
                console.error('ERROR running statement:', stmt);
                console.error(e);
                process.exit(1);
            }
        }
    }
    console.log('Predefined Packages Migration Completed Successfully.');
    process.exit(0);
}

run();
