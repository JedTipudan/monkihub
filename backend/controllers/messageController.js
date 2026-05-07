const MessageModel = require('../models/MessageModel');
const LogModel = require('../models/LogModel');
const { publishMessage } = require('../services/brokerService');

const MessageController = {
  async getAll(req, res) {
    try {
      const { room } = req.query;
      const messages = room ? await MessageModel.findByRoom(room) : await MessageModel.findAll();
      res.json(messages);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async getConversation(req, res) {
    try {
      const messages = await MessageModel.findByConversation(req.user.username, req.params.username);
      res.json(messages);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async send(req, res) {
    try {
      const { content, receiver } = req.body;
      if (!receiver) return res.status(400).json({ error: 'receiver is required' });
      if (!content || !content.trim()) return res.status(400).json({ error: 'content is required' });
      
      // DM room is a sorted pair so both sides share the same room key
      const room = [req.user.username, receiver].sort().join(':');
      const msg = await MessageModel.create({ sender: req.user.username, receiver, content, room });

      await publishMessage('monkihub:messages', msg);
      await LogModel.create({ action: 'MESSAGE_SENT', actor: req.user.username, detail: `DM to ${receiver}` });

      console.log('[MESSAGE] Sender:', req.user.username, 'Receiver:', receiver);
      console.log('[MESSAGE] Message:', JSON.stringify(msg));
      
      // Check if receiver is online
      const receiverSockets = req.io.sockets.adapter.rooms.get(`user:${receiver}`);
      const senderSockets = req.io.sockets.adapter.rooms.get(`user:${req.user.username}`);
      console.log('[MESSAGE] Receiver online?', receiverSockets ? `Yes (${receiverSockets.size} sockets)` : 'No');
      console.log('[MESSAGE] Sender online?', senderSockets ? `Yes (${senderSockets.size} sockets)` : 'No');
      
      // Emit to BOTH users' personal rooms
      req.io.to(`user:${receiver}`).emit('message:new', msg);
      req.io.to(`user:${req.user.username}`).emit('message:new', msg);
      
      console.log('[MESSAGE] Emitted to user:' + receiver + ' and user:' + req.user.username);

      res.status(201).json(msg);
    } catch (err) {
      console.error('[MESSAGE ERROR]', err);
      res.status(400).json({ error: err.message });
    }
  }
};

module.exports = MessageController;
