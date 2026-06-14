const db = require('../config/db');

async function list(req, res) {
    try {
        const { quote_id } = req.query;
        let sql = 'SELECT * FROM daywise_itinenary WHERE company_id = ?';
        const params = [req.companyId];
        if (quote_id) {
            sql += ' AND quote_id = ?';
            params.push(Number(quote_id));
        }
        sql += ' ORDER BY day ASC';
        const [rows] = await db.query(sql, params);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function create(req, res) {
    try {
        const { quote_id, itenary_name, hotel_name, date, day, day_name, vehicle_type, lead_id, amt, details } = req.body;
        const [result] = await db.query(
            `INSERT INTO daywise_itinenary (quote_id, company_id, itenary_name, hotel_name, date, day, day_name, vehicle_type, lead_id, amt, details)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [quote_id, req.companyId, itenary_name, hotel_name || null, date, day, day_name, vehicle_type || '', lead_id || 0, amt || 0, details || '']
        );
        res.status(201).json({ id: result.insertId, message: 'Created' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function update(req, res) {
    try {
        const { id } = req.params;
        const { itenary_name, hotel_name, date, day, day_name, vehicle_type, lead_id, amt, details } = req.body;
        await db.query(
            `UPDATE daywise_itinenary SET itenary_name=?, hotel_name=?, date=?, day=?, day_name=?, vehicle_type=?, lead_id=?, amt=?, details=? WHERE id=? AND company_id=?`,
            [itenary_name, hotel_name || null, date, day, day_name, vehicle_type || '', lead_id || 0, amt || 0, details || '', id, req.companyId]
        );
        res.json({ message: 'Updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function remove(req, res) {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM daywise_itinenary WHERE id=? AND company_id=?', [id, req.companyId]);
        res.json({ message: 'Deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

module.exports = { list, create, update, remove };
