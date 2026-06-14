// src/routes/quotations.routes.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { checkQuota } = require('../middleware/quota');
const c = require('../controllers/quotations.controller');

router.use(authenticate);

router.get('/stats', c.getStats);
router.get('/master/hotel-rates', c.getHotelRatesForDestination);
router.get('/master/car-rates',   c.getCarRatesForDestination);

router.get('/',      c.listQuotations);
router.post('/',     checkQuota('quotations'), c.createQuotation);
router.get('/:id',   c.getQuotation);
router.put('/:id',   c.updateQuotation);
router.patch('/:id/status', c.updateQuotationStatus);

module.exports = router;
