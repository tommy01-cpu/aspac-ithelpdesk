const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function updatePasswordChangeFlags() {
  try {
    console.log('🔍 Checking users whose passwords equal their employee IDs...\n');
    
    // Get all active users
    const users = await prisma.users.findMany({
      where: {
        emp_status: 'active',
        emp_code: { not: null }
      },
      select: {
        id: true,
        emp_code: true,
        emp_fname: true,
        emp_lname: true,
        password: true,
        requiresPasswordChange: true
      }
    });
    
    console.log(`📊 Found ${users.length} active users to check`);
    
    let updateCount = 0;
    
    for (const user of users) {
      if (user.emp_code) {
        // Check if password equals employee ID
        const passwordEqualsEmployeeId = await bcrypt.compare(user.emp_code, user.password);
        
        if (passwordEqualsEmployeeId && !user.requiresPasswordChange) {
          console.log(`🔄 Setting requiresPasswordChange for ${user.emp_fname} ${user.emp_lname} (${user.emp_code})`);
          
          await prisma.users.update({
            where: { id: user.id },
            data: { requiresPasswordChange: true }
          });
          
          updateCount++;
        } else if (passwordEqualsEmployeeId) {
          console.log(`✅ ${user.emp_fname} ${user.emp_lname} (${user.emp_code}) - already flagged for password change`);
        } else {
          console.log(`✓ ${user.emp_fname} ${user.emp_lname} (${user.emp_code}) - password is secure`);
        }
      }
    }
    
    console.log(`\n✅ Updated ${updateCount} users to require password change`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updatePasswordChangeFlags();
