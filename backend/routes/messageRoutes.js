const router = require('express').Router();
const MessageController = require('../controllers/messageController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, MessageController.getAll);
router.get('/conversation/:username', authenticate, MessageController.getConversation);
router.post('/', authenticate, MessageController.send);

module.exports = router;
