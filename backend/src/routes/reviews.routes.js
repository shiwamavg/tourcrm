// src/routes/reviews.routes.js
// Public list is unauthenticated; admin endpoints are gated by staff auth.
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const c = require('../controllers/reviews.controller');

// Public
router.get('/',          c.listPublic);
router.get('/:id',       c.getOne);

// Admin
router.get('/admin/all', authenticate, c.listAdmin);
router.patch('/:id',     authenticate, c.moderate);

// Submit (allowed from either staff or the portal — both pass `authenticate`
// but the portal uses its own token, so we also accept the portal flow via
// the portal routes in portal.routes.js).
router.post('/',         authenticate, c.submit);

module.exports = router;
