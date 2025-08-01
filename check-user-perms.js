const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    const user = await prisma.users.findFirst({
      where: { emp_email: 'tom.mandapat@aspacphils.com.ph' },
      select: {
        id: true,
        emp_fname: true,
        emp_lname: true,
        emp_email: true,
        isServiceApprover: true,
        isTechnician: true
      }
    });
    console.log('User data:', JSON.stringify(user, null, 2));
    
    // Update user to be a service approver if not already
    if (user && !user.isServiceApprover) {
      console.log('Updating user to be a service approver...');
      await prisma.users.update({
        where: { id: user.id },
        data: { isServiceApprover: true }
      });
      console.log('User updated successfully!');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
