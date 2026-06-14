// src/routes/tenant-billing.routes.js
const express = require('express');
const router = express.Router();
const c = require('../controllers/tenant-billing.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/current', c.getCurrentPlan);
router.get('/invoices', c.getInvoices);
router.post('/upgrade', c.changePlan);

module.exports = router;
