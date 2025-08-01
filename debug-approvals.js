const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugApprovals() {
  try {
    // Check current user
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
    console.log('Current user:', JSON.stringify(user, null, 2));
    
    // Check all approvals for this user
    const approvals = await prisma.requestApproval.findMany({
      where: {
        OR: [
          { approverEmail: 'tom.mandapat@aspacphils.com.ph' },
          { approverId: 1 }
        ]
      },
      include: {
        request: {
          select: {
            id: true,
            templateName: true,
            status: true
          }
        }
      }
    });
    console.log('All approvals for user:', JSON.stringify(approvals, null, 2));
    
    // Check pending approvals specifically
    const pendingApprovals = await prisma.requestApproval.findMany({
      where: {
        OR: [
          { approverEmail: 'tom.mandapat@aspacphils.com.ph' },
          { approverId: 1 }
        ],
        status: {
          in: ['pending', 'not_sent', 'pending clarification']
        }
      }
    });
    console.log('Pending approvals count:', pendingApprovals.length);
    console.log('Pending approvals:', JSON.stringify(pendingApprovals, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugApprovals();
