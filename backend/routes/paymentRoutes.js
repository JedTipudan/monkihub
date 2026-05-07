const router = require('express').Router();
const PaymentController = require('../controllers/paymentController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.post('/', authenticate, PaymentController.submit);
router.get('/', authenticate, requireAdmin, PaymentController.getAll);
router.get('/mine', authenticate, PaymentController.getMine);
router.post('/:id/pay', authenticate, requireAdmin, PaymentController.markPaid);
router.post('/:id/reject', authenticate, requireAdmin, PaymentController.reject);
router.delete('/:id', authenticate, requireAdmin, PaymentController.remove);

module.exports = router;
