const router = require('express').Router();
const LogController = require('../controllers/logController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', authenticate, requireAdmin, LogController.getAll);

module.exports = router;
