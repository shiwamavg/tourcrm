// src/scripts/auto-reminder-scheduler.js
// Background processor to auto-generate reminders for upcoming events (birthdays, anniversaries, passport expiry).

const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const LOG_DIR = path.resolve(process.cwd(), 'logs');
try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch (e) {}

function appendLog(file, msg) {
    const time = new Date().toISOString();
    fs.appendFileSync(path.join(LOG_DIR, file), `[${time}] ${msg}\n`);
}

async function processAutoReminders() {
    console.log(`[${new Date().toISOString()}] Starting auto-reminder generation...`);
    appendLog('auto-reminders.log', 'Auto-reminder generation started');

    let createdCount = 0;

    try {
        // Find travellers with upcoming events within 7 days for birthdays/anniversaries, 60 days for passport
        // We use DAYOFYEAR to check if the anniversary/birthday is coming up in the current year.
        const [travellers] = await db.query(
            `SELECT id, company_id, name, email, phone, date_of_birth, anniversary_date, passport_expiry
             FROM travellers
             WHERE (date_of_birth IS NOT NULL) OR (anniversary_date IS NOT NULL) OR (passport_expiry IS NOT NULL)`
        );

        for (const tr of travellers) {
            const today = new Date();
            const year = today.getFullYear();

            // 1. Birthday Check (7 days ahead)
            if (tr.date_of_birth) {
                const dob = new Date(tr.date_of_birth);
                const nextBday = new Date(year, dob.getMonth(), dob.getDate());
                if (nextBday < today && nextBday.getDate() !== today.getDate()) {
                    nextBday.setFullYear(year + 1);
                }
                const daysToBday = Math.floor((nextBday - today) / (1000 * 60 * 60 * 24));
                
                if (daysToBday >= 0 && daysToBday <= 7) {
                    const title = `Birthday: ${tr.name}`;
                    // Check if reminder already exists for this year
                    const [existing] = await db.query(
                        `SELECT id FROM reminders WHERE company_id=? AND entity_type='traveller' AND entity_id=? AND title=? AND YEAR(remind_at) = ?`,
                        [tr.company_id, tr.id, title, year]
                    );
                    if (existing.length === 0) {
                        await db.query(
                            `INSERT INTO reminders (company_id, title, description, remind_at, channel, entity_type, entity_id, status)
                             VALUES (?, ?, ?, ?, 'system', 'traveller', ?, 'pending')`,
                            [tr.company_id, title, `Upcoming birthday on ${dob.toLocaleDateString('en-IN').slice(0,5)}`, nextBday, tr.id]
                        );
                        createdCount++;
                    }
                }
            }

            // 2. Anniversary Check (7 days ahead)
            if (tr.anniversary_date) {
                const anniv = new Date(tr.anniversary_date);
                const nextAnniv = new Date(year, anniv.getMonth(), anniv.getDate());
                if (nextAnniv < today && nextAnniv.getDate() !== today.getDate()) {
                    nextAnniv.setFullYear(year + 1);
                }
                const daysToAnniv = Math.floor((nextAnniv - today) / (1000 * 60 * 60 * 24));
                
                if (daysToAnniv >= 0 && daysToAnniv <= 7) {
                    const title = `Anniversary: ${tr.name}`;
                    const [existing] = await db.query(
                        `SELECT id FROM reminders WHERE company_id=? AND entity_type='traveller' AND entity_id=? AND title=? AND YEAR(remind_at) = ?`,
                        [tr.company_id, tr.id, title, year]
                    );
                    if (existing.length === 0) {
                        await db.query(
                            `INSERT INTO reminders (company_id, title, description, remind_at, channel, entity_type, entity_id, status)
                             VALUES (?, ?, ?, ?, 'system', 'traveller', ?, 'pending')`,
                            [tr.company_id, title, `Upcoming anniversary on ${anniv.toLocaleDateString('en-IN').slice(0,5)}`, nextAnniv, tr.id]
                        );
                        createdCount++;
                    }
                }
            }

            // 3. Passport Expiry Check (60 days ahead)
            if (tr.passport_expiry) {
                const expiry = new Date(tr.passport_expiry);
                const daysToExpiry = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
                
                if (daysToExpiry > 0 && daysToExpiry <= 60) {
                    const title = `Passport Expiring: ${tr.name}`;
                    const [existing] = await db.query(
                        `SELECT id FROM reminders WHERE company_id=? AND entity_type='traveller' AND entity_id=? AND title=?`,
                        [tr.company_id, tr.id, title]
                    );
                    if (existing.length === 0) {
                        await db.query(
                            `INSERT INTO reminders (company_id, title, description, remind_at, channel, entity_type, entity_id, status)
                             VALUES (?, ?, ?, ?, 'system', 'traveller', ?, 'pending')`,
                            [tr.company_id, title, `Passport expires on ${expiry.toLocaleDateString('en-IN')}`, new Date(today.getTime() + 24*60*60*1000), tr.id] // Remind tomorrow
                        );
                        createdCount++;
                    }
                }
            }
        }

        console.log(`[Auto Reminders] Generated ${createdCount} new reminders.`);
        appendLog('auto-reminders.log', `Generated ${createdCount} new reminders.`);
    } catch (err) {
        console.error('Auto-reminder generation failed:', err);
        appendLog('auto-reminders.log', `ERROR: ${err.message}`);
    }

    console.log(`[${new Date().toISOString()}] Auto-reminder generation completed.`);
}

if (require.main === module) {
    processAutoReminders().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
} else {
    module.exports = { processAutoReminders };
}
