// ── routes/quotations.routes.js ──────────────────────────────────
const express = require('express');
const qRouter = express.Router();
const qCtrl = require('../controllers/quotations.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

qRouter.use(authMiddleware);
qRouter.get('/', qCtrl.listQuotations);
qRouter.post('/', qCtrl.createQuotation);
qRouter.get('/master/hotel-rates', qCtrl.getHotelRatesForDestination);
qRouter.get('/master/car-rates', qCtrl.getCarRatesForDestination);
qRouter.get('/:id', qCtrl.getQuotation);
qRouter.patch('/:id/status', qCtrl.updateQuotationStatus);

module.exports = qRouter;


// ── routes/bookings.routes.js ─────────────────────────────────────
const bExpress = require('express');
const bRouter = bExpress.Router();
const bCtrl = require('../controllers/bookings.controller');
const { authMiddleware: bAuth, requireRole: bRole } = require('../middleware/auth.middleware');

bRouter.use(bAuth);
bRouter.get('/', bCtrl.listBookings);
bRouter.get('/:id', bCtrl.getBooking);
bRouter.post('/', bRole(['admin','manager']), bCtrl.createBooking);
bRouter.post('/:id/payments/offline', bRole(['admin','manager','accounts']), bCtrl.recordOfflinePayment);

module.exports = bRouter;


// ── routes/payments.routes.js ─────────────────────────────────────
const pExpress = require('express');
const pRouter = pExpress.Router();
const pCtrl = require('../controllers/payments.controller');

// Webhook — no JWT auth, verified by Cashfree signature
pRouter.post('/cashfree-webhook', express.raw({ type: 'application/json' }), pCtrl.cashfreeWebhook);
pRouter.get('/status/:order_id', pCtrl.checkPaymentStatus);

module.exports = pRouter;


// ── routes/admin.routes.js ────────────────────────────────────────
const aExpress = require('express');
const aRouter = aExpress.Router();
const aCtrl = require('../controllers/admin.controller');
const { authMiddleware: aAuth, requireRole: aRole } = require('../middleware/auth.middleware');

aRouter.use(aAuth);

// Destinations (any authenticated staff can read)
aRouter.get('/destinations', aCtrl.getDestinations);
aRouter.post('/destinations', aRole(['admin']), aCtrl.createDestination);
aRouter.patch('/destinations/:id', aRole(['admin']), aCtrl.updateDestination);

// Hotel rates
aRouter.get('/hotel-rates', aCtrl.getHotelRates);
aRouter.post('/hotel-rates', aRole(['admin','manager']), aCtrl.createHotelRate);
aRouter.patch('/hotel-rates/:id', aRole(['admin','manager']), aCtrl.updateHotelRate);

// Car rates
aRouter.get('/car-rates', aCtrl.getCarRates);
aRouter.post('/car-rates', aRole(['admin','manager']), aCtrl.createCarRate);
aRouter.patch('/car-rates/:id', aRole(['admin','manager']), aCtrl.updateCarRate);
aRouter.get('/car-types', aCtrl.getCarTypes);

// Staff users
aRouter.get('/users', aRole(['admin']), aCtrl.getStaffUsers);
aRouter.post('/users', aRole(['admin']), aCtrl.createStaffUser);

// Settings
aRouter.get('/settings', aCtrl.getSettings);
aRouter.patch('/settings', aRole(['admin']), aCtrl.updateSettings);

module.exports = aRouter;


// ── routes/portal.routes.js ───────────────────────────────────────
const portalExpress = require('express');
const portalRouter = portalExpress.Router();
const portalCtrl = require('../controllers/portal.controller');
const payCtrl = require('../controllers/payments.controller');
const { portalAuthMiddleware } = require('../middleware/auth.middleware');
const rateLimit = require('express-rate-limit');

const otpLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, keyGenerator: (req) => req.body.email || req.ip });

// Auth (public)
portalRouter.post('/auth/send-otp', otpLimiter, portalCtrl.sendOtp);
portalRouter.post('/auth/verify-otp', portalCtrl.verifyOtp);

// Protected
portalRouter.use(portalAuthMiddleware);
portalRouter.get('/bookings', portalCtrl.getMyBookings);
portalRouter.get('/bookings/:id', portalCtrl.getMyBookingDetail);
portalRouter.post('/payments/create-order', payCtrl.createCashfreeOrder);

module.exports = portalRouter;


// ── routes/invoices.routes.js ─────────────────────────────────────
const iExpress = require('express');
const iRouter = iExpress.Router();
const db = require('../config/db');
const { authMiddleware: iAuth } = require('../middleware/auth.middleware');
const { portalAuthMiddleware } = require('../middleware/auth.middleware');

// CRM staff invoice view
iRouter.get('/:booking_id', iAuth, async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT i.*, c.full_name, c.email, c.phone, c.address
             FROM invoices i JOIN customers c ON c.id = i.customer_id
             WHERE i.booking_id = $1`, [req.params.booking_id]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Invoice not found' });
        res.json(result.rows[0]);
    } catch (err) { next(err); }
});

module.exports = iRouter;
