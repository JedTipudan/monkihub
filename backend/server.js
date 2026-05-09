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
const path = require('path');
const { initXmlFiles } = require('./services/xmlService');
const { initKafka } = require('./services/brokerService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Landing page as root
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/landing.html')));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Attach socket.io to requests
app.use((req, _res, next) => { req.io = io; next(); });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/xml', xmlRoutes);
app.use('/api/scripts', scriptRoutes);
app.use('/api/payments', paymentRoutes);

// Socket.IO real-time events
const userSockets = {};

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

// Initialize XML files + Kafka then start server
initXmlFiles().then(async () => {
  await initKafka();
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => console.log(`MonkiHub backend running on port ${PORT}`));
});
