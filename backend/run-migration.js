// run-migration.js - executes the SaaS migration SQL file
const fs = require('fs');
const path = require('path');
const db = require('./src/config/db');

async function run() {
    const sql = fs.readFileSync(path.join(__dirname, 'migrations', '011_saas_multitenant.sql'), 'utf8');
    // Split by semicolon but be careful with statements inside PREPARE blocks
    // We'll execute the whole thing as a single multi-statement query
    console.log('Running migration 011_saas_multitenant.sql...');
    try {
        await db.query(sql);
        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration error:', err.message);
        // Some errors are expected if columns already exist
        if (err.message.includes('Duplicate column name') || err.message.includes('already exists')) {
            console.log('Some columns/tables may already exist. Continuing...');
        } else {
            throw err;
        }
    }
    process.exit(0);
}

run();
