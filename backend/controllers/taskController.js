const TaskModel = require('../models/TaskModel');
const LogModel = require('../models/LogModel');

const TaskController = {
  async getAll(req, res) {
    try {
      const tasks = req.user.role === 'admin'
        ? await TaskModel.findAll()
        : await TaskModel.findByAssignee(req.user.username);
      res.json(tasks);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async create(req, res) {
    try {
      const task = await TaskModel.create({ ...req.body, createdBy: req.user.username });
      await LogModel.create({ action: 'TASK_CREATED', actor: req.user.username, detail: `Task '${task.title}' created` });
      req.io.emit('task:new', task);
      res.status(201).json(task);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  async update(req, res) {
    try {
      const tasks = await TaskModel.findAll();
      const task = tasks.find(t => t.id === req.params.id);
      if (!task) return res.status(404).json({ error: 'Task not found' });

      if (req.user.role !== 'admin') {
        if (task.assignee !== req.user.username)
          return res.status(403).json({ error: 'You can only update tasks assigned to you' });
        // Users can only submit for review, not mark done directly
        if (req.body.status && req.body.status !== 'pending-review')
          return res.status(403).json({ error: 'Submit for review first' });
        req.body = {
          status: 'pending-review',
          proof: req.body.proof || '',
          proofName: req.body.proofName || '',
          submittedAt: new Date().toISOString()
        };
      }

      const updated = await TaskModel.update(req.params.id, req.body);
      await LogModel.create({ action: 'TASK_UPDATED', actor: req.user.username, detail: `Task '${updated.title}' updated to ${updated.status}` });
      req.io.emit('task:updated', updated);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  async submitReview(req, res) {
    try {
      const tasks = await TaskModel.findAll();
      const task = tasks.find(t => t.id === req.params.id);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      if (task.assignee !== req.user.username) return res.status(403).json({ error: 'Not your task' });
      if (!req.body.proof) return res.status(400).json({ error: 'Proof file is required' });

      const updated = await TaskModel.update(req.params.id, {
        status: 'pending-review',
        proof: req.body.proof,
        proofName: req.body.proofName || 'proof',
        submittedAt: new Date().toISOString(),
        rejectedReason: ''
      });
      await LogModel.create({ action: 'TASK_SUBMITTED', actor: req.user.username, detail: `Task '${task.title}' submitted for review` });
      req.io.emit('task:updated', updated);
      req.io.emit('task:review', updated);
      res.json(updated);
    } catch (err) { res.status(400).json({ error: err.message }); }
  },

  async approveTask(req, res) {
    try {
      const updated = await TaskModel.update(req.params.id, { status: 'done', rejectedReason: '' });
      await LogModel.create({ action: 'TASK_APPROVED', actor: req.user.username, detail: `Task '${updated.title}' approved and marked done` });
      req.io.emit('task:updated', updated);
      res.json(updated);
    } catch (err) { res.status(400).json({ error: err.message }); }
  },

  async rejectTask(req, res) {
    try {
      const updated = await TaskModel.update(req.params.id, {
        status: 'in-progress',
        proof: '',
        proofName: '',
        submittedAt: '',
        rejectedReason: req.body.reason || 'Rejected by admin'
      });
      await LogModel.create({ action: 'TASK_REJECTED', actor: req.user.username, detail: `Task '${updated.title}' rejected: ${req.body.reason || ''}` });
      req.io.emit('task:updated', updated);
      res.json(updated);
    } catch (err) { res.status(400).json({ error: err.message }); }
  },

  async delete(req, res) {
    try {
      await TaskModel.delete(req.params.id);
      await LogModel.create({ action: 'TASK_DELETED', actor: req.user.username, detail: `Task ${req.params.id} deleted` });
      req.io.emit('task:deleted', { id: req.params.id });
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
};

module.exports = TaskController;
