const router = require('express').Router();
const MessageController = require('../controllers/messageController');
const { authenticate, requireAdmin, requireSuperAdmin } = require('../middleware/auth');
const { messageLimiter } = require('../middleware/rateLimiter');

router.get('/', authenticate, MessageController.getAll);
router.get('/conversation/:username', authenticate, MessageController.getConversation);
router.post('/', authenticate, messageLimiter, MessageController.send);

// Ban management (admin only)
router.get('/banned', authenticate, requireAdmin, MessageController.getBanned);
router.post('/ban/:username', authenticate, requireAdmin, MessageController.banUser);
router.post('/unban/:username', authenticate, requireAdmin, MessageController.unbanUser);

// Word filter (super admin only)
router.get('/wordfilter', authenticate, requireSuperAdmin, MessageController.getWordFilter);
router.post('/wordfilter', authenticate, requireSuperAdmin, MessageController.addWord);
router.delete('/wordfilter/:word', authenticate, requireSuperAdmin, MessageController.removeWord);

module.exports = router;
