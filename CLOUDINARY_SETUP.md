# 📸 Cloudinary Integration Setup Guide

## Overview

MonkiHub now uses **Cloudinary** for cloud-based image storage. All uploaded images are stored online instead of locally, providing better scalability and reliability.

**⚠️ Important:** Cloudinary integration requires an active internet connection. Uploads will fail if offline.

---

## 🎯 Features Supported

1. **Profile Avatar Uploads** - User profile pictures
2. **Task Proof Uploads** - Proof-of-work submissions
3. **Task Reference Images** - Reference images for task assignments
4. **Payment Proof Screenshots** - Payment confirmation uploads

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Create Cloudinary Account

1. Go to: https://cloudinary.com/users/register/free
2. Sign up for a **free account** (no credit card required)
3. Verify your email address
4. Login to your Cloudinary dashboard

### Step 2: Get Your API Credentials

1. In Cloudinary dashboard, go to **Dashboard** (home page)
2. You'll see your credentials in the **Account Details** section:
   - **Cloud Name** (e.g., `dxyz123abc`)
   - **API Key** (e.g., `123456789012345`)
   - **API Secret** (e.g., `abcdefghijklmnopqrstuvwxyz`)

### Step 3: Configure MonkiHub

1. Open `backend/.env` file
2. Add your Cloudinary credentials:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

**Example:**
```env
CLOUDINARY_CLOUD_NAME=dxyz123abc
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz123
```

### Step 4: Install Dependencies

```bash
cd backend
npm install
```

This will install:
- `cloudinary` - Cloudinary SDK
- `multer` - File upload middleware
- `multer-storage-cloudinary` - Cloudinary storage for multer

### Step 5: Restart Server

```bash
npm start
```

You should see:
```
✅ Cloudinary configured successfully
```

---

## ✅ Verification

### Test Upload Service

1. Start the backend server
2. Open browser console
3. Run:
```javascript
fetch('http://localhost:3000/api/upload/check', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
})
.then(r => r.json())
.then(console.log)
```

Expected response:
```json
{
  "available": true,
  "message": "Image upload service is available"
}
```

### Test Image Upload

1. Login to MonkiHub
2. Go to Profile → Upload Avatar
3. Select an image
4. Click Save
5. Check if avatar displays correctly

---

## 📁 Cloudinary Folder Structure

Images are organized in Cloudinary folders:

```
monkihub/
├── avatars/           # User profile pictures
├── task-proofs/       # Proof-of-work submissions
├── task-references/   # Task reference images
└── payment-proofs/    # Payment confirmation screenshots
```

---

## 🔧 Technical Details

### Upload Flow

```
User selects image
    ↓
Frontend converts to base64
    ↓
Frontend sends to backend API
    ↓
Backend uploads to Cloudinary
    ↓
Cloudinary returns secure URL
    ↓
Backend saves URL to XML database
    ↓
Frontend displays image from Cloudinary URL
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/upload/check` | GET | Check if upload service is available |
| `/api/upload/avatar` | POST | Upload profile avatar |
| `/api/upload/task-proof` | POST | Upload task proof |
| `/api/upload/task-reference` | POST | Upload task reference image |
| `/api/upload/payment-proof` | POST | Upload payment proof |

### Request Format

```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

### Response Format

```json
{
  "url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/monkihub/avatars/abc123.jpg"
}
```

### Image Transformations

All uploaded images are automatically:
- **Resized** to max 1000x1000px (maintains aspect ratio)
- **Optimized** for web delivery
- **Secured** with HTTPS URLs

---

## 🛡️ Security Features

### Rate Limiting

- **50 uploads per hour** per IP address
- Prevents abuse and excessive usage

### File Validation

- **Image files only** (JPEG, PNG, GIF, WebP)
- **Max file size:** 5MB per upload
- **Base64 validation** before upload

### Authentication

- All upload endpoints require **JWT authentication**
- Only authenticated users can upload images

---

## 🆘 Troubleshooting

### Error: "Cloudinary is not configured"

**Solution:**
1. Check if `.env` file exists in `backend/` folder
2. Verify all three credentials are set:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
3. Restart the server

### Error: "Failed to upload image. Check internet connection"

**Solution:**
1. Verify internet connection is active
2. Check if Cloudinary service is accessible: https://status.cloudinary.com
3. Verify API credentials are correct

### Error: "Too many file uploads"

**Solution:**
- Wait 1 hour (rate limit: 50 uploads/hour)
- Or contact admin to adjust rate limits

### Images not displaying

**Solution:**
1. Check browser console for errors
2. Verify Cloudinary URLs are accessible
3. Check if images exist in Cloudinary dashboard
4. Clear browser cache

---

## 💰 Cloudinary Free Tier Limits

Cloudinary free account includes:

- **25 GB** storage
- **25 GB** monthly bandwidth
- **25,000** transformations/month
- **Unlimited** uploads

**This is more than enough for most projects!**

---

## 🔄 Migration from Local Storage

If you have existing base64 images in XML files:

1. Images will continue to display (backward compatible)
2. New uploads will use Cloudinary
3. Old images can be migrated manually if needed

---

## 📊 Monitoring Usage

### View Upload Statistics

1. Login to Cloudinary dashboard
2. Go to **Media Library**
3. Browse folders: `monkihub/avatars`, `monkihub/task-proofs`, etc.
4. Check **Reports** for usage statistics

### Delete Old Images

1. Go to **Media Library**
2. Select images to delete
3. Click **Delete**
4. Frees up storage space

---

## 🎓 For Academic Presentation

### Key Points to Mention:

1. **Cloud-Based Storage**
   - Images stored on Cloudinary servers
   - Not stored locally on server
   - Reduces server storage requirements

2. **Scalability**
   - Can handle thousands of images
   - Automatic CDN delivery
   - Fast image loading worldwide

3. **Security**
   - HTTPS secure URLs
   - API key authentication
   - Rate limiting protection

4. **Integration**
   - RESTful API integration
   - Multer middleware for file handling
   - Base64 to Cloudinary upload

5. **Error Handling**
   - Internet connection checks
   - Graceful error messages
   - Fallback behavior

---

## 📝 Code Structure

### Backend Files

```
backend/
├── services/
│   └── cloudinaryService.js      # Cloudinary SDK wrapper
├── controllers/
│   └── uploadController.js       # Upload API handlers
├── routes/
│   └── uploadRoutes.js           # Upload API routes
└── middleware/
    └── rateLimiter.js            # Upload rate limiting
```

### Frontend Integration

```javascript
// Upload helper function
async function uploadToCloudinary(base64Image, type) {
  const response = await apiCall('POST', `/upload/${type}`, { 
    image: base64Image 
  });
  return response.url;
}

// Usage example
const cloudinaryUrl = await uploadToCloudinary(base64Image, 'avatar');
```

---

## 🔗 Useful Links

- **Cloudinary Dashboard:** https://cloudinary.com/console
- **Cloudinary Documentation:** https://cloudinary.com/documentation
- **API Reference:** https://cloudinary.com/documentation/image_upload_api_reference
- **Status Page:** https://status.cloudinary.com

---

## ✅ Checklist

Before deploying to production:

- [ ] Cloudinary account created
- [ ] API credentials added to `.env`
- [ ] Dependencies installed (`npm install`)
- [ ] Server restarted
- [ ] Upload service tested
- [ ] All image types tested (avatar, task proof, etc.)
- [ ] Error handling verified
- [ ] Rate limiting tested
- [ ] Documentation reviewed

---

## 🎉 Success!

Your MonkiHub project now has cloud-based image storage powered by Cloudinary!

**Benefits:**
- ✅ Scalable image storage
- ✅ Fast CDN delivery
- ✅ Automatic optimization
- ✅ Professional image management
- ✅ Production-ready solution

---

*Last updated: May 13, 2026*
