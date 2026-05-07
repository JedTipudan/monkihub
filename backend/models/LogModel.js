const { readXml, writeXml } = require('../services/xmlService');
const { v4: uuidv4 } = require('uuid');

const FILE = 'logs.xml';

function normalize(logs) {
  if (!logs) return [];
  return (Array.isArray(logs) ? logs : [logs]).map(l => ({
    id: l.$.id,
    action: l.action[0],
    actor: l.actor[0],
    detail: l.detail[0],
    timestamp: l.timestamp[0]
  }));
}

const LogModel = {
  async findAll() {
    const data = await readXml(FILE);
    return normalize(data.logs?.log);
  },

  async create({ action, actor, detail }) {
    if (!action || !actor) throw new Error('action and actor are required');

    const data = await readXml(FILE);
    if (!data.logs) data.logs = { log: [] };
    if (!Array.isArray(data.logs.log)) data.logs.log = data.logs.log ? [data.logs.log] : [];

    const newLog = {
      $: { id: `log-${uuidv4().slice(0, 8)}` },
      action: [action], actor: [actor],
      detail: [detail || ''], timestamp: [new Date().toISOString()]
    };
    data.logs.log.push(newLog);
    await writeXml(FILE, data);
    return normalize([newLog])[0];
  }
};

module.exports = LogModel;
