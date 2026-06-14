// src/routes/followup-sequence.routes.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const c = require('../controllers/followup-sequence.controller');

router.use(authenticate);

router.get('/', c.listSequences);
router.post('/', c.createSequence);
router.get('/:id', c.getSequence);
router.patch('/:id', c.updateSequence);
router.delete('/:id', c.deleteSequence);

module.exports = router;
