// src/routes/admin.routes.js
const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const c = require('../controllers/admin.controller');

// ── Auth for all admin routes ─────────────────────────────
router.use(authenticate);

// Destinations — all staff can read, only admin/manager can write
router.get('/destinations',         c.listDestinations);
router.post('/destinations',        requireRole('admin', 'manager'), c.createDestination);
router.patch('/destinations/:id',   requireRole('admin', 'manager'), c.updateDestination);

// Hotel rates — all staff can read, only admin/manager can write
router.get('/hotel-rates',          c.listHotelRates);
router.post('/hotel-rates',         requireRole('admin', 'manager'), c.createHotelRate);
router.patch('/hotel-rates/:id',    requireRole('admin', 'manager'), c.updateHotelRate);
router.delete('/hotel-rates/:id',   requireRole('admin', 'manager'), c.deleteHotelRate);

// Car types — all staff can read
router.get('/car-types',            c.listCarTypes);

// Car rates — all staff can read, only admin/manager can write
router.get('/car-rates',            c.listCarRates);
router.post('/car-rates',           requireRole('admin', 'manager'), c.createCarRate);
router.patch('/car-rates/:id',      requireRole('admin', 'manager'), c.updateCarRate);
router.delete('/car-rates/:id',     requireRole('admin', 'manager'), c.deleteCarRate);

// Settings — all staff can read, only admin/manager can write
router.get('/settings',             c.getSettings);
router.patch('/settings',           requireRole('admin', 'manager'), c.updateSettings);

// B2B Agent Management
router.get('/agents',               requireRole('admin', 'manager', 'accounts'), c.listAgents);
router.patch('/agents/:id/status',  requireRole('admin', 'manager'), c.updateAgentStatus);

// Commission Management
router.get('/commissions',          requireRole('admin', 'manager', 'accounts'), c.listCommissions);
router.post('/commissions/:id/pay', requireRole('admin', 'accounts'), c.payCommission);

module.exports = router;
