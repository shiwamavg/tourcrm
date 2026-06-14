const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const LOG_DIR = path.resolve(process.cwd(), 'logs');
try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch (e) {}

function appendLog(file, msg) {
    const time = new Date().toISOString();
    fs.appendFileSync(path.join(LOG_DIR, file), `[${time}] ${msg}\n`);
}

async function processCampaigns() {
    try {
        const [campaigns] = await db.query(
            `SELECT * FROM email_campaigns 
              WHERE status = 'scheduled' 
                AND (scheduled_at IS NULL OR scheduled_at <= NOW())`
        );

        for (const camp of campaigns) {
            console.log(`[Campaign Scheduler] Processing campaign: "${camp.name}" (ID: ${camp.id})`);
            appendLog('campaign-scheduler.log', `Starting campaign: "${camp.name}" (ID: ${camp.id})`);

            await db.query(
                `UPDATE email_campaigns SET status = 'sending' WHERE id = ?`,
                [camp.id]
            );

            const [recipients] = await db.query(
                `SELECT email, full_name FROM leads 
                  WHERE company_id = ? 
                    AND email IS NOT NULL 
                    AND email != ''`,
                [camp.company_id]
            );

            let sentCount = 0;
            for (const rec of recipients) {
                const emailLog = `To: ${rec.full_name} <${rec.email}> | Subject: ${camp.subject} | Body: ${camp.body_text || 'HTML Content'}`;
                appendLog('campaign-sent.log', `[Campaign ID: ${camp.id}] ${emailLog}`);
                sentCount++;
            }

            await db.query(
                `UPDATE email_campaigns 
                    SET status = 'sent', 
                        sent_at = NOW(), 
                        sent_count = ? 
                  WHERE id = ?`,
                [sentCount, camp.id]
            );

            console.log(`[Campaign Scheduler] Completed campaign: "${camp.name}". Sent to ${sentCount} recipients.`);
            appendLog('campaign-scheduler.log', `Completed campaign: "${camp.name}" (ID: ${camp.id}). Sent to ${sentCount} recipients.`);
        }
    } catch (err) {
        console.error('Error processing campaigns:', err);
        appendLog('campaign-scheduler.log', `ERROR processing campaigns: ${err.message}`);
    }
}

async function processReminders() {
    try {
        const [reminders] = await db.query(
            `SELECT r.*, c.name as company_name 
               FROM reminders r
               JOIN companies c ON c.id = r.company_id
              WHERE r.status = 'pending' 
                AND r.remind_at <= NOW()`
        );

        for (const rem of reminders) {
            console.log(`[Reminder Scheduler] Dispatching reminder: "${rem.title}" (ID: ${rem.id})`);
            appendLog('campaign-scheduler.log', `Dispatching reminder: "${rem.title}" (ID: ${rem.id})`);

            if (rem.channel === 'whatsapp') {
                const [configs] = await db.query(
                    `SELECT * FROM whatsapp_configs WHERE company_id = ?`,
                    [rem.company_id]
                );
                const config = configs[0];
                const messageText = `Reminder: ${rem.title}\n${rem.description || ''}`;
                let toNumber = '+910000000000';

                if (rem.entity_type === 'lead') {
                    const [[lead]] = await db.query('SELECT phone FROM leads WHERE id = ?', [rem.entity_id]);
                    if (lead && lead.phone) toNumber = lead.phone;
                }

                if (config && config.enabled) {
                    appendLog('whatsapp-mock.log', `[LIVE REMINDER VIA WHATSAPP] To: ${toNumber} | Message: ${messageText}`);
                } else {
                    appendLog('whatsapp-mock.log', `[MOCK REMINDER VIA WHATSAPP] To: ${toNumber} | Message: ${messageText}`);
                }
            } else {
                appendLog('reminder-sent.log', `[Reminder ID: ${rem.id}] Channel: ${rem.channel} | Title: ${rem.title} | Desc: ${rem.description || ''}`);
            }

            await db.query(
                `UPDATE reminders 
                    SET status = 'sent', 
                        sent_at = NOW() 
                  WHERE id = ?`,
                [rem.id]
            );

            console.log(`[Reminder Scheduler] Successfully sent reminder ID: ${rem.id}`);
            appendLog('campaign-scheduler.log', `Completed reminder: "${rem.title}" (ID: ${rem.id})`);
        }
    } catch (err) {
        console.error('Error processing reminders:', err);
        appendLog('campaign-scheduler.log', `ERROR processing reminders: ${err.message}`);
    }
}

async function processAll() {
    await processCampaigns();
    await processReminders();
}

if (require.main === module) {
    processAll().then(() => process.exit(0)).catch(() => process.exit(1));
} else {
    module.exports = { processCampaigns, processReminders, processAll };
}
