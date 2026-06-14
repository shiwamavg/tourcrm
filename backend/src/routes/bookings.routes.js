// src/routes/bookings.routes.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctl   = require('../controllers/bookings.controller');
const payCtl = require('../controllers/payments.controller');
const invCtl = require('../controllers/invoices.controller');

router.use(authenticate);

router.get('/',                       ctl.listBookings);
router.get('/:id',                    ctl.getBooking);
router.patch('/:id/status',           ctl.updateStatus);
router.get('/:id/payments',           payCtl.listByBooking);
router.get('/:id/invoices',           invCtl.listByBooking);

module.exports = router;
