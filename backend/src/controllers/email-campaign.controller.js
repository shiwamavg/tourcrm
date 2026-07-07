const db = require('../config/db');

async function list(req, res) {
    const companyId = req.companyId;
    try {
        const [rows] = await db.query('SELECT * FROM email_campaigns WHERE company_id=? ORDER BY created_at DESC', [companyId]);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function getById(req, res) {
    const companyId = req.companyId;
    try {
        const [[row]] = await db.query('SELECT * FROM email_campaigns WHERE id=? AND company_id=?', [req.params.id, companyId]);
        if (!row) return res.status(404).json({ error: 'Campaign not found' });
        try { row.recipient_filter = typeof row.recipient_filter === 'string' ? JSON.parse(row.recipient_filter) : row.recipient_filter; } catch {}
        res.json(row);
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

/**
 * Schedule or send a campaign immediately.
 * POST /api/email-campaigns/:id/send
 * Body: { scheduled_at? } — if omitted, sends immediately
 */
async function send(req, res) {
    const companyId = req.companyId;
    const id = req.params.id;
    try {
        const [[campaign]] = await db.query('SELECT * FROM email_campaigns WHERE id=? AND company_id=?', [id, companyId]);
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
        if (campaign.status === 'sent' || campaign.status === 'sending') {
            return res.status(400).json({ error: `Campaign already ${campaign.status}` });
        }

        // Count recipients based on filter
        let filter = {};
        try { filter = typeof campaign.recipient_filter === 'string' ? JSON.parse(campaign.recipient_filter) : (campaign.recipient_filter || {}); } catch {}

        let recipientSql = `SELECT COUNT(*) as cnt FROM leads WHERE company_id = ? AND email IS NOT NULL AND email != ''`;
        const params = [companyId];
        if (filter.status) { recipientSql += ' AND status = ?'; params.push(filter.status); }
        if (filter.source) { recipientSql += ' AND source = ?'; params.push(filter.source); }
        if (filter.destination) { recipientSql += ' AND destination_text LIKE ?'; params.push(`%${filter.destination}%`); }

        const [[countResult]] = await db.query(recipientSql, params);
        const recipientCount = countResult.cnt || 0;

        if (recipientCount === 0) {
            return res.status(400).json({ error: 'No recipients match the filter criteria' });
        }

        const { scheduled_at } = req.body || {};
        const newStatus = scheduled_at ? 'scheduled' : 'scheduled'; // campaign-scheduler picks up 'scheduled'
        const scheduleTime = scheduled_at || new Date().toISOString();

        await db.query(
            `UPDATE email_campaigns SET status=?, scheduled_at=?, recipient_count=? WHERE id=? AND company_id=?`,
            [newStatus, scheduleTime, recipientCount, id, companyId]
        );

        res.json({
            message: scheduled_at ? `Campaign scheduled for ${scheduled_at}` : 'Campaign queued for immediate sending',
            recipient_count: recipientCount,
            status: newStatus
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

/**
 * Get campaign statistics.
 * GET /api/email-campaigns/:id/stats
 */
async function getStats(req, res) {
    const companyId = req.companyId;
    const id = req.params.id;
    try {
        const [[campaign]] = await db.query(
            'SELECT id, name, status, sent_count, recipient_count, scheduled_at, sent_at, created_at FROM email_campaigns WHERE id=? AND company_id=?',
            [id, companyId]
        );
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

        // Build filter for recipient count
        let filter = {};
        const [[full]] = await db.query('SELECT recipient_filter FROM email_campaigns WHERE id=?', [id]);
        try { filter = typeof full.recipient_filter === 'string' ? JSON.parse(full.recipient_filter) : (full.recipient_filter || {}); } catch {}

        let recipientSql = `SELECT COUNT(*) as cnt FROM leads WHERE company_id = ? AND email IS NOT NULL AND email != ''`;
        const params = [companyId];
        if (filter.status) { recipientSql += ' AND status = ?'; params.push(filter.status); }
        if (filter.source) { recipientSql += ' AND source = ?'; params.push(filter.source); }

        const [[countResult]] = await db.query(recipientSql, params);

        res.json({
            ...campaign,
            total_recipients: countResult.cnt || 0,
            delivery_rate: campaign.sent_count > 0 && campaign.recipient_count > 0
                ? Math.round((campaign.sent_count / campaign.recipient_count) * 100) : 0
        });
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

module.exports = { list, getById, create, update, send, getStats, remove };

