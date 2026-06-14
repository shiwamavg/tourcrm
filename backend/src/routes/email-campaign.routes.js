const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/email-campaign.controller');
const { authenticate } = require('../middleware/auth');
const { checkFeature } = require('../middleware/feature-gate');
const { checkQuota } = require('../middleware/quota');

router.use(authenticate, checkFeature('campaigns'));

router.get('/', ctrl.list);
router.post('/', checkQuota('campaigns'), ctrl.create);
router.patch('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
