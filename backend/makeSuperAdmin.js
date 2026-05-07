const { readXml, writeXml } = require('./services/xmlService');

async function makeSuperAdmin() {
  try {
    const data = await readXml('users.xml');
    const users = Array.isArray(data.users.user) ? data.users.user : [data.users.user];
    
    const adminUser = users.find(u => u.username[0] === 'admin');
    
    if (!adminUser) {
      console.log('❌ Admin user not found!');
      return;
    }
    
    // Check if already super admin
    if (adminUser.isSuperAdmin && adminUser.isSuperAdmin[0] === 'true') {
      console.log('✅ Admin user is already a Super Admin!');
      return;
    }
    
    // Mark as super admin
    adminUser.isSuperAdmin = ['true'];
    
    data.users.user = users;
    await writeXml('users.xml', data);
    
    console.log('✅ Successfully upgraded "admin" to Super Admin!');
    console.log('🔐 Super Admin can now create other admins from the User Manager panel.');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

makeSuperAdmin();
