const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');
const LogModel = require('../models/LogModel');

const SECRET = process.env.JWT_SECRET || 'monkihub_secret_2025'; // TODO: set JWT_SECRET env var in production

const AuthController = {
  async login(req, res) {
    try {
      const { username, password } = req.body;
      const user = await UserModel.validatePassword(username, password);
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });

      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET, { expiresIn: '24h' });
      await LogModel.create({ action: 'USER_LOGIN', actor: username, detail: `${username} logged in` });
      res.json({ token, user });
    } catch (err) {
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
      if (username === 'admin') return res.status(403).json({ error: 'Cannot delete the admin account' });
      if (username === req.user.username) return res.status(403).json({ error: 'Cannot delete your own account' });
      await UserModel.delete(username);
      await LogModel.create({ action: 'USER_DELETED', actor: req.user.username, detail: `User "${username}" deleted by admin` });
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
        avatar: raw.avatar?.[0] || ''
      });
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  async updateProfile(req, res) {
    try {
      const { displayName, avatar, email } = req.body;
      const updated = await UserModel.updateProfile(req.user.username, { displayName, avatar, email });
      await LogModel.create({ action: 'PROFILE_UPDATED', actor: req.user.username, detail: `${req.user.username} updated their profile` });
      res.json(updated);
    } catch (err) { res.status(400).json({ error: err.message }); }
  }
};

module.exports = AuthController;
