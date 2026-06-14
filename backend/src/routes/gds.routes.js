const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/gds.controller');
const { authenticate } = require('../middleware/auth');
const { checkFeature } = require('../middleware/feature-gate');

router.use(authenticate, checkFeature('supplier'));

router.get('/flights', ctrl.searchFlights);
router.get('/hotels', ctrl.searchHotels);

module.exports = router;
