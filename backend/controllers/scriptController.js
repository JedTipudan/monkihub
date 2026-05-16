const { spawn } = require('child_process');
const path = require('path');

const SCRIPTS = {
  msgmanager: { label: 'Message Manager', file: null, icon: '💬', hideFile: true, virtual: true },
  notifier: { label: 'Auto Notifier',    file: 'notifier.js', icon: '🔔', hideFile: true },
  archiver: { label: 'Auto Archiver',    file: 'archiver.js', icon: '🗂',  hideFile: true },
  reporter: { label: 'Report Generator', file: 'reporter.js', icon: '📊', hideFile: true, persistent: true },
  usermanager: { label: 'User Manager',  file: null,          icon: '👥', hideFile: true, virtual: true }
};

// name -> { process, logs: string[] }
const running = {};

const ScriptController = {
  getStatus(req, res) {
    const status = {};
    for (const [name, meta] of Object.entries(SCRIPTS)) {
      status[name] = {
        ...meta,
        running: !!running[name],
        logs: running[name]?.logs.slice(-100) || []
      };
    }
    res.json(status);
  },

  start(req, res) {
    const { script } = req.params;
    if (!SCRIPTS[script]) return res.status(400).json({ error: 'Unknown script' });
    if (SCRIPTS[script].virtual) return res.status(400).json({ error: 'Virtual script — handled by frontend' });
    if (running[script]) return res.status(409).json({ error: 'Already running' });

    const scriptPath = path.join(__dirname, '../scripts', SCRIPTS[script].file);
    const proc = spawn(process.execPath, [scriptPath], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env }
    });

    running[script] = { process: proc, logs: [] };

    const onData = (data) => {
      const line = data.toString().trimEnd();
      if (!line) return;
      running[script]?.logs.push(line);
      if (running[script]?.logs.length > 200) running[script].logs.shift();
      req.io.emit(`script:log:${script}`, { line });
    };

    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);

    proc.on('close', (code) => {
      const line = `[process exited with code ${code}]`;
      running[script]?.logs.push(line);
      req.io.emit(`script:log:${script}`, { line });
      req.io.emit('script:stopped', { script });
      delete running[script];
    });

    req.io.emit('script:started', { script });
    res.json({ success: true });
  },

  stop(req, res) {
    const { script } = req.params;
    if (!running[script]) return res.status(404).json({ error: 'Not running' });
    running[script].process.kill('SIGTERM');
    res.json({ success: true });
  },

  getReport(req, res) {
    const reportPath = path.join(__dirname, '../data/report.html');
    if (!require('fs').existsSync(reportPath)) {
      return res.status(404).send('<p style="font-family:sans-serif;padding:40px;color:#f87171">No report generated yet. Start the Report Generator script first.</p>');
    }
    res.sendFile(reportPath);
  }
};

function isConsumerRunning() {
  return true; // Consumer is now embedded in the server
}

module.exports = { ...ScriptController, isConsumerRunning };
