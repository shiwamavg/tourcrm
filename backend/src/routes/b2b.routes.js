const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/b2b.controller');
const { authenticate } = require('../middleware/auth');
const { checkFeature } = require('../middleware/feature-gate');

router.use(authenticate, checkFeature('b2b'));

router.get('/marketplace', ctrl.listMarketplace);
router.post('/share', ctrl.shareItem);
router.post('/import', ctrl.importItem);

module.exports = router;
