const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/whatsapp.controller');
const { authenticate } = require('../middleware/auth');
const { checkFeature } = require('../middleware/feature-gate');

router.use(authenticate, checkFeature('whatsapp'));

router.get('/config', ctrl.getConfig);
router.post('/config', ctrl.saveConfig);
router.post('/send', ctrl.sendMessage);

module.exports = router;
