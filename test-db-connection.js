const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  const prisma = new PrismaClient();
  try {
    console.log('Testing database connection...');
    const user = await prisma.users.findFirst();
    console.log('Connection successful! Found user:', user ? user.emp_email : 'No users found');
    return true;
  } catch (error) {
    console.error('Connection failed:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
