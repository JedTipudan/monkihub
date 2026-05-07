const { readXml, writeXml } = require('../services/xmlService');
const { v4: uuidv4 } = require('uuid');

const FILE = 'payments.xml';

function normalize(payments) {
  if (!payments) return [];
  return (Array.isArray(payments) ? payments : [payments]).map(p => ({
    id: p.$.id,
    username: p.username[0],
    method: p.method[0],
    accountName: p.accountName[0],
    accountNumber: p.accountNumber[0],
    amount: p.amount[0],
    note: p.note?.[0] || '',
    status: p.status[0],
    submittedAt: p.submittedAt[0],
    paidAt: p.paidAt?.[0] || '',
    paidBy: p.paidBy?.[0] || '',
    proofOfPayment: p.proofOfPayment?.[0] || ''
  }));
}

const PaymentModel = {
  async findAll() {
    const data = await readXml(FILE);
    return normalize(data.payments?.payment);
  },

  async findByUsername(username) {
    const all = await this.findAll();
    return all.filter(p => p.username === username);
  },

  async create({ username, method, accountName, accountNumber, amount, note }) {
    if (!username || !method || !accountName || !accountNumber || !amount)
      throw new Error('All payment fields are required');

    const data = await readXml(FILE);
    if (!data.payments) data.payments = { payment: [] };
    if (!Array.isArray(data.payments.payment))
      data.payments.payment = data.payments.payment ? [data.payments.payment] : [];

    const newPayment = {
      $: { id: `pay-${uuidv4().slice(0, 8)}` },
      username: [username], method: [method],
      accountName: [accountName], accountNumber: [accountNumber],
      amount: [amount], note: [note || ''],
      status: ['pending'], submittedAt: [new Date().toISOString()],
      paidAt: [''], paidBy: [''], proofOfPayment: ['']
    };
    data.payments.payment.push(newPayment);
    await writeXml(FILE, data);
    return normalize([newPayment])[0];
  },

  async update(id, updates) {
    const data = await readXml(FILE);
    if (!data.payments?.payment) throw new Error('No payments found');
    const payments = Array.isArray(data.payments.payment) ? data.payments.payment : [data.payments.payment];
    const idx = payments.findIndex(p => p.$.id === id);
    if (idx === -1) throw new Error('Payment not found');
    const allowed = ['status', 'paidAt', 'paidBy', 'proofOfPayment', 'amount', 'note'];
    allowed.forEach(k => { if (updates[k] !== undefined) payments[idx][k] = [updates[k]]; });
    data.payments.payment = payments;
    await writeXml(FILE, data);
    return normalize([payments[idx]])[0];
  },

  async delete(id) {
    const data = await readXml(FILE);
    if (!data.payments?.payment) throw new Error('No payments found');
    const payments = Array.isArray(data.payments.payment) ? data.payments.payment : [data.payments.payment];
    const filtered = payments.filter(p => p.$.id !== id);
    if (filtered.length === payments.length) throw new Error('Payment not found');
    data.payments.payment = filtered;
    await writeXml(FILE, data);
    return true;
  }
};

module.exports = PaymentModel;
