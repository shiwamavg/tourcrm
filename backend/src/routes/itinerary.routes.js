const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/itinerary.controller');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, ctrl.list);
router.post('/', authenticate, ctrl.create);
router.get('/:id', authenticate, ctrl.getById);
router.patch('/:id', authenticate, ctrl.update);
router.delete('/:id', authenticate, ctrl.remove);
router.post('/:id/days', authenticate, ctrl.addDay);
router.patch('/:id/days/:dayId', authenticate, ctrl.updateDay);
router.delete('/:id/days/:dayId', authenticate, ctrl.removeDay);

module.exports = router;
