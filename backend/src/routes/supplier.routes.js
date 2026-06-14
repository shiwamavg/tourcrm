const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/supplier.controller');
const { authenticate } = require('../middleware/auth');
const { checkFeature } = require('../middleware/feature-gate');

router.use(authenticate, checkFeature('supplier'));

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.patch('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
