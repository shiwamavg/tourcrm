// src/services/message-queue.service.js
// Simple outbox queue for email/WhatsApp/SMS messages.

const db = require('../config/db');
const { sendMessage: sendWhatsApp } = require('../controllers/whatsapp.controller');

async function enqueue({ company_id, entity_type, entity_id, channel, recipient, subject, body, scheduled_at }) {
    const [r] = await db.query(
        `INSERT INTO message_queue (company_id, entity_type, entity_id, channel, recipient, subject, body, scheduled_at, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [company_id, entity_type, entity_id, channel, recipient, subject || null, body, scheduled_at || new Date()]
    );
    return r.insertId;
}

async function getPending(limit = 100) {
    const [rows] = await db.query(
        `SELECT * FROM message_queue
          WHERE status = 'pending' AND scheduled_at <= NOW()
       ORDER BY id
          LIMIT ?`,
        [limit]
    );
    return rows;
}

async function markSent(id) {
    await db.query(
        `UPDATE message_queue SET status = 'sent', sent_at = NOW(), attempts = attempts + 1 WHERE id = ?`,
        [id]
    );
}

async function markFailed(id, error) {
    await db.query(
        `UPDATE message_queue SET status = 'failed', attempts = attempts + 1, last_error = ? WHERE id = ?`,
        [String(error).slice(0, 500), id]
    );
}

async function cancelPendingForEntity(company_id, entity_type, entity_id) {
    await db.query(
        `UPDATE message_queue SET status = 'cancelled' WHERE company_id = ? AND entity_type = ? AND entity_id = ? AND status = 'pending'`,
        [company_id, entity_type, entity_id]
    );
}

/** Dispatch one queued message. Mock mode logs to console/files. */
async function dispatchOne(msg) {
    if (msg.channel === 'whatsapp') {
        // Mock WhatsApp dispatch; in production this would call the real gateway
        const mockReq = { companyId: msg.company_id, body: { to: msg.recipient, message: msg.body } };
        const result = await new Promise((resolve, reject) => {
            const res = {
                json: (data) => resolve(data),
                status: (code) => ({ json: (data) => reject(new Error(data.error || `HTTP ${code}`)) })
            };
            sendWhatsApp(mockReq, res).catch(reject);
        });
        return result;
    }

    // Email/SMS mock: log to console
    console.log(`\n[MOCK ${msg.channel.toUpperCase()}] To: ${msg.recipient}${msg.subject ? ` | Subject: ${msg.subject}` : ''}\n${msg.body}\n`);
    return { mock: true };
}

async function processQueue(limit = 100) {
    const rows = await getPending(limit);
    for (const msg of rows) {
        try {
            await dispatchOne(msg);
            await markSent(msg.id);
        } catch (err) {
            console.error(`MessageQueue dispatch failed (id=${msg.id}):`, err.message);
            await markFailed(msg.id, err.message);
        }
    }
    return rows.length;
}

module.exports = { enqueue, getPending, markSent, markFailed, cancelPendingForEntity, processQueue };
