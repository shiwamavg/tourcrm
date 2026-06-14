// src/controllers/payments.controller.js
const db       = require('../config/db');
const cashfree = require('../services/cashfree.service');
const invoiceCtl = require('./invoices.controller');

// ── helpers ────────────────────────────────────────────────
const loadBooking = async (id, companyId) => {
    const [rows] = await db.query(
        'SELECT * FROM bookings WHERE id = ? AND company_id = ?',
        [id, companyId]
    );
    return rows[0] || null;
};

const recomputeBookingPaid = async (bookingId, companyId) => {
    const [[agg]] = await db.query(
        `SELECT COALESCE(SUM(amount),0) AS paid
           FROM payments
          WHERE booking_id = ? AND company_id = ? AND status = 'paid'`,
        [bookingId, companyId]
    );
    await db.query(
        'UPDATE bookings SET amount_paid = ? WHERE id = ? AND company_id = ?',
        [Number(agg.paid || 0), bookingId, companyId]
    );
    return Number(agg.paid || 0);
};

// ── list (admin) ───────────────────────────────────────────
const listPayments = async (req, res, next) => {
    try {
        const { status, booking_id, page = 1, limit = 20 } = req.query;
        const where = ['p.company_id = ?'];
        const params = [req.companyId];
        if (status)     { where.push('p.status = ?');     params.push(status); }
        if (booking_id) { where.push('p.booking_id = ?'); params.push(booking_id); }
        const whereSql = `WHERE ${where.join(' AND ')}`;
        const lim = Math.max(1, Math.min(100, Number(limit)));
        const offset = (Math.max(1, Number(page)) - 1) * lim;

        const [rows] = await db.query(
            `SELECT p.*, b.booking_number, b.customer_name, b.customer_phone, b.total_amount
               FROM payments p
               JOIN bookings b ON b.id = p.booking_id AND b.company_id = p.company_id
               ${whereSql}
              ORDER BY p.id DESC
              LIMIT ? OFFSET ?`,
            [...params, lim, offset]
        );
        const [count] = await db.query(
            `SELECT COUNT(*) AS total FROM payments p ${whereSql}`, params
        );
        res.json({ items: rows, total: count[0].total, page: Number(page), limit: lim });
    } catch (err) { next(err); }
};

// ── detail ──────────────────────────────────────────────────
const getPayment = async (req, res, next) => {
    try {
        const [rows] = await db.query(
            `SELECT p.*, b.booking_number, b.customer_name, b.total_amount
               FROM payments p
               JOIN bookings b ON b.id = p.booking_id AND b.company_id = p.company_id
              WHERE p.id = ? AND p.company_id = ?`, [req.params.id, req.companyId]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Payment not found' });
        res.json(rows[0]);
    } catch (err) { next(err); }
};

// ── record offline payment (admin) ─────────────────────────
const recordOffline = async (req, res, next) => {
    try {
        const { booking_id, amount, gateway = 'cash', method_label, offline_reference, offline_note, status = 'paid' } = req.body || {};
        if (!booking_id || !amount) return res.status(400).json({ error: 'booking_id and amount are required' });

        const booking = await loadBooking(booking_id, req.companyId);
        if (!booking) return res.status(404).json({ error: 'Booking not found' });

        if (!['cash','bank_transfer','upi','card','other'].includes(gateway)) {
            return res.status(400).json({ error: 'gateway must be one of cash, bank_transfer, upi, card, other' });
        }
        if (!['paid','failed','refunded'].includes(status)) {
            return res.status(400).json({ error: 'status must be paid, failed, or refunded' });
        }

        const [r] = await db.query(
            `INSERT INTO payments
                (booking_id, quotation_id, gateway, amount, status,
                 method_label, collected_by, offline_reference, offline_note,
                 paid_at, failed_at, refunded_at, raw_response, company_id)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
                booking_id, booking.quotation_id || null, gateway, amount, status,
                method_label || null, req.user?.id || null, offline_reference || null, offline_note || null,
                status === 'paid'      ? new Date() : null,
                status === 'failed'    ? new Date() : null,
                status === 'refunded'  ? new Date() : null,
                JSON.stringify({ source: 'staff_offline', recorded_by: req.user?.id }),
                req.companyId
            ]
        );
        const paid = await recomputeBookingPaid(booking_id, req.companyId);

        try {
            let leadId = null;
            if (booking.quotation_id) {
                const [[q]] = await db.query('SELECT lead_id FROM quotations WHERE id = ? AND company_id = ?', [booking.quotation_id, req.companyId]);
                leadId = q?.lead_id || null;
            }
            const { logFollowup } = require('../services/followup.service');
            await logFollowup(null, {
                company_id: req.companyId,
                lead_id: leadId,
                quotation_id: booking.quotation_id || null,
                booking_id: booking_id,
                user_id: req.user?.id || 1,
                notes: `Payment of ₹${Number(amount).toLocaleString('en-IN')} recorded offline (${gateway}${offline_reference ? ' - Ref: ' + offline_reference : ''}). Status: ${status}.`,
                is_system: 1
            });
        } catch (e) {
            console.error('Failed to log system milestone for offline payment:', e.message);
        }

        if (status === 'paid') {
            try { await invoiceCtl.autoGenerateForBooking(booking_id, req.user?.id || null, req.companyId); } catch (e) {
                console.warn('[payments] auto-invoice failed:', e.message);
            }
        }

        res.status(201).json({ id: r.insertId, booking_id, amount, status, amount_paid: paid });
    } catch (err) { next(err); }
};

// ── create a Cashfree order (online payment) ────────────────
const createOnlineOrder = async (req, res, next) => {
    try {
        const { booking_id, amount } = req.body || {};
        if (!booking_id || !amount) return res.status(400).json({ error: 'booking_id and amount are required' });

        const booking = await loadBooking(booking_id, req.companyId);
        if (!booking) return res.status(404).json({ error: 'Booking not found' });

        if (!cashfree.isConfigured()) {
            return res.status(503).json({
                error: 'Online payments are not configured. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY in .env.'
            });
        }

        const orderId = `pay_${booking.id}_${Date.now()}`;
        const returnUrlTemplate = process.env.CASHFREE_RETURN_URL
            || `${process.env.CUSTOMER_PORTAL_URL || ''}/booking-detail.html?booking_id=${booking.id}`;

        const order = await cashfree.createOrder({
            orderId,
            orderAmount: amount,
            orderCurrency: 'INR',
            customerName:  booking.customer_name,
            customerEmail: booking.customer_email || 'no-email@example.com',
            customerPhone: booking.customer_phone,
            returnUrl:     returnUrlTemplate,
            bookingNumber: booking.booking_number
        });

        const [r] = await db.query(
            `INSERT INTO payments
                (booking_id, quotation_id, gateway, gateway_order_id,
                 amount, status, raw_response, company_id)
             VALUES (?,?,?,?,?,?,?,?)`,
            [
                booking.id, booking.quotation_id || null, 'cashfree', orderId,
                amount, 'created', JSON.stringify(order), req.companyId
            ]
        );

        res.status(201).json({
            payment_id:      r.insertId,
            order_id:        orderId,
            cf_order_id:     order.cf_order_id,
            payment_session_id: order.payment_session_id,
            amount,
            env:             cashfree.env
        });
    } catch (err) { next(err); }
};

// ── Cashfree webhook (no auth, signature-verified) ─────────
const handleWebhook = async (req, res) => {
    const rawBody = req.rawBody || (Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {})));
    const sig = req.header('x-cashfree-signature') || '';

    if (!cashfree.verifyWebhookSignature(rawBody, sig)) {
        console.warn('[cashfree webhook] signature verification failed');
        return res.status(401).json({ error: 'invalid signature' });
    }

    const payload = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString('utf8') || '{}') : (req.body || {});
    const data = payload.data || {};
    const cfOrderId = data.order?.order_id;
    const cfPaymentId = data.payment?.cf_payment_id;
    const paymentStatus = (data.payment?.payment_status || '').toUpperCase();

    if (!cfOrderId) return res.status(400).json({ error: 'missing order_id' });

    let newStatus = 'failed';
    if (paymentStatus === 'SUCCESS') newStatus = 'paid';
    if (paymentStatus === 'PENDING') newStatus = 'created';

    const tsField = newStatus === 'paid' ? 'paid_at'
                  : newStatus === 'failed' ? 'failed_at' : null;

    // Find the payment row (no company context in webhook)
    const [rows] = await db.query(
        'SELECT id, booking_id, amount, company_id FROM payments WHERE gateway = ? AND gateway_order_id = ?',
        ['cashfree', cfOrderId]
    );
    if (!rows[0]) {
        console.warn(`[cashfree webhook] no payment row for order ${cfOrderId}`);
        return res.json({ ok: true, ignored: true });
    }
    const payment = rows[0];

    const sql = tsField
        ? `UPDATE payments SET status = ?, gateway_payment_id = ?, gateway_signature = ?, ${tsField} = NOW(), raw_response = ? WHERE id = ?`
        : `UPDATE payments SET status = ?, gateway_payment_id = ?, gateway_signature = ?, raw_response = ? WHERE id = ?`;
    await db.query(sql, [
        newStatus, cfPaymentId || null, sig, JSON.stringify(payload), payment.id
    ]);

    if (newStatus === 'paid') {
        const paid = await recomputeBookingPaid(payment.booking_id, payment.company_id);
        try {
            const [[booking]] = await db.query(
                'SELECT quotation_id FROM bookings WHERE id = ? AND company_id = ?',
                [payment.booking_id, payment.company_id]
            );
            let leadId = null;
            if (booking && booking.quotation_id) {
                const [[q]] = await db.query('SELECT lead_id FROM quotations WHERE id = ? AND company_id = ?', [booking.quotation_id, payment.company_id]);
                leadId = q?.lead_id || null;
            }
            const { logFollowup } = require('../services/followup.service');
            await logFollowup(null, {
                company_id: payment.company_id,
                lead_id: leadId,
                quotation_id: booking?.quotation_id || null,
                booking_id: payment.booking_id,
                user_id: 1, // System admin
                notes: `Online payment of ₹${Number(payment.amount).toLocaleString('en-IN')} received via Cashfree. Status: paid.`,
                is_system: 1
            });
        } catch (e) {
            console.error('Failed to log system milestone for online payment webhook:', e.message);
        }
        try { await invoiceCtl.autoGenerateForBooking(payment.booking_id, null, payment.company_id); } catch (e) {
            console.warn('[cashfree webhook] auto-invoice failed:', e.message);
        }
        console.log(`[cashfree webhook] payment ${payment.id} marked PAID, booking ${payment.booking_id} total paid = ${paid}`);
    }
    res.json({ ok: true });
};

// ── list by booking ─────────────────────────────────────────
const listByBooking = async (req, res, next) => {
    try {
        const [rows] = await db.query(
            `SELECT * FROM payments WHERE booking_id = ? AND company_id = ? ORDER BY id DESC`,
            [req.params.id, req.companyId]
        );
        res.json(rows);
    } catch (err) { next(err); }
};

module.exports = {
    listPayments, getPayment, recordOffline,
    createOnlineOrder, handleWebhook, listByBooking,
    _recomputeBookingPaid: recomputeBookingPaid
};
