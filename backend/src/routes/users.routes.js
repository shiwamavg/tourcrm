// src/routes/users.routes.js
const router = require('express').Router();
const c = require('../controllers/users.controller');
const { authenticate } = require('../middleware/auth');

// Must be logged in for all routes
router.use(authenticate);

// Current user permissions
router.get('/me/permissions', c.myPermissions);

// Roles (readable by all authenticated users)
router.get('/roles', c.listRoles);
router.get('/roles/:slug', c.getRole);

// User CRUD (admin/manager only – enforcement in controller via middleware or here)
router.get('/', c.listUsers);
router.get('/:id', c.getUser);
router.post('/', c.createUser);
router.patch('/:id', c.updateUser);
router.post('/:id/toggle', c.toggleActive);
router.post('/:id/reset-password', c.resetPassword);

module.exports = router;
