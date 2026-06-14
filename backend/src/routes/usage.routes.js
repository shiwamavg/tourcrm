const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/usage.controller');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, ctrl.usage);

module.exports = router;
