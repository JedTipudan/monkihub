// API Configuration - automatically detects environment
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? `${location.protocol}//${location.hostname}:3000/api`
  : `${location.protocol}//${location.hostname}/api`; // Uses same domain when deployed

const API = API_URL;
let token = null, currentUser = null, socket = null;
let chatTarget = null;
let allTasks = [], allMessages = [], allLogs = [];
const unreadCounts = {};
const notifications = [];

// ── Auth ──────────────────────────────────────────────────────────────────────
async function apiCall(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function login() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  try {
    const data = await apiCall('POST', '/auth/login', { username, password });
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('mh_token', token);
    localStorage.setItem('mh_user', JSON.stringify(currentUser));
    initApp();
  } catch (err) { showToast(err.message, 'error'); }
}

async function register() {
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  const email = document.getElementById('reg-email').value.trim();
  try {
    await apiCall('POST', '/auth/register', { username, password, email });
    showToast('Account created! Please login.', 'success');
    switchAuthTab('login');
  } catch (err) { showToast(err.message, 'error'); }
}

function logout() {
  console.log('[LOGOUT] Logging out user:', currentUser?.username);
  token = null; 
  currentUser = null;
  localStorage.removeItem('mh_token'); 
  localStorage.removeItem('mh_user');
  if (socket) {
    console.log('[LOGOUT] Disconnecting socket');
    socket.disconnect();
    socket = null;
  }
  // Clear notifications on logout
  notifications.length = 0;
  Object.keys(unreadCounts).forEach(key => delete unreadCounts[key]);
  chatTarget = null;
  
  console.log('[LOGOUT] Hiding app, showing auth screen');
  document.getElementById('app').classList.remove('visible');
  document.getElementById('auth-screen').style.display = 'flex';
  
  // Reset auth form
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  
  console.log('[LOGOUT] Logout complete');
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('register-form').style.display = tab === 'register' ? 'block' : 'none';
}

// ── App Init ──────────────────────────────────────────────────────────────────
function initApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').classList.add('visible');

  document.getElementById('user-name').textContent = currentUser.username;
  const roleTag = document.getElementById('user-role');
  roleTag.textContent = currentUser.role;
  roleTag.className = `role-tag ${currentUser.role === 'admin' ? 'admin' : ''}`;

  // Show/hide admin-only elements
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = currentUser.role === 'admin' ? '' : 'none';
  });

  // Show Create Admin nav button only for superadmin
  const createAdminBtn = document.getElementById('btn-create-admin-nav');
  if (createAdminBtn) createAdminBtn.style.display = currentUser.isSuperAdmin ? '' : 'none';

  updateTopbarAvatar();
  initSocket();
  navigateTo('dashboard');
  loadDashboard();
  
  // Check for unread messages on login
  checkUnreadOnLogin();
}

function initSocket() {
  const SOCKET_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? `${location.protocol}//${location.hostname}:3000`
    : `${location.protocol}//${location.hostname}`; // Uses same domain when deployed
  
  socket = io(SOCKET_URL);

  socket.on('connect', async () => {
    console.log('[SOCKET] Connected, registering as:', currentUser.username);
    updateBrokerStatus(true);
    // Register username so server can emit directly to this user
    socket.emit('register', currentUser.username);
  });

  socket.on('message:new', (msg) => {
    console.log('[message:new] Received:', JSON.stringify(msg), 'currentUser:', currentUser.username);
    
    // CRITICAL: Ignore if this is my own message
    if (msg.sender === currentUser.username) {
      console.log('[message:new] This is my own message, ignoring completely');
      // Only append to chat if viewing the conversation
      const chatOpen = document.getElementById('panel-chat').classList.contains('active');
      const myRoom = chatTarget ? [currentUser.username, chatTarget].sort().join(':') : null;
      const isThisConvo = msg.room === myRoom;
      if (chatOpen && isThisConvo) {
        appendMessage(msg);
      }
      return; // EXIT - no notification for own messages
    }

    // CRITICAL: Ignore if this message is not for me
    if (msg.receiver !== currentUser.username) {
      console.log('[message:new] Not for me (receiver:', msg.receiver, '), ignoring');
      return; // EXIT - not my message
    }

    // At this point: msg.sender is NOT me, and msg.receiver IS me
    console.log('[message:new] Message FOR ME from:', msg.sender);
    
    const chatOpen = document.getElementById('panel-chat').classList.contains('active');
    const myRoom = chatTarget ? [currentUser.username, chatTarget].sort().join(':') : null;
    const isThisConvo = msg.room === myRoom;

    // Always show notification for messages from others
    console.log('[message:new] Showing notification');
    unreadCounts[msg.sender] = (unreadCounts[msg.sender] || 0) + 1;
    updateUnreadBadge(msg.sender);
    updateChatNavBadge();
    pushNotification({ type: 'message', title: msg.sender, body: msg.content, sender: msg.sender });

    // Also append message if chat is open
    if (chatOpen && isThisConvo) {
      console.log('[message:new] Chat is open, also appending message');
      appendMessage(msg);
      // Clear the unread count since we're viewing it
      unreadCounts[msg.sender] = 0;
      updateUnreadBadge(msg.sender);
      updateChatNavBadge();
    }

    if (document.getElementById('panel-dashboard').classList.contains('active')) loadDashboard();
  });

  socket.on('task:new', (task) => {
    allTasks.push(task);
    if (document.getElementById('panel-tasks').classList.contains('active')) renderTasks();
    pushNotification({ type: 'task', title: 'New Task', body: `"${task.title}" assigned to @${task.assignee}` });
    if (document.getElementById('panel-dashboard').classList.contains('active')) loadDashboard();
  });

  socket.on('task:updated', (task) => {
    const idx = allTasks.findIndex(t => t.id === task.id);
    if (idx !== -1) allTasks[idx] = task;
    if (document.getElementById('panel-tasks').classList.contains('active')) renderTasks();
    if (document.getElementById('panel-dashboard').classList.contains('active')) loadDashboard();
  });

  socket.on('task:deleted', ({ id }) => {
    allTasks = allTasks.filter(t => t.id !== id);
    if (document.getElementById('panel-tasks').classList.contains('active')) renderTasks();
    if (document.getElementById('panel-dashboard').classList.contains('active')) loadDashboard();
  });

  socket.on('disconnect', () => updateBrokerStatus(false));
}

function updateBrokerStatus(online) {
  const dot = document.getElementById('broker-dot');
  const label = document.getElementById('broker-label');
  dot.className = `status-dot ${online ? '' : 'offline'}`;
  label.textContent = online ? 'Broker Online' : 'Broker Offline';
}

// ── Navigation ────────────────────────────────────────────────────────────────
function navigateTo(panel) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`panel-${panel}`).classList.add('active');
  document.querySelector(`[data-panel="${panel}"]`)?.classList.add('active');

  // Auto-close mobile sidebar when navigating
  if (window.innerWidth <= 640) {
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('show');
  }

  if (panel === 'tasks') loadTasks();
  if (panel === 'chat') loadChatUsers();
  if (panel === 'logs') loadLogs();
  if (panel === 'xml') loadXmlPanel('messages', 'xslt');
  if (panel === 'scripts') loadScripts();
  if (panel === 'history') loadHistory();
  if (panel === 'payroll') loadPayroll();
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
// -- History Panel --
async function loadHistory() {
  const container = document.getElementById('history-container');
  if (!container) return;
  container.innerHTML = '<div class="loading">Loading history...</div>';
  try {
    const [tasks, logs] = await Promise.all([
      apiCall('GET', '/tasks'),
      apiCall('GET', '/logs')
    ]);

    const doneTasks = tasks.filter(function(t) { return t.status === 'done'; });

    // Build approve log map: taskId -> log entry
    const approveMap = {};
    logs.forEach(function(l) {
      if (l.action === 'TASK_APPROVED') {
        // match by title in detail
        doneTasks.forEach(function(t) {
          if (l.detail && l.detail.indexOf(t.title) !== -1) {
            if (!approveMap[t.id]) approveMap[t.id] = l;
          }
        });
      }
    });

    // Stats
    const totalApproved = doneTasks.length;
    const byAssignee = {};
    doneTasks.forEach(function(t) {
      byAssignee[t.assignee] = (byAssignee[t.assignee] || 0) + 1;
    });
    const topPerformer = Object.keys(byAssignee).sort(function(a,b){ return byAssignee[b]-byAssignee[a]; })[0] || '-';

    // Sort by submittedAt or createdAt descending
    doneTasks.sort(function(a,b) {
      return new Date(b.submittedAt || b.createdAt) - new Date(a.submittedAt || a.createdAt);
    });

    if (!doneTasks.length) {
      container.innerHTML = '<div class="empty-state"><div class="emoji">&#128203;</div><p>No approved tasks yet</p></div>';
      return;
    }

    // Group by date
    const groups = {};
    doneTasks.forEach(function(t) {
      const d = new Date(t.submittedAt || t.createdAt);
      const key = d.toLocaleDateString(undefined, { year:'numeric', month:'long', day:'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });

    let html = '<div class="history-stats">' +
      '<div class="history-stat-card"><div class="history-stat-value">' + totalApproved + '</div><div class="history-stat-label">Total Approved</div></div>' +
      '<div class="history-stat-card"><div class="history-stat-value">' + Object.keys(byAssignee).length + '</div><div class="history-stat-label">Contributors</div></div>' +
      '<div class="history-stat-card"><div class="history-stat-value">&#127942; ' + escHtml(topPerformer) + '</div><div class="history-stat-label">Top Performer</div></div>' +
    '</div>';

    Object.keys(groups).forEach(function(dateKey) {
      html += '<div class="history-date-group">' +
        '<div class="history-date-label">&#128197; ' + escHtml(dateKey) + '</div>' +
        '<div class="history-timeline">';

      groups[dateKey].forEach(function(t) {
        const approveLog = approveMap[t.id];
        const approvedBy = approveLog ? approveLog.actor : 'admin';
        const approvedAt = approveLog ? new Date(approveLog.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '';
        const proofHtml = t.proof
          ? (t.proof.startsWith('data:image')
              ? '<img src="' + t.proof + '" class="history-timeline-proof" onclick="viewProof(\'' + t.id + '\')" title="View proof"/>'
              : '<a class="task-proof-file" href="' + t.proof + '" download="' + escHtml(t.proofName||'proof') + '">&#128196; ' + escHtml(t.proofName||'proof') + '</a>')
          : '<span class="history-no-proof">No proof attached</span>';

        html += '<div class="history-timeline-item">' +
          '<div class="history-timeline-dot"></div>' +
          '<div class="history-timeline-card">' +
            '<div class="history-tl-header">' +
              '<span class="history-tl-title">' + escHtml(t.title) + '</span>' +
              '<span class="badge badge-' + t.priority + '">' + t.priority + '</span>' +
            '</div>' +
            '<div class="history-tl-meta">' +
              '<span>&#128100; @' + escHtml(t.assignee) + '</span>' +
              '<span>&#10003; Approved by @' + escHtml(approvedBy) + (approvedAt ? ' at ' + approvedAt : '') + '</span>' +
            '</div>' +
            (t.description ? '<div class="history-tl-desc">' + escHtml(t.description) + '</div>' : '') +
            '<div class="history-tl-proof">' + proofHtml + '</div>' +
            '<div class="history-tl-actions">' +
              '<button class="btn-restore" onclick="restoreTask(\'' + t.id + '\')">&#8635; Restore to In Progress</button>' +
              '<button class="btn-delete-history" onclick="deleteTask(\'' + t.id + '\')">&#128465; Delete</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      });

      html += '</div></div>';
    });

    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = '<div class="empty-state"><p>' + escHtml(err.message) + '</p></div>';
  }
}
async function loadDashboard() {
  // Skeleton
  document.getElementById('activity-feed').innerHTML = skeletonRows(4);
  document.getElementById('recent-tasks').innerHTML = skeletonRows(3);
  ['stat-tasks','stat-messages','stat-todo','stat-inprogress','stat-done','stat-users'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<span class="skel skel-stat"></span>';
  });
  try {
    const [tasks, messages, users] = await Promise.all([
      apiCall('GET', '/tasks'),
      apiCall('GET', '/messages'),
      apiCall('GET', '/auth/list')
    ]);
    allTasks = tasks; allMessages = messages;

    document.getElementById('stat-tasks').textContent = tasks.length;
    document.getElementById('stat-messages').textContent = messages.length;
    document.getElementById('stat-todo').textContent = tasks.filter(t => t.status === 'todo').length;
    document.getElementById('stat-done').textContent = tasks.filter(t => t.status === 'done').length;
    document.getElementById('stat-users').textContent = users.length;
    document.getElementById('stat-inprogress').textContent = tasks.filter(t => t.status === 'in-progress').length;

    // Activity feed — merge tasks + messages, sort by time, show latest 8
    const taskEvents = tasks.map(t => ({ time: t.createdAt, type: 'task', icon: '✅', text: `Task "${t.title}" assigned to @${t.assignee}`, badge: t.priority, badgeClass: `badge-${t.priority}` }));
    const msgEvents = messages.map(m => ({ time: m.timestamp, type: 'msg', icon: '💬', text: `${m.sender} → ${m.receiver}: ${m.content.substring(0, 50)}` }));
    const feed = [...taskEvents, ...msgEvents].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8);

    const feedEl = document.getElementById('activity-feed');
    feedEl.innerHTML = feed.map(e => `
      <div class="feed-item">
        <span class="feed-icon">${e.icon}</span>
        <div class="feed-body">
          <span class="feed-text">${escHtml(e.text)}</span>
          ${e.badge ? `<span class="badge ${e.badgeClass}">${e.badge}</span>` : ''}
        </div>
        <span class="feed-time">${timeAgo(e.time)}</span>
      </div>`).join('') || '<div class="empty-state"><p>No activity yet</p></div>';

    // Recent tasks
    const recentTasks = document.getElementById('recent-tasks');
    recentTasks.innerHTML = tasks.slice(0, 5).map(t =>
      `<div class="recent-task"><span class="badge badge-${t.priority}">${t.priority}</span><span>${escHtml(t.title)}</span><span class="badge badge-${t.status}" style="margin-left:auto">${t.status}</span></div>`
    ).join('') || '<div class="empty-state"><p>No tasks yet</p></div>';
  } catch (err) { showToast(err.message, 'error'); }
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Tasks ─────────────────────────────────────────────────────────────────────
async function loadTasks() {
  document.getElementById('col-todo').innerHTML = skeletonCards(2);
  document.getElementById('col-in-progress').innerHTML = skeletonCards(1);
  document.getElementById('col-pending-review').innerHTML = skeletonCards(1);
  try {
    allTasks = await apiCall('GET', '/tasks');
    renderTasks();
  } catch (err) { showToast(err.message, 'error'); }
}

function renderTasks() {
  const isAdmin = currentUser.role === 'admin';
  const cols = { todo: [], 'in-progress': [], 'pending-review': [], done: [] };
  allTasks.forEach(function(t) { if (cols[t.status]) cols[t.status].push(t); });

  // Kanban: todo, in-progress, pending-review (no done in kanban)
  ['todo','in-progress','pending-review'].forEach(function(status) {
    const tasks = cols[status];
    const col = document.getElementById('col-' + status);
    const countEl = document.getElementById('count-' + status);
    if (!col) return;
    if (countEl) countEl.textContent = tasks.length;

    col.innerHTML = tasks.map(function(t) {
      const isAssignee = t.assignee === currentUser.username;
      const canSubmit = !isAdmin && isAssignee && (status === 'todo' || status === 'in-progress');

      let actions = '';
      if (status === 'pending-review') {
        let proofHtml = '';
        if (t.proof) {
          const isImage = t.proof.startsWith('data:image');
          proofHtml = isImage
            ? '<img src="' + t.proof + '" class="task-proof-img" onclick="viewProof(\'' + t.id + '\')" title="Click to view"/>'
            : '<a class="task-proof-file" href="' + t.proof + '" download="' + escHtml(t.proofName || 'proof') + '">&#128196; ' + escHtml(t.proofName || 'Download proof') + '</a>';
        }
        const submitted = t.submittedAt ? '<div class="task-submitted-at">Submitted: ' + new Date(t.submittedAt).toLocaleString() + '</div>' : '';
        const waitingBadge = !isAdmin && isAssignee ? '<div class="task-waiting-badge">&#9203; Waiting for admin approval</div>' : '';
        const adminActions = isAdmin
          ? '<div class="task-actions review-actions"><button class="btn-approve" onclick="approveTask(\'' + t.id + '\')">&#10003; Approve</button><button class="btn-reject" onclick="openRejectModal(\'' + t.id + '\')">&#10005; Reject</button></div>'
          : '';
        return '<div class="task-card task-review">' +
          '<div class="task-card-title">' + escHtml(t.title) + '</div>' +
          '<div class="task-card-desc">' + escHtml(t.description || '') + '</div>' +
          '<div class="task-card-meta"><span class="task-assignee">@' + t.assignee + '</span><span class="badge badge-' + t.priority + '">' + t.priority + '</span></div>' +
          submitted + proofHtml + waitingBadge + adminActions +
        '</div>';
      }

      const rejectedBanner = t.rejectedReason ? '<div class="task-rejected-banner">&#10060; Rejected: ' + escHtml(t.rejectedReason) + '</div>' : '';
      if (isAdmin) {
        actions = '<div class="task-actions">' +
          (status !== 'in-progress' ? '<button onclick="moveTask(\'' + t.id + '\',\'in-progress\')">&#9654; In Progress</button>' : '') +
          '<button class="del-btn" onclick="deleteTask(\'' + t.id + '\')">&#10005; Delete</button>' +
        '</div>';
      } else if (canSubmit) {
        actions = '<div class="task-actions"><button class="btn-submit-review" onclick="openSubmitModal(\'' + t.id + '\',\'' + escHtml(t.title) + '\')">&#128196; Submit for Review</button></div>';
      }

      const taskImgHtml = t.taskImage
        ? '<img src="' + t.taskImage + '" class="task-ref-img" onclick="viewTaskImage(\'' + t.id + '\')" title="View reference image"/>'
        : '';
      return '<div class="task-card">' +
        '<div class="task-card-title">' + escHtml(t.title) + '</div>' +
        '<div class="task-card-desc">' + escHtml(t.description || '') + '</div>' +
        rejectedBanner +
        taskImgHtml +
        '<div class="task-card-meta"><span class="task-assignee">@' + t.assignee + '</span><span class="badge badge-' + t.priority + '">' + t.priority + '</span></div>' +
        actions +
      '</div>';
    }).join('') || '<div class="empty-state"><p>No tasks</p></div>';
  });

}

async function restoreTask(id) {
  const ok = await confirmModal('Restore this task back to In Progress?', 'Restore');
  if (!ok) return;
  try {
    const updated = await apiCall('PUT', '/tasks/' + id, { status: 'in-progress' });
    showToast('Task restored to In Progress', 'success');
    const idx = allTasks.findIndex(function(t) { return t.id === id; });
    if (idx !== -1) allTasks[idx] = updated;
    renderTasks();
  } catch (err) { showToast(err.message, 'error'); }
}
async function openSubmitModal(taskId, taskTitle) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'submit-modal';
  overlay.innerHTML = '<div class="modal-box submit-modal-box">' +
    '<div class="modal-icon">&#128196;</div>' +
    '<h3 style="margin-bottom:8px">Submit for Review</h3>' +
    '<p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:16px">Task: <strong>' + escHtml(taskTitle) + '</strong></p>' +
    '<div class="submit-upload-area" id="submit-upload-area">' +
      '<div class="submit-upload-icon">&#128247;</div>' +
      '<div class="submit-upload-text">Click to upload proof<br><span>Photo, screenshot, or any file (max 5MB)</span></div>' +
      '<input type="file" id="submit-proof-input" accept="image/*,.pdf,.doc,.docx,.txt" style="position:absolute;inset:0;opacity:0;cursor:pointer" onchange="handleProofFile(event)"/>' +
    '</div>' +
    '<div id="submit-proof-preview" style="display:none;margin-top:12px;text-align:center"></div>' +
    '<div class="modal-actions" style="margin-top:20px">' +
      '<button class="modal-cancel" onclick="document.getElementById(\'submit-modal\').remove()">Cancel</button>' +
      '<button class="modal-confirm" style="background:var(--accent)" id="submit-confirm-btn" onclick="submitProof(\'' + taskId + '\')" disabled>Submit</button>' +
    '</div>' +
  '</div>';
  document.body.appendChild(overlay);
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
}

let pendingProof = null;
let pendingProofName = '';

function handleProofFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showToast('File must be under 5MB', 'error'); return; }
  pendingProofName = file.name;
  const reader = new FileReader();
  reader.onload = function(ev) {
    pendingProof = ev.target.result;
    const preview = document.getElementById('submit-proof-preview');
    const confirmBtn = document.getElementById('submit-confirm-btn');
    if (file.type.startsWith('image/')) {
      preview.innerHTML = '<img src="' + pendingProof + '" style="max-width:100%;max-height:160px;border-radius:8px;border:1px solid var(--border)"/>';
    } else {
      preview.innerHTML = '<div style="padding:12px;background:var(--surface2);border-radius:8px;font-size:0.82rem">&#128196; ' + escHtml(file.name) + '</div>';
    }
    preview.style.display = 'block';
    document.getElementById('submit-upload-area').style.borderColor = 'var(--success)';
    if (confirmBtn) confirmBtn.disabled = false;
  };
  reader.readAsDataURL(file);
}

async function submitProof(taskId) {
  if (!pendingProof) return;
  try {
    const updated = await apiCall('POST', '/tasks/' + taskId + '/submit', { proof: pendingProof, proofName: pendingProofName });
    const modal = document.getElementById('submit-modal');
    if (modal) modal.remove();
    pendingProof = null; pendingProofName = '';
    showToast('Submitted for review!', 'success');
    const idx = allTasks.findIndex(function(t) { return t.id === updated.id; });
    if (idx !== -1) allTasks[idx] = updated; else allTasks.push(updated);
    renderTasks();
  } catch (err) { showToast(err.message, 'error'); }
}

async function approveTask(taskId) {
  const ok = await confirmModal('Approve this task and mark it as Done?', 'Approve');
  if (!ok) return;
  try {
    const updated = await apiCall('POST', '/tasks/' + taskId + '/approve');
    showToast('Task approved!', 'success');
    const idx = allTasks.findIndex(function(t) { return t.id === updated.id; });
    if (idx !== -1) allTasks[idx] = updated;
    renderTasks();
  } catch (err) { showToast(err.message, 'error'); }
}

function openRejectModal(taskId) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'reject-modal';
  overlay.innerHTML = '<div class="modal-box">' +
    '<div class="modal-icon">&#10060;</div>' +
    '<div class="modal-msg">Reason for rejection (optional)</div>' +
    '<textarea id="reject-reason" style="width:100%;padding:10px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:0.85rem;resize:vertical;min-height:80px;margin-bottom:16px" placeholder="e.g. Photo is unclear, please resubmit..."></textarea>' +
    '<div class="modal-actions">' +
      '<button class="modal-cancel" onclick="document.getElementById(\'reject-modal\').remove()">Cancel</button>' +
      '<button class="modal-confirm" onclick="rejectTask(\'' + taskId + '\')">Reject</button>' +
    '</div>' +
  '</div>';
  document.body.appendChild(overlay);
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
}

async function rejectTask(taskId) {
  const reason = document.getElementById('reject-reason')?.value.trim() || 'Rejected by admin';
  try {
    const updated = await apiCall('POST', '/tasks/' + taskId + '/reject', { reason });
    const modal = document.getElementById('reject-modal');
    if (modal) modal.remove();
    showToast('Task rejected and sent back.', 'success');
    const idx = allTasks.findIndex(function(t) { return t.id === updated.id; });
    if (idx !== -1) allTasks[idx] = updated;
    renderTasks();
  } catch (err) { showToast(err.message, 'error'); }
}

function viewTaskImage(taskId) {
  const task = allTasks.find(function(t) { return t.id === taskId; });
  if (!task || !task.taskImage) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML = '<div class="proof-viewer">' +
    '<button onclick="this.closest(\'.modal-overlay\').remove()" style="position:absolute;top:12px;right:12px;background:transparent;border:none;color:#fff;font-size:1.5rem;cursor:pointer">&#10005;</button>' +
    '<img src="' + task.taskImage + '" style="max-width:90vw;max-height:85vh;border-radius:12px"/>' +
  '</div>';
  document.body.appendChild(overlay);
}

function viewProof(taskId) {
  const task = allTasks.find(function(t) { return t.id === taskId; });
  if (!task || !task.proof) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML = '<div class="proof-viewer">' +
    '<button onclick="this.closest(\'.modal-overlay\').remove()" style="position:absolute;top:12px;right:12px;background:transparent;border:none;color:#fff;font-size:1.5rem;cursor:pointer">&#10005;</button>' +
    (task.proof.startsWith('data:image')
      ? '<img src="' + task.proof + '" style="max-width:90vw;max-height:85vh;border-radius:12px"/>'
      : '<div style="padding:32px;color:#fff;font-size:1rem">&#128196; <a href="' + task.proof + '" download="' + escHtml(task.proofName || 'proof') + '" style="color:var(--accent2)">Download ' + escHtml(task.proofName || 'proof') + '</a></div>') +
  '</div>';
  document.body.appendChild(overlay);
}
let pendingTaskImage = null;

function handleTaskImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showToast('Image must be under 5MB', 'error'); return; }
  const reader = new FileReader();
  reader.onload = function(ev) {
    pendingTaskImage = ev.target.result;
    document.getElementById('task-img-preview-img').src = pendingTaskImage;
    document.getElementById('task-img-preview').style.display = 'block';
    document.getElementById('task-img-upload-area').style.borderColor = 'var(--success)';
  };
  reader.readAsDataURL(file);
}

function clearTaskImage() {
  pendingTaskImage = null;
  document.getElementById('task-img-input').value = '';
  document.getElementById('task-img-preview').style.display = 'none';
  document.getElementById('task-img-upload-area').style.borderColor = '';
}

async function createTask() {
  const title = document.getElementById('task-title').value.trim();
  const description = document.getElementById('task-desc').value.trim();
  const assignee = document.getElementById('task-assignee').value.trim();
  const priority = document.getElementById('task-priority').value;
  if (!title || !assignee) return showToast('Title and assignee are required', 'error');
  try {
    await apiCall('POST', '/tasks', { title, description, assignee, priority, status: 'todo', taskImage: pendingTaskImage || '' });
    document.getElementById('task-title').value = '';
    document.getElementById('task-desc').value = '';
    document.getElementById('task-assignee').value = '';
    clearTaskImage();
    showToast('Task created!', 'success');
  } catch (err) { showToast(err.message, 'error'); }
}

async function moveTask(id, status) {
  try { await apiCall('PUT', `/tasks/${id}`, { status }); }
  catch (err) { showToast(err.message, 'error'); }
}

async function markMyTaskDone(id) {
  const ok = await confirmModal('Mark this task as done?', 'Mark Done');
  if (!ok) return;
  try {
    await apiCall('PUT', `/tasks/${id}`, { status: 'done' });
    showToast('Task marked as done! 🎉', 'success');
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteTask(id) {
  const ok = await confirmModal('Delete this task? This cannot be undone.', 'Delete');
  if (!ok) return;
  try { await apiCall('DELETE', `/tasks/${id}`); }
  catch (err) { showToast(err.message, 'error'); }
}

// ── Notifications ──────────────────────────────────────────────────────────────────
function pushNotification({ type, title, body, sender }) {
  // CRITICAL: Never push notification for own messages
  if (sender === currentUser.username) {
    console.log('[NOTIFICATION] Blocked - this is my own message, sender:', sender, 'currentUser:', currentUser.username);
    return;
  }
  
  console.log('[NOTIFICATION] Pushing:', { type, title, body, sender });
  const n = { id: Date.now(), type, title, body, sender, time: new Date().toISOString(), read: false };
  notifications.unshift(n);
  if (notifications.length > 20) notifications.pop();
  updateBellBadge();
  showNotificationBanner(n);
}

function updateBellBadge() {
  const unread = notifications.filter(n => !n.read).length;
  const badge = document.getElementById('bell-badge');
  console.log('[BELL] Updating badge, unread count:', unread);
  if (!badge) return;
  badge.textContent = unread > 9 ? '9+' : unread;
  badge.style.display = unread > 0 ? 'flex' : 'none';
}

function showNotificationBanner(n) {
  console.log('[BANNER] Showing notification banner:', n);
  const banner = document.createElement('div');
  banner.className = `notif-banner ${n.type === 'message' ? 'msg' : 'task'}`;
  banner.innerHTML = `
    <div class="notif-banner-icon">${n.type === 'message' ? '💬' : '✅'}</div>
    <div class="notif-banner-body">
      <div class="notif-banner-title">${escHtml(n.title)}</div>
      <div class="notif-banner-text">${escHtml(n.body.substring(0, 60))}</div>
    </div>
    <button class="notif-banner-close" onclick="this.parentElement.remove()">×</button>`;
  if (n.type === 'message' && n.sender) {
    banner.style.cursor = 'pointer';
    banner.addEventListener('click', (e) => {
      if (e.target.classList.contains('notif-banner-close')) return;
      banner.remove();
      navigateTo('chat');
      openDM(n.sender);
    });
  }
  const container = document.getElementById('notif-banners');
  console.log('[BANNER] Container found:', !!container);
  if (container) {
    container.appendChild(banner);
    console.log('[BANNER] Banner appended to container');
  }
  setTimeout(() => banner.remove(), 5000);
}

function toggleNotifDropdown() {
  const dd = document.getElementById('notif-dropdown');
  const isOpen = dd.classList.toggle('open');
  if (isOpen) {
    notifications.forEach(n => n.read = true);
    updateBellBadge();
    renderNotifDropdown();
  }
}

function renderNotifDropdown() {
  const list = document.getElementById('notif-list');
  
  // Filter out notifications that are from current user (shouldn't happen but safety check)
  const validNotifications = notifications.filter(n => n.sender !== currentUser.username);
  
  if (!validNotifications.length) {
    list.innerHTML = '<div class="notif-empty">No notifications yet</div>';
    return;
  }
  
  console.log('[RENDER NOTIF] Total notifications:', validNotifications.length);
  validNotifications.forEach((n, i) => {
    console.log(`[RENDER NOTIF] ${i}:`, n.type, 'from:', n.sender, 'title:', n.title);
  });
  
  list.innerHTML = validNotifications.map(n => `
    <div class="notif-item ${n.type}" ${n.type === 'message' ? `onclick="navigateTo('chat');openDM('${n.sender}');toggleNotifDropdown()"` : ''}>
      <span class="notif-item-icon">${n.type === 'message' ? '💬' : '✅'}</span>
      <div class="notif-item-body">
        <div class="notif-item-title">${escHtml(n.title)}</div>
        <div class="notif-item-text">${escHtml(n.body.substring(0, 55))}</div>
      </div>
      <span class="notif-item-time">${timeAgo(n.time)}</span>
    </div>`).join('');
}

// ── Chat ──────────────────────────────────────────────────────────────────────
function updateUnreadBadge(sender) {
  const item = document.querySelector(`.room-item[data-username="${sender}"]`);
  if (!item) return;
  let badge = item.querySelector('.unread-badge');
  const count = unreadCounts[sender] || 0;
  if (count > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'unread-badge';
      item.appendChild(badge);
    }
    badge.textContent = count > 99 ? '99+' : count;
  } else if (badge) {
    badge.remove();
  }
}

function updateChatNavBadge() {
  const total = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
  const navBtn = document.querySelector('[data-panel="chat"]');
  if (!navBtn) return;
  let badge = navBtn.querySelector('.nav-badge');
  if (total > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'nav-badge';
      navBtn.appendChild(badge);
    }
    badge.textContent = total > 99 ? '99+' : total;
  } else if (badge) {
    badge.remove();
  }
}

async function loadChatUsers() {
  try {
    const users = await apiCall('GET', '/auth/list');
    const list = document.getElementById('room-list');
    const others = users.filter(u => u.username !== currentUser.username);
    if (!others.length) {
      list.innerHTML = '<div class="empty-state"><p>No other users yet</p></div>';
      return;
    }
    list.innerHTML = others.map(u => `
      <div class="room-item" data-username="${u.username}" onclick="openDM('${u.username}')">
        <div class="dm-avatar ${u.role === 'admin' ? 'admin-av' : ''}">${u.username.slice(0,2).toUpperCase()}</div>
        <div class="dm-info">
          <span class="dm-name">${u.username}</span>
          <span class="dm-role">${u.role}</span>
        </div>
      </div>`).join('');
    // Check for unread messages from all users
    await checkAllUnreadMessages(others);
    // Restore any existing unread badges after re-render
    Object.keys(unreadCounts).forEach(sender => updateUnreadBadge(sender));
  } catch (err) { showToast(err.message, 'error'); }
}

async function openDM(username) {
  chatTarget = username;
  // Clear unread for this sender
  unreadCounts[username] = 0;
  updateUnreadBadge(username);
  updateChatNavBadge();
  document.querySelectorAll('.room-item').forEach(el =>
    el.classList.toggle('active', el.dataset.username === username));
  document.getElementById('chat-room-name').textContent = username;
  document.getElementById('chat-room-sub').textContent = 'Direct Message';
  const input = document.getElementById('chat-input');
  const btn = document.getElementById('send-btn');
  input.disabled = false;
  btn.disabled = false;
  input.focus();
  const room = [currentUser.username, username].sort().join(':');
  if (socket) socket.emit('join', room);
  await loadMessages();
  // After loading messages, check for unread and create notifications
  checkForUnreadMessages();
}

async function loadMessages() {
  if (!chatTarget) return;
  try {
    const messages = await apiCall('GET', `/messages/conversation/${chatTarget}`);
    const container = document.getElementById('chat-messages');
    container.innerHTML = '';
    if (!messages.length) {
      container.innerHTML = '<div class="empty-state"><div class="emoji">💬</div><p>No messages yet. Say hello!</p></div>';
      return;
    }
    messages.forEach(m => appendMessage(m, false));
    container.scrollTop = container.scrollHeight;
  } catch (err) { showToast(err.message, 'error'); }
}

function appendMessage(msg, scroll = true) {
  const container = document.getElementById('chat-messages');
  const empty = container.querySelector('.empty-state');
  if (empty) empty.remove();
  const isOwn = msg.sender === currentUser.username;
  const initials = msg.sender.slice(0, 2).toUpperCase();
  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const el = document.createElement('div');
  el.className = `chat-msg ${isOwn ? 'own' : ''}`;
  el.innerHTML = `
    <div class="msg-avatar ${msg.sender === 'admin' ? 'admin-av' : ''}">${initials}</div>
    <div class="msg-body">
      <div class="msg-sender">${msg.sender}</div>
      <div class="msg-bubble">${escHtml(msg.content)}</div>
      <div class="msg-time">${time}</div>
    </div>`;
  container.appendChild(el);
  if (scroll) container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
  if (!chatTarget) return;
  const input = document.getElementById('chat-input');
  const content = input.value.trim();
  if (!content) return;
  input.value = '';
  try {
    const result = await apiCall('POST', '/messages', { content, receiver: chatTarget });
    if (result.status === 'delivered') {
      appendMessage({ sender: currentUser.username, receiver: chatTarget, content, room: [currentUser.username, chatTarget].sort().join(':'), timestamp: new Date().toISOString() });
    }
  } catch (err) {
    showToast(err.message, 'error');
    input.value = content;
  }
}

// Check for unread messages from all users
async function checkAllUnreadMessages(users) {
  try {
    const lastCheck = localStorage.getItem('mh_last_check_' + currentUser.username);
    const lastCheckTime = lastCheck ? new Date(lastCheck) : new Date(0);
    
    for (const user of users) {
      const messages = await apiCall('GET', `/messages/conversation/${user.username}`);
      const unreadMessages = messages.filter(m => {
        const isFromOtherUser = m.sender === user.username; // Message FROM the other user
        const isToMe = m.receiver === currentUser.username; // Message TO me
        const isNew = new Date(m.timestamp) > lastCheckTime; // After last check
        const notMyOwnMessage = m.sender !== currentUser.username; // NOT my own message
        
        console.log('[FILTER]', m.sender, '->', m.receiver, '| isFromOther:', isFromOtherUser, 'isToMe:', isToMe, 'isNew:', isNew, 'notMine:', notMyOwnMessage);
        
        return isFromOtherUser && isToMe && isNew && notMyOwnMessage;
      });
      
      if (unreadMessages.length > 0) {
        console.log('[CHECK UNREAD] Found', unreadMessages.length, 'unread from', user.username);
        unreadCounts[user.username] = unreadMessages.length;
        updateUnreadBadge(user.username);
        // Add only the most recent message to notifications (not all)
        const latestMsg = unreadMessages[unreadMessages.length - 1];
        pushNotification({ 
          type: 'message', 
          title: latestMsg.sender, 
          body: unreadMessages.length > 1 
            ? `${unreadMessages.length} new messages` 
            : latestMsg.content, 
          sender: latestMsg.sender 
        });
      }
    }
    updateChatNavBadge();
    // Update last check time
    localStorage.setItem('mh_last_check_' + currentUser.username, new Date().toISOString());
  } catch (err) {
    console.error('[CHECK UNREAD] Error:', err);
  }
}

// Check for unread messages from current chat target
async function checkForUnreadMessages() {
  if (!chatTarget) return;
  try {
    const lastCheck = localStorage.getItem('mh_last_check_' + currentUser.username);
    const lastCheckTime = lastCheck ? new Date(lastCheck) : new Date(0);
    
    const messages = await apiCall('GET', `/messages/conversation/${chatTarget}`);
    const unreadMessages = messages.filter(m => 
      m.sender === chatTarget && 
      new Date(m.timestamp) > lastCheckTime
    );
    
    if (unreadMessages.length > 0) {
      console.log('[CHECK UNREAD] Found', unreadMessages.length, 'unread messages from', chatTarget);
    }
  } catch (err) {
    console.error('[CHECK UNREAD] Error:', err);
  }
}

// Check for unread messages on login (without going to chat section)
async function checkUnreadOnLogin() {
  try {
    const users = await apiCall('GET', '/auth/list');
    const others = users.filter(u => u.username !== currentUser.username);
    await checkAllUnreadMessages(others);
  } catch (err) {
    console.error('[CHECK UNREAD ON LOGIN] Error:', err);
  }
}

// ── Logs ──────────────────────────────────────────────────────────────────────
async function loadLogs() {
  try {
    allLogs = await apiCall('GET', '/logs');
    const tbody = document.getElementById('logs-tbody');
    tbody.innerHTML = allLogs.map(l => `
      <tr>
        <td>${l.id}</td>
        <td><span class="action-tag">${l.action}</span></td>
        <td>${l.actor}</td>
        <td>${escHtml(l.detail)}</td>
        <td>${new Date(l.timestamp).toLocaleString()}</td>
      </tr>`).join('') || '<tr><td colspan="5" class="loading">No logs yet</td></tr>';
  } catch (err) { showToast(err.message, 'error'); }
}

// ── XML Panel ─────────────────────────────────────────────────────────────────
let activeXmlFile = 'messages';
let activeXmlView = 'xslt';

async function loadXmlPanel(file, view) {
  activeXmlFile = file || activeXmlFile;
  activeXmlView = view || activeXmlView;

  document.querySelectorAll('.xml-tab').forEach(t => t.classList.toggle('active', t.dataset.file === activeXmlFile));
  document.querySelectorAll('.toggle-btn').forEach(t => t.classList.toggle('active', t.dataset.view === activeXmlView));

  const area = document.getElementById('xml-content');
  area.innerHTML = '<div class="loading">⏳ Loading...</div>';

  try {
    if (activeXmlView === 'xslt') {
      const res = await fetch(`${API}/xml/transform/${activeXmlFile}`, { headers: { Authorization: `Bearer ${token}` } });
      const html = await res.text();
      area.innerHTML = html;
    } else {
      const res = await fetch(`${API}/xml/raw/${activeXmlFile}.xml`, { headers: { Authorization: `Bearer ${token}` } });
      const xml = await res.text();
      area.innerHTML = `<pre class="xml-pre">${escHtml(xml)}</pre>`;
    }
  } catch (err) { area.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`; }
}

// ── Scripts Panel ──────────────────────────────────────────────────────────
let scriptsData = {};
const scriptMinimized = {};

async function loadScripts() {
  try {
    scriptsData = await apiCall('GET', '/scripts/status');
    renderScripts();
    Object.keys(scriptsData).forEach(name => {
      socket.off(`script:log:${name}`);
      socket.on(`script:log:${name}`, ({ line }) => appendScriptLog(name, line));
    });
    socket.off('script:started'); socket.off('script:stopped');
    socket.on('script:started', ({ script }) => setScriptRunning(script, true));
    socket.on('script:stopped', ({ script }) => setScriptRunning(script, false));
  } catch (err) { showToast(err.message, 'error'); }
}

function renderScripts() {
  const body = document.getElementById('scripts-body');
  body.innerHTML = Object.entries(scriptsData).map(function(entry) {
    const name = entry[0];
    const s = entry[1];
    const minimized = !!scriptMinimized[name];
    const isReporter = name === 'reporter';
    const isUserManager = name === 'usermanager';
    const logContent = isUserManager
      ? '<span class="script-log-empty">Click Start to load all users.</span>'
      : s.logs.length
        ? s.logs.map(function(l) { return '<div>' + escHtml(l) + '</div>'; }).join('')
        : '<span class="script-log-empty">No output yet - start the script to see logs here.</span>';

    return '<div class="script-card ' + (minimized ? 'minimized' : '') + '" id="script-card-' + name + '">' +
      '<div class="script-card-header">' +
        '<div class="script-icon">' + s.icon + '</div>' +
        '<div class="script-info"><div class="script-name">' + s.label + '</div></div>' +
        '<span class="script-status ' + (s.running ? 'running' : '') + '" id="script-status-' + name + '">' +
          (s.running ? '&#9679; Running' : '&#9675; Stopped') +
        '</span>' +
        '<div class="script-actions">' +
          (isReporter ? '<button class="btn-report" onclick="openReport()" title="View Report">&#128196; Report</button>' : '') +
          '<button class="btn-run" id="btn-run-' + name + '" onclick="startScript(\'' + name + '\')"' + (s.running ? ' disabled' : '') + '>&#9654; Start</button>' +
          '<button class="btn-stop" id="btn-stop-' + name + '" onclick="stopScript(\'' + name + '\')"' + (!s.running || isUserManager ? ' disabled' : '') + '>&#9632; Stop</button>' +
          '<button class="btn-minimize" onclick="toggleScriptMinimize(\'' + name + '\')" title="' + (minimized ? 'Expand' : 'Minimize') + '">' + (minimized ? '&#9660;' : '&#9650;') + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="' + (isUserManager ? 'script-log-users' : 'script-log') + '" id="script-log-' + name + '" style="' + (minimized ? 'display:none' : '') + '">' +
        logContent +
      '</div>' +
    '</div>';
  }).join('');
  Object.keys(scriptsData).forEach(function(name) { if (!scriptMinimized[name]) scrollLogToBottom(name); });
}
function toggleScriptMinimize(name) {
  scriptMinimized[name] = !scriptMinimized[name];
  const card = document.getElementById(`script-card-${name}`);
  const log = document.getElementById(`script-log-${name}`);
  const btn = card?.querySelector('.btn-minimize');
  if (!card || !log) return;
  const minimized = scriptMinimized[name];
  log.style.display = minimized ? 'none' : '';
  card.classList.toggle('minimized', minimized);
  if (btn) btn.textContent = minimized ? '▼' : '▲';
  if (!minimized) scrollLogToBottom(name);
}

function openReport() {
  const url = `${API}/scripts/report`;
  // Open in new tab — user can Print > Save as PDF from there
  const win = window.open('about:blank', '_blank');
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.text())
    .then(html => {
      // Inject download + print buttons into the report
      const injected = html.replace('</body>', `
        <div style="position:fixed;bottom:24px;right:24px;display:flex;gap:10px;z-index:9999">
          <button onclick="window.print()" style="padding:10px 20px;background:#7c6af7;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600">🖨️ Print / Save PDF</button>
          <button onclick="downloadHtml()" style="padding:10px 20px;background:#34d399;color:#0f1117;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600">⬇️ Download HTML</button>
        </div>
        <script>
          function downloadHtml() {
            const blob = new Blob([document.documentElement.outerHTML], {type:'text/html'});
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'monkihub-report-' + new Date().toISOString().slice(0,10) + '.html';
            a.click();
          }
        <\/script>
        </body>`);
      win.document.open();
      win.document.write(injected);
      win.document.close();
    })
    .catch(err => { win.close(); showToast(err.message, 'error'); });
}

function appendScriptLog(name, line) {
  const el = document.getElementById(`script-log-${name}`);
  if (!el) return;
  const empty = el.querySelector('.script-log-empty');
  if (empty) empty.remove();
  const div = document.createElement('div');
  div.className = 'log-line-new';
  div.textContent = line;
  el.appendChild(div);
  if (!scriptMinimized[name]) scrollLogToBottom(name);
  setTimeout(() => div.classList.remove('log-line-new'), 2000);
}

function scrollLogToBottom(name) {
  const el = document.getElementById(`script-log-${name}`);
  if (el) el.scrollTop = el.scrollHeight;
}

function setScriptRunning(name, isRunning) {
  const statusEl = document.getElementById(`script-status-${name}`);
  const runBtn = document.getElementById(`btn-run-${name}`);
  const stopBtn = document.getElementById(`btn-stop-${name}`);
  if (!statusEl) return;
  statusEl.textContent = isRunning ? '● Running' : '○ Stopped';
  statusEl.className = `script-status ${isRunning ? 'running' : ''}`;
  if (runBtn) runBtn.disabled = isRunning;
  if (stopBtn) stopBtn.disabled = !isRunning;
}

async function startScript(name) {
  if (name === 'usermanager') { runUserManager(); return; }
  // Auto-expand log when starting
  if (scriptMinimized[name]) toggleScriptMinimize(name);
  try {
    await apiCall('POST', `/scripts/start/${name}`);
    showToast(`${scriptsData[name]?.label} started`, 'success');
  } catch (err) { showToast(err.message, 'error'); }
}

async function stopScript(name) {
  try {
    await apiCall('POST', `/scripts/stop/${name}`);
    showToast(`${scriptsData[name]?.label} stopped`, 'success');
  } catch (err) { showToast(err.message, 'error'); }
}

// ── User Manager Script Card ───────────────────────────────────────────
async function runUserManager() {
  const log = document.getElementById('script-log-usermanager');
  const runBtn = document.getElementById('btn-run-usermanager');
  const statusEl = document.getElementById('script-status-usermanager');
  if (!log) return;
  Object.keys(scriptsData).forEach(function(n) {
    if (n !== 'usermanager' && !scriptMinimized[n]) toggleScriptMinimize(n);
  });
  runBtn.disabled = true;
  statusEl.textContent = 'Running';
  statusEl.className = 'script-status running';
  log.innerHTML = '<div style="padding:12px;color:#94a3b8">Loading users...</div>';
  try {
    const users = await apiCall('GET', '/auth/users');
    const deletable = users.filter(u => !u.isSuperAdmin && u.username !== currentUser.username);
    log.innerHTML = '';
    if (currentUser.isSuperAdmin) {
      const createForm = document.createElement('div');
      createForm.className = 'um-create-admin';
      createForm.innerHTML = '<div class="um-create-title">Create New Admin</div>' +
        '<div class="um-create-form">' +
          '<input type="text" id="new-admin-username" placeholder="Username" class="um-input"/>' +
          '<input type="password" id="new-admin-password" placeholder="Password" class="um-input"/>' +
          '<input type="email" id="new-admin-email" placeholder="Email" class="um-input"/>' +
          '<button class="btn-create-admin" onclick="createAdminUser()">Create Admin</button>' +
        '</div>';
      log.appendChild(createForm);
    }
    const summary = document.createElement('div');
    summary.className = 'um-summary';
    summary.innerHTML = 'Found <strong>' + users.length + '</strong> user(s) &nbsp;&middot;&nbsp; <strong>' + deletable.length + '</strong> deletable';
    log.appendChild(summary);
    const table = document.createElement('table');
    table.className = 'um-table';
    table.innerHTML = '<thead><tr><th>Username</th><th>Role</th><th>Email</th><th>Joined</th><th></th></tr></thead>';
    const tbody = document.createElement('tbody');
    users.forEach(function(u) {
      const isSelf = u.username === currentUser.username;
      const isSuperAdminTarget = u.isSuperAdmin === true;
      const isAdminTarget = u.role === 'admin';
      const tr = document.createElement('tr');
      const tdName = document.createElement('td');
      tdName.innerHTML = '<strong>' + escHtml(u.username) + '</strong>' +
        (isSelf ? ' <span class="um-you">(you)</span>' : '') +
        (isSuperAdminTarget ? ' <span class="um-super-badge">SUPER</span>' : '');
      const tdRole = document.createElement('td');
      tdRole.innerHTML = '<span class="role-tag ' + (u.role === 'admin' ? 'admin' : '') + '">' + u.role + '</span>';
      const tdEmail = document.createElement('td');
      tdEmail.textContent = u.email;
      const tdJoined = document.createElement('td');
      tdJoined.textContent = new Date(u.createdAt).toLocaleDateString();
      const tdAction = document.createElement('td');
      const cantDelete = isSelf || isSuperAdminTarget;
      const noPermission = isAdminTarget && !currentUser.isSuperAdmin;
      if (cantDelete || noPermission) {
        const span = document.createElement('span');
        span.className = 'um-protected';
        span.textContent = isSuperAdminTarget ? 'Super Admin' : (isSelf ? 'You' : 'Protected');
        tdAction.appendChild(span);
      } else {
        const btn = document.createElement('button');
        btn.className = 'btn-delete-user';
        btn.textContent = 'Delete';
        btn.onclick = (function(name) { return function() { deleteUser(name); }; })(u.username);
        tdAction.appendChild(btn);
      }
      tr.appendChild(tdName); tr.appendChild(tdRole); tr.appendChild(tdEmail); tr.appendChild(tdJoined); tr.appendChild(tdAction);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    log.appendChild(table);
  } catch(err) {
    log.innerHTML = '<div style="padding:12px;color:var(--danger)">' + escHtml(err.message) + '</div>';
  }
  statusEl.textContent = 'Stopped';
  statusEl.className = 'script-status';
  runBtn.disabled = false;
}

function openCreateAdminModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'create-admin-modal';
  overlay.innerHTML = `
    <div class="modal-box cam-box">
      <div class="cam-header">
        <div class="cam-icon-wrap"><span class="cam-icon">&#128737;</span></div>
        <div class="cam-header-text">
          <div class="cam-title">Create Admin Account</div>
          <div class="cam-subtitle">New admin will have full management access</div>
        </div>
        <button class="modal-close-btn" onclick="document.getElementById('create-admin-modal').remove()">&#10005;</button>
      </div>
      <div class="cam-body">
        <div class="cam-field">
          <label class="cam-label">Username</label>
          <div class="cam-input-wrap">
            <span class="cam-input-icon">&#128100;</span>
            <input type="text" id="cam-username" placeholder="e.g. manager01" class="cam-input" autocomplete="off"/>
          </div>
        </div>
        <div class="cam-field">
          <label class="cam-label">Password</label>
          <div class="cam-input-wrap">
            <span class="cam-input-icon">&#128274;</span>
            <input type="password" id="cam-password" placeholder="Min. 6 characters" class="cam-input"/>
          </div>
        </div>
        <div class="cam-field">
          <label class="cam-label">Email</label>
          <div class="cam-input-wrap">
            <span class="cam-input-icon">&#9993;</span>
            <input type="email" id="cam-email" placeholder="admin@example.com" class="cam-input"/>
          </div>
        </div>
        <div class="cam-notice">&#9888; This account will have admin-level permissions. Only create for trusted team members.</div>
      </div>
      <div class="cam-footer">
        <button class="modal-cancel" onclick="document.getElementById('create-admin-modal').remove()">Cancel</button>
        <button class="cam-submit" onclick="submitCreateAdmin()">&#10133; Create Admin</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById('cam-username').focus();
}

async function submitCreateAdmin() {
  const username = document.getElementById('cam-username')?.value.trim();
  const password = document.getElementById('cam-password')?.value.trim();
  const email = document.getElementById('cam-email')?.value.trim();
  if (!username || !password || !email) { showToast('All fields are required', 'error'); return; }
  try {
    await apiCall('POST', '/auth/create-admin', { username, password, email });
    showToast(`Admin "${username}" created!`, 'success');
    document.getElementById('create-admin-modal')?.remove();
  } catch (err) { showToast(err.message, 'error'); }
}

async function createAdminUser() {
  const username = document.getElementById('new-admin-username')?.value.trim();
  const password = document.getElementById('new-admin-password')?.value.trim();
  const email = document.getElementById('new-admin-email')?.value.trim();
  
  if (!username || !password || !email) {
    showToast('All fields are required', 'error');
    return;
  }
  
  try {
    await apiCall('POST', '/auth/create-admin', { username, password, email });
    showToast(`Admin "${username}" created successfully!`, 'success');
    document.getElementById('new-admin-username').value = '';
    document.getElementById('new-admin-password').value = '';
    document.getElementById('new-admin-email').value = '';
    runUserManager(); // Refresh the list
  } catch (err) {
    showToast(err.message, 'error');
  }
}
async function deleteUser(username) {
  const ok = await confirmModal(`Delete user "${username}"?\n\nThey will be locked out and cannot login anymore.`, 'Delete User');
  if (!ok) return;
  try {
    await apiCall('DELETE', `/auth/users/${username}`);
    showToast(`User "${username}" deleted.`, 'success');
    runUserManager();
  } catch (err) { showToast(err.message, 'error'); }
}

// ── Utilities ─────────────────────────────────────────────────────────────────
// -- Payroll Panel --
async function loadPayroll() {
  if (currentUser.role === 'admin') {
    await loadAdminPayroll();
  } else {
    await loadUserPayroll();
  }
}

// â”€â”€ Admin Payroll View â”€â”€
async function loadAdminPayroll() {
  const body = document.getElementById('payroll-body');
  const subtitle = document.getElementById('payroll-subtitle');
  if (subtitle) subtitle.textContent = 'Review and process VA payment requests';
  body.innerHTML = '<div class="loading">Loading...</div>';
  try {
    const payments = await apiCall('GET', '/payments');
    const pending  = payments.filter(function(p) { return p.status === 'pending'; });
    const paid     = payments.filter(function(p) { return p.status === 'paid'; });
    const rejected = payments.filter(function(p) { return p.status === 'rejected'; });
    const totalPaid = paid.reduce(function(s,p) { return s + parseFloat(p.amount||0); }, 0);

    let html = '<div class="payroll-stats">' +
      '<div class="payroll-stat pending"><div class="ps-value">' + pending.length + '</div><div class="ps-label">Pending</div></div>' +
      '<div class="payroll-stat paid"><div class="ps-value">' + paid.length + '</div><div class="ps-label">Paid</div></div>' +
      '<div class="payroll-stat total"><div class="ps-value">&#8369;' + totalPaid.toLocaleString() + '</div><div class="ps-label">Total Released</div></div>' +
    '</div>';

    if (pending.length) {
      html += '<div class="payroll-section-title">&#9203; Pending Requests</div>';
      html += pending.map(function(p) { return renderAdminPaymentCard(p, true); }).join('');
    }
    if (paid.length) {
      html += '<div class="payroll-section-title">&#10003; Payment History</div>';
      html += paid.map(function(p) { return renderAdminPaymentCard(p, false); }).join('');
    }
    if (rejected.length) {
      html += '<div class="payroll-section-title">&#10060; Rejected</div>';
      html += rejected.map(function(p) { return renderAdminPaymentCard(p, false); }).join('');
    }
    if (!payments.length) html += '<div class="empty-state"><div class="emoji">&#128181;</div><p>No payment requests yet</p></div>';

    body.innerHTML = html;
  } catch (err) { body.innerHTML = '<div class="empty-state"><p>' + escHtml(err.message) + '</p></div>'; }
}

function renderAdminPaymentCard(p, showActions) {
  const statusClass = { pending: 'status-pending', paid: 'status-paid', rejected: 'status-rejected' }[p.status] || '';
  const methodIcon = { GCash: '&#128241;', 'Bank Transfer': '&#127981;', PayPal: '&#128179;', 'Maya': '&#128241;' }[p.method] || '&#128181;';
  const proofThumb = p.proofOfPayment && p.proofOfPayment.startsWith('data:image')
    ? '<img src="' + p.proofOfPayment + '" class="payment-proof-thumb" onclick="viewPaymentProof(\'' + p.id + '\')" title="View proof of payment"/>'
    : '';
  const actions = showActions
    ? '<div class="payment-card-actions">' +
        '<button class="btn-pay" onclick="openPayModal(\'' + p.id + '\',\'' + escHtml(p.username) + '\',\'' + escHtml(p.amount) + '\')">&#128181; Mark as Paid</button>' +
        '<button class="btn-reject-pay" onclick="rejectPayment(\'' + p.id + '\')">&#10005; Reject</button>' +
      '</div>'
    : (p.paidAt ? '<div class="payment-paid-info">Paid ' + new Date(p.paidAt).toLocaleDateString() + ' by @' + escHtml(p.paidBy) + '</div>' : '');

  return '<div class="payment-card">' +
    '<div class="payment-card-header">' +
      '<div class="payment-user-info">' +
        '<div class="payment-avatar">' + p.username.slice(0,2).toUpperCase() + '</div>' +
        '<div>' +
          '<div class="payment-username">@' + escHtml(p.username) + '</div>' +
          '<div class="payment-tasks-done">&#10003; ' + (p.taskStats ? p.taskStats.done : 0) + ' tasks completed</div>' +
        '</div>' +
      '</div>' +
      '<span class="payment-status-badge ' + statusClass + '">' + p.status.toUpperCase() + '</span>' +
    '</div>' +
    '<div class="payment-card-body">' +
      '<div class="payment-method">' + methodIcon + ' ' + escHtml(p.method) + '</div>' +
      '<div class="payment-account">' +
        '<span class="payment-account-name">' + escHtml(p.accountName) + '</span>' +
        '<span class="payment-account-number">' + escHtml(p.accountNumber) + '</span>' +
      '</div>' +
      '<div class="payment-amount">&#8369;' + parseFloat(p.amount).toLocaleString() + '</div>' +
      (p.note ? '<div class="payment-note">&#128172; ' + escHtml(p.note) + '</div>' : '') +
      '<div class="payment-date">Submitted: ' + new Date(p.submittedAt).toLocaleString() + '</div>' +
    '</div>' +
    proofThumb +
    actions +
  '</div>';
}

function openPayModal(payId, username, amount) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'pay-modal';
  overlay.innerHTML = '<div class="modal-box pay-modal-box">' +
    '<div class="modal-icon">&#128181;</div>' +
    '<h3 style="margin-bottom:6px">Mark as Paid</h3>' +
    '<p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:16px">@' + escHtml(username) + ' &mdash; <strong>&#8369;' + parseFloat(amount).toLocaleString() + '</strong></p>' +
    '<div class="submit-upload-area" id="pay-upload-area" style="margin-bottom:12px">' +
      '<div class="submit-upload-icon">&#128247;</div>' +
      '<div class="submit-upload-text">Upload proof of payment (optional)<br><span>Screenshot of GCash/bank transfer</span></div>' +
      '<input type="file" accept="image/*" style="position:absolute;inset:0;opacity:0;cursor:pointer" onchange="handlePayProof(event)"/>' +
    '</div>' +
    '<div id="pay-proof-preview" style="display:none;margin-bottom:12px;text-align:center"></div>' +
    '<div class="modal-actions">' +
      '<button class="modal-cancel" onclick="document.getElementById(\'pay-modal\').remove()">Cancel</button>' +
      '<button class="modal-confirm" style="background:var(--success);color:#0f1117" onclick="confirmPay(\'' + payId + '\')">&#10003; Confirm Paid</button>' +
    '</div>' +
  '</div>';
  document.body.appendChild(overlay);
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
}

let pendingPayProof = null;
function handlePayProof(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    pendingPayProof = ev.target.result;
    const preview = document.getElementById('pay-proof-preview');
    preview.innerHTML = '<img src="' + pendingPayProof + '" style="max-width:100%;max-height:140px;border-radius:8px;border:1px solid var(--border)"/>';
    preview.style.display = 'block';
    document.getElementById('pay-upload-area').style.borderColor = 'var(--success)';
  };
  reader.readAsDataURL(file);
}

async function confirmPay(payId) {
  try {
    await apiCall('POST', '/payments/' + payId + '/pay', { proofOfPayment: pendingPayProof || '' });
    pendingPayProof = null;
    const modal = document.getElementById('pay-modal');
    if (modal) modal.remove();
    showToast('Payment marked as paid!', 'success');
    loadAdminPayroll();
  } catch (err) { showToast(err.message, 'error'); }
}

async function rejectPayment(payId) {
  const ok = await confirmModal('Reject this payment request?', 'Reject');
  if (!ok) return;
  try {
    await apiCall('POST', '/payments/' + payId + '/reject');
    showToast('Payment request rejected.', 'success');
    loadAdminPayroll();
  } catch (err) { showToast(err.message, 'error'); }
}

function viewPaymentProof(payId) {
  // reuse viewProof concept but for payment proof
  const allPayments = document.querySelectorAll('.payment-proof-thumb');
  // find src from the card â€” simpler: just open in new tab
  const img = document.querySelector('[onclick="viewPaymentProof(\'' + payId + '\')"]');
  if (!img) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML = '<div class="proof-viewer"><button onclick="this.closest(\'.modal-overlay\').remove()" style="position:absolute;top:12px;right:12px;background:transparent;border:none;color:#fff;font-size:1.5rem;cursor:pointer">&#10005;</button><img src="' + img.src + '" style="max-width:90vw;max-height:85vh;border-radius:12px"/></div>';
  document.body.appendChild(overlay);
}

// â”€â”€ User Payroll View â”€â”€
async function loadUserPayroll() {
  const body = document.getElementById('payroll-body');
  const subtitle = document.getElementById('payroll-subtitle');
  if (subtitle) subtitle.textContent = 'Submit your payment details and track requests';
  body.innerHTML = '<div class="loading">Loading...</div>';
  try {
    const data = await apiCall('GET', '/payments/mine');
    const { payments, taskStats } = data;
    const pending = payments.filter(function(p) { return p.status === 'pending'; });
    const hasPending = pending.length > 0;

    let html = '<div class="user-payroll-stats">' +
      '<div class="ups-card"><div class="ups-value">' + taskStats.total + '</div><div class="ups-label">Total Tasks</div></div>' +
      '<div class="ups-card"><div class="ups-value">' + taskStats.done + '</div><div class="ups-label">Completed</div></div>' +
      '<div class="ups-card"><div class="ups-value">' + payments.filter(function(p){return p.status==='paid';}).length + '</div><div class="ups-label">Times Paid</div></div>' +
    '</div>';

    // Submit form
    html += '<div class="payroll-submit-card">' +
      '<div class="payroll-submit-title">&#128181; Request Payment</div>' +
      (hasPending ? '<div class="payroll-pending-notice">&#9203; You have a pending request. Wait for admin to process it before submitting a new one.</div>' : '') +
      '<div class="payroll-form" ' + (hasPending ? 'style="opacity:0.5;pointer-events:none"' : '') + '>' +
        '<div class="form-group"><label>Payment Method</label>' +
          '<select id="pay-method"><option>GCash</option><option>Maya</option><option>Bank Transfer</option><option>PayPal</option></select>' +
        '</div>' +
        '<div class="form-group"><label>Account Name</label><input type="text" id="pay-account-name" placeholder="Full name on account"/></div>' +
        '<div class="form-group"><label>Account Number / Email</label><input type="text" id="pay-account-number" placeholder="09XXXXXXXXX or email"/></div>' +
        '<div class="form-group"><label>Amount Requested (&#8369;)</label><input type="number" id="pay-amount" placeholder="0.00" min="1"/></div>' +
        '<div class="form-group"><label>Note (optional)</label><input type="text" id="pay-note" placeholder="e.g. Week 1 payment, 5 tasks completed"/></div>' +
        '<button class="btn-sm" onclick="submitPaymentRequest()" style="width:100%;margin-top:4px">&#128228; Submit Request</button>' +
      '</div>' +
    '</div>';

    // Payment history
    if (payments.length) {
      html += '<div class="payroll-section-title">&#128203; My Payment History</div>';
      html += payments.slice().reverse().map(function(p) {
        const statusClass = { pending: 'status-pending', paid: 'status-paid', rejected: 'status-rejected' }[p.status] || '';
        const proofThumb = p.proofOfPayment && p.proofOfPayment.startsWith('data:image')
          ? '<img src="' + p.proofOfPayment + '" class="payment-proof-thumb" style="max-height:80px;margin-top:8px;border-radius:6px;border:1px solid var(--border)" onclick="this.style.maxHeight=this.style.maxHeight===\'none\'?\'80px\':\'none\'" title="Proof of payment"/>'
          : '';
        return '<div class="payment-card user-payment-card">' +
          '<div class="payment-card-header">' +
            '<div><div class="payment-method">&#128181; ' + escHtml(p.method) + ' &mdash; ' + escHtml(p.accountNumber) + '</div>' +
            '<div class="payment-amount" style="font-size:1.1rem">&#8369;' + parseFloat(p.amount).toLocaleString() + '</div></div>' +
            '<span class="payment-status-badge ' + statusClass + '">' + p.status.toUpperCase() + '</span>' +
          '</div>' +
          (p.note ? '<div class="payment-note">&#128172; ' + escHtml(p.note) + '</div>' : '') +
          '<div class="payment-date">Submitted: ' + new Date(p.submittedAt).toLocaleString() + '</div>' +
          (p.paidAt ? '<div class="payment-paid-info">&#10003; Paid on ' + new Date(p.paidAt).toLocaleDateString() + '</div>' : '') +
          proofThumb +
        '</div>';
      }).join('');
    }

    body.innerHTML = html;
  } catch (err) { body.innerHTML = '<div class="empty-state"><p>' + escHtml(err.message) + '</p></div>'; }
}

async function submitPaymentRequest() {
  const method = document.getElementById('pay-method').value;
  const accountName = document.getElementById('pay-account-name').value.trim();
  const accountNumber = document.getElementById('pay-account-number').value.trim();
  const amount = document.getElementById('pay-amount').value.trim();
  const note = document.getElementById('pay-note').value.trim();
  if (!accountName || !accountNumber || !amount) return showToast('Please fill all required fields', 'error');
  try {
    await apiCall('POST', '/payments', { method, accountName, accountNumber, amount, note });
    showToast('Payment request submitted!', 'success');
    loadUserPayroll();
  } catch (err) { showToast(err.message, 'error'); }
}
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function skeletonRows(n) {
  return Array(n).fill('<div class="skel-row"><span class="skel skel-icon"></span><span class="skel skel-line"></span><span class="skel skel-short"></span></div>').join('');
}

function skeletonCards(n) {
  return Array(n).fill('<div class="skel-card"><span class="skel skel-title"></span><span class="skel skel-line"></span><span class="skel skel-line"></span></div>').join('');
}

function confirmModal(message, confirmLabel = 'Confirm') {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box">
        <div class="modal-icon">⚠️</div>
        <div class="modal-msg">${escHtml(message)}</div>
        <div class="modal-actions">
          <button class="modal-cancel">Cancel</button>
          <button class="modal-confirm">${escHtml(confirmLabel)}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.modal-cancel').onclick = () => { overlay.remove(); resolve(false); };
    overlay.querySelector('.modal-confirm').onclick = () => { overlay.remove(); resolve(true); };
    overlay.onclick = e => { if (e.target === overlay) { overlay.remove(); resolve(false); } };
  });
}


// -- Profile --
let pendingAvatar = null;

async function openProfileModal() {
  try {
    const profile = await apiCall('GET', '/auth/profile');
    document.getElementById('profile-username').value = profile.username;
    document.getElementById('profile-displayname').value = profile.displayName || '';
    document.getElementById('profile-email').value = profile.email || '';
    pendingAvatar = null;
    renderAvatarPreview(profile.avatar, profile.username);
    document.getElementById('profile-modal').style.display = 'flex';
  } catch (err) { showToast(err.message, 'error'); }
}

function closeProfileModal() {
  document.getElementById('profile-modal').style.display = 'none';
  pendingAvatar = null;
}

function renderAvatarPreview(avatar, username) {
  const el = document.getElementById('profile-avatar-preview');
  if (avatar) {
    el.style.backgroundImage = 'url(' + avatar + ')';
    el.style.backgroundSize = 'cover';
    el.style.backgroundPosition = 'center';
    el.textContent = '';
  } else {
    el.style.backgroundImage = '';
    el.textContent = (username || '?').slice(0, 2).toUpperCase();
  }
}

function handleAvatarUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { showToast('Image must be under 2MB', 'error'); return; }
  const reader = new FileReader();
  reader.onload = function(ev) {
    pendingAvatar = ev.target.result;
    renderAvatarPreview(pendingAvatar, currentUser.username);
  };
  reader.readAsDataURL(file);
}

function removeAvatar() {
  pendingAvatar = '';
  renderAvatarPreview('', currentUser.username);
}

async function saveProfile() {
  const displayName = document.getElementById('profile-displayname').value.trim();
  const email = document.getElementById('profile-email').value.trim();
  const body = { displayName, email };
  if (pendingAvatar !== null) body.avatar = pendingAvatar;
  try {
    const updated = await apiCall('PUT', '/auth/profile', body);
    currentUser.displayName = updated.displayName;
    currentUser.avatar = updated.avatar;
    localStorage.setItem('mh_user', JSON.stringify(currentUser));
    updateTopbarAvatar();
    closeProfileModal();
    showToast('Profile updated!', 'success');
  } catch (err) { showToast(err.message, 'error'); }
}

function updateTopbarAvatar() {
  const btn = document.getElementById('topbar-avatar');
  if (!btn) return;
  if (currentUser.avatar) {
    btn.style.backgroundImage = 'url(' + currentUser.avatar + ')';
    btn.style.backgroundSize = 'cover';
    btn.style.backgroundPosition = 'center';
    btn.textContent = '';
  } else {
    btn.style.backgroundImage = '';
    btn.textContent = (currentUser.displayName || currentUser.username || '?').slice(0, 2).toUpperCase();
  }
}
function showToast(msg, type) {
  if (!type) type = '';
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(function() { toast.remove(); }, 3500);
}

function toggleTheme() {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('mh_theme', isDark ? 'dark' : 'light');
  applyThemeSwitch(isDark);
}

function applyTheme() {
  const saved = localStorage.getItem('mh_theme');
  const isDark = saved === 'dark';
  document.body.classList.toggle('dark', isDark);
  applyThemeSwitch(isDark);
}

function applyThemeSwitch(isDark) {
  const sw = document.getElementById('theme-toggle');
  if (!sw) return;
  sw.classList.toggle('is-dark', isDark);
}

// Toggle mobile sidebar
function toggleMobileSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  const isOpen = sidebar.classList.toggle('open');
  if (backdrop) backdrop.classList.toggle('show', isOpen);
}

document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  // Close notif dropdown on outside click
  document.addEventListener('click', (e) => {
    const wrap = document.querySelector('.notif-bell-wrap');
    if (wrap && !wrap.contains(e.target)) {
      document.getElementById('notif-dropdown')?.classList.remove('open');
    }
    // Close mobile sidebar on outside click (handled by backdrop now)
  });

  // Enter key for chat
  document.getElementById('chat-input').addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });

  // Enter key for login
  document.getElementById('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
  document.getElementById('login-username').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });

  // Check saved session
  const savedToken = localStorage.getItem('mh_token');
  const savedUser = localStorage.getItem('mh_user');
  if (savedToken && savedUser) {
    token = savedToken;
    currentUser = JSON.parse(savedUser);
    initApp();
  }
});


// ══════════════════════════════════════════════════════════════════════════════
// ── Calendar / Due Date Feature ──────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

let calYear  = new Date().getFullYear();
let calMonth = new Date().getMonth(); // 0-indexed

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns a CSS class name based on how close/past the due date is.
 * @param {string} dueDate  ISO date string (YYYY-MM-DD or full ISO)
 * @param {string} status   task status
 */
function getDueClass(dueDate, status) {
  if (!dueDate) return 'no-due';
  if (status === 'done') return 'done';
  const due  = new Date(dueDate);
  const now  = new Date();
  // Normalise to midnight for day-level comparison
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due - now) / 86400000);
  if (diffDays < 0)  return 'overdue';
  if (diffDays <= 3) return 'due-soon';
  return 'on-track';
}

/**
 * Formats a YYYY-MM-DD string to a human-readable short date.
 */
function formatDueDate(dueDate) {
  if (!dueDate) return '';
  const d = new Date(dueDate + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Returns a label like "Due May 12" or "Overdue · May 10".
 */
function dueDateLabel(dueDate, status) {
  if (!dueDate) return '';
  const cls = getDueClass(dueDate, status);
  const formatted = formatDueDate(dueDate);
  if (cls === 'overdue')  return '⚠ Overdue · ' + formatted;
  if (cls === 'due-soon') return '⏰ Due soon · ' + formatted;
  if (cls === 'done')     return '✓ ' + formatted;
  return '📅 Due ' + formatted;
}

// ── Due date badge rendered on task cards ────────────────────────────────────

function renderDueBadge(task) {
  if (!task.dueDate) return '';
  const cls   = getDueClass(task.dueDate, task.status);
  const label = dueDateLabel(task.dueDate, task.status);
  const editBtn = (currentUser && currentUser.role === 'admin' && task.status !== 'done')
    ? '<button class="btn-edit-due" onclick="openEditDueModal(\'' + task.id + '\',\'' + escHtml(task.dueDate) + '\',event)" title="Edit due date">✏</button>'
    : '';
  return '<div style="display:flex;align-items:center;gap:2px">' +
    '<span class="task-due-badge ' + cls + '">' + escHtml(label) + '</span>' +
    editBtn +
  '</div>';
}

// ── Patch renderTasks to include due date badges ──────────────────────────────
// We fully override renderTasks below to include due date badges on task cards.

// Override renderTasks to include due date badges
// (replaces the original defined earlier in app.js)
window.renderTasks = function renderTasks() {
  var isAdmin = currentUser.role === 'admin';
  var cols = { todo: [], 'in-progress': [], 'pending-review': [], done: [] };
  allTasks.forEach(function(t) { if (cols[t.status]) cols[t.status].push(t); });

  ['todo','in-progress','pending-review'].forEach(function(status) {
    var tasks = cols[status];
    var col = document.getElementById('col-' + status);
    var countEl = document.getElementById('count-' + status);
    if (!col) return;
    if (countEl) countEl.textContent = tasks.length;

    col.innerHTML = tasks.map(function(t) {
      var isAssignee = t.assignee === currentUser.username;
      var canSubmit = !isAdmin && isAssignee && (status === 'todo' || status === 'in-progress');

      var dueBadgeHtml = renderDueBadge(t);

      if (status === 'pending-review') {
        var proofHtml = '';
        if (t.proof) {
          var isImage = t.proof.startsWith('data:image');
          proofHtml = isImage
            ? '<img src="' + t.proof + '" class="task-proof-img" onclick="viewProof(\'' + t.id + '\')" title="Click to view"/>'
            : '<a class="task-proof-file" href="' + t.proof + '" download="' + escHtml(t.proofName || 'proof') + '">&#128196; ' + escHtml(t.proofName || 'Download proof') + '</a>';
        }
        var submitted = t.submittedAt ? '<div class="task-submitted-at">Submitted: ' + new Date(t.submittedAt).toLocaleString() + '</div>' : '';
        var waitingBadge = !isAdmin && isAssignee ? '<div class="task-waiting-badge">&#9203; Waiting for admin approval</div>' : '';
        var adminActions = isAdmin
          ? '<div class="task-actions review-actions"><button class="btn-approve" onclick="approveTask(\'' + t.id + '\')">&#10003; Approve</button><button class="btn-reject" onclick="openRejectModal(\'' + t.id + '\')">&#10005; Reject</button></div>'
          : '';
        return '<div class="task-card task-review">' +
          '<div class="task-card-title">' + escHtml(t.title) + '</div>' +
          '<div class="task-card-desc">' + escHtml(t.description || '') + '</div>' +
          '<div class="task-card-meta"><span class="task-assignee">@' + t.assignee + '</span><span class="badge badge-' + t.priority + '">' + t.priority + '</span></div>' +
          dueBadgeHtml +
          submitted + proofHtml + waitingBadge + adminActions +
        '</div>';
      }

      var rejectedBanner = t.rejectedReason ? '<div class="task-rejected-banner">&#10060; Rejected: ' + escHtml(t.rejectedReason) + '</div>' : '';
      var actions = '';
      if (isAdmin) {
        actions = '<div class="task-actions">' +
          (status !== 'in-progress' ? '<button onclick="moveTask(\'' + t.id + '\',\'in-progress\')">&#9654; In Progress</button>' : '') +
          '<button class="del-btn" onclick="deleteTask(\'' + t.id + '\')">&#10005; Delete</button>' +
        '</div>';
      } else if (canSubmit) {
        actions = '<div class="task-actions"><button class="btn-submit-review" onclick="openSubmitModal(\'' + t.id + '\',\'' + escHtml(t.title) + '\')">&#128196; Submit for Review</button></div>';
      }

      var taskImgHtml = t.taskImage
        ? '<img src="' + t.taskImage + '" class="task-ref-img" onclick="viewTaskImage(\'' + t.id + '\')" title="View reference image"/>'
        : '';

      return '<div class="task-card">' +
        '<div class="task-card-title">' + escHtml(t.title) + '</div>' +
        '<div class="task-card-desc">' + escHtml(t.description || '') + '</div>' +
        rejectedBanner +
        taskImgHtml +
        '<div class="task-card-meta"><span class="task-assignee">@' + t.assignee + '</span><span class="badge badge-' + t.priority + '">' + t.priority + '</span></div>' +
        dueBadgeHtml +
        actions +
      '</div>';
    }).join('') || '<div class="empty-state"><p>No tasks</p></div>';
  });
};

// ── Patch createTask to send dueDate ─────────────────────────────────────────
var _origCreateTask = window.createTask;
window.createTask = async function createTask() {
  var title       = document.getElementById('task-title').value.trim();
  var description = document.getElementById('task-desc').value.trim();
  var assignee    = document.getElementById('task-assignee').value.trim();
  var priority    = document.getElementById('task-priority').value;
  var dueDate     = document.getElementById('task-due-date') ? document.getElementById('task-due-date').value : '';
  if (!title || !assignee) return showToast('Title and assignee are required', 'error');
  try {
    await apiCall('POST', '/tasks', {
      title, description, assignee, priority,
      status: 'todo',
      taskImage: pendingTaskImage || '',
      dueDate: dueDate || ''
    });
    document.getElementById('task-title').value = '';
    document.getElementById('task-desc').value = '';
    document.getElementById('task-assignee').value = '';
    if (document.getElementById('task-due-date')) document.getElementById('task-due-date').value = '';
    clearTaskImage();
    showToast('Task created!', 'success');
  } catch (err) { showToast(err.message, 'error'); }
};

// ── Edit Due Date Modal (admin) ───────────────────────────────────────────────
function openEditDueModal(taskId, currentDue, event) {
  if (event) event.stopPropagation();
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'edit-due-modal';
  overlay.innerHTML =
    '<div class="modal-box" style="max-width:320px;text-align:left">' +
      '<div class="modal-icon">&#128197;</div>' +
      '<h3 style="margin-bottom:14px;text-align:center">Set Due Date</h3>' +
      '<div class="form-group">' +
        '<label>Due Date</label>' +
        '<input type="date" id="edit-due-input" class="task-due-input" value="' + escHtml(currentDue || '') + '"/>' +
      '</div>' +
      '<div class="modal-actions" style="margin-top:16px">' +
        '<button class="modal-cancel" onclick="document.getElementById(\'edit-due-modal\').remove()">Cancel</button>' +
        '<button class="modal-confirm" style="background:var(--accent)" onclick="saveEditDue(\'' + taskId + '\')">Save</button>' +
        (currentDue ? '<button class="modal-cancel" style="border-color:var(--danger);color:var(--danger)" onclick="clearDueDate(\'' + taskId + '\')">Remove</button>' : '') +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
  var inp = document.getElementById('edit-due-input');
  if (inp) inp.focus();
}

async function saveEditDue(taskId) {
  var inp = document.getElementById('edit-due-input');
  var dueDate = inp ? inp.value : '';
  try {
    var updated = await apiCall('PUT', '/tasks/' + taskId, { dueDate: dueDate });
    var idx = allTasks.findIndex(function(t) { return t.id === taskId; });
    if (idx !== -1) allTasks[idx] = updated;
    document.getElementById('edit-due-modal').remove();
    showToast('Due date updated!', 'success');
    renderTasks();
    if (document.getElementById('panel-calendar').classList.contains('active')) renderCalendar();
  } catch (err) { showToast(err.message, 'error'); }
}

async function clearDueDate(taskId) {
  try {
    var updated = await apiCall('PUT', '/tasks/' + taskId, { dueDate: '' });
    var idx = allTasks.findIndex(function(t) { return t.id === taskId; });
    if (idx !== -1) allTasks[idx] = updated;
    document.getElementById('edit-due-modal').remove();
    showToast('Due date removed.', 'success');
    renderTasks();
    if (document.getElementById('panel-calendar').classList.contains('active')) renderCalendar();
  } catch (err) { showToast(err.message, 'error'); }
}

// ── Calendar rendering ────────────────────────────────────────────────────────

async function loadCalendar() {
  try {
    allTasks = await apiCall('GET', '/tasks');
    renderCalendar();
  } catch (err) { showToast(err.message, 'error'); }
}

function calPrevMonth() {
  calMonth--;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
}

function calNextMonth() {
  calMonth++;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
}

function calGoToday() {
  var now = new Date();
  calYear  = now.getFullYear();
  calMonth = now.getMonth();
  renderCalendar();
}

function renderCalendar() {
  var grid = document.getElementById('calendar-grid');
  var title = document.getElementById('cal-month-title');
  if (!grid) return;

  var monthNames = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
  title.textContent = monthNames[calMonth] + ' ' + calYear;

  // Build a map: "YYYY-MM-DD" → [tasks]
  var taskMap = {};
  allTasks.forEach(function(t) {
    if (!t.dueDate) return;
    // Normalise to YYYY-MM-DD
    var key = t.dueDate.slice(0, 10);
    if (!taskMap[key]) taskMap[key] = [];
    taskMap[key].push(t);
  });

  var today = new Date();
  today.setHours(0,0,0,0);

  // First day of the month
  var firstDay = new Date(calYear, calMonth, 1);
  var startDow = firstDay.getDay(); // 0=Sun

  // Last day of the month
  var lastDay = new Date(calYear, calMonth + 1, 0);
  var totalDays = lastDay.getDate();

  // Day headers
  var dayHeaders = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var html = dayHeaders.map(function(d) {
    return '<div class="calendar-day-header">' + d + '</div>';
  }).join('');

  // Blank cells before first day
  for (var i = 0; i < startDow; i++) {
    // Previous month days
    var prevLast = new Date(calYear, calMonth, 0).getDate();
    var prevDay  = prevLast - startDow + i + 1;
    html += '<div class="calendar-cell other-month"><div class="cal-day-num">' + prevDay + '</div></div>';
  }

  // Actual days
  for (var d = 1; d <= totalDays; d++) {
    var cellDate = new Date(calYear, calMonth, d);
    cellDate.setHours(0,0,0,0);
    var isToday = cellDate.getTime() === today.getTime();

    // Build YYYY-MM-DD key
    var mm = String(calMonth + 1).padStart(2, '0');
    var dd = String(d).padStart(2, '0');
    var key = calYear + '-' + mm + '-' + dd;

    var tasks = taskMap[key] || [];
    var MAX_VISIBLE = 3;
    var visible = tasks.slice(0, MAX_VISIBLE);
    var overflow = tasks.length - MAX_VISIBLE;

    var chipsHtml = visible.map(function(t) {
      var cls = getDueClass(t.dueDate, t.status);
      return '<div class="cal-task-chip ' + cls + '" onclick="showCalTaskPopup(\'' + t.id + '\',event)" title="' + escHtml(t.title) + '">' +
        escHtml(t.title.length > 18 ? t.title.slice(0,17) + '…' : t.title) +
      '</div>';
    }).join('');

    if (overflow > 0) {
      chipsHtml += '<div class="cal-more" onclick="showCalDayModal(\'' + key + '\',event)">+' + overflow + ' more</div>';
    }

    html += '<div class="calendar-cell' + (isToday ? ' today' : '') + '">' +
      '<div class="cal-day-num">' + d + '</div>' +
      chipsHtml +
    '</div>';
  }

  // Fill remaining cells to complete the last row
  var totalCells = startDow + totalDays;
  var remainder  = totalCells % 7;
  if (remainder !== 0) {
    var nextDayCount = 7 - remainder;
    for (var n = 1; n <= nextDayCount; n++) {
      html += '<div class="calendar-cell other-month"><div class="cal-day-num">' + n + '</div></div>';
    }
  }

  grid.innerHTML = html;
}

// ── Calendar task popup ───────────────────────────────────────────────────────

function showCalTaskPopup(taskId, event) {
  event.stopPropagation();
  // Remove any existing popup
  var existing = document.getElementById('cal-popup');
  if (existing) existing.remove();

  var task = allTasks.find(function(t) { return t.id === taskId; });
  if (!task) return;

  var cls   = getDueClass(task.dueDate, task.status);
  var popup = document.createElement('div');
  popup.className = 'cal-popup';
  popup.id = 'cal-popup';

  var editBtn = (currentUser && currentUser.role === 'admin' && task.status !== 'done')
    ? '<button class="btn-sm" style="width:100%;margin-top:10px;font-size:0.75rem" onclick="openEditDueModal(\'' + task.id + '\',\'' + escHtml(task.dueDate || '') + '\',event)">&#128197; Edit Due Date</button>'
    : '';

  popup.innerHTML =
    '<button class="cal-popup-close" onclick="document.getElementById(\'cal-popup\').remove()">&#10005;</button>' +
    '<div class="cal-popup-title">' + escHtml(task.title) + '</div>' +
    '<div class="cal-popup-meta">' +
      '<span>&#128100; @' + escHtml(task.assignee) + '</span>' +
      '<span><span class="badge badge-' + task.priority + '">' + task.priority + '</span></span>' +
      '<span><span class="task-due-badge ' + cls + '">' + escHtml(dueDateLabel(task.dueDate, task.status)) + '</span></span>' +
      '<span>Status: <strong>' + escHtml(task.status) + '</strong></span>' +
      (task.description ? '<span>' + escHtml(task.description) + '</span>' : '') +
    '</div>' +
    editBtn;

  document.body.appendChild(popup);

  // Position near click
  var x = event.clientX + 10;
  var y = event.clientY + 10;
  // Keep within viewport
  if (x + 290 > window.innerWidth)  x = event.clientX - 290;
  if (y + 200 > window.innerHeight) y = event.clientY - 200;
  popup.style.left = x + 'px';
  popup.style.top  = y + 'px';

  // Close on outside click
  setTimeout(function() {
    document.addEventListener('click', function closePopup(e) {
      if (!popup.contains(e.target)) {
        popup.remove();
        document.removeEventListener('click', closePopup);
      }
    });
  }, 0);
}

function showCalDayModal(dateKey, event) {
  event.stopPropagation();
  var tasks = allTasks.filter(function(t) { return t.dueDate && t.dueDate.slice(0,10) === dateKey; });
  if (!tasks.length) return;

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'cal-day-modal';

  var formatted = formatDueDate(dateKey);
  var items = tasks.map(function(t) {
    var cls = getDueClass(t.dueDate, t.status);
    var clsColorMap = { overdue: 'var(--danger)', 'due-soon': 'var(--warning)', 'on-track': 'var(--success)', done: 'var(--text-muted)', 'no-due': 'var(--border)' };
    var dotColor = clsColorMap[cls] || 'var(--border)';
    return '<div class="upcoming-due-item" onclick="showCalTaskPopup(\'' + t.id + '\',event)">' +
      '<div class="upcoming-due-dot" style="background:' + dotColor + '"></div>' +
      '<span class="upcoming-due-title">' + escHtml(t.title) + '</span>' +
      '<span class="upcoming-due-date">@' + escHtml(t.assignee) + '</span>' +
    '</div>';
  }).join('');

  overlay.innerHTML =
    '<div class="modal-box" style="max-width:360px;text-align:left">' +
      '<div class="modal-icon">&#128197;</div>' +
      '<h3 style="margin-bottom:14px;text-align:center">' + escHtml(formatted) + '</h3>' +
      '<div class="upcoming-due-list">' + items + '</div>' +
      '<div class="modal-actions" style="margin-top:16px">' +
        '<button class="modal-cancel" onclick="document.getElementById(\'cal-day-modal\').remove()">Close</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
}

// ── Hook calendar into navigation ────────────────────────────────────────────
// Patch navigateTo to handle the calendar panel
var _origNavigateTo = window.navigateTo;
window.navigateTo = function navigateTo(panel) {
  _origNavigateTo(panel);
  if (panel === 'calendar') loadCalendar();
};

// ── Dashboard: show upcoming due dates widget ─────────────────────────────────
// Patch loadDashboard to add upcoming due dates after it loads
var _origLoadDashboard = window.loadDashboard;
window.loadDashboard = async function loadDashboard() {
  await _origLoadDashboard();
  // Inject upcoming due dates into the dashboard if the container exists
  renderUpcomingDueDates();
};

function renderUpcomingDueDates() {
  // Find the recent-tasks dash-card and add an upcoming dues section after it
  var recentTasksCard = document.querySelector('.dash-card:last-child');
  if (!recentTasksCard) return;

  // Remove existing upcoming widget if any
  var existing = document.getElementById('upcoming-due-widget');
  if (existing) existing.remove();

  // Get tasks with due dates, not done, sorted by due date
  var upcoming = allTasks
    .filter(function(t) { return t.dueDate && t.status !== 'done'; })
    .sort(function(a, b) { return new Date(a.dueDate) - new Date(b.dueDate); })
    .slice(0, 5);

  if (!upcoming.length) return;

  var widget = document.createElement('div');
  widget.id = 'upcoming-due-widget';
  widget.className = 'dash-card';
  widget.style.marginTop = '16px';

  var dotColors = { overdue: 'var(--danger)', 'due-soon': 'var(--warning)', 'on-track': 'var(--success)', done: 'var(--text-muted)', 'no-due': 'var(--border)' };

  var items = upcoming.map(function(t) {
    var cls   = getDueClass(t.dueDate, t.status);
    var color = dotColors[cls] || 'var(--border)';
    return '<div class="upcoming-due-item" onclick="navigateTo(\'calendar\')">' +
      '<div class="upcoming-due-dot" style="background:' + color + '"></div>' +
      '<span class="upcoming-due-title">' + escHtml(t.title) + '</span>' +
      '<span class="upcoming-due-date">' + escHtml(formatDueDate(t.dueDate)) + '</span>' +
    '</div>';
  }).join('');

  widget.innerHTML = '<h4>&#128197; Upcoming Due Dates</h4><div class="upcoming-due-list">' + items + '</div>';

  // Insert after the dashboard grid
  var dashGrid = document.querySelector('.dashboard-grid');
  if (dashGrid) dashGrid.parentNode.insertBefore(widget, dashGrid.nextSibling);
}

// ── Real-time: update calendar when tasks change ──────────────────────────────
// Socket events already update allTasks and call renderTasks().
// We additionally re-render the calendar if it's open.
var _origInitSocket = window.initSocket;
window.initSocket = function initSocket() {
  _origInitSocket();
  // Patch task socket events to also refresh calendar
  if (socket) {
    socket.on('task:new', function() {
      if (document.getElementById('panel-calendar').classList.contains('active')) renderCalendar();
    });
    socket.on('task:updated', function() {
      if (document.getElementById('panel-calendar').classList.contains('active')) renderCalendar();
    });
    socket.on('task:deleted', function() {
      if (document.getElementById('panel-calendar').classList.contains('active')) renderCalendar();
    });
  }
};
