const db = require('../config/db');

async function list(req, res) {
    const companyId = req.companyId;
    try {
        const [rows] = await db.query(
            `SELECT s.*,
                (SELECT COUNT(*) FROM bookings b WHERE b.company_id = s.company_id AND b.status != 'cancelled') as booking_count
             FROM suppliers s WHERE s.company_id = ? ORDER BY s.name`,
            [companyId]
        );
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function create(req, res) {
    const companyId = req.companyId;
    const { name, type, contact_name, contact_email, contact_phone, address, city, country, commission_percent, payment_terms, notes } = req.body;
    try {
        const [result] = await db.query(
            `INSERT INTO suppliers (company_id, name, type, contact_name, contact_email, contact_phone, address, city, country, commission_percent, payment_terms, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [companyId, name, type || 'other', contact_name, contact_email, contact_phone, address, city, country, commission_percent || 0, payment_terms, notes]
        );
        res.status(201).json({ id: result.insertId, message: 'Supplier created' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function update(req, res) {
    const companyId = req.companyId;
    const id = req.params.id;
    const { name, type, contact_name, contact_email, contact_phone, address, city, country, commission_percent, payment_terms, notes, status } = req.body;
    try {
        await db.query(
            `UPDATE suppliers SET name=?, type=?, contact_name=?, contact_email=?, contact_phone=?, address=?, city=?, country=?, commission_percent=?, payment_terms=?, notes=?, status=? WHERE id=? AND company_id=?`,
            [name, type, contact_name, contact_email, contact_phone, address, city, country, commission_percent, payment_terms, notes, status, id, companyId]
        );
        res.json({ message: 'Supplier updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function remove(req, res) {
    const companyId = req.companyId;
    const id = req.params.id;
    try {
        await db.query('DELETE FROM suppliers WHERE id=? AND company_id=?', [id, companyId]);
        res.json({ message: 'Supplier deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

module.exports = { list, create, update, remove };
