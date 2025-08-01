const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixApprovalIssues() {
  try {
    // Update user ID 2 to be a service approver
    await prisma.users.update({
      where: { id: 2 },
      data: { isServiceApprover: true }
    });
    console.log('Updated user ID 2 to be a service approver');
    
    // Update approvals to point to user ID 2 instead of 1, removing email dependency
    const updatedApprovals = await prisma.requestApproval.updateMany({
      where: { approverId: 1 },
      data: { 
        approverId: 2,
        approverEmail: null  // Remove email dependency
      }
    });
    console.log('Updated approvals count:', updatedApprovals.count);
    
    // Verify the changes
    const finalApprovals = await prisma.requestApproval.findMany({
      where: { approverId: 2 },
      select: {
        id: true,
        requestId: true,
        approverId: true,
        status: true
      }
    });
    console.log('Final approvals for user ID 2:', JSON.stringify(finalApprovals, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixApprovalIssues();
