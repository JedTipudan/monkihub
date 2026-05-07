let redisClient = null;
let pubClient = null;
let subClient = null;
let redisAvailable = false;

// In-memory queue fallback when Redis is not available
const inMemoryQueue = [];
const subscribers = {};

async function initRedis() {
  try {
    const Redis = require('ioredis');
    pubClient = new Redis({ host: '127.0.0.1', port: 6379, connectTimeout: 2000, maxRetriesPerRequest: 0, lazyConnect: true });
    subClient = new Redis({ host: '127.0.0.1', port: 6379, connectTimeout: 2000, maxRetriesPerRequest: 0, lazyConnect: true });

    // Suppress unhandled error events — we handle them below
    pubClient.on('error', () => {});
    subClient.on('error', () => {});

    await pubClient.connect();
    await pubClient.ping();
    await subClient.connect();
    redisAvailable = true;
    console.log('✅ Redis connected');
  } catch {
    redisAvailable = false;
    if (pubClient) { pubClient.disconnect(); pubClient = null; }
    if (subClient) { subClient.disconnect(); subClient = null; }
    console.log('⚠️  Redis unavailable — using in-memory queue fallback');
  }
}

async function publishMessage(channel, payload) {
  const data = JSON.stringify(payload);
  if (redisAvailable && pubClient) {
    await pubClient.publish(channel, data);
  } else {
    inMemoryQueue.push({ channel, data });
    if (subscribers[channel]) subscribers[channel].forEach(cb => cb(data));
  }
}

async function subscribeToChannel(channel, callback) {
  if (redisAvailable && subClient) {
    await subClient.subscribe(channel);
    subClient.on('message', (ch, msg) => { if (ch === channel) callback(msg); });
  } else {
    if (!subscribers[channel]) subscribers[channel] = [];
    subscribers[channel].push(callback);
  }
}

function getQueue() { return inMemoryQueue; }
function isRedisAvailable() { return redisAvailable; }

module.exports = { initRedis, publishMessage, subscribeToChannel, getQueue, isRedisAvailable };
