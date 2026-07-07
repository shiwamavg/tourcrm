// run-migration-028.js - executes the Agent & Commission migration SQL file
const fs = require('fs');
const path = require('path');
const db = require('./src/config/db');

async function run() {
    console.log('Running migration 028_agents_commissions.sql...');
    const sqlPath = path.join(__dirname, 'migrations', '028_agents_commissions.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split statements. Note: we need to handle multi-line SQL statements.
    // A simple split by semicolon is fine here as we don't have stored procedures/triggers with internal semicolons.
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        if (stmt.toLowerCase().startsWith('use ')) {
            continue; // Skip USE statements as db connection pool handles database selection
        }
        try {
            await db.query(stmt);
        } catch (err) {
            console.error(`Error executing statement ${i + 1}:`, err.message);
            console.error('Statement was:', stmt);
            process.exit(1);
        }
    }

    console.log('Migration 028_agents_commissions.sql completed successfully.');
    process.exit(0);
}

run();
