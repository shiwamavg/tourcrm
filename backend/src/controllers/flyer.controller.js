const db = require('../config/db');

async function list(req, res) {
    const companyId = req.companyId;
    try {
        const [rows] = await db.query(
            `SELECT * FROM flyers WHERE company_id = ? ORDER BY created_at DESC`,
            [companyId]
        );
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

async function getById(req, res) {
    const companyId = req.companyId;
    const { id } = req.params;
    try {
        const [rows] = await db.query(
            `SELECT * FROM flyers WHERE id = ? AND company_id = ?`,
            [id, companyId]
        );
        if (!rows[0]) {
            return res.status(404).json({ error: 'Flyer not found' });
        }
        res.json(rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

async function create(req, res) {
    const companyId = req.companyId;
    const { title, layout_data, package_id } = req.body;

    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    try {
        const [result] = await db.query(
            `INSERT INTO flyers (company_id, title, layout_data, package_id) 
             VALUES (?, ?, ?, ?)`,
            [companyId, title, JSON.stringify(layout_data || {}), package_id || null]
        );
        res.status(201).json({ id: result.insertId, message: 'Flyer created successfully.' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

async function update(req, res) {
    const companyId = req.companyId;
    const { id } = req.params;
    const { title, layout_data, package_id } = req.body;

    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    try {
        const [result] = await db.query(
            `UPDATE flyers SET title = ?, layout_data = ?, package_id = ? 
             WHERE id = ? AND company_id = ?`,
            [title, JSON.stringify(layout_data || {}), package_id || null, id, companyId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Flyer not found or does not belong to your company.' });
        }

        res.json({ message: 'Flyer updated successfully.' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

async function remove(req, res) {
    const companyId = req.companyId;
    const { id } = req.params;
    try {
        const [result] = await db.query(
            `DELETE FROM flyers WHERE id = ? AND company_id = ?`,
            [id, companyId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Flyer not found or does not belong to your company.' });
        }

        res.json({ message: 'Flyer deleted successfully.' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

module.exports = {
    list,
    getById,
    create,
    update,
    remove
};
