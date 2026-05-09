const helmet = require('helmet');
const hpp = require('hpp');

// ══════════════════════════════════════════════════════
// ── Security Headers (Helmet) ──
// ══════════════════════════════════════════════════════
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.socket.io"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:", "https:"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true,
  frameguard: { action: 'deny' }
});

// ══════════════════════════════════════════════════════
// ── HTTP Parameter Pollution Protection ──
// ══════════════════════════════════════════════════════
const parameterPollutionProtection = hpp();

// ══════════════════════════════════════════════════════
// ── Request Size Limiter ──
// ══════════════════════════════════════════════════════
const requestSizeLimiter = (req, res, next) => {
  const contentLength = req.headers['content-length'];
  const maxSize = 10 * 1024 * 1024; // 10MB max request size
  
  if (contentLength && parseInt(contentLength) > maxSize) {
    console.log(`[SECURITY] Request too large from IP: ${req.ip} (${contentLength} bytes)`);
    return res.status(413).json({
      error: 'Request entity too large. Maximum size is 10MB.'
    });
  }
  next();
};

// ══════════════════════════════════════════════════════
// ── Suspicious Pattern Detection ──
// ══════════════════════════════════════════════════════
const suspiciousPatternDetection = (req, res, next) => {
  // Use non-stateful patterns (no /g flag) to avoid lastIndex bug
  const suspiciousPatterns = [
    /<script[\s\S]*?<\/script>/i,
    /javascript:/i,
    /<iframe/i,
    /\.\.\/\.\.\//, // Path traversal
    /union[\s]+select/i, // SQL injection
    /drop[\s]+table/i,
  ];

  const checkString = JSON.stringify(req.body) + JSON.stringify(req.query) + JSON.stringify(req.params);

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(checkString)) {
      console.log(`[SECURITY] Suspicious pattern detected from IP: ${req.ip}, Path: ${req.path}`);
      return res.status(400).json({ error: 'Invalid request detected.' });
    }
  }

  next();
};

// ══════════════════════════════════════════════════════
// ── IP Blacklist (Simple Implementation) ──
// ══════════════════════════════════════════════════════
const blacklistedIPs = new Set();
const ipAttempts = new Map();

const ipBlacklist = (req, res, next) => {
  const ip = req.ip;
  
  if (blacklistedIPs.has(ip)) {
    console.log(`[SECURITY] Blocked request from blacklisted IP: ${ip}`);
    return res.status(403).json({
      error: 'Access denied. Your IP has been blocked due to suspicious activity.'
    });
  }
  
  next();
};

// Track failed attempts and auto-blacklist
const trackFailedAttempt = (ip) => {
  const attempts = ipAttempts.get(ip) || { count: 0, firstAttempt: Date.now() };
  attempts.count++;
  
  // Reset counter after 1 hour
  if (Date.now() - attempts.firstAttempt > 60 * 60 * 1000) {
    attempts.count = 1;
    attempts.firstAttempt = Date.now();
  }
  
  ipAttempts.set(ip, attempts);
  
  // Blacklist after 50 failed attempts in 1 hour
  if (attempts.count > 50) {
    blacklistedIPs.add(ip);
    console.log(`[SECURITY] IP blacklisted due to excessive failed attempts: ${ip}`);
    
    // Auto-remove from blacklist after 24 hours
    setTimeout(() => {
      blacklistedIPs.delete(ip);
      ipAttempts.delete(ip);
      console.log(`[SECURITY] IP removed from blacklist: ${ip}`);
    }, 24 * 60 * 60 * 1000);
  }
};

// ══════════════════════════════════════════════════════
// ── Request Logger (Security Monitoring) ──
// ══════════════════════════════════════════════════════
const securityLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Log suspicious activity
    if (res.statusCode === 429 || res.statusCode === 403 || res.statusCode === 401) {
      console.log(`[SECURITY] ${res.statusCode} - ${req.method} ${req.path} - IP: ${req.ip} - Duration: ${duration}ms`);
    }
    
    // Log slow requests (potential DoS)
    if (duration > 5000) {
      console.log(`[SECURITY] Slow request detected - ${req.method} ${req.path} - IP: ${req.ip} - Duration: ${duration}ms`);
    }
  });
  
  next();
};

// ══════════════════════════════════════════════════════
// ── CORS Protection ──
// ══════════════════════════════════════════════════════
const corsProtection = (req, res, next) => {
  const origin = req.headers.origin;
  // Allow same-origin and any origin (frontend is served from same server)
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
};

module.exports = {
  securityHeaders,
  parameterPollutionProtection,
  requestSizeLimiter,
  suspiciousPatternDetection,
  ipBlacklist,
  trackFailedAttempt,
  securityLogger,
  corsProtection
};
