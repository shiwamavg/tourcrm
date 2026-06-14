const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/email-campaign.controller');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, ctrl.list);
router.post('/', authenticate, ctrl.create);
router.patch('/:id', authenticate, ctrl.update);
router.delete('/:id', authenticate, ctrl.remove);

module.exports = router;
