// src/controllers/payment-reminder.controller.js
const db = require('../config/db');
const { renderTemplate } = require('./message-template.controller');
const messageQueue = require('../services/message-queue.service');

const VALID_CHANNELS = new Set(['email', 'whatsapp', 'both']);
const VALID_TRIGGERS = new Set(['before_trip', 'after_due']);

const listSchedules = async (req, res, next) => {
    try {
        const [rows] = await db.query(
            `SELECT prs.*, mt.name AS template_name, mt.channel AS template_channel
               FROM payment_reminder_schedules prs
               JOIN message_templates mt ON mt.id = prs.template_id
              WHERE prs.company_id = ?
           ORDER BY prs.trigger_type, prs.days_offset`,
            [req.companyId]
        );
        res.json(rows);
    } catch (err) { next(err); }
};

const createSchedule = async (req, res, next) => {
    try {
        const { name, trigger_type, days_offset, template_id, channel, is_active } = req.body || {};
        if (!name?.trim() || !trigger_type || !template_id || !channel) {
            return res.status(400).json({ error: 'name, trigger_type, template_id, and channel are required' });
        }
        if (!VALID_TRIGGERS.has(trigger_type)) {
            return res.status(400).json({ error: 'trigger_type must be before_trip or after_due' });
        }
        if (!VALID_CHANNELS.has(channel)) {
            return res.status(400).json({ error: 'channel must be email, whatsapp, or both' });
        }
        const [[template]] = await db.query(
            'SELECT * FROM message_templates WHERE id = ? AND company_id = ?',
            [template_id, req.companyId]
        );
        if (!template) return res.status(404).json({ error: 'Template not found' });

        const [r] = await db.query(
            `INSERT INTO payment_reminder_schedules (company_id, name, trigger_type, days_offset, template_id, channel, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [req.companyId, name.trim(), trigger_type, days_offset || 7, template_id, channel, is_active !== undefined ? (is_active ? 1 : 0) : 1]
        );
        const [rows] = await db.query('SELECT * FROM payment_reminder_schedules WHERE id = ?', [r.insertId]);
        res.status(201).json(rows[0]);
    } catch (err) { next(err); }
};

const updateSchedule = async (req, res, next) => {
    try {
        const id = req.params.id;
        const allowed = ['name', 'trigger_type', 'days_offset', 'template_id', 'channel', 'is_active'];
        const sets = [];
        const params = [];
        for (const k of allowed) {
            if (req.body[k] !== undefined) {
                sets.push(`${k} = ?`);
                params.push(k === 'is_active' ? (req.body[k] ? 1 : 0) : req.body[k]);
            }
        }
        if (!sets.length) return res.status(400).json({ error: 'No fields to update' });
        params.push(id, req.companyId);
        const [r] = await db.query(
            `UPDATE payment_reminder_schedules SET ${sets.join(', ')} WHERE id = ? AND company_id = ?`,
            params
        );
        if (!r.affectedRows) return res.status(404).json({ error: 'Schedule not found' });
        const [rows] = await db.query('SELECT * FROM payment_reminder_schedules WHERE id = ?', [id]);
        res.json(rows[0]);
    } catch (err) { next(err); }
};

const deleteSchedule = async (req, res, next) => {
    try {
        const [r] = await db.query(
            'DELETE FROM payment_reminder_schedules WHERE id = ? AND company_id = ?',
            [req.params.id, req.companyId]
        );
        if (!r.affectedRows) return res.status(404).json({ error: 'Schedule not found' });
        res.json({ ok: true });
    } catch (err) { next(err); }
};

const listLogs = async (req, res, next) => {
    try {
        const { booking_id, status, page = 1, limit = 50 } = req.query;
        const where = ['prl.company_id = ?'];
        const params = [req.companyId];
        if (booking_id) { where.push('prl.booking_id = ?'); params.push(booking_id); }
        if (status) { where.push('prl.status = ?'); params.push(status); }
        const offset = (Math.max(1, +page) - 1) * +limit;
        const [rows] = await db.query(
            `SELECT prl.*, b.booking_number, mt.name AS template_name
               FROM payment_reminder_logs prl
               JOIN bookings b ON b.id = prl.booking_id
               JOIN message_templates mt ON mt.id = prl.template_id
              WHERE ${where.join(' AND ')}
           ORDER BY prl.created_at DESC
              LIMIT ? OFFSET ?`,
            [...params, +limit, offset]
        );
        const [count] = await db.query(
            `SELECT COUNT(*) AS total FROM payment_reminder_logs prl WHERE ${where.join(' AND ')}`,
            params
        );
        res.json({ items: rows, total: count[0].total, page: +page, limit: +limit });
    } catch (err) { next(err); }
};

/** Render a template with booking + agency data. */
async function buildReminderMessage(template, booking, company) {
    const balance = Math.max(0, Number(booking.total_amount || 0) - Number(booking.amount_paid || 0));
    const values = {
        full_name: booking.customer_name || 'Traveller',
        destination: booking.destination_name || booking.destination_text || 'your destination',
        amount: '₹' + balance.toLocaleString('en-IN'),
        booking_number: booking.booking_number,
        trip_start_date: booking.trip_start_date ? new Date(booking.trip_start_date).toLocaleDateString('en-IN') : '',
        agency_name: company.name || 'TourCRM Agency'
    };
    return renderTemplate({ subject: template.subject, body: template.body }, values);
}

/** Scheduler-facing function: queue reminders for all due bookings. */
async function processDueReminders() {
    const [schedules] = await db.query(
        `SELECT prs.*, mt.subject, mt.body, mt.channel AS template_channel
           FROM payment_reminder_schedules prs
           JOIN message_templates mt ON mt.id = prs.template_id
          WHERE prs.is_active = 1`
    );

    let queued = 0;
    for (const schedule of schedules) {
        let dateCondition;
        let params = [schedule.company_id];

        if (schedule.trigger_type === 'before_trip') {
            dateCondition = `DATE(b.trip_start_date) = DATE_ADD(CURDATE(), INTERVAL ? DAY)`;
            params.push(schedule.days_offset);
        } else {
            // after_due: simple proxy — bookings not fully paid with trip_start_date within last N days
            dateCondition = `DATE(b.trip_start_date) <= DATE_ADD(CURDATE(), INTERVAL ? DAY) AND DATE(b.trip_start_date) >= CURDATE()`;
            params.push(schedule.days_offset);
        }

        const [bookings] = await db.query(
            `SELECT b.*, c.name AS company_name
               FROM bookings b
               JOIN companies c ON c.id = b.company_id
              WHERE b.company_id = ?
                AND b.status NOT IN ('cancelled')
                AND (${dateCondition})
                AND (b.total_amount - COALESCE(b.amount_paid, 0)) > 0`,
            params
        );

        for (const booking of bookings) {
            // Skip if already reminded for this schedule/booking in last 24h
            const [[recent]] = await db.query(
                `SELECT id FROM payment_reminder_logs
                  WHERE schedule_id = ? AND booking_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
                [schedule.id, booking.id]
            );
            if (recent) continue;

            const { subject, body } = await buildReminderMessage(schedule, booking, { name: booking.company_name });
            const channels = schedule.channel === 'both'
                ? [schedule.template_channel, schedule.template_channel === 'email' ? 'whatsapp' : 'email'].filter((v, i, a) => a.indexOf(v) === i)
                : [schedule.channel];

            for (const channel of channels) {
                const recipient = channel === 'email' ? booking.customer_email : booking.customer_phone;
                if (!recipient) continue;
                await messageQueue.enqueue({
                    company_id: schedule.company_id,
                    entity_type: 'payment_reminder',
                    entity_id: booking.id,
                    channel,
                    recipient,
                    subject,
                    body,
                    scheduled_at: new Date()
                });
                await db.query(
                    `INSERT INTO payment_reminder_logs (company_id, booking_id, schedule_id, template_id, channel, recipient, status)
                     VALUES (?, ?, ?, ?, ?, ?, 'queued')`,
                    [schedule.company_id, booking.id, schedule.id, schedule.template_id, channel, recipient]
                );
                queued++;
            }
        }
    }
    return queued;
}

module.exports = {
    listSchedules, createSchedule, updateSchedule, deleteSchedule, listLogs, processDueReminders
};
