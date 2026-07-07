// src/routes/portal.routes.js
// Customer-portal routes (OTP-based, no staff login).
const router = require('express').Router();
const c = require('../controllers/portal.controller');
const inv = require('../controllers/invoices.controller');

// Auth
router.post('/auth/send-otp',    c.sendOtp);
router.post('/auth/verify-otp',  c.verifyOtp);

// Everything below requires a portal JWT
router.use(c.portalAuth);
router.get ('/me',                         c.me);
router.get ('/bookings',                   c.myBookings);
router.get ('/bookings/:id',               c.bookingDetail);
router.post('/bookings/:id/pay',           c.payBooking);
router.post('/bookings/:id/pay-offline',   c.payOffline);
router.post('/bookings/:id/review',        c.reviewBooking);
router.get ('/invoices/:id/download',      inv.downloadPortalInvoice);
router.get ('/referrals',                  c.myReferrals);

module.exports = router;
