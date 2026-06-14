const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const LOG_DIR = path.resolve(process.cwd(), 'logs');
try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch (e) {}

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

    if (!to || !message) {
        return res.status(400).json({ error: 'Recipient number (to) and message are required' });
    }

    try {
        const [[config]] = await db.query('SELECT * FROM whatsapp_configs WHERE company_id=?', [companyId]);
        
        if (!config || !config.enabled) {
            const logMsg = `[MOCK WHATSAPP] [Company: ${companyId}] To: ${to} | Message: ${message}\n`;
            fs.appendFileSync(path.join(LOG_DIR, 'whatsapp-mock.log'), logMsg);
            console.log(`Mock WhatsApp message written to logs/whatsapp-mock.log for company ${companyId}`);
            return res.json({ message: 'Message logged (gateway mock)', to, length: message.length, mock: true });
        }

        if (config.provider === 'twilio') {
            const accountSid = config.api_key;
            const authToken = config.api_secret;
            const fromNumber = config.phone_number;

            if (!accountSid || !authToken || !fromNumber) {
                return res.status(400).json({ error: 'WhatsApp config is enabled but Twilio credentials are incomplete' });
            }

            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
            const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

            const params = new URLSearchParams();
            params.append('To', `whatsapp:${to.startsWith('+') ? to : '+' + to}`);
            params.append('From', `whatsapp:${fromNumber.startsWith('+') ? fromNumber : '+' + fromNumber}`);
            params.append('Body', message);

            const response = await fetch(twilioUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${basicAuth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params.toString()
            });

            const bodyText = await response.text();
            let body = bodyText;
            try { body = JSON.parse(bodyText); } catch {}

            if (!response.ok) {
                console.error('Twilio WhatsApp Gateway API error:', body);
                return res.status(response.status).json({
                    error: 'Twilio WhatsApp sending failed',
                    details: body
                });
            }

            return res.json({
                message: 'Message sent via Twilio WhatsApp',
                sid: body.sid,
                status: body.status,
                to
            });
        } else {
            const logMsg = `[MOCK WEBHOOK PROVIDER] [Company: ${companyId}] Provider: ${config.provider} | To: ${to} | Message: ${message}\n`;
            fs.appendFileSync(path.join(LOG_DIR, 'whatsapp-mock.log'), logMsg);
            return res.json({
                message: `Message dispatched to mock provider '${config.provider}'`,
                to,
                mock: true
            });
        }
    } catch (e) {
        console.error('whatsapp.controller.js sendMessage error:', e);
        res.status(500).json({ error: e.message });
    }
}

module.exports = { getConfig, saveConfig, sendMessage };
