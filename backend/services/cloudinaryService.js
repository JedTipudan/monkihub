/**
 * Cloudinary Service
 * Handles cloud-based image storage using Cloudinary API
 * Only works when internet connection is available
 */

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Cloudinary configuration
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
const API_KEY = process.env.CLOUDINARY_API_KEY || '';
const API_SECRET = process.env.CLOUDINARY_API_SECRET || '';

let cloudinaryAvailable = false;

/**
 * Initialize Cloudinary configuration
 */
function initCloudinary() {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    console.log('⚠️  Cloudinary credentials not configured - image uploads will fail');
    console.log('   Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env');
    cloudinaryAvailable = false;
    return;
  }

  try {
    cloudinary.config({
      cloud_name: CLOUD_NAME,
      api_key: API_KEY,
      api_secret: API_SECRET,
      secure: true
    });
    cloudinaryAvailable = true;
    console.log('✅ Cloudinary configured successfully');
  } catch (err) {
    console.error('❌ Cloudinary configuration failed:', err.message);
    cloudinaryAvailable = false;
  }
}

/**
 * Check if Cloudinary is available
 */
function isCloudinaryAvailable() {
  return cloudinaryAvailable;
}

/**
 * Create Cloudinary storage for multer
 * @param {string} folder - Cloudinary folder name (e.g., 'avatars', 'tasks', 'payments')
 * @param {string[]} allowedFormats - Allowed file formats (e.g., ['jpg', 'png', 'gif'])
 */
function createCloudinaryStorage(folder, allowedFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp']) {
  if (!cloudinaryAvailable) {
    throw new Error('Cloudinary is not configured. Please set environment variables.');
  }

  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: `monkihub/${folder}`,
      allowed_formats: allowedFormats,
      transformation: [{ width: 1000, height: 1000, crop: 'limit' }], // Limit max size
      resource_type: 'auto'
    }
  });
}

/**
 * Create multer upload middleware for specific folder
 * @param {string} folder - Cloudinary folder name
 * @param {number} maxSize - Max file size in bytes (default: 5MB)
 */
function createUploadMiddleware(folder, maxSize = 5 * 1024 * 1024) {
  if (!cloudinaryAvailable) {
    // Return middleware that rejects uploads
    return (req, res, next) => {
      return res.status(503).json({ 
        error: 'Image upload service unavailable. Cloudinary is not configured or internet connection is required.' 
      });
    };
  }

  const storage = createCloudinaryStorage(folder);
  
  return multer({
    storage: storage,
    limits: {
      fileSize: maxSize
    },
    fileFilter: (req, file, cb) => {
      // Accept images only
      if (!file.mimetype.startsWith('image/')) {
        cb(new Error('Only image files are allowed'), false);
        return;
      }
      cb(null, true);
    }
  });
}

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public ID of the image
 */
async function deleteImage(publicId) {
  if (!cloudinaryAvailable) {
    throw new Error('Cloudinary is not available');
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (err) {
    console.error('Error deleting image from Cloudinary:', err.message);
    throw err;
  }
}

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary image URL
 * @returns {string|null} - Public ID or null if invalid URL
 */
function extractPublicId(url) {
  if (!url || typeof url !== 'string') return null;
  
  // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{format}
  const match = url.match(/\/v\d+\/(.+)\.\w+$/);
  return match ? match[1] : null;
}

/**
 * Upload base64 image to Cloudinary
 * @param {string} base64Data - Base64 encoded image data
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise<string>} - Cloudinary secure URL
 */
async function uploadBase64(base64Data, folder) {
  if (!cloudinaryAvailable) {
    throw new Error('Cloudinary is not configured. Internet connection required.');
  }

  try {
    const result = await cloudinary.uploader.upload(base64Data, {
      folder: `monkihub/${folder}`,
      transformation: [{ width: 1000, height: 1000, crop: 'limit' }],
      resource_type: 'auto'
    });
    return result.secure_url;
  } catch (err) {
    console.error('Error uploading base64 to Cloudinary:', err.message);
    throw new Error('Failed to upload image to cloud storage. Check internet connection.');
  }
}

module.exports = {
  initCloudinary,
  isCloudinaryAvailable,
  createUploadMiddleware,
  deleteImage,
  extractPublicId,
  uploadBase64,
  cloudinary
};
