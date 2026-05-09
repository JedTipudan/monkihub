# 📦 MonkiHub Deployment & Data Persistence Guide

## ⚠️ Important: Data Persistence Issue

### The Problem
When you push code changes to GitHub and Render redeploys, **all user accounts and data get reset** because:
1. XML data files were tracked in Git
2. Every deployment replaces files with what's in the repository
3. Production data gets overwritten with empty/default files

### ✅ The Solution (Implemented)
We've now **excluded XML data files from Git** so they persist between deployments.

---

## 🔧 What Was Changed

### 1. Updated `.gitignore`
```gitignore
# Exclude data files but keep structure
backend/data/*.xml
!backend/data/.gitkeep

# Exclude uploaded files
backend/uploads/

# Exclude temporary files
temp_*.html
.vscode/
```

### 2. Removed XML Files from Git Tracking
```bash
git rm --cached backend/data/*.xml
```

This removes files from Git but **keeps them locally and on the server**.

### 3. Added `.gitkeep`
Created `backend/data/.gitkeep` to ensure the directory exists in Git.

---

## 🚀 How It Works Now

### **First Deployment (Fresh Server)**
1. Render clones your repository
2. `backend/data/` directory exists (via `.gitkeep`)
3. Server starts → `initXmlFiles()` runs
4. Creates empty XML files
5. Seeds default admin user (`admin`/`admin`)

### **Subsequent Deployments (After Users Created)**
1. You push code changes to GitHub
2. Render redeploys
3. **XML files are NOT in Git** → they persist on server
4. Server restarts with existing data intact
5. All user accounts remain ✅

---

## 📊 Data Persistence Comparison

| Scenario | Before Fix | After Fix |
|----------|-----------|-----------|
| Push code changes | ❌ Data lost | ✅ Data persists |
| Create new users | ❌ Lost on redeploy | ✅ Kept forever |
| Update tasks | ❌ Lost on redeploy | ✅ Kept forever |
| Send messages | ❌ Lost on redeploy | ✅ Kept forever |

---

## 🔄 Migration Steps (One-Time)

### Step 1: Commit the Changes
```bash
git add .gitignore backend/data/.gitkeep
git commit -m "Fix: Exclude XML data files from Git for persistence"
git push origin main
```

### Step 2: On Render (After Deployment)
The XML files on your Render server will now persist between deployments!

### Step 3: Verify
1. Create a test user account on your live site
2. Push a small code change (e.g., update README)
3. Wait for Render to redeploy
4. Check if test user still exists ✅

---

## 🗄️ Data Storage Architecture

```
Production Server (Render)
├── /opt/render/project/src/
│   ├── backend/
│   │   ├── data/              ← Persistent directory
│   │   │   ├── users.xml      ← NOT in Git (persists)
│   │   │   ├── tasks.xml      ← NOT in Git (persists)
│   │   │   ├── messages.xml   ← NOT in Git (persists)
│   │   │   ├── payments.xml   ← NOT in Git (persists)
│   │   │   ├── logs.xml       ← NOT in Git (persists)
│   │   │   └── .gitkeep       ← IN Git (ensures dir exists)
│   │   ├── server.js          ← IN Git
│   │   └── ...
```

---

## 🛡️ Backup Strategy

### Automatic Backups (Recommended)
Since XML files are now persistent on Render, you should implement backups:

#### Option 1: Manual Backup Script
Create `backend/scripts/backup.js`:
```javascript
const fs = require('fs-extra');
const path = require('path');

async function backup() {
  const dataDir = path.join(__dirname, '../data');
  const backupDir = path.join(__dirname, '../backups', new Date().toISOString().split('T')[0]);
  await fs.copy(dataDir, backupDir);
  console.log(`✅ Backup created: ${backupDir}`);
}

backup();
```

Run manually:
```bash
node backend/scripts/backup.js
```

#### Option 2: Download Data via API
Add a backup endpoint (admin only):
```javascript
// In backend/routes/backupRoutes.js
router.get('/download', authenticate, requireAdmin, async (req, res) => {
  const archiver = require('archiver');
  const archive = archiver('zip');
  
  res.attachment('monkihub-backup.zip');
  archive.pipe(res);
  archive.directory('backend/data/', false);
  archive.finalize();
});
```

#### Option 3: Cloud Storage (Best)
Use AWS S3, Google Cloud Storage, or similar:
```javascript
// Backup to S3 daily
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

async function backupToS3() {
  const files = await fs.readdir('backend/data');
  for (const file of files) {
    const content = await fs.readFile(`backend/data/${file}`);
    await s3.putObject({
      Bucket: 'monkihub-backups',
      Key: `${new Date().toISOString()}/${file}`,
      Body: content
    }).promise();
  }
}
```

---

## 🔍 Troubleshooting

### Issue: Data Still Gets Reset
**Cause**: XML files are still in Git history  
**Solution**: 
```bash
# Remove from Git completely
git rm --cached backend/data/*.xml
git commit -m "Remove XML files from tracking"
git push origin main
```

### Issue: "Directory not found" error
**Cause**: `backend/data/` doesn't exist  
**Solution**: The `.gitkeep` file ensures it exists. If missing:
```bash
mkdir backend/data
touch backend/data/.gitkeep
git add backend/data/.gitkeep
git commit -m "Add data directory"
git push origin main
```

### Issue: Admin user not created on first deploy
**Cause**: `initXmlFiles()` not running  
**Solution**: Check Render logs for errors. Manually create:
```bash
# On Render shell
cd backend
node -e "require('./services/xmlService').initXmlFiles()"
```

---

## 📝 Best Practices

### ✅ DO:
- Keep XML files out of Git (already done)
- Implement regular backups
- Monitor disk usage on Render
- Use environment variables for sensitive data
- Test locally before deploying

### ❌ DON'T:
- Commit XML files to Git
- Store sensitive data in XML without encryption
- Rely solely on server storage (always backup)
- Delete `backend/data/.gitkeep`

---

## 🎯 Summary

### What Changed:
1. ✅ XML data files excluded from Git
2. ✅ Data persists between deployments
3. ✅ User accounts no longer reset
4. ✅ `.gitkeep` maintains directory structure

### What You Need to Do:
1. Commit and push the changes (see Step 1 above)
2. Wait for Render to redeploy
3. Verify data persists after next deployment
4. (Optional) Implement backup strategy

### Result:
🎉 **Your MonkiHub data now persists forever!** Users can create accounts, and they'll remain even when you push code updates.

---

## 🆘 Need Help?

If data still resets after following this guide:
1. Check Render logs for errors
2. Verify `.gitignore` is working: `git status` should NOT show XML files
3. Ensure `initXmlFiles()` runs on startup
4. Contact Render support if disk is being wiped

---

**Made with 💾 by the MonkiHub Team**
