// src/routes/booking-traveller.routes.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctl = require('../controllers/booking-traveller.controller');

router.use(authenticate);

router.get('/:bookingId', ctl.listByBooking);
router.put('/:bookingId', ctl.saveBulk);

module.exports = router;
