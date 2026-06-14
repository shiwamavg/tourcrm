// src/routes/payments.routes.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const c = require('../controllers/payments.controller');

router.use(authenticate);

router.get('/',                     c.listPayments);
router.get('/booking/:id',          c.listByBooking);
router.get('/:id',                  c.getPayment);
router.post('/',                    c.recordOffline);   // admin records cash/UPI/etc.
router.post('/online',              c.createOnlineOrder);

module.exports = router;
