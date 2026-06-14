// src/routes/monitor.routes.js
const router = require('express').Router();
const { authenticateSuperAdmin } = require('../middleware/super-admin-auth');
const c = require('../controllers/monitor.controller');

// Metrics intended for super-admin use only
router.get('/metrics', authenticateSuperAdmin, c.metrics);

module.exports = router;
