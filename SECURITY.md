# 🛡️ MonkiHub DDoS Protection & Security

## Overview

MonkiHub implements **multi-layered DDoS protection** and security measures to protect against various types of attacks including:
- Distributed Denial of Service (DDoS)
- Brute force attacks
- SQL injection
- XSS attacks
- Parameter pollution
- Request flooding
- Socket connection flooding

---

## 🔒 Security Layers

### 1. **Global Rate Limiting**
- **Limit**: 500 requests per 15 minutes per IP
- **Purpose**: Prevent request flooding
- **Response**: 429 Too Many Requests

### 2. **API Rate Limiting**
- **Limit**: 60 requests per minute per IP
- **Purpose**: Protect API endpoints from abuse
- **Applies to**: All `/api/*` routes

### 3. **Speed Limiter (Gradual Slowdown)**
- **Threshold**: 100 requests per 15 minutes
- **Delay**: 500ms added per request after threshold
- **Max Delay**: 5 seconds
- **Purpose**: Slow down aggressive clients without blocking

### 4. **Authentication Rate Limiting**
- **Limit**: 10 login/register attempts per 15 minutes
- **Purpose**: Prevent brute force attacks
- **Applies to**: `/api/auth/login`, `/api/auth/register`

### 5. **Account Creation Rate Limiting**
- **Limit**: 3 account creations per hour per IP
- **Purpose**: Prevent spam account creation
- **Applies to**: `/api/auth/register`

### 6. **Message Rate Limiting**
- **Limit**: 30 messages per minute
- **Purpose**: Prevent chat spam
- **Applies to**: `/api/messages`

### 7. **File Upload Rate Limiting**
- **Limit**: 50 uploads per hour
- **Purpose**: Prevent storage abuse
- **Applies to**: Task submissions with proof uploads

### 8. **Strict Rate Limiting (Sensitive Operations)**
- **Limit**: 20 requests per hour
- **Purpose**: Protect critical operations
- **Applies to**: Admin creation, user deletion

---

## 🚫 IP Blacklisting

### Auto-Blacklist System
- **Trigger**: 50 failed attempts within 1 hour
- **Duration**: 24 hours (auto-removed)
- **Tracked Events**:
  - Failed login attempts
  - Invalid credentials
  - Suspicious patterns detected
  - Rate limit violations

### Manual Blacklist
Admins can manually blacklist IPs by modifying the blacklist in the security middleware.

---

## 🔐 Security Headers (Helmet)

### Implemented Headers:
- **Content Security Policy (CSP)**: Prevents XSS attacks
- **HTTP Strict Transport Security (HSTS)**: Forces HTTPS
- **X-Content-Type-Options**: Prevents MIME sniffing
- **X-Frame-Options**: Prevents clickjacking
- **X-XSS-Protection**: Browser XSS filter
- **Hide X-Powered-By**: Hides Express.js signature

---

## 🛡️ Request Protection

### 1. **Request Size Limiting**
- **Max Size**: 10MB per request
- **Response**: 413 Payload Too Large
- **Purpose**: Prevent memory exhaustion

### 2. **HTTP Parameter Pollution (HPP) Protection**
- Prevents duplicate parameter attacks
- Sanitizes query strings and body parameters

### 3. **Suspicious Pattern Detection**
Blocks requests containing:
- `<script>` tags (XSS)
- `javascript:` protocol
- SQL injection patterns (`UNION SELECT`, `DROP TABLE`, etc.)
- Path traversal attempts (`../../`)
- `eval()` and `expression()` calls

---

## 🔌 Socket.IO Protection

### Connection Limits
- **Max Connections**: 10 per IP address
- **Purpose**: Prevent socket flooding
- **Message Size**: 5MB maximum
- **Ping Timeout**: 60 seconds
- **Ping Interval**: 25 seconds

---

## 📊 Security Monitoring

### Logged Events:
- Failed login attempts with IP
- Rate limit violations
- Suspicious pattern detections
- Slow requests (>5 seconds)
- IP blacklist additions/removals
- Socket connection limits reached

### Log Format:
```
[SECURITY] 429 - POST /api/auth/login - IP: 192.168.1.100 - Duration: 45ms
[RATE LIMIT] Auth limit exceeded for IP: 192.168.1.100
[SECURITY] IP blacklisted due to excessive failed attempts: 192.168.1.100
```

---

## 🚀 Rate Limit Headers

All rate-limited responses include headers:
```
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 499
X-RateLimit-Reset: 1640000000
Retry-After: 900
```

---

## 📋 Rate Limit Summary Table

| Endpoint | Limit | Window | Purpose |
|----------|-------|--------|---------|
| **Global** | 500 req | 15 min | Overall protection |
| **API** | 60 req | 1 min | API abuse prevention |
| **Login** | 10 attempts | 15 min | Brute force protection |
| **Register** | 3 accounts | 1 hour | Spam prevention |
| **Messages** | 30 messages | 1 min | Chat spam prevention |
| **Uploads** | 50 uploads | 1 hour | Storage abuse prevention |
| **Admin Ops** | 20 req | 1 hour | Critical operation protection |
| **Socket.IO** | 10 connections | Per IP | Connection flooding prevention |

---

## 🔧 Configuration

### Environment Variables
```env
# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX=500

# Security
MAX_REQUEST_SIZE=10485760  # 10MB
MAX_SOCKET_CONNECTIONS=10

# JWT
JWT_SECRET=your_secret_key_here
```

### Customizing Limits
Edit `backend/middleware/rateLimiter.js`:
```javascript
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Change window
  max: 500, // Change limit
  // ...
});
```

---

## 🧪 Testing DDoS Protection

### Test Rate Limiting
```bash
# Test global rate limit (500 requests)
for i in {1..600}; do curl http://localhost:3000/api/tasks; done

# Test auth rate limit (10 attempts)
for i in {1..15}; do curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"wrong"}'; done
```

### Expected Responses
After exceeding limits:
```json
{
  "error": "Too many requests from this IP, please try again later.",
  "retryAfter": "15 minutes"
}
```

---

## 🚨 Attack Response Workflow

```
1. Request arrives
   ↓
2. IP blacklist check → [BLOCKED if blacklisted]
   ↓
3. Request size check → [BLOCKED if >10MB]
   ↓
4. Suspicious pattern detection → [BLOCKED if malicious]
   ↓
5. Global rate limit → [BLOCKED if >500/15min]
   ↓
6. Speed limiter → [SLOWED if >100/15min]
   ↓
7. API rate limit → [BLOCKED if >60/min]
   ↓
8. Route-specific limit → [BLOCKED if exceeded]
   ↓
9. Request processed ✅
```

---

## 📈 Performance Impact

- **Minimal overhead**: ~2-5ms per request
- **Memory usage**: ~50MB for rate limit storage
- **CPU impact**: <1% on modern servers

---

## 🔄 Auto-Recovery

### IP Blacklist
- Auto-removed after 24 hours
- Attempt counter resets after 1 hour

### Rate Limits
- Windows reset automatically
- No manual intervention needed

---

## 🎯 Best Practices

1. **Monitor logs** regularly for attack patterns
2. **Adjust limits** based on legitimate traffic
3. **Use HTTPS** in production (Helmet enforces this)
4. **Set strong JWT_SECRET** in environment
5. **Enable firewall** at infrastructure level (Cloudflare, AWS WAF)
6. **Regular updates** of dependencies

---

## 🆘 Emergency Response

### Under Active Attack?

1. **Reduce rate limits** temporarily:
   ```javascript
   max: 100 // Instead of 500
   ```

2. **Enable stricter blacklisting**:
   ```javascript
   if (attempts.count > 10) { // Instead of 50
     blacklistedIPs.add(ip);
   }
   ```

3. **Check logs** for attack patterns:
   ```bash
   grep "RATE LIMIT" backend/data/logs.xml
   ```

4. **Use external DDoS protection**:
   - Cloudflare (recommended)
   - AWS Shield
   - Akamai

---

## 📚 Additional Resources

- [Express Rate Limit Docs](https://github.com/express-rate-limit/express-rate-limit)
- [Helmet.js Security](https://helmetjs.github.io/)
- [OWASP DDoS Prevention](https://owasp.org/www-community/attacks/Denial_of_Service)

---

**Made with 🛡️ by the MonkiHub Team**
