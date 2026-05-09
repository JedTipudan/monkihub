const { Kafka } = require('kafkajs');

const KAFKA_BROKER = process.env.KAFKA_BROKER || '';
const KAFKA_USERNAME = process.env.KAFKA_USERNAME || '';
const KAFKA_PASSWORD = process.env.KAFKA_PASSWORD || '';
const TOPIC = process.env.KAFKA_TOPIC || 'monkihub_messages';

let producer = null;
let kafkaAvailable = false;

// In-memory fallback
const inMemorySubscribers = [];

async function initKafka() {
  if (!KAFKA_BROKER || !KAFKA_USERNAME || !KAFKA_PASSWORD) {
    console.log('⚠️  Kafka env vars not set — using in-memory fallback');
    return;
  }

  try {
    const kafka = new Kafka({
      clientId: 'monkihub-server',
      brokers: [KAFKA_BROKER],
      ssl: true,
      sasl: { mechanism: 'scram-sha-256', username: KAFKA_USERNAME, password: KAFKA_PASSWORD },
    });

    producer = kafka.producer();
    await producer.connect();
    kafkaAvailable = true;
    console.log('✅ Kafka producer connected');
  } catch (err) {
    kafkaAvailable = false;
    producer = null;
    console.log('⚠️  Kafka unavailable — using in-memory fallback:', err.message);
  }
}

async function publishMessage(channel, payload) {
  const data = JSON.stringify(payload);

  if (kafkaAvailable && producer) {
    await producer.send({
      topic: TOPIC,
      messages: [{ key: channel, value: data }],
    });
  } else {
    // In-memory fallback: notify any in-process subscribers directly
    inMemorySubscribers.forEach(cb => cb(data));
  }
}

function subscribeInMemory(callback) {
  inMemorySubscribers.push(callback);
}

function isKafkaAvailable() { return kafkaAvailable; }
function getTopic() { return TOPIC; }

module.exports = { initKafka, publishMessage, subscribeInMemory, isKafkaAvailable, getTopic };
