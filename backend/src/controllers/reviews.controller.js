// src/controllers/reviews.controller.js
const db = require('../config/db');

const isBookingComplete = async (bookingId, companyId) => {
    const [rows] = await db.query(
        `SELECT b.id, b.status, b.trip_end_date,
                (SELECT COALESCE(SUM(amount),0) FROM payments p
                   WHERE p.booking_id = b.id AND p.company_id = b.company_id AND p.status='paid') AS paid,
                b.total_amount
           FROM bookings b WHERE b.id = ? AND b.company_id = ?`, [bookingId, companyId]
    );
    const b = rows[0];
    if (!b) return false;
    if (b.status === 'cancelled') return false;
    if (Number(b.paid) < Number(b.total_amount) * 0.25) return false;
    return true;
};

// ── public list ────────────────────────────────────────────
const listPublic = async (req, res, next) => {
    try {
        const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 12));
        const [rows] = await db.query(
            `SELECT r.id, r.rating, r.title, r.comment, r.created_at,
                    r.customer_name, r.admin_reply, r.admin_reply_at,
                    b.booking_number, d.name AS destination_name
               FROM reviews r
               JOIN bookings b ON b.id = r.booking_id AND b.company_id = r.company_id
               LEFT JOIN quotations q ON q.id = b.quotation_id AND q.company_id = r.company_id
               LEFT JOIN destinations d ON d.id = q.destination_id AND d.company_id = r.company_id
              WHERE r.is_visible = 1 AND r.company_id = ?
              ORDER BY r.id DESC
              LIMIT ?`, [req.companyId, limit]
        );
        const [[agg]] = await db.query(
            `SELECT COUNT(*) AS n, AVG(rating) AS avg_rating
               FROM reviews WHERE is_visible = 1 AND company_id = ?`, [req.companyId]
        );
        res.json({
            items: rows,
            total: Number(agg.n || 0),
            avg_rating: Number(agg.avg_rating || 0).toFixed(2)
        });
    } catch (err) { next(err); }
};

// ── admin list ─────────────────────────────────────────────
const listAdmin = async (req, res, next) => {
    try {
        const { is_visible, page = 1, limit = 20, search } = req.query;
        const where = ['r.company_id = ?'];
        const params = [req.companyId];
        if (is_visible === '1' || is_visible === '0') {
            where.push('r.is_visible = ?'); params.push(Number(is_visible));
        }
        if (search && search.trim()) {
            where.push(`(r.comment LIKE ? OR r.title LIKE ? OR r.customer_name LIKE ? OR b.booking_number LIKE ?)`);
            const q = `%${search.trim()}%`;
            params.push(q, q, q, q);
        }
        const whereSql = `WHERE ${where.join(' AND ')}`;
        const lim = Math.max(1, Math.min(100, Number(limit)));
        const offset = (Math.max(1, Number(page)) - 1) * lim;
        const [rows] = await db.query(
            `SELECT r.*, b.booking_number, b.customer_phone, d.name AS destination_name
               FROM reviews r
               JOIN bookings b ON b.id = r.booking_id AND b.company_id = r.company_id
               LEFT JOIN quotations q ON q.id = b.quotation_id AND q.company_id = r.company_id
               LEFT JOIN destinations d ON d.id = q.destination_id AND d.company_id = r.company_id
               ${whereSql}
              ORDER BY r.id DESC
              LIMIT ? OFFSET ?`, [...params, lim, offset]
        );
        const [c] = await db.query(
            `SELECT COUNT(*) AS total FROM reviews r JOIN bookings b ON b.id = r.booking_id AND b.company_id = r.company_id ${whereSql}`, params);
        res.json({ items: rows, total: c[0].total, page: Number(page), limit: lim });
    } catch (err) { next(err); }
};

// ── submit ─────────────────────────────────────────────────
const submit = async (req, res, next) => {
    try {
        const { booking_id, rating, title, comment, customer_name, customer_email } = req.body || {};
        if (!booking_id) return res.status(400).json({ error: 'booking_id is required' });
        if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'rating must be 1..5' });
        if (!comment || comment.trim().length < 5) return res.status(400).json({ error: 'comment must be at least 5 characters' });

        const [b] = await db.query(
            'SELECT id, customer_name, customer_email, status FROM bookings WHERE id = ? AND company_id = ?',
            [booking_id, req.companyId]
        );
        if (!b[0]) return res.status(404).json({ error: 'Booking not found' });

        const [existing] = await db.query(
            'SELECT id FROM reviews WHERE booking_id = ? AND company_id = ?', [booking_id, req.companyId]
        );
        if (existing[0]) return res.status(409).json({ error: 'A review already exists for this booking' });

        const verified = await isBookingComplete(booking_id, req.companyId);

        const [r] = await db.query(
            `INSERT INTO reviews
                (booking_id, customer_name, customer_email, rating, title, comment, is_verified, is_visible, company_id)
             VALUES (?,?,?,?,?,?,?,?,?)`,
            [
                booking_id,
                customer_name || b[0].customer_name,
                customer_email || b[0].customer_email || null,
                Number(rating),
                (title || '').slice(0, 120) || null,
                comment.trim(),
                verified ? 1 : 0,
                1,
                req.companyId
            ]
        );
        res.status(201).json({ id: r.insertId, booking_id, rating, is_verified: verified });
    } catch (err) { next(err); }
};

// ── admin: hide/show / reply ───────────────────────────────
const moderate = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { is_visible, admin_reply } = req.body || {};
        const fields = [];
        const params = [];
        if (typeof is_visible === 'boolean' || is_visible === 0 || is_visible === 1) {
            fields.push('is_visible = ?'); params.push(Number(is_visible) ? 1 : 0);
        }
        if (admin_reply !== undefined) {
            fields.push('admin_reply = ?', 'admin_reply_at = NOW()', 'admin_reply_by = ?');
            params.push((admin_reply || '').toString().slice(0, 2000) || null);
            params.push(req.user?.id || null);
        }
        if (!fields.length) return res.status(400).json({ error: 'no fields to update' });
        params.push(id, req.companyId);
        const [r] = await db.query(
            `UPDATE reviews SET ${fields.join(', ')} WHERE id = ? AND company_id = ?`, params
        );
        if (!r.affectedRows) return res.status(404).json({ error: 'Review not found' });
        res.json({ ok: true });
    } catch (err) { next(err); }
};

// ── single review (public) ─────────────────────────────────
const getOne = async (req, res, next) => {
    try {
        const [rows] = await db.query(
            `SELECT r.id, r.rating, r.title, r.comment, r.created_at, r.customer_name,
                    r.admin_reply, r.admin_reply_at, b.booking_number, d.name AS destination_name
               FROM reviews r
               JOIN bookings b ON b.id = r.booking_id AND b.company_id = r.company_id
               LEFT JOIN quotations q ON q.id = b.quotation_id AND q.company_id = r.company_id
               LEFT JOIN destinations d ON d.id = q.destination_id AND d.company_id = r.company_id
              WHERE r.id = ? AND r.is_visible = 1 AND r.company_id = ?`, [req.params.id, req.companyId]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Review not found' });
        res.json(rows[0]);
    } catch (err) { next(err); }
};

module.exports = { listPublic, listAdmin, submit, moderate, getOne };
