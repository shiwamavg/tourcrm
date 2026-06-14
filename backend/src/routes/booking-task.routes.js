// src/routes/booking-task.routes.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const c = require('../controllers/booking-task.controller');

router.use(authenticate);

// Templates
router.get('/templates', c.listTaskTemplates);
router.post('/templates', c.createTaskTemplate);
router.patch('/templates/:id', c.updateTaskTemplate);
router.delete('/templates/:id', c.deleteTaskTemplate);

// Booking tasks
router.get('/booking/:bookingId', c.listBookingTasks);
router.post('/', c.createBookingTask);
router.post('/:id/toggle', c.toggleTask);
router.delete('/:id', c.deleteBookingTask);

module.exports = router;
