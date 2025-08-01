const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCurrentApprovals() {
  try {
    // Check current user from session logs (ID 1)
    const user1Approvals = await prisma.requestApproval.findMany({
      where: { approverId: 1 },
      select: {
        id: true,
        requestId: true,
        status: true
      }
    });
    console.log('User ID 1 approvals:', JSON.stringify(user1Approvals, null, 2));
    
    // Check user ID 2 as well
    const user2Approvals = await prisma.requestApproval.findMany({
      where: { approverId: 2 },
      select: {
        id: true,
        requestId: true,
        status: true
      }
    });
    console.log('User ID 2 approvals:', JSON.stringify(user2Approvals, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCurrentApprovals();
