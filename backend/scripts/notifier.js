/**
 * MonkiHub - Auto Notification Sender
 * Polls tasks.xml every 5 seconds.
 * - New tasks    → sends a message notification to all users
 * - Completed tasks → sends a completion notification
 * Run with: node scripts/notifier.js  (from within backend/)
 */

const { initXmlFiles } = require('../services/xmlService');
const TaskModel = require('../models/TaskModel');
const MessageModel = require('../models/MessageModel');
const LogModel = require('../models/LogModel');

const POLL_INTERVAL = 5000; // ms

// Track what we've already notified about
const notifiedNew = new Set();
const notifiedDone = new Set();

async function checkTasks() {
  try {
    const tasks = await TaskModel.findAll();

    for (const task of tasks) {
      // New task notification
      if (!notifiedNew.has(task.id)) {
        notifiedNew.add(task.id);
        // Skip tasks that already existed before this script started (first run)
        // We only notify on subsequent detections
        continue;
      }

      // Completed task notification
      if (task.status === 'done' && !notifiedDone.has(task.id)) {
        notifiedDone.add(task.id);
        const content = `✅ Task completed: "${task.title}" (assigned to @${task.assignee})`;
        await MessageModel.create({ sender: 'system', receiver: 'all', content, room: 'general' });
        await LogModel.create({ action: 'TASK_COMPLETED_NOTIFY', actor: 'notifier-script', detail: content });
        console.log(`[${new Date().toISOString()}] 🔔 Completion notified: "${task.title}"`);
      }
    }
  } catch (err) {
    console.error('Notifier error:', err.message);
  }
}

// Second pass — detect genuinely new tasks added after startup
const knownIds = new Set();

async function poll() {
  try {
    const tasks = await TaskModel.findAll();

    for (const task of tasks) {
      if (!knownIds.has(task.id)) {
        if (knownIds.size > 0) {
          const content = `📌 New task: "${task.title}" assigned to @${task.assignee} [${task.priority} priority]`;
          await MessageModel.create({ sender: 'system', receiver: 'all', content, room: 'general' });
          await LogModel.create({ action: 'TASK_NEW_NOTIFY', actor: 'notifier-script', detail: content });
          console.log(`[${new Date().toISOString()}] 🔔 New task notified: "${task.title}"`);
        }
        knownIds.add(task.id);
        notifiedNew.add(task.id);
      }

      if (task.status === 'done' && !notifiedDone.has(task.id)) {
        notifiedDone.add(task.id);
        const content = `✅ Task completed: "${task.title}" (assigned to @${task.assignee})`;
        await MessageModel.create({ sender: 'system', receiver: 'all', content, room: 'general' });
        await LogModel.create({ action: 'TASK_COMPLETED_NOTIFY', actor: 'notifier-script', detail: content });
        console.log(`[${new Date().toISOString()}] 🔔 Completion notified: "${task.title}"`);
      }
    }

    // Auto-stop when all tasks are done and there are tasks to track
    if (tasks.length > 0 && tasks.every(t => t.status === 'done')) {
      console.log(`[${new Date().toISOString()}] ✅ All tasks are done — notifier stopping automatically.`);
      await LogModel.create({ action: 'NOTIFIER_AUTO_STOP', actor: 'notifier-script', detail: 'All tasks completed, notifier stopped.' });
      process.exit(0);
    }
  } catch (err) {
    console.error('Notifier poll error:', err.message);
  }
}

async function start() {
  await initXmlFiles();
  console.log('\n🔔 MonkiHub Auto Notifier Started');
  console.log('==================================');
  console.log(`Polling tasks every ${POLL_INTERVAL / 1000}s...\n`);

  // Seed initial known state without notifying
  const initial = await TaskModel.findAll();
  initial.forEach(t => {
    knownIds.add(t.id);
    notifiedNew.add(t.id);
    if (t.status === 'done') notifiedDone.add(t.id);
  });
  console.log(`📋 Loaded ${initial.length} existing tasks (no notifications for these)\n`);

  setInterval(poll, POLL_INTERVAL);
}

start().catch(console.error);
