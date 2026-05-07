/**
 * MonkiHub - Report Generator
 * Generates data/report.html with full VA performance, payroll, and task data.
 */

const fs = require('fs-extra');
const path = require('path');
const { initXmlFiles } = require('../services/xmlService');
const TaskModel = require('../models/TaskModel');
const MessageModel = require('../models/MessageModel');
const LogModel = require('../models/LogModel');
const UserModel = require('../models/UserModel');
const PaymentModel = require('../models/PaymentModel');

const REPORT_FILE = path.join(__dirname, '../data/report.html');

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
}

function fmtMoney(val) {
  const n = parseFloat(val || 0);
  return isNaN(n) ? '₱0' : '₱' + n.toLocaleString();
}

async function generateReport() {
  try {
    const [tasks, messages, logs, users, payments] = await Promise.all([
      TaskModel.findAll(),
      MessageModel.findAll(),
      LogModel.findAll(),
      UserModel.findAll(),
      PaymentModel.findAll()
    ]);

    const now = new Date();
    const today = new Date(); today.setHours(0,0,0,0);

    // ── Task Stats ──
    const totalTasks      = tasks.length;
    const todo            = tasks.filter(t => t.status === 'todo').length;
    const inProgress      = tasks.filter(t => t.status === 'in-progress').length;
    const pendingReview   = tasks.filter(t => t.status === 'pending-review').length;
    const done            = tasks.filter(t => t.status === 'done').length;
    const highPending     = tasks.filter(t => t.priority === 'high' && t.status !== 'done').length;
    const withImage       = tasks.filter(t => t.taskImage).length;

    // ── Payment Stats ──
    const totalPayments   = payments.length;
    const pendingPay      = payments.filter(p => p.status === 'pending').length;
    const paidPay         = payments.filter(p => p.status === 'paid').length;
    const rejectedPay     = payments.filter(p => p.status === 'rejected').length;
    const totalReleased   = payments.filter(p => p.status === 'paid').reduce((s,p) => s + parseFloat(p.amount||0), 0);

    // ── Per-VA breakdown ──
    const vaUsers = users.filter(u => u.role !== 'admin');
    const vaStats = {};
    vaUsers.forEach(u => {
      vaStats[u.username] = { todo:0, 'in-progress':0, 'pending-review':0, done:0, totalPaid:0, pendingPay:0, paymentCount:0 };
    });
    tasks.forEach(t => {
      if (!vaStats[t.assignee]) vaStats[t.assignee] = { todo:0,'in-progress':0,'pending-review':0,done:0,totalPaid:0,pendingPay:0,paymentCount:0 };
      vaStats[t.assignee][t.status] = (vaStats[t.assignee][t.status] || 0) + 1;
    });
    payments.forEach(p => {
      if (!vaStats[p.username]) vaStats[p.username] = { todo:0,'in-progress':0,'pending-review':0,done:0,totalPaid:0,pendingPay:0,paymentCount:0 };
      if (p.status === 'paid') {
        vaStats[p.username].totalPaid += parseFloat(p.amount || 0);
        vaStats[p.username].paymentCount++;
      }
      if (p.status === 'pending') vaStats[p.username].pendingPay++;
    });

    // Top performer by done tasks
    const topPerformer = Object.entries(vaStats).sort((a,b) => b[1].done - a[1].done)[0]?.[0] || '—';

    // Recent logs (last 15)
    const recentLogs = [...logs].reverse().slice(0, 15);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>MonkiHub VA Report — ${now.toLocaleDateString()}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,sans-serif;background:#0a0b0f;color:#e2e8f0;padding:32px 24px;min-height:100vh}
    .report-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:12px}
    h1{font-size:1.6rem;font-weight:800;color:#a78bfa}
    .subtitle{color:#64748b;font-size:13px;margin-bottom:32px}
    .section-title{font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin:36px 0 14px;padding-bottom:8px;border-bottom:1px solid #1e2235}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin-bottom:8px}
    .card{background:#12141c;border:1px solid #1e2235;border-radius:12px;padding:18px;text-align:center}
    .card .value{font-size:1.8rem;font-weight:800;color:#a78bfa;line-height:1}
    .card .label{font-size:12px;color:#64748b;margin-top:6px}
    .card.green .value{color:#34d399}
    .card.yellow .value{color:#fbbf24}
    .card.red .value{color:#f87171}
    .card.teal .value{color:#5eead4}
    table{width:100%;border-collapse:collapse;background:#12141c;border-radius:12px;overflow:hidden;margin-bottom:8px}
    th{background:#1a1d2e;padding:10px 14px;text-align:left;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.05em}
    td{padding:10px 14px;font-size:13px;border-top:1px solid #1e2235;vertical-align:middle}
    tr:hover td{background:#1a1d2e}
    .badge{display:inline-block;padding:2px 9px;border-radius:99px;font-size:11px;font-weight:700}
    .badge-todo{background:#1e3a5f;color:#60a5fa}
    .badge-in-progress{background:#3b2f00;color:#fbbf24}
    .badge-pending-review{background:#3b2000;color:#fb923c}
    .badge-done{background:#14532d;color:#4ade80}
    .badge-high{background:#450a0a;color:#f87171}
    .badge-medium{background:#3b2f00;color:#fbbf24}
    .badge-low{background:#14532d;color:#4ade80}
    .badge-paid{background:#14532d;color:#4ade80}
    .badge-pending{background:#3b2f00;color:#fbbf24}
    .badge-rejected{background:#450a0a;color:#f87171}
    .img-indicator{display:inline-block;font-size:11px;padding:2px 7px;border-radius:6px;background:rgba(124,106,247,.15);color:#a78bfa;border:1px solid rgba(124,106,247,.3)}
    .va-row-top{font-weight:700;color:#e2e8f0}
    .progress-bar-wrap{background:#1e2235;border-radius:99px;height:6px;width:100%;min-width:80px}
    .progress-bar{height:6px;border-radius:99px;background:linear-gradient(90deg,#7c6af7,#5eead4)}
    .money{font-weight:700;color:#34d399}
    .money-pending{color:#fbbf24}
    .generated{color:#334155;font-size:11px;margin-top:40px;text-align:right}
    @media(max-width:600px){.grid{grid-template-columns:1fr 1fr}.report-header{flex-direction:column}}
  </style>
</head>
<body>

<div class="report-header">
  <div>
    <h1>🐒 MonkiHub — VA Performance Report</h1>
    <div class="subtitle">Generated: ${now.toLocaleString()} &nbsp;·&nbsp; ${vaUsers.length} VAs &nbsp;·&nbsp; ${users.length} total users</div>
  </div>
  <div style="text-align:right;font-size:12px;color:#475569">
    Top Performer: <strong style="color:#a78bfa">@${esc(topPerformer)}</strong>
  </div>
</div>

<!-- ── Task Overview ── -->
<div class="section-title">📋 Task Overview</div>
<div class="grid">
  <div class="card"><div class="value">${totalTasks}</div><div class="label">Total Tasks</div></div>
  <div class="card"><div class="value">${todo}</div><div class="label">To Do</div></div>
  <div class="card yellow"><div class="value">${inProgress}</div><div class="label">In Progress</div></div>
  <div class="card" style="border-color:rgba(251,146,60,.3)"><div class="value" style="color:#fb923c">${pendingReview}</div><div class="label">Pending Review</div></div>
  <div class="card green"><div class="value">${done}</div><div class="label">Completed</div></div>
  <div class="card red"><div class="value">${highPending}</div><div class="label">High Priority Pending</div></div>
  <div class="card teal"><div class="value">${withImage}</div><div class="label">Tasks with Ref Image</div></div>
</div>

<!-- ── Payroll Overview ── -->
<div class="section-title">💰 Payroll Overview</div>
<div class="grid">
  <div class="card"><div class="value">${totalPayments}</div><div class="label">Total Requests</div></div>
  <div class="card yellow"><div class="value">${pendingPay}</div><div class="label">Pending Payment</div></div>
  <div class="card green"><div class="value">${paidPay}</div><div class="label">Paid</div></div>
  <div class="card red"><div class="value">${rejectedPay}</div><div class="label">Rejected</div></div>
  <div class="card green" style="grid-column:span 2"><div class="value" style="font-size:1.4rem">${fmtMoney(totalReleased)}</div><div class="label">Total Released</div></div>
</div>

<!-- ── VA Performance Table ── -->
<div class="section-title">👥 VA Performance Breakdown</div>
<table>
  <thead>
    <tr>
      <th>VA</th>
      <th>To Do</th>
      <th>In Progress</th>
      <th>Pending Review</th>
      <th>Done</th>
      <th>Completion</th>
      <th>Total Earned</th>
      <th>Pending Pay</th>
    </tr>
  </thead>
  <tbody>
    ${Object.entries(vaStats).length ? Object.entries(vaStats).map(([va, s]) => {
      const total = (s.todo||0) + (s['in-progress']||0) + (s['pending-review']||0) + (s.done||0);
      const pct = total > 0 ? Math.round((s.done / total) * 100) : 0;
      return `<tr>
        <td class="va-row-top">@${esc(va)}</td>
        <td>${s.todo||0}</td>
        <td>${s['in-progress']||0}</td>
        <td>${s['pending-review']||0}</td>
        <td><strong style="color:#34d399">${s.done||0}</strong></td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div class="progress-bar-wrap"><div class="progress-bar" style="width:${pct}%"></div></div>
            <span style="font-size:12px;color:#94a3b8;white-space:nowrap">${pct}%</span>
          </div>
        </td>
        <td class="money">${fmtMoney(s.totalPaid)}</td>
        <td class="money-pending">${s.pendingPay > 0 ? s.pendingPay + ' request(s)' : '—'}</td>
      </tr>`;
    }).join('') : '<tr><td colspan="8" style="color:#475569;text-align:center;padding:24px">No VA data yet</td></tr>'}
  </tbody>
</table>

<!-- ── All Tasks ── -->
<div class="section-title">📌 All Tasks</div>
<table>
  <thead>
    <tr><th>Title</th><th>Assignee</th><th>Status</th><th>Priority</th><th>Ref Image</th><th>Submitted</th><th>Created</th></tr>
  </thead>
  <tbody>
    ${tasks.length ? tasks.map(t => `
    <tr>
      <td>${esc(t.title)}</td>
      <td>@${esc(t.assignee)}</td>
      <td><span class="badge badge-${t.status}">${t.status}</span></td>
      <td><span class="badge badge-${t.priority}">${t.priority}</span></td>
      <td>${t.taskImage ? '<span class="img-indicator">📷 Yes</span>' : '<span style="color:#334155">—</span>'}</td>
      <td>${t.submittedAt ? fmt(t.submittedAt) : '—'}</td>
      <td>${fmt(t.createdAt)}</td>
    </tr>`).join('') : '<tr><td colspan="7" style="color:#475569;text-align:center;padding:24px">No tasks yet</td></tr>'}
  </tbody>
</table>

<!-- ── Payment Records ── -->
<div class="section-title">💳 Payment Records</div>
<table>
  <thead>
    <tr><th>VA</th><th>Method</th><th>Account</th><th>Amount</th><th>Status</th><th>Submitted</th><th>Paid At</th><th>Paid By</th></tr>
  </thead>
  <tbody>
    ${payments.length ? payments.map(p => `
    <tr>
      <td>@${esc(p.username)}</td>
      <td>${esc(p.method)}</td>
      <td style="font-family:monospace;font-size:12px">${esc(p.accountNumber)}</td>
      <td class="money">${fmtMoney(p.amount)}</td>
      <td><span class="badge badge-${p.status}">${p.status}</span></td>
      <td>${fmt(p.submittedAt)}</td>
      <td>${p.paidAt ? fmt(p.paidAt) : '—'}</td>
      <td>${p.paidBy ? '@'+esc(p.paidBy) : '—'}</td>
    </tr>`).join('') : '<tr><td colspan="8" style="color:#475569;text-align:center;padding:24px">No payments yet</td></tr>'}
  </tbody>
</table>

<!-- ── Recent Activity ── -->
<div class="section-title">📜 Recent Activity (last 15)</div>
<table>
  <thead><tr><th>Action</th><th>Actor</th><th>Detail</th><th>Time</th></tr></thead>
  <tbody>
    ${recentLogs.length ? recentLogs.map(l => `
    <tr>
      <td><span class="badge badge-todo" style="font-size:10px">${esc(l.action)}</span></td>
      <td>@${esc(l.actor)}</td>
      <td style="color:#94a3b8">${esc(l.detail)}</td>
      <td style="color:#475569;white-space:nowrap">${new Date(l.timestamp).toLocaleString()}</td>
    </tr>`).join('') : '<tr><td colspan="4" style="color:#475569;text-align:center;padding:24px">No logs yet</td></tr>'}
  </tbody>
</table>

<div class="generated">Auto-generated by MonkiHub reporter.js · ${now.toISOString()}</div>
</body>
</html>`;

    await fs.writeFile(REPORT_FILE, html, 'utf8');
    console.log(`[${now.toISOString()}] 📊 Report generated → data/report.html`);
    console.log(`   Tasks: ${totalTasks} total | ${done} done | ${pendingReview} pending review | ${highPending} high-priority`);
    console.log(`   Payments: ${totalPayments} total | ${paidPay} paid | ${fmtMoney(totalReleased)} released`);
    console.log(`   Top performer: @${topPerformer}\n`);
  } catch (err) {
    console.error('Reporter error:', err.message);
  }
}

async function start() {
  await initXmlFiles();
  console.log('\n📊 MonkiHub Report Generator Started');
  console.log('=====================================');

  // Generate immediately on start
  await generateReport();

  // Watch all XML data files and regenerate on any change
  const DATA_DIR = path.join(__dirname, '../data');
  const WATCH_FILES = ['tasks.xml', 'payments.xml', 'messages.xml', 'logs.xml', 'users.xml'];

  let debounceTimer = null;
  WATCH_FILES.forEach(file => {
    const filePath = path.join(DATA_DIR, file);
    fs.watch(filePath, () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        console.log(`[${new Date().toISOString()}] 🔄 Change detected in ${file} — regenerating report...`);
        await generateReport();
      }, 300);
    });
  });

  console.log('👀 Watching for data changes. Report will auto-update.');
  console.log('   Press Ctrl+C to stop.\n');
}

start().catch(console.error);
