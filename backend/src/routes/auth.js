const express = require('express');
const router = express.Router();
const { register, login, refresh, logout, getMe } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  registerValidator,
  loginValidator,
  refreshValidator,
} = require('../validators');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication & session management
 */

router.post('/register', registerValidator, validate, register);
router.post('/login', loginValidator, validate, login);
router.post('/refresh', refreshValidator, validate, refresh);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);

module.exports = router;
