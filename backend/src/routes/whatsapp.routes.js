const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/whatsapp.controller');
const { authenticate } = require('../middleware/auth');

router.get('/config', authenticate, ctrl.getConfig);
router.post('/config', authenticate, ctrl.saveConfig);
router.post('/send', authenticate, ctrl.sendMessage);

module.exports = router;
