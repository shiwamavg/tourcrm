// run-migration-012.js - applies competitor features migration
const fs = require('fs');
const db = require('./src/config/db');

async function run() {
    const sql = fs.readFileSync(__dirname + '/migrations/012_competitor_features.sql', 'utf8');
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    console.log(`Running ${statements.length} statements...`);
    for (const stmt of statements) {
        try {
            await db.query(stmt + ';');
            console.log('OK');
        } catch (e) {
            if (e.message.includes('Duplicate') || e.message.includes('already exists')) {
                console.log('SKIP (already exists)');
            } else {
                console.error('ERROR:', e.message);
            }
        }
    }
    console.log('Done.');
    await db.end();
}

run();
