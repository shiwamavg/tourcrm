const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/visa.controller');
const { authenticate } = require('../middleware/auth');
const { checkQuota } = require('../middleware/quota');

router.get('/', authenticate, ctrl.list);
router.post('/', authenticate, checkQuota('visas'), ctrl.create);
router.patch('/:id', authenticate, ctrl.update);
router.delete('/:id', authenticate, ctrl.remove);

module.exports = router;
