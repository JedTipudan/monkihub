const router = require('express').Router();
const TaskController = require('../controllers/taskController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', authenticate, TaskController.getAll);
router.post('/', authenticate, requireAdmin, TaskController.create);
router.put('/:id', authenticate, TaskController.update);
router.post('/:id/submit', authenticate, TaskController.submitReview);
router.post('/:id/approve', authenticate, requireAdmin, TaskController.approveTask);
router.post('/:id/reject', authenticate, requireAdmin, TaskController.rejectTask);
router.delete('/:id', authenticate, requireAdmin, TaskController.delete);

module.exports = router;
