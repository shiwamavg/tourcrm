const db = require('../config/db');

async function getConfig(req, res) {
    const companyId = req.companyId;
    try {
        const [[row]] = await db.query('SELECT * FROM whatsapp_configs WHERE company_id=?', [companyId]);
        res.json(row || {});
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function saveConfig(req, res) {
    const companyId = req.companyId;
    const { provider, api_key, api_secret, phone_number, webhook_url, enabled, welcome_message } = req.body;
    try {
        const [[existing]] = await db.query('SELECT id FROM whatsapp_configs WHERE company_id=?', [companyId]);
        if (existing) {
            await db.query(
                `UPDATE whatsapp_configs SET provider=?, api_key=?, api_secret=?, phone_number=?, webhook_url=?, enabled=?, welcome_message=? WHERE company_id=?`,
                [provider, api_key, api_secret, phone_number, webhook_url, enabled ? 1 : 0, welcome_message, companyId]
            );
        } else {
            await db.query(
                `INSERT INTO whatsapp_configs (company_id, provider, api_key, api_secret, phone_number, webhook_url, enabled, welcome_message) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [companyId, provider, api_key, api_secret, phone_number, webhook_url, enabled ? 1 : 0, welcome_message]
            );
        }
        res.json({ message: 'WhatsApp config saved' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function sendMessage(req, res) {
    const companyId = req.companyId;
    const { to, message } = req.body;
    // Placeholder: real implementation would call provider API
    res.json({ message: 'Message queued', to, length: message?.length });
}

module.exports = { getConfig, saveConfig, sendMessage };
