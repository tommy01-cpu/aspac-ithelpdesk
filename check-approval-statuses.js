const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkApprovalStatuses() {
  try {
    const distinctStatuses = await prisma.requestApproval.findMany({
      select: { status: true },
      distinct: ['status']
    });
    
    console.log('Distinct approval statuses:', distinctStatuses.map(r => r.status));
    
    // Count by status
    for (const statusObj of distinctStatuses) {
      const count = await prisma.requestApproval.count({
        where: { status: statusObj.status }
      });
      console.log(`Status "${statusObj.status}": ${count} approvals`);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkApprovalStatuses();
