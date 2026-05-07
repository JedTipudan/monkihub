const router = require('express').Router();
const ScriptController = require('../controllers/scriptController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/status', authenticate, requireAdmin, ScriptController.getStatus);
router.post('/start/:script', authenticate, requireAdmin, ScriptController.start);
router.post('/stop/:script', authenticate, requireAdmin, ScriptController.stop);
router.get('/report', authenticate, requireAdmin, ScriptController.getReport);

module.exports = router;
