// src/routes/payment-reminder.routes.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const c = require('../controllers/payment-reminder.controller');

router.use(authenticate);

router.get('/', c.listSchedules);
router.post('/', c.createSchedule);
router.patch('/:id', c.updateSchedule);
router.delete('/:id', c.deleteSchedule);
router.get('/logs', c.listLogs);

module.exports = router;
