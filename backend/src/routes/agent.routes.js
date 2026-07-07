// src/routes/agent.routes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/agent.controller');
const { authenticateAgent } = require('../middleware/auth');

// Public agent routes
router.post('/auth/signup', ctrl.signup);
router.post('/auth/login', ctrl.login);

// Protected agent routes
router.get('/dashboard', authenticateAgent, ctrl.getDashboard);
router.post('/trips', authenticateAgent, ctrl.submitTrip);
router.get('/trips', authenticateAgent, ctrl.getTrips);
router.get('/commissions', authenticateAgent, ctrl.getCommissions);

module.exports = router;
