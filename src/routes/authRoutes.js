const express = require('express');
const router = express.Router();
const { requestPasswordReset, resetPassword } = require('../controllers/authController');

// opcional: rate limit iría acá
router.post('/reset-password-request', requestPasswordReset);
router.post('/reset-password', resetPassword);

module.exports = router;