const { readXml, writeXml } = require('../services/xmlService');
const { v4: uuidv4 } = require('uuid');

const FILE = 'tasks.xml';
const VALID_STATUSES = ['todo', 'in-progress', 'pending-review', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

function normalize(tasks) {
  if (!tasks) return [];
  return (Array.isArray(tasks) ? tasks : [tasks]).map(t => ({
    id: t.$.id,
    title: t.title[0],
    description: t.description[0],
    assignee: t.assignee[0],
    status: t.status[0],
    priority: t.priority[0],
    createdAt: t.createdAt[0],
    createdBy: t.createdBy[0],
    proof: t.proof?.[0] || '',
    proofName: t.proofName?.[0] || '',
    submittedAt: t.submittedAt?.[0] || '',
    rejectedReason: t.rejectedReason?.[0] || '',
    taskImage: t.taskImage?.[0] || ''
  }));
}

const TaskModel = {
  async findAll() {
    const data = await readXml(FILE);
    return normalize(data.tasks?.task);
  },

  async findById(id) {
    const all = await this.findAll();
    return all.find(t => t.id === id) || null;
  },

  async findByAssignee(username) {
    const all = await this.findAll();
    return all.filter(t => t.assignee === username);
  },

  async create({ title, description, assignee, status = 'todo', priority = 'medium', createdBy, taskImage = '' }) {
    if (!title || !assignee || !createdBy) throw new Error('title, assignee, createdBy are required');
    if (!VALID_STATUSES.includes(status)) throw new Error(`status must be one of: ${VALID_STATUSES.join(', ')}`);
    if (!VALID_PRIORITIES.includes(priority)) throw new Error(`priority must be one of: ${VALID_PRIORITIES.join(', ')}`);

    const data = await readXml(FILE);
    if (!data.tasks) data.tasks = { task: [] };
    if (!Array.isArray(data.tasks.task)) data.tasks.task = data.tasks.task ? [data.tasks.task] : [];

    const newTask = {
      $: { id: `task-${uuidv4().slice(0, 8)}` },
      title: [title], description: [description || ''], assignee: [assignee],
      status: [status], priority: [priority],
      createdAt: [new Date().toISOString()], createdBy: [createdBy],
      taskImage: [taskImage || '']
    };
    data.tasks.task.push(newTask);
    await writeXml(FILE, data);
    return normalize([newTask])[0];
  },

  async update(id, updates) {
    const data = await readXml(FILE);
    if (!data.tasks?.task) throw new Error('No tasks found');
    const tasks = Array.isArray(data.tasks.task) ? data.tasks.task : [data.tasks.task];
    const idx = tasks.findIndex(t => t.$.id === id);
    if (idx === -1) throw new Error('Task not found');

    const allowed = ['title', 'description', 'assignee', 'status', 'priority', 'proof', 'proofName', 'submittedAt', 'rejectedReason', 'taskImage'];
    allowed.forEach(k => { if (updates[k] !== undefined) tasks[idx][k] = [updates[k]]; });
    data.tasks.task = tasks;
    await writeXml(FILE, data);
    return normalize([tasks[idx]])[0];
  },

  async delete(id) {
    const data = await readXml(FILE);
    if (!data.tasks?.task) throw new Error('No tasks found');
    const tasks = Array.isArray(data.tasks.task) ? data.tasks.task : [data.tasks.task];
    const filtered = tasks.filter(t => t.$.id !== id);
    if (filtered.length === tasks.length) throw new Error('Task not found');
    data.tasks.task = filtered;
    await writeXml(FILE, data);
    return true;
  }
};

module.exports = TaskModel;
