const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listUsers() {
  try {
    console.log('=== All Users in Database ===');
    
    const users = await prisma.users.findMany({
      select: {
        id: true,
        emp_email: true,
        emp_fname: true,
        emp_lname: true,
        isTechnician: true
      },
      orderBy: { emp_email: 'asc' }
    });
    
    if (users.length === 0) {
      console.log('No users found in database');
      return;
    }
    
    console.log('\nUsers:');
    console.log('ID\tEmail\t\t\t\tName\t\t\tTechnician');
    console.log('---\t-----\t\t\t\t----\t\t\t----------');
    
    users.forEach(user => {
      const name = `${user.emp_fname || ''} ${user.emp_lname || ''}`.trim() || 'N/A';
      const tech = user.isTechnician ? 'YES' : 'NO';
      console.log(`${user.id}\t${user.emp_email}\t${name}\t${tech}`);
    });
    
  } catch (error) {
    console.error('❌ Error fetching users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();
