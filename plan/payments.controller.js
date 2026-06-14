const crypto = require('crypto');
const db = require('../config/db');

const CASHFREE_BASE = process.env.CASHFREE_ENV === 'PROD'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';

// ── Create Cashfree order ─────────────────────────────────────────
const createCashfreeOrder = async (req, res, next) => {
    try {
        const { booking_id, amount } = req.body;
        const customerId = req.customer?.id;   // portal JWT

        const booking = await db.query(
            `SELECT b.*, c.email, c.phone, c.full_name FROM bookings b
             JOIN customers c ON c.id = b.customer_id
             WHERE b.id = $1 AND b.customer_id = $2`,
            [booking_id, customerId]
        );
        if (!booking.rows.length) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        const b = booking.rows[0];
        const orderId = `ORD-${Date.now()}`;

        const orderPayload = {
            order_id: orderId,
            order_amount: parseFloat(amount),
            order_currency: 'INR',
            customer_details: {
                customer_id: customerId,
                customer_email: b.email,
                customer_phone: b.phone,
                customer_name: b.full_name
            },
            order_meta: {
                return_url: `${process.env.CUSTOMER_PORTAL_URL}/booking-detail.html?id=${booking_id}&order_id=${orderId}`,
                notify_url: `${process.env.BACKEND_URL || 'https://yourdomain.com'}/api/payments/cashfree-webhook`
            }
        };

        const response = await fetch(`${CASHFREE_BASE}/orders`, {
            method: 'POST',
            headers: {
                'x-api-version': '2023-08-01',
                'x-client-id': process.env.CASHFREE_APP_ID,
                'x-client-secret': process.env.CASHFREE_SECRET_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderPayload)
        });

        const orderData = await response.json();
        if (!response.ok) {
            return res.status(400).json({ error: 'Cashfree order creation failed', details: orderData });
        }

        // Store pending payment record
        await db.query(`
            INSERT INTO payments (booking_id, customer_id, cashfree_order_id,
                payment_session_id, amount, payment_method, payment_status)
            VALUES ($1,$2,$3,$4,$5,'cashfree_online','pending')
        `, [booking_id, customerId, orderId, orderData.payment_session_id, amount]);

        res.json({
            order_id: orderId,
            payment_session_id: orderData.payment_session_id,
            cashfree_order: orderData
        });
    } catch (err) { next(err); }
};

// ── Cashfree Webhook ──────────────────────────────────────────────
const cashfreeWebhook = async (req, res, next) => {
    try {
        const signature = req.headers['x-webhook-signature'];
        const timestamp = req.headers['x-webhook-timestamp'];
        const rawBody = JSON.stringify(req.body);

        // Verify signature
        const expectedSig = crypto
            .createHmac('sha256', process.env.CASHFREE_SECRET_KEY)
            .update(timestamp + rawBody)
            .digest('base64');

        if (signature !== expectedSig) {
            console.warn('Cashfree webhook signature mismatch');
            return res.status(401).json({ error: 'Invalid signature' });
        }

        const event = req.body;
        const orderId = event?.data?.order?.order_id;
        const paymentStatus = event?.data?.payment?.payment_status;
        const cfPaymentId = event?.data?.payment?.cf_payment_id;
        const paidAmount = event?.data?.payment?.payment_amount;

        if (!orderId) return res.json({ received: true });

        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            const paymentRow = await client.query(
                `SELECT * FROM payments WHERE cashfree_order_id = $1`, [orderId]
            );
            if (!paymentRow.rows.length) {
                await client.query('ROLLBACK');
                return res.json({ received: true });
            }
            const payment = paymentRow.rows[0];

            if (paymentStatus === 'SUCCESS') {
                await client.query(`
                    UPDATE payments SET
                        payment_status = 'paid',
                        cashfree_payment_id = $1,
                        payment_date = CURRENT_DATE,
                        webhook_payload = $2,
                        verified_at = NOW()
                    WHERE cashfree_order_id = $3
                `, [cfPaymentId, event, orderId]);

                await client.query(`
                    UPDATE bookings
                    SET total_paid = total_paid + $1,
                        payment_status = CASE
                            WHEN total_paid + $1 >= total_amount THEN 'paid'
                            ELSE 'partial' END
                    WHERE id = $2
                `, [paidAmount, payment.booking_id]);

                // Update invoice paid amount
                await client.query(`
                    UPDATE invoices SET total_paid = total_paid + $1
                    WHERE booking_id = $2
                `, [paidAmount, payment.booking_id]);
            } else if (paymentStatus === 'FAILED') {
                await client.query(
                    `UPDATE payments SET payment_status = 'failed', webhook_payload = $1 WHERE cashfree_order_id = $2`,
                    [event, orderId]
                );
            }

            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally { client.release(); }

        res.json({ received: true });
    } catch (err) { next(err); }
};

// ── Check payment status (polling) ───────────────────────────────
const checkPaymentStatus = async (req, res, next) => {
    try {
        const { order_id } = req.params;
        const result = await db.query(
            `SELECT payment_status, cashfree_payment_id, amount FROM payments WHERE cashfree_order_id = $1`,
            [order_id]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Order not found' });
        res.json(result.rows[0]);
    } catch (err) { next(err); }
};

module.exports = { createCashfreeOrder, cashfreeWebhook, checkPaymentStatus };
