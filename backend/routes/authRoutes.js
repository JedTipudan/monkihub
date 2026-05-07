const router = require('express').Router();
const AuthController = require('../controllers/authController');
const { authenticate, requireAdmin, requireSuperAdmin } = require('../middleware/auth');

router.post('/login', AuthController.login);
router.post('/register', AuthController.register);
router.post('/create-admin', authenticate, requireSuperAdmin, AuthController.createAdmin);
router.get('/users', authenticate, requireAdmin, AuthController.getUsers);
router.get('/list', authenticate, AuthController.getUsers);
router.delete('/users/:username', authenticate, requireAdmin, AuthController.deleteUser);
router.get('/profile', authenticate, AuthController.getProfile);
router.put('/profile', authenticate, AuthController.updateProfile);

module.exports = router;
