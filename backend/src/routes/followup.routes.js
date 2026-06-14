const router = require('express').Router();
const c = require('../controllers/followup.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/journey', c.getJourney);
router.get('/', c.listFollowups);
router.post('/', c.createFollowup);
router.delete('/:id', c.deleteFollowup);

module.exports = router;
