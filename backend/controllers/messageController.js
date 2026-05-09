const LogModel = require('../models/LogModel');
const { publishMessage, isKafkaAvailable, subscribeInMemory } = require('../services/brokerService');
const MessageModel = require('../models/MessageModel');
const { isConsumerRunning } = require('./scriptController');

// In-memory fallback: if Kafka is not available, consumer.js won't run,
// so we handle delivery directly here only in fallback mode.
let fallbackReady = false;
function initFallback(io) {
  if (fallbackReady) return;
  fallbackReady = true;
  subscribeInMemory(async (raw) => {
    try {
      const msg = JSON.parse(raw);
      const saved = await MessageModel.create({
        sender: msg.sender, receiver: msg.receiver,
        content: msg.content, room: msg.room,
      });
      io.to(`user:${saved.receiver}`).emit('message:new', saved);
      io.to(`user:${saved.sender}`).emit('message:new', saved);
    } catch (err) {
      console.error('[FALLBACK] Error:', err.message);
    }
  });
}

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

      const room = [req.user.username, receiver].sort().join(':');

      // Build the message payload (NOT saved yet — Kafka consumer saves it)
      const payload = {
        sender:    req.user.username,
        receiver,
        content:   content.trim(),
        room,
        timestamp: new Date().toISOString(),
      };

      if (isKafkaAvailable()) {
        // ── Kafka mode: only publish if consumer is running ──
        if (!isConsumerRunning()) {
          return res.status(503).json({ error: 'Consumer is offline. Start the Message Consumer script to send messages.' });
        }
        await publishMessage('monkihub_messages', payload);
        console.log(`[KAFKA] Published message from ${payload.sender} to topic`);
        await LogModel.create({ action: 'MESSAGE_PUBLISHED', actor: req.user.username, detail: `Message published to Kafka for ${receiver}` });
        res.status(202).json({ status: 'queued', message: 'Message sent to Kafka broker' });
      } else {
        // ── Fallback mode: in-memory broker, saves + delivers directly ──
        initFallback(req.io);
        await publishMessage('monkihub_messages', payload);
        await LogModel.create({ action: 'MESSAGE_SENT', actor: req.user.username, detail: `DM to ${receiver}` });
        res.status(201).json({ status: 'delivered', ...payload });
      }
    } catch (err) {
      console.error('[MESSAGE ERROR]', err);
      res.status(400).json({ error: err.message });
    }
  }
};

module.exports = MessageController;
