// src/services/cashfree.service.js
// Thin wrapper around the Cashfree PG REST API.
// Docs: https://www.cashfree.com/docs/api-reference/payments/latest
//
// The service is intentionally a small, dependency-free client (uses the
// global `fetch` available in Node 18+) so the backend has no extra npm
// packages to install for payments.

const BASE_URL = process.env.CASHFREE_ENV === 'PROD'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';

const APP_ID  = process.env.CASHFREE_APP_ID  || '';
const SECRET  = process.env.CASHFREE_SECRET_KEY || '';
const ENV     = process.env.CASHFREE_ENV || 'TEST';

/** Throw a clean error if credentials are missing. Called lazily. */
const assertCredentials = () => {
    if (!APP_ID || !SECRET || APP_ID.startsWith('replace_me') || SECRET.startsWith('replace_me')) {
        const err = new Error('Cashfree credentials are not configured (CASHFREE_APP_ID / CASHFREE_SECRET_KEY)');
        err.code = 'CASHFREE_NOT_CONFIGURED';
        throw err;
    }
};

/** Returns a base64'd signature header value for the order payload.
 *  Cashfree expects HMAC-SHA256 of "<order_id>:<order_amount>:<order_currency>"
 *  signed with the API secret. Used for the hosted checkout integration. */
const createOrderSignature = ({ orderId, orderAmount, orderCurrency = 'INR' }) => {
    const crypto = require('crypto');
    const payload = `${orderId}:${orderAmount.toFixed(2)}:${orderCurrency}`;
    return crypto.createHmac('sha256', SECRET).update(payload).digest('base64');
};

/**
 * Create a Cashfree order. Returns the parsed JSON response which includes
 * `payment_session_id` (used by the frontend to open the checkout) and
 * `cf_order_id` (gateway's own id).
 *
 * @param {object} opts
 * @param {string} opts.orderId         – our idempotency token, e.g. "pay_<uuid>"
 * @param {number} opts.orderAmount     – amount in INR
 * @param {string} opts.orderCurrency   – "INR"
 * @param {string} opts.customerName
 * @param {string} opts.customerEmail
 * @param {string} opts.customerPhone
 * @param {string} opts.returnUrl       – URL the gateway redirects to
 * @param {string} [opts.bookingNumber] – human-readable label shown in the checkout
 */
const createOrder = async (opts) => {
    assertCredentials();

    const body = {
        order_id:         opts.orderId,
        order_amount:     Number(opts.orderAmount).toFixed(2),
        order_currency:   opts.orderCurrency || 'INR',
        customer_details: {
            customer_id:    opts.customerPhone || opts.orderId, // Cashfree requires an id
            customer_name:  opts.customerName  || 'Customer',
            customer_email: opts.customerEmail || 'no-email@example.com',
            customer_phone: opts.customerPhone || '9999999999'
        },
        order_meta: {
            return_url:  opts.returnUrl,
            notify_url:  `${process.env.BACKEND_URL || ''}/api/payments/cashfree/webhook`,
            payment_methods: 'cc,dc,nb,upi,paylater,emi,wallet'
        },
        order_note: opts.bookingNumber ? `Booking ${opts.bookingNumber}` : ''
    };

    const resp = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: {
            'Content-Type':     'application/json',
            'x-api-version':    '2023-08-01',
            'x-client-id':      APP_ID,
            'x-client-secret':  SECRET
        },
        body: JSON.stringify(body)
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
        const err = new Error(json?.message || `Cashfree createOrder failed (HTTP ${resp.status})`);
        err.code = 'CASHFREE_ORDER_FAILED';
        err.gatewayPayload = json;
        throw err;
    }
    return json;
};

/**
 * Fetch a previously-created order from Cashfree (used in the webhook
 * handler to confirm status before flipping the payment to "paid").
 */
const getOrder = async (cfOrderId) => {
    assertCredentials();
    const resp = await fetch(`${BASE_URL}/orders/${cfOrderId}`, {
        headers: {
            'x-api-version':   '2023-08-01',
            'x-client-id':     APP_ID,
            'x-client-secret': SECRET
        }
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
        const err = new Error(json?.message || `Cashfree getOrder failed (HTTP ${resp.status})`);
        err.code = 'CASHFREE_GET_ORDER_FAILED';
        err.gatewayPayload = json;
        throw err;
    }
    return json;
};

/**
 * Verify a Cashfree webhook signature. Cashfree posts
 *   x-cashfree-signature = base64(HMAC-SHA256(raw_body, secret))
 * Returns true on valid signature.
 */
const verifyWebhookSignature = (rawBody, signatureHeader) => {
    if (!SECRET || !signatureHeader) return false;
    const crypto = require('crypto');
    const expected = crypto.createHmac('sha256', SECRET)
        .update(rawBody, 'utf8')
        .digest('base64');
    // constant-time compare
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(signatureHeader, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
};

module.exports = {
    createOrder,
    getOrder,
    createOrderSignature,
    verifyWebhookSignature,
    isConfigured: () => !!APP_ID && !!SECRET
                     && !APP_ID.startsWith('replace_me')
                     && !SECRET.startsWith('replace_me'),
    env: ENV
};
