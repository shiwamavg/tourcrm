const router = require('express').Router();
const { listPublicPackages } = require('../controllers/subscription.controller');

router.get('/', listPublicPackages);

module.exports = router;
