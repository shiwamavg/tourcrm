const db = require('../config/db');

async function list(req, res) {
    const companyId = req.companyId;
    try {
        const [rows] = await db.query('SELECT * FROM currencies WHERE company_id=? ORDER BY is_default DESC, code ASC', [companyId]);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function create(req, res) {
    const companyId = req.companyId;
    const { code, name, symbol, exchange_rate, is_default } = req.body;
    try {
        if (is_default) await db.query('UPDATE currencies SET is_default=0 WHERE company_id=?', [companyId]);
        const [result] = await db.query(
            `INSERT INTO currencies (company_id, code, name, symbol, exchange_rate, is_default) VALUES (?, ?, ?, ?, ?, ?)`,
            [companyId, code, name, symbol, exchange_rate || 1.0, is_default ? 1 : 0]
        );
        res.status(201).json({ id: result.insertId, message: 'Currency created' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function update(req, res) {
    const companyId = req.companyId;
    const id = req.params.id;
    const { code, name, symbol, exchange_rate, is_default } = req.body;
    try {
        if (is_default) await db.query('UPDATE currencies SET is_default=0 WHERE company_id=?', [companyId]);
        await db.query(
            `UPDATE currencies SET code=?, name=?, symbol=?, exchange_rate=?, is_default=? WHERE id=? AND company_id=?`,
            [code, name, symbol, exchange_rate, is_default ? 1 : 0, id, companyId]
        );
        res.json({ message: 'Currency updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function remove(req, res) {
    const companyId = req.companyId;
    const id = req.params.id;
    try {
        await db.query('DELETE FROM currencies WHERE id=? AND company_id=?', [id, companyId]);
        res.json({ message: 'Currency deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

module.exports = { list, create, update, remove };
