const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/fixed-departure.controller');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, ctrl.list);
router.get('/:id', authenticate, ctrl.getById);
router.get('/:id/availability', authenticate, ctrl.getAvailability);
router.post('/', authenticate, ctrl.create);
router.post('/:id/book', authenticate, ctrl.bookSeat);
router.post('/:id/cancel', authenticate, ctrl.cancelSeat);
router.patch('/:id', authenticate, ctrl.update);
router.delete('/:id', authenticate, ctrl.remove);

module.exports = router;
