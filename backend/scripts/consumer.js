/**
 * MonkiHub — Kafka Message Consumer
 * Subscribes to Kafka topic → saves to XML → delivers via Socket.IO
 * ⚠️  If this consumer is NOT running, messages will NOT be delivered or saved.
 */

require('dotenv').config();
const { Kafka } = require('kafkajs');
const { initXmlFiles } = require('../services/xmlService');
const MessageModel = require('../models/MessageModel');
const LogModel = require('../models/LogModel');
const { io: ioClient } = require('socket.io-client');

const KAFKA_BROKER   = process.env.KAFKA_BROKER   || '';
const KAFKA_USERNAME = process.env.KAFKA_USERNAME  || '';
const KAFKA_PASSWORD = process.env.KAFKA_PASSWORD  || '';
const TOPIC          = process.env.KAFKA_TOPIC     || 'monkihub_messages';
const SERVER_URL     = process.env.SERVER_URL      || 'http://localhost:3000';

let socket = null;

function connectSocket() {
  return new Promise((resolve) => {
    socket = ioClient(SERVER_URL, { reconnection: true });
    socket.on('connect', () => {
      console.log('🔌 Connected to MonkiHub server via Socket.IO, id:', socket.id);
      // Register as consumer so server knows who we are
      socket.emit('register', '__kafka_consumer__');
      resolve();
    });
    socket.on('disconnect', () => console.log('🔌 Disconnected from server, reconnecting...'));
    socket.on('connect_error', (e) => console.error('❌ Socket error:', e.message));
    setTimeout(resolve, 5000); // fallback if connect takes too long
  });
}

async function startConsumer() {
  await initXmlFiles();

  console.log('\n🐒 MonkiHub Kafka Consumer Started');
  console.log('====================================');

  if (!KAFKA_BROKER || !KAFKA_USERNAME || !KAFKA_PASSWORD) {
    console.log('⚠️  Kafka env vars missing — running in simulation mode\n');
    runSimulation();
    return;
  }

  // Connect socket first
  await connectSocket();

  const kafka = new Kafka({
    clientId: 'monkihub-consumer',
    brokers: [KAFKA_BROKER],
    ssl: true,
    sasl: { mechanism: 'scram-sha-256', username: KAFKA_USERNAME, password: KAFKA_PASSWORD },
  });

  const consumer = kafka.consumer({ groupId: 'monkihub-group' });

  try {
    await consumer.connect();
    console.log('✅ Connected to Kafka broker');
    await consumer.subscribe({ topic: TOPIC, fromBeginning: false });
    console.log(`👂 Subscribed to topic: ${TOPIC}\n`);

    await consumer.run({
      eachMessage: async ({ message }) => {
        await processMessage(message.value.toString());
      },
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Consumer stopping...');
      await consumer.disconnect();
      if (socket) socket.disconnect();
      process.exit(0);
    });

  } catch (err) {
    console.error('❌ Kafka connection failed:', err.message);
    runSimulation();
  }
}

async function processMessage(raw) {
  try {
    const msg = JSON.parse(raw);
    console.log(`\n📨 Message received from Kafka`);
    console.log(`   From : ${msg.sender} → To: ${msg.receiver}`);
    console.log(`   Text : "${msg.content}"`);

    // Save to messages.xml
    const saved = await MessageModel.create({
      sender:   msg.sender,
      receiver: msg.receiver,
      content:  msg.content,
      room:     msg.room,
    });
    console.log(`   💾 Saved to XML, id: ${saved.id}`);

    // Deliver via Socket.IO back to server
    if (socket && socket.connected) {
      socket.emit('consumer:deliver', saved);
      console.log(`   📡 Emitted consumer:deliver to server`);
    } else {
      console.log(`   ⚠️  Socket not connected, message saved but not delivered live`);
    }

    await LogModel.create({
      action: 'MESSAGE_CONSUMED',
      actor:  'kafka-consumer',
      detail: `Delivered: ${msg.sender} → ${msg.receiver}: "${msg.content.substring(0, 50)}"`,
    });

    console.log(`   ✅ Done\n`);
  } catch (err) {
    console.error('❌ Error processing message:', err.message);
  }
}

function runSimulation() {
  const samples = [
    { sender: 'admin', receiver: 'jed', room: 'admin:jed', content: 'Hey, sprint planning at 3pm!' },
    { sender: 'jed',   receiver: 'admin', room: 'admin:jed', content: 'On it!' },
  ];
  console.log('🔄 Simulating Kafka message processing...\n');
  let i = 0;
  const interval = setInterval(async () => {
    if (i >= samples.length) { clearInterval(interval); return; }
    await processMessage(JSON.stringify(samples[i++]));
  }, 1500);
}

startConsumer().catch(console.error);
