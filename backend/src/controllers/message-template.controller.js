// src/controllers/message-template.controller.js
const db = require('../config/db');

const VALID_CHANNELS = new Set(['email', 'sms', 'whatsapp']);
const VALID_CATEGORIES = new Set(['payment_reminder', 'follow_up', 'welcome', 'booking_confirmation', 'general', '']);

const listTemplates = async (req, res, next) => {
    try {
        const { category, channel } = req.query;
        const where = ['company_id = ?'];
        const params = [req.companyId];
        if (category) { where.push('category = ?'); params.push(category); }
        if (channel) { where.push('channel = ?'); params.push(channel); }
        const [rows] = await db.query(
            `SELECT * FROM message_templates
              WHERE ${where.join(' AND ')}
           ORDER BY category, name`,
            params
        );
        res.json(rows.map(r => ({
            ...r,
            placeholders: typeof r.placeholders === 'string' ? JSON.parse(r.placeholders || '[]') : (r.placeholders || [])
        })));
    } catch (err) { next(err); }
};

const getTemplate = async (req, res, next) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM message_templates WHERE id = ? AND company_id = ?',
            [req.params.id, req.companyId]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Template not found' });
        const r = rows[0];
        r.placeholders = typeof r.placeholders === 'string' ? JSON.parse(r.placeholders || '[]') : (r.placeholders || []);
        res.json(r);
    } catch (err) { next(err); }
};

const createTemplate = async (req, res, next) => {
    try {
        const { name, channel, subject, body, placeholders, category, is_active } = req.body || {};
        if (!name?.trim() || !body?.trim()) {
            return res.status(400).json({ error: 'name and body are required' });
        }
        if (!VALID_CHANNELS.has(channel)) {
            return res.status(400).json({ error: 'Valid channel required: email, sms, whatsapp' });
        }
        const [result] = await db.query(
            `INSERT INTO message_templates (company_id, name, channel, subject, body, placeholders, category, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.companyId, name.trim(), channel, subject || null, body.trim(),
             JSON.stringify(placeholders || []), category || 'general', is_active !== undefined ? (is_active ? 1 : 0) : 1]
        );
        const [created] = await db.query('SELECT * FROM message_templates WHERE id = ?', [result.insertId]);
        res.status(201).json(created[0]);
    } catch (err) { next(err); }
};

const updateTemplate = async (req, res, next) => {
    try {
        const id = req.params.id;
        const allowed = ['name', 'channel', 'subject', 'body', 'placeholders', 'category', 'is_active'];
        const sets = [];
        const params = [];
        for (const k of allowed) {
            if (req.body[k] !== undefined) {
                sets.push(`${k} = ?`);
                params.push(k === 'placeholders' ? JSON.stringify(req.body[k]) : (k === 'is_active' ? (req.body[k] ? 1 : 0) : req.body[k]));
            }
        }
        if (!sets.length) return res.status(400).json({ error: 'No fields to update' });
        params.push(id, req.companyId);
        const [r] = await db.query(
            `UPDATE message_templates SET ${sets.join(', ')} WHERE id = ? AND company_id = ?`,
            params
        );
        if (!r.affectedRows) return res.status(404).json({ error: 'Template not found' });
        const [rows] = await db.query('SELECT * FROM message_templates WHERE id = ?', [id]);
        res.json(rows[0]);
    } catch (err) { next(err); }
};

const deleteTemplate = async (req, res, next) => {
    try {
        const [r] = await db.query(
            'DELETE FROM message_templates WHERE id = ? AND company_id = ?',
            [req.params.id, req.companyId]
        );
        if (!r.affectedRows) return res.status(404).json({ error: 'Template not found' });
        res.json({ ok: true });
    } catch (err) { next(err); }
};

/** Render a template by replacing {{placeholder}} with provided values. */
function renderTemplate(template, values = {}) {
    let text = template.body || '';
    let subject = template.subject || '';
    Object.entries(values).forEach(([key, val]) => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        text = text.replace(regex, val ?? '');
        subject = subject.replace(regex, val ?? '');
    });
    return { subject, body: text };
}

module.exports = {
    listTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate, renderTemplate
};
