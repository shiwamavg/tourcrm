const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/email-campaign.controller');
const { authenticate } = require('../middleware/auth');
const { checkFeature } = require('../middleware/feature-gate');
const { checkQuota } = require('../middleware/quota');

router.use(authenticate, checkFeature('campaigns'));

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.get('/:id/stats', ctrl.getStats);
router.post('/', checkQuota('campaigns'), ctrl.create);
router.post('/:id/send', ctrl.send);
router.patch('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;

