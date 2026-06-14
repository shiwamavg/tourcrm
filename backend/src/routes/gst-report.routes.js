// src/routes/gst-report.routes.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const c = require('../controllers/gst-report.controller');

router.use(authenticate);
router.get('/', c.gstReport);

module.exports = router;
