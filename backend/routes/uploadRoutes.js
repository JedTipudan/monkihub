/**
 * Upload Routes
 * API endpoints for image uploads to Cloudinary
 */

const router = require('express').Router();
const UploadController = require('../controllers/uploadController');
const { authenticate } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');

// All upload routes require authentication and rate limiting
router.use(authenticate);
router.use(uploadLimiter);

// Check if upload service is available
router.get('/check', UploadController.checkAvailability);

// Upload avatar image
router.post('/avatar', UploadController.uploadAvatar);

// Upload task proof image
router.post('/task-proof', UploadController.uploadTaskProof);

// Upload task reference image
router.post('/task-reference', UploadController.uploadTaskReference);

// Upload payment proof image
router.post('/payment-proof', UploadController.uploadPaymentProof);

module.exports = router;
