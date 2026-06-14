const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reminder.controller');
const { authenticate } = require('../middleware/auth');

router.get('/stats', authenticate, ctrl.stats);
router.get('/', authenticate, ctrl.list);
router.post('/', authenticate, ctrl.create);
router.patch('/:id', authenticate, ctrl.update);
router.post('/:id/dismiss', authenticate, ctrl.dismiss);
router.delete('/:id', authenticate, ctrl.remove);

module.exports = router;
