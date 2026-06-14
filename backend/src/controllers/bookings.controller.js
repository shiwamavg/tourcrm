// src/controllers/bookings.controller.js
const db = require('../config/db');

const listBookings = async (req, res, next) => {
    try {
        const { status, payment_status, q, page = 1, limit = 20 } = req.query;
        const where = ['b.company_id = ?'];
        const params = [req.companyId];
        if (status)         { where.push('b.status = ?');         params.push(status); }
        if (payment_status) { where.push('b.payment_status = ?'); params.push(payment_status); }
        if (q) {
            where.push('(b.booking_number LIKE ? OR b.customer_name LIKE ? OR b.customer_phone LIKE ? OR b.customer_email LIKE ?)');
            const like = `%${q}%`;
            params.push(like, like, like, like);
        }
        const whereSql = `WHERE ${where.join(' AND ')}`;
        const lim = Math.max(1, Math.min(100, Number(limit)));
        const offset = (Math.max(1, Number(page)) - 1) * lim;

        const [rows] = await db.query(
            `SELECT b.id, b.booking_number, b.customer_name, b.customer_phone, b.customer_email,
                    b.trip_start_date, b.trip_end_date, b.total_amount, b.amount_paid,
                    b.balance_due, b.status, b.payment_status, b.created_at,
                    b.destination_text, q.package_type, d.name AS destination_name
               FROM bookings b
               LEFT JOIN quotations q ON q.id = b.quotation_id AND q.company_id = b.company_id
               LEFT JOIN destinations d ON d.id = q.destination_id AND d.company_id = b.company_id
               ${whereSql}
              ORDER BY b.id DESC
              LIMIT ? OFFSET ?`,
            [...params, lim, offset]
        );
        const [count] = await db.query(
            `SELECT COUNT(*) AS total FROM bookings b ${whereSql}`, params
        );
        res.json({ items: rows, total: count[0].total, page: Number(page), limit: lim });
    } catch (err) { next(err); }
};

const getBooking = async (req, res, next) => {
    try {
        const [rows] = await db.query(
            `SELECT b.*, d.name AS destination_name, q.quotation_number, q.package_type,
                    pq.quotation_number AS parent_quotation_number,
                    su.full_name AS created_by_name
               FROM bookings b
               LEFT JOIN quotations q  ON q.id  = b.quotation_id AND q.company_id = b.company_id
               LEFT JOIN quotations pq ON pq.id = q.parent_quotation_id AND pq.company_id = b.company_id
               LEFT JOIN destinations d ON d.id = q.destination_id AND d.company_id = b.company_id
               LEFT JOIN staff_users  su ON su.id = b.created_by AND su.company_id = b.company_id
              WHERE b.id = ? AND b.company_id = ?`, [req.params.id, req.companyId]
        );
        const b = rows[0];
        if (!b) return res.status(404).json({ error: 'Booking not found' });
        const cid = req.companyId;
        const [hotels, cars, flights, payments, invoices, reviews] = await Promise.all([
            db.query('SELECT * FROM quotation_hotels WHERE quotation_id = ? AND company_id = ? ORDER BY sort_order', [b.quotation_id, cid]),
            db.query('SELECT * FROM quotation_cars WHERE quotation_id = ? AND company_id = ? ORDER BY sort_order', [b.quotation_id, cid]),
            db.query('SELECT * FROM quotation_flights WHERE quotation_id = ? AND company_id = ? ORDER BY sort_order', [b.quotation_id, cid]),
            db.query('SELECT * FROM payments WHERE booking_id = ? AND company_id = ? ORDER BY id DESC', [b.id, cid]),
            db.query('SELECT * FROM invoices WHERE booking_id = ? AND company_id = ? ORDER BY id DESC', [b.id, cid]),
            db.query('SELECT id, rating, title, comment, customer_name, is_visible, created_at FROM reviews WHERE booking_id = ? AND company_id = ?', [b.id, cid])
        ]);
        res.json({
            ...b,
            hotels: hotels[0], cars: cars[0], flights: flights[0],
            payments: payments[0], invoices: invoices[0], reviews: reviews[0]
        });
    } catch (err) { next(err); }
};

const updateStatus = async (req, res, next) => {
    try {
        const { status } = req.body || {};
        if (!['pending','confirmed','cancelled','completed'].includes(status)) {
            return res.status(400).json({ error: 'status must be pending, confirmed, cancelled, or completed' });
        }

        // Fetch current status and lead/quotation details for timeline logging
        const [[booking]] = await db.query(
            `SELECT b.status, b.booking_number, b.quotation_id, q.lead_id
               FROM bookings b
          LEFT JOIN quotations q ON b.quotation_id = q.id AND q.company_id = b.company_id
              WHERE b.id = ? AND b.company_id = ?`,
            [req.params.id, req.companyId]
        );
        if (!booking) return res.status(404).json({ error: 'Booking not found' });

        const [r] = await db.query(
            'UPDATE bookings SET status = ? WHERE id = ? AND company_id = ?',
            [status, req.params.id, req.companyId]
        );
        if (!r.affectedRows) return res.status(404).json({ error: 'Booking not found' });

        try {
            const { logFollowup } = require('../services/followup.service');
            await logFollowup(null, {
                company_id: req.companyId,
                lead_id: booking.lead_id || null,
                quotation_id: booking.quotation_id || null,
                booking_id: req.params.id,
                user_id: req.user.id,
                notes: `Booking ${booking.booking_number} status updated from "${booking.status}" to "${status}".`,
                is_system: 1
            });
        } catch (e) {
            console.error('Failed to log system milestone for booking status update:', e.message);
        }

        const [rows] = await db.query('SELECT * FROM bookings WHERE id = ? AND company_id = ?', [req.params.id, req.companyId]);
        res.json(rows[0]);
    } catch (err) { next(err); }
};

module.exports = { listBookings, getBooking, updateStatus };
