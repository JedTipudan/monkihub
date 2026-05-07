const { readXml, writeXml } = require('./services/xmlService');

async function promoteToAdmin(username) {
  try {
    const data = await readXml('users.xml');
    
    if (!data.users || !data.users.user) {
      console.log('❌ No users found!');
      return;
    }

    const users = Array.isArray(data.users.user) ? data.users.user : [data.users.user];
    const user = users.find(u => u.username && u.username[0] === username);

    if (!user) {
      console.log(`❌ User "${username}" not found!`);
      return;
    }

    if (user.role && user.role[0] === 'admin') {
      console.log(`ℹ️  User "${username}" is already an admin!`);
      return;
    }

    // Promote to admin
    user.role = ['admin'];
    await writeXml('users.xml', data);

    console.log('✅ User promoted to admin successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Username: ${username}`);
    console.log(`New Role: admin`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (err) {
    console.error('❌ Error promoting user:', err.message);
  }
}

const username = process.argv[2];

if (!username) {
  console.log('Usage: node promoteToAdmin.js <username>');
  console.log('Example: node promoteToAdmin.js alice');
  process.exit(1);
}

promoteToAdmin(username);
