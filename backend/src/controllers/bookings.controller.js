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
                    b.destination_text, q.package_type, d.name AS destination_name, b.package_id,
                    p.title AS package_title
               FROM bookings b
               LEFT JOIN quotations q ON q.id = b.quotation_id AND q.company_id = b.company_id
               LEFT JOIN destinations d ON d.id = q.destination_id AND d.company_id = b.company_id
               LEFT JOIN packages p ON p.id = b.package_id AND p.company_id = b.company_id
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
                    su.full_name AS created_by_name,
                    p.title AS package_title
               FROM bookings b
               LEFT JOIN quotations q  ON q.id  = b.quotation_id AND q.company_id = b.company_id
               LEFT JOIN quotations pq ON pq.id = q.parent_quotation_id AND pq.company_id = b.company_id
               LEFT JOIN destinations d ON d.id = q.destination_id AND d.company_id = b.company_id
               LEFT JOIN staff_users  su ON su.id = b.created_by AND su.company_id = b.company_id
               LEFT JOIN packages     p  ON p.id  = b.package_id AND p.company_id = b.company_id
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

const generateBookingNumber = async (conn, companyId) => {
    const year = new Date().getFullYear();
    const [rows] = await conn.query(
        'SELECT COUNT(*) AS c FROM bookings WHERE YEAR(created_at) = ? AND company_id = ?',
        [year, companyId]
    );
    const seq = String(Number(rows[0].c || 0) + 1).padStart(4, '0');
    return `BKG-${year}-${seq}`;
};

const createBooking = async (req, res, next) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const { quotation_id, booking_fee_pct, special_requests, internal_notes } = req.body || {};

        if (!quotation_id) {
            await conn.rollback();
            return res.status(400).json({ error: 'quotation_id is required' });
        }

        const [qResult] = await conn.query(
            `SELECT * FROM quotations WHERE id = ? AND company_id = ?`,
            [quotation_id, req.companyId]
        );
        if (!qResult.length) {
            await conn.rollback();
            return res.status(400).json({ error: 'Quotation not found' });
        }
        const q = qResult[0];

        const bookingNumber = await generateBookingNumber(conn, req.companyId);
        const feePct = booking_fee_pct || 20;
        const feeAmount = (q.grand_total * feePct / 100);

        const [bResult] = await conn.query(`
            INSERT INTO bookings (
                booking_number, quotation_id, package_id, customer_name, customer_phone, customer_email,
                destination_text, trip_start_date, trip_end_date, adults,
                children_below_5, children_above_5, total_amount,
                booking_fee_pct, booking_fee_amount, amount_paid, status, payment_status,
                special_requests, internal_notes, created_by, company_id
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,'pending','pending',?,?,?,?)
        `, [
            bookingNumber, quotation_id, q.package_id || null, q.customer_name, q.customer_phone, q.customer_email || null,
            q.destination_text, q.trip_start_date, q.trip_end_date, q.adults,
            q.children_below_5, q.children_above_5, q.grand_total,
            feePct, feeAmount, special_requests || null, internal_notes || null, req.user.id, req.companyId
        ]);

        const bookingId = bResult.insertId;

        await conn.query(
            `UPDATE quotations SET status = 'accepted' WHERE id = ? AND company_id = ?`,
            [quotation_id, req.companyId]
        );

        if (q.lead_id) {
            await conn.query(
                `UPDATE leads SET status = 'converted' WHERE id = ? AND company_id = ?`,
                [q.lead_id, req.companyId]
            );
        }

        try {
            const { logFollowup } = require('../services/followup.service');
            await logFollowup(conn, {
                company_id: req.companyId,
                lead_id: q.lead_id || null,
                quotation_id,
                booking_id: bookingId,
                user_id: req.user.id,
                notes: `Booking ${bookingNumber} created from Quotation ${q.quotation_number}.`,
                is_system: 1
            });
        } catch (e) {
            console.error('Failed to log system milestone for booking creation:', e.message);
        }

        // Create default operational tasks for this booking
        try {
            const { createTasksForBooking } = require('./booking-task.controller');
            await createTasksForBooking({
                id: bookingId,
                company_id: req.companyId,
                trip_start_date: q.trip_start_date
            });
        } catch (e) {
            console.error('Failed to create default booking tasks:', e.message);
        }

        await conn.commit();

        const [rows] = await db.query('SELECT * FROM bookings WHERE id = ? AND company_id = ?', [bookingId, req.companyId]);
        res.status(201).json(rows[0]);
    } catch (err) {
        try { await conn.rollback(); } catch {}
        next(err);
    } finally {
        conn.release();
    }
};

const getCalendarBookings = async (req, res, next) => {
    try {
        const { year, month } = req.query;
        const y = parseInt(year) || new Date().getFullYear();
        const m = parseInt(month) || (new Date().getMonth() + 1);
        // Build date range: first day of month to last day of month
        const startDate = `${y}-${String(m).padStart(2,'0')}-01`;
        const nextMonth = m === 12 ? `${y+1}-01-01` : `${y}-${String(m+1).padStart(2,'0')}-01`;

        const [rows] = await db.query(
            `SELECT b.id, b.booking_number, b.customer_name, b.status, b.payment_status,
                    b.trip_start_date, b.trip_end_date, b.total_amount, b.adults,
                    b.destination_text, q.package_type,
                    COALESCE(p.title, q.destination_text, b.destination_text) AS tour_title,
                    COALESCE(p.category, q.package_type, 'Individual / Family') AS category
               FROM bookings b
               LEFT JOIN quotations q ON q.id = b.quotation_id AND q.company_id = b.company_id
               LEFT JOIN packages p   ON p.id = b.package_id AND p.company_id = b.company_id
              WHERE b.company_id = ?
                AND b.status != 'cancelled'
                AND b.trip_start_date >= ? AND b.trip_start_date < ?
              ORDER BY b.trip_start_date ASC`,
            [req.companyId, startDate, nextMonth]
        );
        res.json({ items: rows, year: y, month: m });
    } catch (err) { next(err); }
};

module.exports = { listBookings, getBooking, updateStatus, createBooking, getCalendarBookings };
