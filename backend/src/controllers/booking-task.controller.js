// src/controllers/booking-task.controller.js
const db = require('../config/db');

const listTaskTemplates = async (req, res, next) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM booking_task_templates WHERE company_id = ? ORDER BY sort_order',
            [req.companyId]
        );
        res.json(rows);
    } catch (err) { next(err); }
};

const createTaskTemplate = async (req, res, next) => {
    try {
        const { title, description, due_before_days, sort_order, is_active } = req.body || {};
        if (!title?.trim()) return res.status(400).json({ error: 'title is required' });
        const [r] = await db.query(
            `INSERT INTO booking_task_templates (company_id, title, description, due_before_days, sort_order, is_active)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [req.companyId, title.trim(), description || null, due_before_days || 7, sort_order || 0, is_active !== undefined ? (is_active ? 1 : 0) : 1]
        );
        const [rows] = await db.query('SELECT * FROM booking_task_templates WHERE id = ?', [r.insertId]);
        res.status(201).json(rows[0]);
    } catch (err) { next(err); }
};

const updateTaskTemplate = async (req, res, next) => {
    try {
        const id = req.params.id;
        const allowed = ['title', 'description', 'due_before_days', 'sort_order', 'is_active'];
        const sets = [];
        const params = [];
        for (const k of allowed) {
            if (req.body[k] !== undefined) { sets.push(`${k} = ?`); params.push(req.body[k]); }
        }
        if (!sets.length) return res.status(400).json({ error: 'No fields to update' });
        params.push(id, req.companyId);
        const [r] = await db.query(
            `UPDATE booking_task_templates SET ${sets.join(', ')} WHERE id = ? AND company_id = ?`,
            params
        );
        if (!r.affectedRows) return res.status(404).json({ error: 'Template not found' });
        const [rows] = await db.query('SELECT * FROM booking_task_templates WHERE id = ?', [id]);
        res.json(rows[0]);
    } catch (err) { next(err); }
};

const deleteTaskTemplate = async (req, res, next) => {
    try {
        const [r] = await db.query(
            'DELETE FROM booking_task_templates WHERE id = ? AND company_id = ?',
            [req.params.id, req.companyId]
        );
        if (!r.affectedRows) return res.status(404).json({ error: 'Template not found' });
        res.json({ ok: true });
    } catch (err) { next(err); }
};

const listBookingTasks = async (req, res, next) => {
    try {
        const [rows] = await db.query(
            `SELECT bt.*, su.full_name AS completed_by_name
               FROM booking_tasks bt
               LEFT JOIN staff_users su ON su.id = bt.completed_by
              WHERE bt.booking_id = ? AND bt.company_id = ?
           ORDER BY bt.due_date, bt.id`,
            [req.params.bookingId, req.companyId]
        );
        res.json(rows);
    } catch (err) { next(err); }
};

const createBookingTask = async (req, res, next) => {
    try {
        const { booking_id, title, description, due_date } = req.body || {};
        if (!booking_id || !title?.trim()) {
            return res.status(400).json({ error: 'booking_id and title are required' });
        }
        const [r] = await db.query(
            `INSERT INTO booking_tasks (company_id, booking_id, title, description, due_date)
             VALUES (?, ?, ?, ?, ?)`,
            [req.companyId, booking_id, title.trim(), description || null, due_date || null]
        );
        const [rows] = await db.query('SELECT * FROM booking_tasks WHERE id = ?', [r.insertId]);
        res.status(201).json(rows[0]);
    } catch (err) { next(err); }
};

const toggleTask = async (req, res, next) => {
    try {
        const id = req.params.id;
        const [[task]] = await db.query(
            'SELECT * FROM booking_tasks WHERE id = ? AND company_id = ?',
            [id, req.companyId]
        );
        if (!task) return res.status(404).json({ error: 'Task not found' });
        const newStatus = task.is_completed ? 0 : 1;
        await db.query(
            `UPDATE booking_tasks
                SET is_completed = ?,
                    completed_by = ?,
                    completed_at = ?
              WHERE id = ?`,
            [newStatus, newStatus ? req.user.id : null, newStatus ? new Date() : null, id]
        );
        res.json({ ok: true, id, is_completed: !!newStatus });
    } catch (err) { next(err); }
};

const deleteBookingTask = async (req, res, next) => {
    try {
        const [r] = await db.query(
            'DELETE FROM booking_tasks WHERE id = ? AND company_id = ?',
            [req.params.id, req.companyId]
        );
        if (!r.affectedRows) return res.status(404).json({ error: 'Task not found' });
        res.json({ ok: true });
    } catch (err) { next(err); }
};

/** Generate default tasks for a new booking from templates. */
async function createTasksForBooking(booking) {
    if (!booking || !booking.id || !booking.company_id) return;
    const [templates] = await db.query(
        'SELECT * FROM booking_task_templates WHERE company_id = ? AND is_active = 1 ORDER BY sort_order',
        [booking.company_id]
    );
    for (const t of templates) {
        const due = booking.trip_start_date
            ? new Date(new Date(booking.trip_start_date).getTime() - (t.due_before_days * 86400000))
            : null;
        await db.query(
            `INSERT INTO booking_tasks (company_id, booking_id, template_id, title, description, due_date)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [booking.company_id, booking.id, t.id, t.title, t.description,
             due ? due.toISOString().slice(0, 10) : null]
        );
    }
}

module.exports = {
    listTaskTemplates, createTaskTemplate, updateTaskTemplate, deleteTaskTemplate,
    listBookingTasks, createBookingTask, toggleTask, deleteBookingTask,
    createTasksForBooking
};
