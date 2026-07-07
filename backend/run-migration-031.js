// run-migration-031.js - executes the 031 supplier migration SQL file
const fs = require('fs');
const path = require('path');
const db = require('./src/config/db');

async function run() {
    console.log('Running migration 031_vendor_ledgers_suppliers.sql...');
    const sqlPath = path.join(__dirname, 'migrations', '031_vendor_ledgers_suppliers.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split statements.
    const statements = sql
        .replace(/--.*$/gm, '') // Remove single-line comments
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        if (stmt.toLowerCase().startsWith('use ')) {
            continue; // Skip USE statements
        }
        try {
            await db.query(stmt);
        } catch (err) {
            console.error(`Error executing statement ${i + 1}:`, err.message);
            console.error('Statement was:', stmt);
            process.exit(1);
        }
    }

    console.log('Migration 031_vendor_ledgers_suppliers.sql completed successfully.');
    process.exit(0);
}

run();
