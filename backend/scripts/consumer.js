/**
 * MonkiHub - Background Message Consumer Script
 * Listens to the message broker, processes messages, and logs activity.
 * Run with: node scripts/consumer.js  (from within the backend/ directory)
 */

const { initXmlFiles } = require('../services/xmlService');
const LogModel = require('../models/LogModel');

let redisAvailable = false;

async function startConsumer() {
  await initXmlFiles();
  console.log('\n🐒 MonkiHub Message Consumer Started');
  console.log('=====================================');

  try {
    const Redis = require('ioredis');
    const sub = new Redis({ host: '127.0.0.1', port: 6379, connectTimeout: 2000, maxRetriesPerRequest: 0, lazyConnect: true });
    sub.on('error', () => {});
    await sub.connect();
    await sub.ping();
    redisAvailable = true;
    console.log('✅ Connected to Redis broker');
    console.log('👂 Listening on channel: monkihub:messages\n');

    await sub.subscribe('monkihub:messages');
    sub.on('message', async (channel, rawMsg) => {
      await processMessage(channel, rawMsg);
    });

    sub.on('error', (err) => console.error('Redis error:', err.message));
  } catch {
    console.log('⚠️  Redis not available — running in simulation mode\n');
    runSimulation();
  }
}

async function processMessage(channel, rawMsg) {
  try {
    const msg = JSON.parse(rawMsg);
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 📨 Message received on ${channel}`);
    console.log(`   From: ${msg.sender} | Room: ${msg.room}`);
    console.log(`   Content: "${msg.content}"`);

    await LogModel.create({
      action: 'MESSAGE_CONSUMED',
      actor: 'consumer-script',
      detail: `Processed message from ${msg.sender} in #${msg.room}: "${msg.content.substring(0, 50)}"`
    });
    console.log(`   ✅ Logged to activity log\n`);
  } catch (err) {
    console.error('Error processing message:', err.message);
  }
}

function runSimulation() {
  const sampleMessages = [
    { id: 'sim-001', sender: 'alice', room: 'general', content: 'Hey team, sprint planning at 3pm!' },
    { id: 'sim-002', sender: 'bob', room: 'dev', content: 'PR #42 is ready for review' },
    { id: 'sim-003', sender: 'admin', room: 'general', content: 'Server maintenance tonight at 11pm' },
    { id: 'sim-004', sender: 'alice', room: 'dev', content: 'Fixed the XML parsing bug' },
    { id: 'sim-005', sender: 'bob', room: 'general', content: 'Great work everyone! 🎉' }
  ];

  console.log('🔄 Simulating message queue processing...\n');
  let index = 0;

  const interval = setInterval(async () => {
    if (index >= sampleMessages.length) {
      console.log('\n✅ Simulation complete. All messages processed and logged.');
      console.log('📄 Check data/logs.xml for activity records.');
      clearInterval(interval);
      return;
    }

    const msg = sampleMessages[index++];
    await processMessage('monkihub:messages', JSON.stringify(msg));
  }, 1500);
}

startConsumer().catch(console.error);
