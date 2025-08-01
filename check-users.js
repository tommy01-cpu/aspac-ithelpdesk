const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('Checking users in database...');
    
    const users = await prisma.users.findMany({
      select: {
        id: true,
        emp_fname: true,
        emp_lname: true,
        emp_email: true,
        emp_status: true
      },
      take: 10
    });

    console.log('Found users:', users.length);
    console.log('Users:', JSON.stringify(users, null, 2));

    // Also check the User model (NextAuth users)
    const authUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true
      },
      take: 10
    });

    console.log('Auth users:', authUsers.length);
    console.log('Auth users:', JSON.stringify(authUsers, null, 2));

  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
