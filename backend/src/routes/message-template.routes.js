// src/routes/message-template.routes.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const c = require('../controllers/message-template.controller');

router.use(authenticate);

router.get('/', c.listTemplates);
router.post('/', c.createTemplate);
router.get('/:id', c.getTemplate);
router.patch('/:id', c.updateTemplate);
router.delete('/:id', c.deleteTemplate);

module.exports = router;
