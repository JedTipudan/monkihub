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
const userSockets = {}; // username -> Set of socket ids

io.on('connection', (socket) => {
  console.log('[SOCKET] Client connected:', socket.id);

  socket.on('register', (username) => {
    socket.username = username;
    if (!userSockets[username]) userSockets[username] = new Set();
    userSockets[username].add(socket.id);
    socket.join(`user:${username}`);
    console.log(`[REGISTER] ${username} registered socket ${socket.id}, joined room: user:${username}`);
    console.log(`[REGISTER] Active users:`, Object.keys(userSockets));
  });

  socket.on('join', (room) => {
    socket.join(room);
    console.log(`[JOIN] Socket ${socket.id} (${socket.username || 'unknown'}) joined room: ${room}`);
  });

  socket.on('disconnect', () => {
    if (socket.username && userSockets[socket.username]) {
      userSockets[socket.username].delete(socket.id);
      console.log(`[DISCONNECT] ${socket.username} disconnected, socket ${socket.id}`);
    } else {
      console.log('[DISCONNECT] Unknown client disconnected:', socket.id);
    }
  });
});

// Initialize XML data files then start server
initXmlFiles().then(() => {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => console.log(`MonkiHub backend running on port ${PORT}`));
});
