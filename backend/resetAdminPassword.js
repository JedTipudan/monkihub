const { readXml, writeXml } = require('./services/xmlService');
const bcrypt = require('bcryptjs');

async function resetAdminPassword() {
  try {
    const data = await readXml('users.xml');
    const users = Array.isArray(data.users.user) ? data.users.user : [data.users.user];
    
    const adminUser = users.find(u => u.username[0] === 'admin');
    
    if (!adminUser) {
      console.log('❌ Admin user not found!');
      return;
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash('admin', 10);
    adminUser.password = [hashedPassword];
    
    // Ensure super admin status
    if (!adminUser.isSuperAdmin) {
      adminUser.isSuperAdmin = ['true'];
    }
    
    data.users.user = users;
    await writeXml('users.xml', data);
    
    console.log('✅ Admin password reset successfully!');
    console.log('📝 Username: admin');
    console.log('🔑 Password: admin');
    console.log('⭐ Role: Super Admin');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

resetAdminPassword();
