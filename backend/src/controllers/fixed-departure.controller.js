const db = require('../config/db');

async function list(req, res) {
    const companyId = req.companyId;
    try {
        const [rows] = await db.query('SELECT * FROM fixed_departures WHERE company_id=? ORDER BY start_date ASC', [companyId]);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function create(req, res) {
    const companyId = req.companyId;
    const { title, destination, start_date, end_date, total_seats, price_per_person, currency, description, inclusions, exclusions } = req.body;
    const createdBy = req.user?.id || null;
    try {
        const [result] = await db.query(
            `INSERT INTO fixed_departures (company_id, title, destination, start_date, end_date, total_seats, price_per_person, currency, description, inclusions, exclusions, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [companyId, title, destination, start_date, end_date, total_seats || 20, price_per_person || 0, currency || 'INR', description, inclusions, exclusions, createdBy]
        );
        res.status(201).json({ id: result.insertId, message: 'Fixed departure created' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function update(req, res) {
    const companyId = req.companyId;
    const id = req.params.id;
    const { title, destination, start_date, end_date, total_seats, price_per_person, currency, status, description, inclusions, exclusions } = req.body;
    try {
        await db.query(
            `UPDATE fixed_departures SET title=?, destination=?, start_date=?, end_date=?, total_seats=?, price_per_person=?, currency=?, status=?, description=?, inclusions=?, exclusions=? WHERE id=? AND company_id=?`,
            [title, destination, start_date, end_date, total_seats, price_per_person, currency, status, description, inclusions, exclusions, id, companyId]
        );
        res.json({ message: 'Fixed departure updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function remove(req, res) {
    const companyId = req.companyId;
    const id = req.params.id;
    try {
        await db.query('DELETE FROM fixed_departures WHERE id=? AND company_id=?', [id, companyId]);
        res.json({ message: 'Fixed departure deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

module.exports = { list, create, update, remove };
