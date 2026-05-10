const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'monkihub_secret_2025';

// Warn if using default secret in production
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  WARNING: Using default JWT_SECRET in production! Set JWT_SECRET environment variable.');
}

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    req.user = jwt.verify(header.split(' ')[1], SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

function requireSuperAdmin(req, res, next) {
  if (req.user?.role !== 'admin' || !req.user?.isSuperAdmin) {
    return res.status(403).json({ error: 'Super Admin access required' });
  }
  next();
}

module.exports = { authenticate, requireAdmin, requireSuperAdmin };
