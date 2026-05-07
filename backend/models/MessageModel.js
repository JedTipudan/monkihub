const { readXml, writeXml } = require('../services/xmlService');
const { v4: uuidv4 } = require('uuid');

const FILE = 'messages.xml';

function normalize(messages) {
  if (!messages) return [];
  return (Array.isArray(messages) ? messages : [messages]).map(m => ({
    id: m.$.id,
    sender: m.sender[0],
    receiver: m.receiver[0],
    content: m.content[0],
    timestamp: m.timestamp[0],
    room: m.room[0]
  }));
}

const MessageModel = {
  async findAll() {
    const data = await readXml(FILE);
    return normalize(data.messages?.message);
  },

  async findByRoom(room) {
    const all = await this.findAll();
    return all.filter(m => m.room === room);
  },

  async findByConversation(userA, userB) {
    const all = await this.findAll();
    return all.filter(m =>
      (m.sender === userA && m.receiver === userB) ||
      (m.sender === userB && m.receiver === userA)
    );
  },

  async create({ sender, receiver = 'all', content, room = 'general' }) {
    if (!sender || !content) throw new Error('sender and content are required');

    const data = await readXml(FILE);
    if (!data.messages) data.messages = { message: [] };
    if (!Array.isArray(data.messages.message)) {
      data.messages.message = data.messages.message ? [data.messages.message] : [];
    }

    const newMsg = {
      $: { id: `msg-${uuidv4().slice(0, 8)}` },
      sender: [sender], receiver: [receiver], content: [content],
      timestamp: [new Date().toISOString()], room: [room]
    };
    data.messages.message.push(newMsg);
    await writeXml(FILE, data);
    return normalize([newMsg])[0];
  }
};

module.exports = MessageModel;
