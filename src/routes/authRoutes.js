const express = require('express');
const router = express.Router();
const { requestPasswordReset, resetPassword } = require('../controllers/authController');
const { loginWithGoogle } = require('../controllers/googleAuthController');

// opcional: rate limit iría acá
router.post('/reset-password-request', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.post('/google', loginWithGoogle);

module.exports = router;