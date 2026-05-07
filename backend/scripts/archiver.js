/**
 * MonkiHub - Auto Archiver
 * Runs every 60 seconds. Moves tasks and messages older than 7 days to archive.xml.
 * Run with: node scripts/archiver.js  (from within backend/)
 */

const fs = require('fs-extra');
const path = require('path');
const xml2js = require('xml2js');
const { initXmlFiles, readXml, writeXml } = require('../services/xmlService');
const LogModel = require('../models/LogModel');

const DATA_DIR = path.join(__dirname, '../data');
const ARCHIVE_FILE = path.join(DATA_DIR, 'archive.xml');
const ARCHIVE_AGE_DAYS = 7;
const POLL_INTERVAL = 60000; // ms

const parser = new xml2js.Parser();
const builder = new xml2js.Builder({ xmldec: { version: '1.0', encoding: 'UTF-8' } });

async function ensureArchive() {
  if (!(await fs.pathExists(ARCHIVE_FILE))) {
    await fs.writeFile(ARCHIVE_FILE, '<?xml version="1.0" encoding="UTF-8"?>\n<archive><tasks/><messages/></archive>', 'utf8');
  }
}

async function readArchive() {
  const raw = await fs.readFile(ARCHIVE_FILE, 'utf8');
  return parser.parseStringPromise(raw);
}

async function writeArchive(data) {
  await fs.writeFile(ARCHIVE_FILE, builder.buildObject(data), 'utf8');
}

function isOlderThan(isoDate, days) {
  return Date.now() - new Date(isoDate).getTime() > days * 24 * 60 * 60 * 1000;
}

async function archiveTasks() {
  const data = await readXml('tasks.xml');
  if (!data.tasks?.task) return 0;

  const tasks = Array.isArray(data.tasks.task) ? data.tasks.task : [data.tasks.task];
  const keep = [], archive = [];

  tasks.forEach(t => {
    if (isOlderThan(t.createdAt[0], ARCHIVE_AGE_DAYS)) archive.push(t);
    else keep.push(t);
  });

  if (!archive.length) return 0;

  data.tasks.task = keep;
  await writeXml('tasks.xml', data);

  const arch = await readArchive();
  if (!Array.isArray(arch.archive.tasks[0]?.task)) arch.archive.tasks = [{ task: [] }];
  arch.archive.tasks[0].task.push(...archive);
  await writeArchive(arch);

  return archive.length;
}

async function archiveMessages() {
  const data = await readXml('messages.xml');
  if (!data.messages?.message) return 0;

  const messages = Array.isArray(data.messages.message) ? data.messages.message : [data.messages.message];
  const keep = [], archive = [];

  messages.forEach(m => {
    if (isOlderThan(m.timestamp[0], ARCHIVE_AGE_DAYS)) archive.push(m);
    else keep.push(m);
  });

  if (!archive.length) return 0;

  data.messages.message = keep;
  await writeXml('messages.xml', data);

  const arch = await readArchive();
  if (!Array.isArray(arch.archive.messages[0]?.message)) arch.archive.messages = [{ message: [] }];
  arch.archive.messages[0].message.push(...archive);
  await writeArchive(arch);

  return archive.length;
}

async function runArchive() {
  try {
    const archivedTasks = await archiveTasks();
    const archivedMessages = await archiveMessages();
    const total = archivedTasks + archivedMessages;

    if (total > 0) {
      const detail = `Archived ${archivedTasks} task(s) and ${archivedMessages} message(s) older than ${ARCHIVE_AGE_DAYS} days`;
      await LogModel.create({ action: 'AUTO_ARCHIVE', actor: 'archiver-script', detail });
      console.log(`[${new Date().toISOString()}] 🗂  ${detail}`);
    } else {
      console.log(`[${new Date().toISOString()}] 🗂  Nothing to archive`);
    }
  } catch (err) {
    console.error('Archiver error:', err.message);
  }
}

async function start() {
  await initXmlFiles();
  await ensureArchive();
  console.log('\n🗂  MonkiHub Auto Archiver Started');
  console.log('===================================');
  console.log(`Archiving entries older than ${ARCHIVE_AGE_DAYS} days...\n`);

  await runArchive();
  console.log('\n✅ Archiver done — stopping automatically.');
  process.exit(0);
}

start().catch(console.error);
