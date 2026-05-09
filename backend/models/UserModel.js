const { readXml, writeXml } = require('../services/xmlService');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const FILE = 'users.xml';

const UserModel = {
  async findAll() {
    const data = await readXml(FILE);
    const users = data.users?.user || [];
    return (Array.isArray(users) ? users : [users]).map(u => ({
      id: u.$.id, username: u.username[0], role: u.role[0], email: u.email[0],
      displayName: u.displayName?.[0] || '', avatar: u.avatar?.[0] || '', createdAt: u.createdAt[0],
      isSuperAdmin: u.isSuperAdmin?.[0] === 'true'
    }));
  },

  async findByUsername(username) {
    const data = await readXml(FILE);
    const users = data.users?.user || [];
    const list = Array.isArray(users) ? users : [users];
    return list.find(u => u.username[0] === username) || null;
  },

  async create({ username, password, role = 'user', email, isSuperAdmin = false }) {
    if (!username || !password || !email) throw new Error('username, password, email are required');
    const existing = await this.findByUsername(username);
    if (existing) throw new Error('Username already exists');

    const data = await readXml(FILE);
    if (!data.users) data.users = { user: [] };
    if (!Array.isArray(data.users.user)) data.users.user = data.users.user ? [data.users.user] : [];

    const hashed = await bcrypt.hash(password, 10);
    const newUser = {
      $: { id: `user-${uuidv4().slice(0, 8)}` },
      username: [username], password: [hashed], role: [role],
      email: [email], createdAt: [new Date().toISOString()],
      isSuperAdmin: [String(isSuperAdmin)]
    };
    data.users.user.push(newUser);
    await writeXml(FILE, data);
    return { id: newUser.$.id, username, role, email, isSuperAdmin };
  },

  async validatePassword(username, password) {
    const raw = await this.findByUsername(username);
    if (!raw) return null;
    const match = await bcrypt.compare(password, raw.password[0]);
    if (!match) return null;
    return {
      id: raw.$.id,
      username: raw.username[0],
      role: raw.role[0],
      isSuperAdmin: raw.isSuperAdmin?.[0] === 'true'
    };
  },

  async updateProfile(username, { displayName, avatar, email, password }) {
    const data = await readXml(FILE);
    const users = Array.isArray(data.users.user) ? data.users.user : [data.users.user];
    const idx = users.findIndex(u => u.username[0] === username);
    if (idx === -1) throw new Error('User not found');
    if (displayName !== undefined) users[idx].displayName = [displayName];
    if (avatar !== undefined) users[idx].avatar = [avatar];
    if (email !== undefined) users[idx].email = [email];
    if (password !== undefined) users[idx].password = [password];
    data.users.user = users;
    await writeXml(FILE, data);
    return {
      id: users[idx].$.id,
      username,
      role: users[idx].role[0],
      email: users[idx].email[0],
      displayName: users[idx].displayName?.[0] || '',
      avatar: users[idx].avatar?.[0] || '',
      isSuperAdmin: users[idx].isSuperAdmin?.[0] === 'true'
    };
  },

  async delete(username) {
    const data = await readXml(FILE);
    if (!data.users?.user) throw new Error('No users found');
    const users = Array.isArray(data.users.user) ? data.users.user : [data.users.user];
    const filtered = users.filter(u => u.username[0] !== username);
    if (filtered.length === users.length) throw new Error('User not found');
    data.users.user = filtered;
    await writeXml(FILE, data);
    return true;
  }
};

module.exports = UserModel;
