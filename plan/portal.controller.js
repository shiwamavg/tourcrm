const db = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendOtpEmail } = require('../services/email.service');

const PORTAL_SECRET = process.env.PORTAL_JWT_SECRET || process.env.JWT_SECRET + '_portal';

// ── Send OTP ──────────────────────────────────────────────────────
const sendOtp = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        // Check customer exists
        const customer = await db.query(`SELECT id, full_name FROM customers WHERE email = $1`, [email]);
        if (!customer.rows.length) {
            // Don't reveal whether email exists - same response
            return res.json({ message: 'If this email is registered, an OTP has been sent.' });
        }

        // Rate limit: max 3 OTPs per hour
        const recentOtps = await db.query(`
            SELECT COUNT(*) FROM customer_otps
            WHERE email = $1 AND created_at > NOW() - INTERVAL '1 hour' AND used_at IS NULL
        `, [email]);
        if (parseInt(recentOtps.rows[0].count) >= 3) {
            return res.status(429).json({ error: 'Too many OTP requests. Try again after 1 hour.' });
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await db.query(`
            INSERT INTO customer_otps (email, otp_hash, expires_at)
            VALUES ($1, $2, $3)
        `, [email, otpHash, expiresAt]);

        await sendOtpEmail(email, customer.rows[0].full_name, otp);

        res.json({ message: 'OTP sent successfully.' });
    } catch (err) { next(err); }
};

// ── Verify OTP ────────────────────────────────────────────────────
const verifyOtp = async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

        const otpRecord = await db.query(`
            SELECT * FROM customer_otps
            WHERE email = $1 AND expires_at > NOW() AND used_at IS NULL
            ORDER BY created_at DESC LIMIT 1
        `, [email]);

        if (!otpRecord.rows.length) {
            return res.status(400).json({ error: 'OTP expired or not found' });
        }

        const record = otpRecord.rows[0];

        if (record.attempts >= 5) {
            return res.status(400).json({ error: 'Too many failed attempts. Request a new OTP.' });
        }

        const valid = await bcrypt.compare(otp, record.otp_hash);
        if (!valid) {
            await db.query(`UPDATE customer_otps SET attempts = attempts + 1 WHERE id = $1`, [record.id]);
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        // Mark OTP as used
        await db.query(`UPDATE customer_otps SET used_at = NOW() WHERE id = $1`, [record.id]);

        const customer = await db.query(`SELECT id, full_name, email, phone FROM customers WHERE email = $1`, [email]);
        if (!customer.rows.length) return res.status(404).json({ error: 'Customer not found' });

        const c = customer.rows[0];
        const token = jwt.sign(
            { id: c.id, email: c.email, name: c.full_name, type: 'customer' },
            PORTAL_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token, customer: { id: c.id, name: c.full_name, email: c.email, phone: c.phone } });
    } catch (err) { next(err); }
};

// ── Portal: get customer's bookings ──────────────────────────────
const getMyBookings = async (req, res, next) => {
    try {
        const customerId = req.customer.id;
        const result = await db.query(`
            SELECT b.id, b.booking_number, b.destination_text, b.trip_start_date,
                   b.trip_end_date, b.adults, b.total_amount, b.total_paid,
                   b.balance_due, b.status, b.payment_status, b.created_at,
                   i.invoice_number
            FROM bookings b
            LEFT JOIN invoices i ON i.booking_id = b.id
            WHERE b.customer_id = $1
            ORDER BY b.created_at DESC
        `, [customerId]);
        res.json(result.rows);
    } catch (err) { next(err); }
};

// ── Portal: booking detail with full itinerary ───────────────────
const getMyBookingDetail = async (req, res, next) => {
    try {
        const customerId = req.customer.id;
        const { id } = req.params;

        const b = await db.query(`
            SELECT b.*, c.full_name AS customer_name, c.email, c.phone
            FROM bookings b
            JOIN customers c ON c.id = b.customer_id
            WHERE b.id = $1 AND b.customer_id = $2
        `, [id, customerId]);
        if (!b.rows.length) return res.status(404).json({ error: 'Booking not found' });

        const booking = b.rows[0];

        // Get quotation with line items
        const q = await db.query(`SELECT * FROM quotations WHERE id = $1`, [booking.quotation_id]);
        const hotels   = await db.query(`SELECT * FROM quotation_hotels WHERE quotation_id = $1 ORDER BY sort_order`, [booking.quotation_id]);
        const cars     = await db.query(`SELECT * FROM quotation_cars WHERE quotation_id = $1 ORDER BY sort_order`, [booking.quotation_id]);
        const flights  = await db.query(`SELECT * FROM quotation_flights WHERE quotation_id = $1 ORDER BY sort_order`, [booking.quotation_id]);
        const misc     = await db.query(`SELECT * FROM quotation_misc WHERE quotation_id = $1 ORDER BY sort_order`, [booking.quotation_id]);
        const payments = await db.query(`SELECT amount, payment_method, payment_status, payment_date, reference_number FROM payments WHERE booking_id = $1 AND payment_status = 'paid' ORDER BY payment_date DESC`, [id]);
        const invoice  = await db.query(`SELECT * FROM invoices WHERE booking_id = $1`, [id]);

        res.json({
            booking,
            quotation: q.rows[0],
            itinerary: { hotels: hotels.rows, cars: cars.rows, flights: flights.rows, misc: misc.rows },
            payments: payments.rows,
            invoice: invoice.rows[0]
        });
    } catch (err) { next(err); }
};

module.exports = { sendOtp, verifyOtp, getMyBookings, getMyBookingDetail };
