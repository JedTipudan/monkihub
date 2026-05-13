const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const messageRoutes = require('./routes/messageRoutes');
const logRoutes = require('./routes/logRoutes');
const xmlRoutes = require('./routes/xmlRoutes');
const scriptRoutes = require('./routes/scriptRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const path = require('path');
const { initXmlFiles } = require('./services/xmlService');
const { initKafka } = require('./services/brokerService');
const { initCloudinary } = require('./services/cloudinaryService');

// ══════════════════════════════════════════════════════
// ── Security & Rate Limiting Middleware ──
// ══════════════════════════════════════════════════════
const {
  globalLimiter,
  speedLimiter,
  apiLimiter
} = require('./middleware/rateLimiter');

const {
  securityHeaders,
  parameterPollutionProtection,
  requestSizeLimiter,
  suspiciousPatternDetection,
  ipBlacklist,
  securityLogger,
  corsProtection
} = require('./middleware/security');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
  cors: { origin: '*' },
  maxHttpBufferSize: 5e6, // 5MB max message size
  pingTimeout: 60000,
  pingInterval: 25000
});

// ══════════════════════════════════════════════════════
// ── Apply Security Middleware (Order Matters!) ──
// ══════════════════════════════════════════════════════

// 1. Security headers (Helmet)
app.use(securityHeaders);

// 2. CORS protection
app.use(corsProtection);

// 3. Security logger
app.use(securityLogger);

// 4. IP blacklist check
app.use(ipBlacklist);

// 5. Request size limiter
app.use(requestSizeLimiter);

// 6. Body parser with size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 7. HTTP Parameter Pollution protection
app.use(parameterPollutionProtection);

// 8. Suspicious pattern detection
app.use(suspiciousPatternDetection);

// 9. Global rate limiter (all requests)
app.use(globalLimiter);

// 10. Speed limiter (gradual slowdown)
app.use(speedLimiter);

// 11. API-specific rate limiter
app.use('/api', apiLimiter);

// ══════════════════════════════════════════════════════
// ── Static Files & Routes ──
// ══════════════════════════════════════════════════════

// Landing page as root
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/landing.html')));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Attach socket.io to requests
app.use((req, _res, next) => { req.io = io; next(); });

// ══════════════════════════════════════════════════════
// ── API Routes ──
// ══════════════════════════════════════════════════════
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/xml', xmlRoutes);
app.use('/api/scripts', scriptRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/upload', uploadRoutes);

// ══════════════════════════════════════════════════════
// ── Error Handler ──
// ══════════════════════════════════════════════════════
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  
  // Don't leak error details in production
  const isDev = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: isDev ? err.message : 'Internal server error',
    ...(isDev && { stack: err.stack })
  });
});

// ══════════════════════════════════════════════════════
// ── Socket.IO Connection Limits ──
// ══════════════════════════════════════════════════════
const connectionCounts = new Map();
const MAX_CONNECTIONS_PER_IP = 10;
const userSockets = {};

io.use((socket, next) => {
  const ip = socket.handshake.address;
  const count = connectionCounts.get(ip) || 0;
  
  if (count >= MAX_CONNECTIONS_PER_IP) {
    console.log(`[SOCKET SECURITY] Too many connections from IP: ${ip}`);
    return next(new Error('Too many connections from this IP'));
  }
  
  connectionCounts.set(ip, count + 1);
  
  socket.on('disconnect', () => {
    const currentCount = connectionCounts.get(ip) || 0;
    if (currentCount > 0) {
      connectionCounts.set(ip, currentCount - 1);
    }
  });
  
  next();
});

// ══════════════════════════════════════════════════════
// ── Socket.IO Real-time Events ──
// ══════════════════════════════════════════════════════
io.on('connection', (socket) => {
  console.log('[SOCKET] Client connected:', socket.id);

  socket.on('register', (username) => {
    socket.username = username;
    if (!userSockets[username]) userSockets[username] = new Set();
    userSockets[username].add(socket.id);
    socket.join(`user:${username}`);
    console.log(`[REGISTER] ${username} joined room: user:${username}`);
  });

  socket.on('join', (room) => {
    socket.join(room);
  });

  // Kafka consumer connects here to deliver processed messages
  socket.on('consumer:deliver', (msg) => {
    console.log(`[CONSUMER:DELIVER] Delivering ${msg.sender} → ${msg.receiver}: "${msg.content}"`);
    io.to(`user:${msg.receiver}`).emit('message:new', msg);
    io.to(`user:${msg.sender}`).emit('message:new', msg);
    console.log(`[CONSUMER:DELIVER] Emitted to user:${msg.receiver} and user:${msg.sender}`);
  });

  socket.on('disconnect', () => {
    if (socket.username && userSockets[socket.username]) {
      userSockets[socket.username].delete(socket.id);
    }
  });
});

// ══════════════════════════════════════════════════════
// ── Server Initialization ──
// ══════════════════════════════════════════════════════
initXmlFiles().then(async () => {
  await initKafka();
  initCloudinary(); // Initialize Cloudinary for image uploads
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🐒 MonkiHub Backend Server`);
    console.log(`${'='.repeat(60)}`);
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🔒 Security features enabled:`);
    console.log(`   - Rate limiting (500 req/15min global)`);
    console.log(`   - DDoS protection with speed limiter`);
    console.log(`   - IP blacklisting (auto-ban after 50 failed attempts)`);
    console.log(`   - Request size limits (10MB max)`);
    console.log(`   - Suspicious pattern detection`);
    console.log(`   - Security headers (Helmet)`);
    console.log(`   - Socket.IO connection limits (10 per IP)`);
    console.log(`${'='.repeat(60)}\n`);
  });
});
