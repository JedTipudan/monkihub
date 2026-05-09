const PaymentModel = require('../models/PaymentModel');
const TaskModel = require('../models/TaskModel');
const LogModel = require('../models/LogModel');

const PaymentController = {
  // User: submit payment request
  async submit(req, res) {
    try {
      const { method, accountName, accountNumber, amount, note } = req.body;

      // Validate amount
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount < 1) return res.status(400).json({ error: 'Amount must be at least ₱1' });
      if (parsedAmount > 50000) return res.status(400).json({ error: 'Amount cannot exceed ₱50,000 per request' });

      const all = await PaymentModel.findByUsername(req.user.username);

      // Block if pending request exists
      if (all.some(p => p.status === 'pending')) {
        return res.status(400).json({ error: 'You already have a pending payment request. Wait for it to be processed.' });
      }

      // Rate limit: max 5 requests per day
      const today = new Date().toDateString();
      const todayCount = all.filter(p => new Date(p.submittedAt).toDateString() === today).length;
      if (todayCount >= 5) {
        return res.status(429).json({ error: 'Daily limit reached. You can submit at most 5 payment requests per day.' });
      }

      const payment = await PaymentModel.create({
        username: req.user.username, method, accountName, accountNumber, amount: parsedAmount.toFixed(2), note
      });
      await LogModel.create({ action: 'PAYMENT_SUBMITTED', actor: req.user.username, detail: `${req.user.username} requested payment of ${amount} via ${method}` });
      req.io.emit('payment:new', payment);
      res.status(201).json(payment);
    } catch (err) { res.status(400).json({ error: err.message }); }
  },

  // Admin: get all payments with task stats per user
  async getAll(req, res) {
    try {
      const [payments, tasks] = await Promise.all([PaymentModel.findAll(), TaskModel.findAll()]);
      const taskStats = {};
      tasks.forEach(t => {
        if (!taskStats[t.assignee]) taskStats[t.assignee] = { total: 0, done: 0 };
        taskStats[t.assignee].total++;
        if (t.status === 'done') taskStats[t.assignee].done++;
      });
      const enriched = payments.map(p => ({ ...p, taskStats: taskStats[p.username] || { total: 0, done: 0 } }));
      res.json(enriched);
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  // User: get own payments
  async getMine(req, res) {
    try {
      const [payments, tasks] = await Promise.all([
        PaymentModel.findByUsername(req.user.username),
        TaskModel.findByAssignee(req.user.username)
      ]);
      const done = tasks.filter(t => t.status === 'done').length;
      res.json({ payments, taskStats: { total: tasks.length, done } });
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  // Admin: mark as paid (with optional proof of payment image)
  async markPaid(req, res) {
    try {
      const { proofOfPayment } = req.body;
      const updated = await PaymentModel.update(req.params.id, {
        status: 'paid', paidAt: new Date().toISOString(),
        paidBy: req.user.username, proofOfPayment: proofOfPayment || ''
      });
      await LogModel.create({ action: 'PAYMENT_PAID', actor: req.user.username, detail: `Payment ${req.params.id} marked as paid to ${updated.username}` });
      req.io.emit('payment:paid', updated);
      res.json(updated);
    } catch (err) { res.status(400).json({ error: err.message }); }
  },

  // Admin: reject payment request
  async reject(req, res) {
    try {
      const updated = await PaymentModel.update(req.params.id, { status: 'rejected' });
      await LogModel.create({ action: 'PAYMENT_REJECTED', actor: req.user.username, detail: `Payment ${req.params.id} rejected for ${updated.username}` });
      req.io.emit('payment:updated', updated);
      res.json(updated);
    } catch (err) { res.status(400).json({ error: err.message }); }
  },

  // Admin: delete payment record
  async remove(req, res) {
    try {
      await PaymentModel.delete(req.params.id);
      await LogModel.create({ action: 'PAYMENT_DELETED', actor: req.user.username, detail: `Payment ${req.params.id} deleted` });
      res.json({ success: true });
    } catch (err) { res.status(400).json({ error: err.message }); }
  }
};

module.exports = PaymentController;
