/**
 * Upload Controller
 * Handles image uploads to Cloudinary for various features
 */

const { uploadBase64, isCloudinaryAvailable } = require('../services/cloudinaryService');
const LogModel = require('../models/LogModel');

const UploadController = {
  /**
   * Upload avatar image (base64)
   */
  async uploadAvatar(req, res) {
    try {
      if (!isCloudinaryAvailable()) {
        return res.status(503).json({ 
          error: 'Image upload service unavailable. Internet connection required.' 
        });
      }

      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ error: 'No image data provided' });
      }

      // Validate base64 image
      if (!image.startsWith('data:image/')) {
        return res.status(400).json({ error: 'Invalid image format' });
      }

      const url = await uploadBase64(image, 'avatars');
      
      await LogModel.create({ 
        action: 'AVATAR_UPLOADED', 
        actor: req.user.username, 
        detail: `Avatar uploaded to cloud storage` 
      });

      res.json({ url });
    } catch (err) {
      console.error('Avatar upload error:', err.message);
      res.status(500).json({ 
        error: 'Failed to upload avatar. Check internet connection and try again.' 
      });
    }
  },

  /**
   * Upload task proof image (base64)
   */
  async uploadTaskProof(req, res) {
    try {
      if (!isCloudinaryAvailable()) {
        return res.status(503).json({ 
          error: 'Image upload service unavailable. Internet connection required.' 
        });
      }

      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ error: 'No image data provided' });
      }

      // Validate base64 image
      if (!image.startsWith('data:image/')) {
        return res.status(400).json({ error: 'Invalid image format' });
      }

      const url = await uploadBase64(image, 'task-proofs');
      
      await LogModel.create({ 
        action: 'TASK_PROOF_UPLOADED', 
        actor: req.user.username, 
        detail: `Task proof uploaded to cloud storage` 
      });

      res.json({ url });
    } catch (err) {
      console.error('Task proof upload error:', err.message);
      res.status(500).json({ 
        error: 'Failed to upload proof. Check internet connection and try again.' 
      });
    }
  },

  /**
   * Upload task reference image (base64)
   */
  async uploadTaskReference(req, res) {
    try {
      if (!isCloudinaryAvailable()) {
        return res.status(503).json({ 
          error: 'Image upload service unavailable. Internet connection required.' 
        });
      }

      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ error: 'No image data provided' });
      }

      // Validate base64 image
      if (!image.startsWith('data:image/')) {
        return res.status(400).json({ error: 'Invalid image format' });
      }

      const url = await uploadBase64(image, 'task-references');
      
      await LogModel.create({ 
        action: 'TASK_REFERENCE_UPLOADED', 
        actor: req.user.username, 
        detail: `Task reference image uploaded to cloud storage` 
      });

      res.json({ url });
    } catch (err) {
      console.error('Task reference upload error:', err.message);
      res.status(500).json({ 
        error: 'Failed to upload reference image. Check internet connection and try again.' 
      });
    }
  },

  /**
   * Upload payment proof image (base64)
   */
  async uploadPaymentProof(req, res) {
    try {
      if (!isCloudinaryAvailable()) {
        return res.status(503).json({ 
          error: 'Image upload service unavailable. Internet connection required.' 
        });
      }

      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ error: 'No image data provided' });
      }

      // Validate base64 image
      if (!image.startsWith('data:image/')) {
        return res.status(400).json({ error: 'Invalid image format' });
      }

      const url = await uploadBase64(image, 'payment-proofs');
      
      await LogModel.create({ 
        action: 'PAYMENT_PROOF_UPLOADED', 
        actor: req.user.username, 
        detail: `Payment proof uploaded to cloud storage` 
      });

      res.json({ url });
    } catch (err) {
      console.error('Payment proof upload error:', err.message);
      res.status(500).json({ 
        error: 'Failed to upload payment proof. Check internet connection and try again.' 
      });
    }
  },

  /**
   * Check if upload service is available
   */
  async checkAvailability(req, res) {
    const available = isCloudinaryAvailable();
    res.json({ 
      available,
      message: available 
        ? 'Image upload service is available' 
        : 'Image upload service unavailable. Configure Cloudinary credentials or check internet connection.'
    });
  }
};

module.exports = UploadController;
