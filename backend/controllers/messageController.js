const LogModel = require('../models/LogModel');
const { publishMessage } = require('../services/brokerService');
const MessageModel = require('../models/MessageModel');
const fs = require('fs');
const path = require('path');

const WORDS_FILE = path.join(__dirname, '../data/bannedWords.json');

// ── Ban list (in-memory) ──
const bannedUsers = new Set();

// ── Word filter ── load from file, fall back to defaults
const DEFAULT_WORDS = [
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'damn', 'crap',
  'dick', 'pussy', 'cock', 'cunt', 'whore', 'slut', 'nigger', 'faggot'
];

function loadWords() {
  try {
    if (fs.existsSync(WORDS_FILE)) {
      return JSON.parse(fs.readFileSync(WORDS_FILE, 'utf8'));
    }
  } catch (e) { /* ignore, use defaults */ }
  return DEFAULT_WORDS;
}

function saveWords() {
  try {
    fs.writeFileSync(WORDS_FILE, JSON.stringify([...bannedWords]), 'utf8');
  } catch (e) { console.error('[WORD FILTER] Failed to save:', e.message); }
}

const bannedWords = new Set(loadWords());

function filterContent(text) {
  let filtered = text;
  bannedWords.forEach(word => {
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    filtered = filtered.replace(regex, '*'.repeat(word.length));
  });
  return filtered;
}

// ── Per-user cooldown: username → last send timestamp ──
const lastSentAt = new Map();
const COOLDOWN_MS = 5000;

// ── Bad word strike tracking ──
const badWordStrikes = new Map(); // username → strike count
const mutedUntil = new Map();     // username → timestamp when mute expires
const MAX_STRIKES = 3;
const MUTE_MS = 5 * 60 * 1000; // 5 minutes

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

      // ── Ban check ──
      if (bannedUsers.has(req.user.username)) {
        return res.status(403).json({ error: 'You have been banned from sending messages.' });
      }

      // ── Mute check ──
      const now = Date.now();
      const muteExpiry = mutedUntil.get(req.user.username) || 0;
      if (now < muteExpiry) {
        const secsLeft = Math.ceil((muteExpiry - now) / 1000);
        const minsLeft = Math.floor(secsLeft / 60);
        const s = secsLeft % 60;
        return res.status(403).json({ error: `You are muted for ${minsLeft}m ${s}s due to repeated bad language.` });
      }

      // ── Cooldown check (5 seconds) ──
      const last = lastSentAt.get(req.user.username) || 0;
      const remaining = COOLDOWN_MS - (now - last);
      if (remaining > 0) {
        return res.status(429).json({ error: `Please wait ${Math.ceil(remaining / 1000)}s before sending again.` });
      }
      lastSentAt.set(req.user.username, now);

      const room = [req.user.username, receiver].sort().join(':');
      const filtered = filterContent(content.trim());
      const hadBadWord = filtered !== content.trim();

      // ── Strike system ──
      let warning = null;
      if (hadBadWord) {
        // Find which bad words were used
        const usedWords = [];
        bannedWords.forEach(word => {
          const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
          if (regex.test(content.trim())) usedWords.push(word);
        });

        const strikes = (badWordStrikes.get(req.user.username) || 0) + 1;
        if (strikes >= MAX_STRIKES) {
          badWordStrikes.set(req.user.username, 0);
          mutedUntil.set(req.user.username, now + MUTE_MS);
          LogModel.create({ action: 'USER_MUTED', actor: 'system', detail: `${req.user.username} muted 5min after ${MAX_STRIKES} bad word strikes` });
          warning = { type: 'muted', message: `You used "${usedWords[0]}" — that was your 3rd warning. You are now muted for 5 minutes.` };
        } else {
          badWordStrikes.set(req.user.username, strikes);
          const left = MAX_STRIKES - strikes;
          LogModel.create({ action: 'BAD_WORD_STRIKE', actor: 'system', detail: `${req.user.username} strike ${strikes}/${MAX_STRIKES} — word: ${usedWords.join(', ')}` });
          warning = {
            type: 'strike',
            strikes,
            max: MAX_STRIKES,
            word: usedWords[0],
            message: `Warning! You used "${usedWords[0]}". ${left} more bad word${left > 1 ? 's' : ''} and you will be muted for 5 minutes.`
          };
        }
      }

      const payload = {
        sender:    req.user.username,
        receiver,
        content:   filtered,
        room,
        timestamp: new Date().toISOString(),
      };

      // Embedded consumer in server.js handles save + Socket.IO delivery for both Kafka and in-memory
      await publishMessage('monkihub_messages', payload);
      await LogModel.create({ action: 'MESSAGE_SENT', actor: req.user.username, detail: `DM to ${receiver}` });
      res.status(202).json({ status: 'queued', warning });
    } catch (err) {
      console.error('[MESSAGE ERROR]', err);
      res.status(400).json({ error: err.message });
    }
  },

  // ── Word filter management (super admin only) ──
  getWordFilter(req, res) {
    res.json({ words: [...bannedWords].sort() });
  },

  addWord(req, res) {
    const word = (req.body.word || '').trim().toLowerCase();
    if (!word) return res.status(400).json({ error: 'word is required' });
    if (word.length > 50) return res.status(400).json({ error: 'word too long' });
    bannedWords.add(word);
    saveWords();
    LogModel.create({ action: 'WORD_BANNED', actor: req.user.username, detail: `Added "${word}" to word filter` });
    res.json({ success: true, words: [...bannedWords].sort() });
  },

  removeWord(req, res) {
    const word = decodeURIComponent(req.params.word).toLowerCase();
    bannedWords.delete(word);
    saveWords();
    LogModel.create({ action: 'WORD_UNBANNED', actor: req.user.username, detail: `Removed "${word}" from word filter` });
    res.json({ success: true, words: [...bannedWords].sort() });
  },

  // ── Ban management (admin only) ──
  getBanned(req, res) {
    res.json({ banned: [...bannedUsers] });
  },

  banUser(req, res) {
    const { username } = req.params;
    if (!username) return res.status(400).json({ error: 'username required' });
    bannedUsers.add(username);
    LogModel.create({ action: 'USER_BANNED', actor: req.user.username, detail: `Banned ${username} from messaging` });
    res.json({ success: true, banned: username });
  },

  unbanUser(req, res) {
    const { username } = req.params;
    bannedUsers.delete(username);
    LogModel.create({ action: 'USER_UNBANNED', actor: req.user.username, detail: `Unbanned ${username}` });
    res.json({ success: true, unbanned: username });
  }
};

module.exports = MessageController;
