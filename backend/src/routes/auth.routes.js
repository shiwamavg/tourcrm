// src/routes/auth.routes.js
const router = require('express').Router();
const { login, signup, verifySignupOtp, resendSignupOtp, me } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

router.post('/login', login);
router.post('/signup', signup);
router.post('/signup/verify', verifySignupOtp);
router.post('/signup/resend', resendSignupOtp);
router.get('/me', authenticate, me);

module.exports = router;
