const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllApprovals() {
  try {
    // Check all approval records
    const allApprovals = await prisma.requestApproval.findMany({
      select: {
        id: true,
        requestId: true,
        approverId: true,
        approverEmail: true,
        status: true
      }
    });
    console.log('All approval records:', JSON.stringify(allApprovals, null, 2));
    
    // If you want NO approvals tab to show, set user ID 1 to NOT be a service approver
    await prisma.users.update({
      where: { id: 1 },
      data: { isServiceApprover: false }
    });
    console.log('Updated user ID 1 to NOT be a service approver');
    
    // Also set user ID 2 to NOT be a service approver
    await prisma.users.update({
      where: { id: 2 },
      data: { isServiceApprover: false }
    });
    console.log('Updated user ID 2 to NOT be a service approver');
    
    // Verify both users
    const user1 = await prisma.users.findUnique({
      where: { id: 1 },
      select: { id: true, isServiceApprover: true }
    });
    const user2 = await prisma.users.findUnique({
      where: { id: 2 },
      select: { id: true, isServiceApprover: true }
    });
    
    console.log('User 1 after update:', user1);
    console.log('User 2 after update:', user2);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllApprovals();
