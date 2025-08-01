const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getSessionUser() {
  try {
    // Find the session user
    const sessionUser = await prisma.users.findFirst({
      where: { emp_email: 'tom.mandapat@aspacphils.com.ph' }
    });
    console.log('Session user:', sessionUser);
    
    // Create approval for this user
    if (sessionUser) {
      // Delete existing approvals
      await prisma.requestApproval.deleteMany({
        where: { approverId: sessionUser.id }
      });
      
      // Create new approval
      const newApproval = await prisma.requestApproval.create({
        data: {
          requestId: 1,
          level: 1,
          name: "level 1",
          status: "not_sent",
          approverId: sessionUser.id
        }
      });
      console.log('Created approval:', newApproval);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getSessionUser();
