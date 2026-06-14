// src/routes/invoices.routes.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const c = require('../controllers/invoices.controller');

router.use(authenticate);

router.get('/',                c.listInvoices);
router.get('/booking/:id',     c.listByBooking);
router.get('/:id',             c.getInvoice);
router.get('/:id/download',    c.downloadInvoice);

module.exports = router;
