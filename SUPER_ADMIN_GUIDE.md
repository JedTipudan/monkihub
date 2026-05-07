# 🔐 Super Admin System

## Overview
MonkiHub now has a **Super Admin** role that can create other admins. Regular admins can manage tasks, users, and payments, but ONLY Super Admins can create new admin accounts.

---

## 🚀 Setup (One-Time)

### Step 1: Upgrade `admin` to Super Admin

Run this command **once** to make your existing `admin` user a Super Admin:

```bash
cd backend
node makeSuperAdmin.js
```

You should see:
```
✅ Successfully upgraded "admin" to Super Admin!
🔐 Super Admin can now create other admins from the User Manager panel.
```

### Step 2: Deploy to Render

```bash
git add .
git commit -m "Add Super Admin system"
git push origin main
```

Wait 2-3 minutes for Render to rebuild.

---

## 👑 How to Create Admins (Super Admin Only)

### From the Website:

1. **Login as `admin`** (the Super Admin)
2. Go to **Scripts Panel** (⚙️ in sidebar)
3. Find **"User Manager"** card
4. Click **"▶ Start"** button
5. You'll see a **"➕ Create New Admin"** form at the top (only visible to Super Admin)
6. Fill in:
   - Username
   - Password
   - Email
7. Click **"Create Admin"** button
8. Done! ✅

---

## 🔒 Permissions

| Role | Can Create Admins? | Can Manage Tasks? | Can Delete Users? | Can View Logs? |
|------|-------------------|-------------------|-------------------|----------------|
| **Super Admin** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Admin** | ❌ No | ✅ Yes | ✅ Yes | ✅ Yes |
| **User** | ❌ No | ❌ No | ❌ No | ❌ No |

---

## 🎯 Features

- **Super Admin Badge**: Super Admins have a ⭐ SUPER badge in the User Manager
- **Protected Accounts**: Cannot delete `admin` or your own account
- **Create Admin Form**: Only visible to Super Admins
- **API Protection**: `/api/auth/create-admin` endpoint requires Super Admin token

---

## 🛠️ Technical Details

### What Changed:

1. **UserModel.js**: Added `isSuperAdmin` field to user schema
2. **auth.js**: Added `requireSuperAdmin` middleware
3. **authRoutes.js**: Protected `/create-admin` endpoint with `requireSuperAdmin`
4. **app.js**: Added Create Admin form to User Manager (only shows for Super Admin)
5. **makeSuperAdmin.js**: Script to upgrade existing admin to Super Admin

### Database:

The `isSuperAdmin` field is stored in `users.xml`:
```xml
<user id="user-abc123">
  <username>admin</username>
  <role>admin</role>
  <isSuperAdmin>true</isSuperAdmin>
  ...
</user>
```

---

## ❓ FAQ

**Q: Can I have multiple Super Admins?**  
A: Yes! Just create a new admin and manually edit `users.xml` to set `<isSuperAdmin>true</isSuperAdmin>` for that user.

**Q: What if I lose Super Admin access?**  
A: Run `node makeSuperAdmin.js` again to restore Super Admin status to the `admin` user.

**Q: Can regular admins see the Create Admin form?**  
A: No, the form only appears for users with `isSuperAdmin: true`.

**Q: Can I demote a Super Admin?**  
A: Yes, edit `users.xml` and change `<isSuperAdmin>true</isSuperAdmin>` to `<isSuperAdmin>false</isSuperAdmin>`.

---

## 🐒 Made with ❤️ by MonkiHub Team
