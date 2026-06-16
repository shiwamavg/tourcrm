const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/report.controller');
const { authenticate } = require('../middleware/auth');
const { checkFeature } = require('../middleware/feature-gate');

router.use(authenticate, checkFeature('reports'));

router.get('/sales-by-agent', ctrl.getSalesByAgent);
router.get('/sales-by-destination', ctrl.getSalesByDestination);
router.get('/lead-sources', ctrl.getLeadSources);
router.get('/monthly-revenue', ctrl.getMonthlyRevenue);
router.get('/package-performance', ctrl.getPackagePerformance);

module.exports = router;
