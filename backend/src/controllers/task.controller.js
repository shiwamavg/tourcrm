const db = require('../config/db');

async function list(req, res) {
    const companyId = req.companyId;
    try {
        const [rows] = await db.query(
            `SELECT t.*, u.full_name as assigned_name FROM tasks t LEFT JOIN staff_users u ON t.assigned_to = u.id WHERE t.company_id = ? ORDER BY t.due_date ASC`,
            [companyId]
        );
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function create(req, res) {
    const companyId = req.companyId;
    const { title, description, assigned_to, lead_id, booking_id, quotation_id, due_date, priority, reminder_at } = req.body;
    const createdBy = req.user?.id || null;

    if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Title is required' });
    }

    try {
        const [result] = await db.query(
            `INSERT INTO tasks (company_id, title, description, assigned_to, lead_id, booking_id, quotation_id, due_date, priority, reminder_at, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [companyId, title, description, assigned_to || null, lead_id || null, booking_id || null, quotation_id || null, due_date || null, priority || 'medium', reminder_at || null, createdBy]
        );
        res.status(201).json({ id: result.insertId, message: 'Task created' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function update(req, res) {
    const companyId = req.companyId;
    const id = req.params.id;
    const fields = req.body || {};
    try {
        const updates = [];
        const params = [];
        const validFields = ['title', 'description', 'assigned_to', 'lead_id', 'booking_id', 'quotation_id', 'due_date', 'priority', 'status', 'reminder_at'];

        for (const field of validFields) {
            if (field in fields) {
                updates.push(`${field} = ?`);
                let val = fields[field];
                if (val === undefined) val = null;
                if (['assigned_to', 'lead_id', 'booking_id', 'quotation_id', 'due_date', 'reminder_at'].includes(field)) {
                    if (val === '' || val === null) val = null;
                }
                params.push(val);
            }
        }

        if (fields.status === 'completed') {
            updates.push('completed_at = NOW()');
        } else if ('status' in fields) {
            updates.push('completed_at = NULL');
        }

        if (updates.length === 0) {
            return res.json({ message: 'No fields to update' });
        }

        params.push(id, companyId);

        await db.query(
            `UPDATE tasks SET ${updates.join(', ')} WHERE id = ? AND company_id = ?`,
            params
        );
        res.json({ message: 'Task updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function remove(req, res) {
    const companyId = req.companyId;
    const id = req.params.id;
    try {
        await db.query('DELETE FROM tasks WHERE id=? AND company_id=?', [id, companyId]);
        res.json({ message: 'Task deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

module.exports = { list, create, update, remove };
