const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

// ══════════════════════════════════════════════════════
// ── Global Rate Limiter (All Requests) ──
// ══════════════════════════════════════════════════════
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log(`[RATE LIMIT] Global limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// ══════════════════════════════════════════════════════
// ── Authentication Rate Limiter (Login/Register) ──
// ══════════════════════════════════════════════════════
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login/register attempts per windowMs
  skipSuccessfulRequests: true, // Don't count successful requests
  message: {
    error: 'Too many authentication attempts, please try again after 15 minutes.',
    retryAfter: '15 minutes'
  },
  handler: (req, res) => {
    console.log(`[RATE LIMIT] Auth limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many authentication attempts. Please try again after 15 minutes.',
      retryAfter: '15 minutes'
    });
  }
});

// ══════════════════════════════════════════════════════
// ── Strict Rate Limiter (Sensitive Operations) ──
// ══════════════════════════════════════════════════════
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 requests per hour
  message: {
    error: 'Too many requests for this operation, please try again later.',
    retryAfter: '1 hour'
  },
  handler: (req, res) => {
    console.log(`[RATE LIMIT] Strict limit exceeded for IP: ${req.ip} on ${req.path}`);
    res.status(429).json({
      error: 'Too many requests for this operation. Please try again later.',
      retryAfter: '1 hour'
    });
  }
});

// ══════════════════════════════════════════════════════
// ── API Rate Limiter (General API Calls) ──
// ══════════════════════════════════════════════════════
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 requests per minute
  message: {
    error: 'Too many API requests, please slow down.',
    retryAfter: '1 minute'
  },
  handler: (req, res) => {
    console.log(`[RATE LIMIT] API limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many API requests. Please slow down.',
      retryAfter: '1 minute'
    });
  }
});

// ══════════════════════════════════════════════════════
// ── Speed Limiter (Gradual Slowdown) ──
// ══════════════════════════════════════════════════════
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 100, // Allow 100 requests per 15 minutes at full speed
  delayMs: 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 5000, // Maximum delay of 5 seconds
  onLimitReached: (req, res, options) => {
    console.log(`[SPEED LIMIT] Slowdown activated for IP: ${req.ip}`);
  }
});

// ══════════════════════════════════════════════════════
// ── Message/Chat Rate Limiter ──
// ══════════════════════════════════════════════════════
const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit to 30 messages per minute
  message: {
    error: 'You are sending messages too quickly. Please slow down.',
    retryAfter: '1 minute'
  },
  handler: (req, res) => {
    console.log(`[RATE LIMIT] Message limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'You are sending messages too quickly. Please slow down.',
      retryAfter: '1 minute'
    });
  }
});

// ══════════════════════════════════════════════════════
// ── File Upload Rate Limiter ──
// ══════════════════════════════════════════════════════
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit to 50 uploads per hour
  message: {
    error: 'Too many file uploads. Please try again later.',
    retryAfter: '1 hour'
  },
  handler: (req, res) => {
    console.log(`[RATE LIMIT] Upload limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many file uploads. Please try again later.',
      retryAfter: '1 hour'
    });
  }
});

// ══════════════════════════════════════════════════════
// ── Create Account Rate Limiter (Very Strict) ──
// ══════════════════════════════════════════════════════
const createAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Only 3 account creations per hour per IP
  message: {
    error: 'Too many accounts created from this IP. Please try again later.',
    retryAfter: '1 hour'
  },
  handler: (req, res) => {
    console.log(`[RATE LIMIT] Account creation limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many accounts created from this IP. Please try again later.',
      retryAfter: '1 hour'
    });
  }
});

module.exports = {
  globalLimiter,
  authLimiter,
  strictLimiter,
  apiLimiter,
  speedLimiter,
  messageLimiter,
  uploadLimiter,
  createAccountLimiter
};
