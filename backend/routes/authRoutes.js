const router = require('express').Router();
const AuthController = require('../controllers/authController');
const { authenticate, requireAdmin, requireSuperAdmin } = require('../middleware/auth');
const { authLimiter, createAccountLimiter, strictLimiter } = require('../middleware/rateLimiter');

router.post('/login', authLimiter, AuthController.login);
router.post('/register', createAccountLimiter, AuthController.register);
router.post('/create-admin', authenticate, requireSuperAdmin, strictLimiter, AuthController.createAdmin);
router.get('/users', authenticate, requireAdmin, AuthController.getUsers);
router.get('/list', authenticate, AuthController.getUsers);
router.delete('/users/:username', authenticate, requireAdmin, strictLimiter, AuthController.deleteUser);
router.get('/profile', authenticate, AuthController.getProfile);
router.put('/profile', authenticate, AuthController.updateProfile);

module.exports = router;
