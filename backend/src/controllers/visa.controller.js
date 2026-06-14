const db = require('../config/db');

async function list(req, res) {
    const companyId = req.companyId;
    try {
        const [rows] = await db.query(
            `SELECT v.*, t.first_name, t.last_name FROM visas v LEFT JOIN travellers t ON v.traveller_id = t.id WHERE v.company_id=? ORDER BY v.created_at DESC`,
            [companyId]
        );
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function create(req, res) {
    const companyId = req.companyId;
    const { traveller_id, booking_id, visa_type, country, application_date, issue_date, expiry_date, document_url, notes } = req.body;
    try {
        const [result] = await db.query(
            `INSERT INTO visas (company_id, traveller_id, booking_id, visa_type, country, application_date, issue_date, expiry_date, document_url, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [companyId, traveller_id || null, booking_id || null, visa_type, country, application_date || null, issue_date || null, expiry_date || null, document_url, notes]
        );
        res.status(201).json({ id: result.insertId, message: 'Visa record created' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function update(req, res) {
    const companyId = req.companyId;
    const id = req.params.id;
    const { traveller_id, booking_id, visa_type, country, application_date, issue_date, expiry_date, status, document_url, notes } = req.body;
    try {
        await db.query(
            `UPDATE visas SET traveller_id=?, booking_id=?, visa_type=?, country=?, application_date=?, issue_date=?, expiry_date=?, status=?, document_url=?, notes=? WHERE id=? AND company_id=?`,
            [traveller_id || null, booking_id || null, visa_type, country, application_date || null, issue_date || null, expiry_date || null, status, document_url, notes, id, companyId]
        );
        res.json({ message: 'Visa updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function remove(req, res) {
    const companyId = req.companyId;
    const id = req.params.id;
    try {
        await db.query('DELETE FROM visas WHERE id=? AND company_id=?', [id, companyId]);
        res.json({ message: 'Visa deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

module.exports = { list, create, update, remove };
