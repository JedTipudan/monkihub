const fs = require('fs-extra');
const path = require('path');
const xml2js = require('xml2js');

const DATA_DIR = path.join(__dirname, '../data');
const XSLT_DIR = path.join(__dirname, '../xslt');

const parser = new xml2js.Parser();
const builder = new xml2js.Builder({ xmldec: { version: '1.0', encoding: 'UTF-8' } });

async function readXml(filename) {
  const content = await fs.readFile(path.join(DATA_DIR, filename), 'utf8');
  return parser.parseStringPromise(content);
}

async function writeXml(filename, data) {
  const xml = builder.buildObject(data);
  await fs.writeFile(path.join(DATA_DIR, filename), xml, 'utf8');
}

async function getRawXml(filename) {
  return fs.readFile(path.join(DATA_DIR, filename), 'utf8');
}

async function transformXslt(xmlFile, xsltFile) {
  const xmlPath  = path.join(DATA_DIR, xmlFile);
  const xsltPath = path.join(XSLT_DIR, xsltFile);
  const xslt3    = path.join(__dirname, '../node_modules/xslt3/xslt3.js');
  return new Promise((resolve) => {
    const { execFile } = require('child_process');
    execFile(process.execPath, [xslt3, `-xsl:${xsltPath}`, `-s:${xmlPath}`], { timeout: 10000 }, (err, stdout) => {
      if (err || !stdout.trim()) {
        fs.readFile(xmlPath, 'utf8').then(xml => resolve(buildFallbackHtml(xml, xmlFile))).catch(() => resolve('<p>Error</p>'));
      } else {
        resolve(stdout);
      }
    });
  });
}

function buildFallbackHtml(xmlContent, xmlFile) {
  const type = xmlFile.replace('.xml', '');
  return `<div class="xml-output"><h3>📄 ${type} (XML Parsed)</h3><pre class="xml-pre">${xmlContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></div>`;
}

async function initXmlFiles() {
  const bcrypt = require('bcryptjs');
  await fs.ensureDir(DATA_DIR);
  const defaults = {
    'messages.xml': '<?xml version="1.0" encoding="UTF-8"?>\n<messages></messages>',
    'tasks.xml': '<?xml version="1.0" encoding="UTF-8"?>\n<tasks></tasks>',
    'logs.xml': '<?xml version="1.0" encoding="UTF-8"?>\n<logs></logs>',
    'payments.xml': '<?xml version="1.0" encoding="UTF-8"?>\n<payments></payments>'
  };
  for (const [file, content] of Object.entries(defaults)) {
    const filePath = path.join(DATA_DIR, file);
    if (!(await fs.pathExists(filePath))) await fs.writeFile(filePath, content, 'utf8');
  }

  // Seed admin user if users.xml is empty or missing
  const usersPath = path.join(DATA_DIR, 'users.xml');
  if (!(await fs.pathExists(usersPath))) {
    await fs.writeFile(usersPath, '<?xml version="1.0" encoding="UTF-8"?>\n<users></users>', 'utf8');
  }
  const raw = await fs.readFile(usersPath, 'utf8');
  const parsed = await parser.parseStringPromise(raw);
  const existing = parsed.users?.user || [];
  const list = Array.isArray(existing) ? existing : [existing];
  const hasAdmin = list.some(u => u?.username?.[0] === 'admin');
  if (!hasAdmin) {
    const { v4: uuidv4 } = require('uuid');
    const hashed = await bcrypt.hash('admin', 10);
    const adminUser = {
      $: { id: `user-${uuidv4().slice(0, 8)}` },
      username: ['admin'], password: [hashed], role: ['admin'],
      email: ['admin@monkihub.local'], createdAt: [new Date().toISOString()],
      isSuperAdmin: ['true']
    };
    if (!parsed.users) parsed.users = { user: [] };
    if (!Array.isArray(parsed.users.user)) parsed.users.user = [];
    parsed.users.user.push(adminUser);
    await fs.writeFile(usersPath, builder.buildObject(parsed), 'utf8');
    console.log('✅ Admin user seeded (username: admin, password: admin)');
  }
}

module.exports = { readXml, writeXml, getRawXml, transformXslt, initXmlFiles };
