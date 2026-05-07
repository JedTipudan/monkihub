const { readXml, writeXml } = require('./services/xmlService');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function createAdmin(username, password, email) {
  try {
    const data = await readXml('users.xml');
    
    if (!data.users) data.users = { user: [] };
    if (!Array.isArray(data.users.user)) {
      data.users.user = data.users.user ? [data.users.user] : [];
    }

    // Check if username already exists
    const exists = data.users.user.some(u => u.username && u.username[0] === username);
    if (exists) {
      console.log(`❌ Error: Username "${username}" already exists!`);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new admin user
    const newUser = {
      $: { id: `user-${uuidv4().slice(0, 8)}` },
      username: [username],
      password: [hashedPassword],
      email: [email || `${username}@monkihub.com`],
      role: ['admin'], // Set as admin
      createdAt: [new Date().toISOString()],
      avatar: [''],
      displayName: [username]
    };

    data.users.user.push(newUser);
    await writeXml('users.xml', data);

    console.log('✅ Admin user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    console.log(`Email: ${email || `${username}@monkihub.com`}`);
    console.log(`Role: admin`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (err) {
    console.error('❌ Error creating admin:', err.message);
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: node createAdmin.js <username> <password> [email]');
  console.log('Example: node createAdmin.js manager123 securepass manager@company.com');
  process.exit(1);
}

const [username, password, email] = args;
createAdmin(username, password, email);
