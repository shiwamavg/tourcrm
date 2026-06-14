// src/controllers/portal.controller.js
const db     = require('../config/db');
const jwt    = require('jsonwebtoken');
const otp    = require('../services/email-otp.service');
const cashfree = require('../services/cashfree.service');

const PORTAL_SECRET   = process.env.PORTAL_JWT_SECRET || 'portal_dev_secret';
const PORTAL_EXPIRES  = process.env.PORTAL_JWT_EXPIRES_IN || '24h';
const PORTAL_URL      = process.env.CUSTOMER_PORTAL_URL || '';

// ── send OTP ───────────────────────────────────────────────
const sendOtp = async (req, res, next) => {
    try {
        const { email } = req.body || {};
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'A valid email is required' });
        }
        const result = await otp.issueOtp(email, { ip: req.ip, userAgent: req.get('user-agent') });
        const resp = { ok: true, message: 'OTP sent. Check your inbox.' };
        if ((process.env.EMAIL_MODE || 'console') === 'console') {
            resp.dev_otp = result.code;
        }
        res.json(resp);
    } catch (err) { next(err); }
};

// ── verify OTP ─────────────────────────────────────────────
const verifyOtp = async (req, res, next) => {
    try {
        const { email, code } = req.body || {};
        if (!email || !code) return res.status(400).json({ error: 'email and code are required' });
        const result = await otp.verifyOtp(email, code);
        if (!result.ok) {
            const code_ = { no_active_otp: 400, expired: 400, wrong_code: 401,
                            too_many_attempts: 429, invalid_code_format: 400 }[result.reason] || 400;
            return res.status(code_).json({ error: result.reason });
        }
        const token = jwt.sign(
            { email: result.email, kind: 'portal' },
            PORTAL_SECRET,
            { expiresIn: PORTAL_EXPIRES }
        );
        res.json({ access_token: token, email: result.email });
    } catch (err) { next(err); }
};

// ── middleware: verify portal JWT ──────────────────────────
const portalAuth = (req, res, next) => {
    const h = req.header('authorization') || '';
    const m = h.match(/^Bearer\s+(.+)$/i);
    if (!m) return res.status(401).json({ error: 'Missing portal token' });
    try {
        const payload = jwt.verify(m[1], PORTAL_SECRET);
        if (payload.kind !== 'portal') return res.status(401).json({ error: 'Not a portal token' });
        req.portal = { email: payload.email };
        next();
    } catch (e) {
        res.status(401).json({ error: 'Invalid or expired portal token' });
    }
};

// ── me ─────────────────────────────────────────────────────
const me = async (req, res) => {
    res.json({ email: req.portal.email });
};

// ── list customer's bookings ───────────────────────────────
const myBookings = async (req, res, next) => {
    try {
        const email = req.portal.email;
        const [rows] = await db.query(
            `SELECT b.id, b.booking_number, b.customer_name, b.customer_email, b.customer_phone,
                    b.trip_start_date, b.trip_end_date, b.total_amount, b.amount_paid, b.status,
                    b.created_at, b.company_id,
                    d.name AS destination_name, b.destination_text, q.package_type,
                    b.adults, b.children_below_5, b.children_above_5
               FROM bookings b
               LEFT JOIN quotations q ON q.id = b.quotation_id AND q.company_id = b.company_id
               LEFT JOIN destinations d ON d.id = q.destination_id AND d.company_id = b.company_id
              WHERE b.customer_email = ?
              ORDER BY b.id DESC`, [email]
        );
        res.json({ items: rows });
    } catch (err) { next(err); }
};

// ── booking detail ─────────────────────────────────────────
const bookingDetail = async (req, res, next) => {
    try {
        const email = req.portal.email;
        const [rows] = await db.query(
            `SELECT b.*, d.name AS destination_name,
                    q.quotation_number, q.parent_quotation_id,
                    pq.quotation_number AS parent_quotation_number,
                    q.package_type
               FROM bookings b
               LEFT JOIN quotations q ON q.id = b.quotation_id AND q.company_id = b.company_id
               LEFT JOIN quotations pq ON pq.id = q.parent_quotation_id AND pq.company_id = b.company_id
               LEFT JOIN destinations d ON d.id = q.destination_id AND d.company_id = b.company_id
              WHERE b.id = ? AND b.customer_email = ?`,
            [req.params.id, email]
        );
        const b = rows[0];
        if (!b) return res.status(404).json({ error: 'Booking not found' });
        const cid = b.company_id;
        const [hotels, cars, flights, payments, invoices, reviews] = await Promise.all([
            db.query('SELECT * FROM quotation_hotels WHERE quotation_id = ? AND company_id = ? ORDER BY sort_order', [b.quotation_id, cid]),
            db.query('SELECT * FROM quotation_cars   WHERE quotation_id = ? AND company_id = ? ORDER BY sort_order', [b.quotation_id, cid]),
            db.query('SELECT * FROM quotation_flights WHERE quotation_id = ? AND company_id = ? ORDER BY sort_order', [b.quotation_id, cid]),
            db.query(`SELECT id, gateway, amount, status, method_label, paid_at, offline_reference, created_at
                        FROM payments WHERE booking_id = ? AND company_id = ? ORDER BY id DESC`, [b.id, cid]),
            db.query(`SELECT id, invoice_number, total, issued_at, pdf_path FROM invoices WHERE booking_id = ? AND company_id = ? ORDER BY id DESC`, [b.id, cid]),
            db.query(`SELECT id, rating, title, comment, created_at FROM reviews WHERE booking_id = ? AND company_id = ?`, [b.id, cid])
        ]);

        res.json({
            ...b,
            hotels:   hotels[0],
            cars:     cars[0],
            flights:  flights[0],
            payments: payments[0],
            invoices: invoices[0],
            review:   reviews[0][0] || null
        });
    } catch (err) { next(err); }
};

// ── initiate payment for a booking (Cashfree) ──────────────
const payBooking = async (req, res, next) => {
    try {
        const email = req.portal.email;
        const { amount } = req.body || {};
        if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'amount must be > 0' });

        const [rows] = await db.query(
            'SELECT * FROM bookings WHERE id = ? AND customer_email = ?',
            [req.params.id, email]
        );
        const b = rows[0];
        if (!b) return res.status(404).json({ error: 'Booking not found' });
        if (b.status === 'cancelled') return res.status(400).json({ error: 'Booking is cancelled' });

        if (!cashfree.isConfigured()) {
            return res.status(503).json({
                error: 'Online payments are in demo mode (Cashfree credentials are placeholders). Please contact the agency to record an offline payment, or replace the Cashfree keys in backend/.env with real sandbox credentials.',
                code: 'CASHFREE_NOT_CONFIGURED'
            });
        }

        const orderId = `pay_${b.id}_${Date.now()}`;
        const returnUrl = `${PORTAL_URL}/booking-detail.html?booking_id=${b.id}`;
        const order = await cashfree.createOrder({
            orderId, orderAmount: amount, orderCurrency: 'INR',
            customerName: b.customer_name, customerEmail: b.customer_email, customerPhone: b.customer_phone,
            returnUrl, bookingNumber: b.booking_number
        });

        const [r] = await db.query(
            `INSERT INTO payments
                (booking_id, quotation_id, gateway, gateway_order_id, amount, status, raw_response, company_id)
             VALUES (?,?,?,?,?,?,?,?)`,
            [b.id, b.quotation_id || null, 'cashfree', orderId, amount, 'created', JSON.stringify(order), b.company_id]
        );

        res.status(201).json({
            payment_id: r.insertId,
            order_id: orderId,
            cf_order_id: order.cf_order_id,
            payment_session_id: order.payment_session_id,
            amount, env: cashfree.env
        });
    } catch (err) { next(err); }
};

// ── pay offline ────────────────────────────────────────────
const payOffline = async (req, res, next) => {
    try {
        const email = req.portal.email;
        const { amount, reference, gateway = 'bank_transfer', method_label, note } = req.body || {};
        if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'amount must be > 0' });
        if (!reference || !String(reference).trim()) return res.status(400).json({ error: 'reference is required' });

        const allowedGateway = ['cash','bank_transfer','upi','card','other'];
        if (!allowedGateway.includes(gateway)) {
            return res.status(400).json({ error: 'gateway must be one of cash, bank_transfer, upi, card, other' });
        }

        const [rows] = await db.query(
            'SELECT id, quotation_id, booking_number, total_amount, amount_paid, company_id FROM bookings WHERE id = ? AND customer_email = ?',
            [req.params.id, email]
        );
        const b = rows[0];
        if (!b) return res.status(404).json({ error: 'Booking not found' });
        if (b.status === 'cancelled') return res.status(400).json({ error: 'Booking is cancelled' });

        const total = Number(b.total_amount);
        const paid  = Number(b.amount_paid);
        const balance = Math.max(0, total - paid);
        const amt = Math.min(Number(amount), balance);
        if (amt <= 0) {
            return res.status(400).json({ error: 'Booking already fully paid' });
        }

        const composedNote = `[PENDING VERIFICATION via customer portal] ${(note || '').trim()}`;
        const [r] = await db.query(
            `INSERT INTO payments
                (booking_id, quotation_id, gateway, amount, currency, method_label,
                 status, offline_reference, offline_note, company_id)
             VALUES (?, ?, ?, ?, 'INR', ?, 'created', ?, ?, ?)`,
            [b.id, b.quotation_id || null, gateway, amt,
             method_label || gateway, String(reference).trim(), composedNote, b.company_id]
        );
        console.log(`[portal.pay-offline] customer=${email} booking=${b.booking_number} amount=${amt} ref=${reference} payment_id=${r.insertId}`);

        res.status(201).json({
            ok: true,
            payment_id: r.insertId,
            amount: amt,
            status: 'created',
            message: 'Payment recorded. Our team will verify the transfer and generate your invoice shortly.'
        });
    } catch (err) { next(err); }
};

// ── leave a review (one per booking) ───────────────────────
const reviewBooking = async (req, res, next) => {
    try {
        const email = req.portal.email;
        const { rating, title, comment } = req.body || {};
        if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'rating must be 1..5' });
        if (!comment || comment.trim().length < 5) return res.status(400).json({ error: 'comment must be at least 5 characters' });

        const [rows] = await db.query(
            'SELECT id, customer_name, customer_email, status, company_id, total_amount FROM bookings WHERE id = ? AND customer_email = ?',
            [req.params.id, email]
        );
        const b = rows[0];
        if (!b) return res.status(404).json({ error: 'Booking not found' });

        const [existing] = await db.query(
            'SELECT id FROM reviews WHERE booking_id = ? AND company_id = ?', [b.id, b.company_id]
        );
        if (existing[0]) return res.status(409).json({ error: 'A review already exists for this booking' });

        const [[paid]] = await db.query(
            `SELECT COALESCE(SUM(amount),0) AS paid FROM payments WHERE booking_id = ? AND company_id = ? AND status='paid'`, [b.id, b.company_id]
        );
        const verified = Number(paid.paid || 0) >= Number(b.total_amount || 0) * 0.25;

        const [r] = await db.query(
            `INSERT INTO reviews
                (booking_id, customer_name, customer_email, rating, title, comment, is_verified, is_visible, company_id)
             VALUES (?,?,?,?,?,?,?,?,?)`,
            [b.id, b.customer_name, b.customer_email, Number(rating),
             (title || '').slice(0, 120) || null, comment.trim(), verified ? 1 : 0, 1, b.company_id]
        );
        res.status(201).json({ id: r.insertId, is_verified: verified });
    } catch (err) { next(err); }
};

module.exports = {
    sendOtp, verifyOtp, portalAuth, me,
    myBookings, bookingDetail, payBooking, payOffline, reviewBooking
};
