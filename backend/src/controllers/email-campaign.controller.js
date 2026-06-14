const db = require('../config/db');

async function list(req, res) {
    const companyId = req.companyId;
    try {
        const [rows] = await db.query('SELECT * FROM email_campaigns WHERE company_id=? ORDER BY created_at DESC', [companyId]);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function create(req, res) {
    const companyId = req.companyId;
    const { name, subject, body_html, body_text, recipient_filter, scheduled_at } = req.body;
    const createdBy = req.user?.id || null;
    try {
        const [result] = await db.query(
            `INSERT INTO email_campaigns (company_id, name, subject, body_html, body_text, recipient_filter, scheduled_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [companyId, name, subject, body_html, body_text, JSON.stringify(recipient_filter || {}), scheduled_at || null, createdBy]
        );
        res.status(201).json({ id: result.insertId, message: 'Campaign created' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function update(req, res) {
    const companyId = req.companyId;
    const id = req.params.id;
    const { name, subject, body_html, body_text, recipient_filter, scheduled_at, status } = req.body;
    try {
        await db.query(
            `UPDATE email_campaigns SET name=?, subject=?, body_html=?, body_text=?, recipient_filter=?, scheduled_at=?, status=? WHERE id=? AND company_id=?`,
            [name, subject, body_html, body_text, JSON.stringify(recipient_filter || {}), scheduled_at || null, status, id, companyId]
        );
        res.json({ message: 'Campaign updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function remove(req, res) {
    const companyId = req.companyId;
    const id = req.params.id;
    try {
        await db.query('DELETE FROM email_campaigns WHERE id=? AND company_id=?', [id, companyId]);
        res.json({ message: 'Campaign deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

module.exports = { list, create, update, remove };
