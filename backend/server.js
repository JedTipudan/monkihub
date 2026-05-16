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
const { initKafka, subscribeInMemory, isKafkaAvailable, getTopic } = require('./services/brokerService');
const { initCloudinary } = require('./services/cloudinaryService');
const MessageModel = require('./models/MessageModel');
const LogModel = require('./models/LogModel');

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

  socket.on('disconnect', () => {
    if (socket.username && userSockets[socket.username]) {
      userSockets[socket.username].delete(socket.id);
    }
  });
});

// ══════════════════════════════════════════════════════
// ── Server Initialization ──
// ══════════════════════════════════════════════════════
async function startEmbeddedConsumer() {
  if (!isKafkaAvailable()) {
    // In-memory fallback: subscribe directly
    subscribeInMemory(async (raw) => {
      try {
        const msg = JSON.parse(raw);
        const saved = await MessageModel.create({ sender: msg.sender, receiver: msg.receiver, content: msg.content, room: msg.room });
        io.to(`user:${saved.receiver}`).emit('message:new', saved);
        io.to(`user:${saved.sender}`).emit('message:new', saved);
      } catch (err) { console.error('[EMBEDDED CONSUMER] Error:', err.message); }
    });
    console.log('✅ Embedded message consumer ready (in-memory mode)');
    return;
  }

  const { Kafka } = require('kafkajs');
  const KAFKA_BROKER = process.env.KAFKA_BROKER || '';
  const KAFKA_USERNAME = process.env.KAFKA_USERNAME || '';
  const KAFKA_PASSWORD = process.env.KAFKA_PASSWORD || '';
  const TOPIC = getTopic();
  const isLocal = KAFKA_BROKER.includes('localhost') || KAFKA_BROKER.includes('127.0.0.1');
  const kafkaConfig = { clientId: 'monkihub-embedded-consumer', brokers: [KAFKA_BROKER] };
  if (!isLocal && KAFKA_USERNAME && KAFKA_PASSWORD) {
    kafkaConfig.ssl = true;
    kafkaConfig.sasl = { mechanism: 'scram-sha-256', username: KAFKA_USERNAME, password: KAFKA_PASSWORD };
  }
  const kafka = new Kafka(kafkaConfig);
  const consumer = kafka.consumer({ groupId: 'monkihub-embedded-group' });
  try {
    await consumer.connect();
    await consumer.subscribe({ topic: TOPIC, fromBeginning: false });
    await consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const msg = JSON.parse(message.value.toString());
          const saved = await MessageModel.create({ sender: msg.sender, receiver: msg.receiver, content: msg.content, room: msg.room });
          io.to(`user:${saved.receiver}`).emit('message:new', saved);
          io.to(`user:${saved.sender}`).emit('message:new', saved);
          await LogModel.create({ action: 'MESSAGE_CONSUMED', actor: 'embedded-consumer', detail: `${msg.sender} → ${msg.receiver}` });
        } catch (err) { console.error('[EMBEDDED CONSUMER] Process error:', err.message); }
      }
    });
    console.log(`✅ Embedded Kafka consumer connected to topic: ${TOPIC}`);
  } catch (err) {
    console.error('⚠️  Embedded Kafka consumer failed, falling back to in-memory:', err.message);
    subscribeInMemory(async (raw) => {
      try {
        const msg = JSON.parse(raw);
        const saved = await MessageModel.create({ sender: msg.sender, receiver: msg.receiver, content: msg.content, room: msg.room });
        io.to(`user:${saved.receiver}`).emit('message:new', saved);
        io.to(`user:${saved.sender}`).emit('message:new', saved);
      } catch (e) { console.error('[EMBEDDED CONSUMER FALLBACK] Error:', e.message); }
    });
  }
}

initXmlFiles().then(async () => {
  await initKafka();
  await startEmbeddedConsumer();
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
