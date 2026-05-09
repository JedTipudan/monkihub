const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');
const LogModel = require('../models/LogModel');
const { trackFailedAttempt } = require('../middleware/security');

const SECRET = process.env.JWT_SECRET || 'monkihub_secret_2025'; // TODO: set JWT_SECRET env var in production

const AuthController = {
  async login(req, res) {
    try {
      const { username, password } = req.body;
      const user = await UserModel.validatePassword(username, password);
      if (!user) {
        // Track failed login attempt
        trackFailedAttempt(req.ip);
        await LogModel.create({ action: 'LOGIN_FAILED', actor: username || 'unknown', detail: `Failed login attempt from IP: ${req.ip}` });
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ id: user.id, username: user.username, role: user.role, isSuperAdmin: user.isSuperAdmin }, SECRET, { expiresIn: '24h' });
      await LogModel.create({ action: 'USER_LOGIN', actor: username, detail: `${username} logged in` });
      res.json({ token, user });
    } catch (err) {
      trackFailedAttempt(req.ip);
      res.status(500).json({ error: err.message });
    }
  },

  async register(req, res) {
    try {
      const user = await UserModel.create({ ...req.body, role: 'user' });
      await LogModel.create({ action: 'USER_REGISTERED', actor: user.username, detail: `New user ${user.username} registered` });
      res.status(201).json(user);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  async createAdmin(req, res) {
    try {
      const { username, password, email } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }
      const user = await UserModel.create({ username, password, email: email || `${username}@monkihub.com`, role: 'admin' });
      await LogModel.create({ action: 'ADMIN_CREATED', actor: req.user.username, detail: `Admin user "${username}" created by ${req.user.username}` });
      res.status(201).json({ success: true, user: { username: user.username, role: user.role } });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  async getUsers(req, res) {
    try {
      const users = await UserModel.findAll();
      const safe = req.user?.role === 'admin' ? users : users.map(({ id, username, role }) => ({ id, username, role }));
      res.json(safe);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async deleteUser(req, res) {
    try {
      const { username } = req.params;
      if (username === req.user.username) return res.status(403).json({ error: 'Cannot delete your own account' });

      const target = await UserModel.findByUsername(username);
      if (!target) return res.status(404).json({ error: 'User not found' });

      const targetRole = target.role[0];
      const targetIsSuperAdmin = target.isSuperAdmin?.[0] === 'true';

      // Protect the super admin account entirely
      if (targetIsSuperAdmin) return res.status(403).json({ error: 'Cannot delete the Super Admin account' });

      // Only super admin can delete other admins
      if (targetRole === 'admin' && !req.user.isSuperAdmin) {
        return res.status(403).json({ error: 'Only Super Admin can delete admin accounts' });
      }

      await UserModel.delete(username);
      await LogModel.create({ action: 'USER_DELETED', actor: req.user.username, detail: `User "${username}" deleted by ${req.user.username}` });
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  async getProfile(req, res) {
    try {
      const raw = await UserModel.findByUsername(req.user.username);
      if (!raw) return res.status(404).json({ error: 'User not found' });
      res.json({
        id: raw.$.id, username: raw.username[0], role: raw.role[0],
        email: raw.email[0], displayName: raw.displayName?.[0] || '',
        avatar: raw.avatar?.[0] || '', isSuperAdmin: raw.isSuperAdmin?.[0] === 'true'
      });
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  async updateProfile(req, res) {
    try {
      const { displayName, avatar, email, password } = req.body;
      const updateData = { displayName, avatar, email };
      
      // If password is provided, hash it
      if (password) {
        const bcrypt = require('bcryptjs');
        updateData.password = await bcrypt.hash(password, 10);
      }
      
      const updated = await UserModel.updateProfile(req.user.username, updateData);
      const detail = password 
        ? `${req.user.username} updated their profile and password`
        : `${req.user.username} updated their profile`;
      await LogModel.create({ action: 'PROFILE_UPDATED', actor: req.user.username, detail });
      res.json(updated);
    } catch (err) { res.status(400).json({ error: err.message }); }
  }
};

module.exports = AuthController;
