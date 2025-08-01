const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupTestApprovals() {
  try {
    // Create test approvals for user ID 2 (which matches the current session user)
    const testApprovals = [
      {
        requestId: 1,
        level: 1,
        name: "level 1", 
        status: "not_sent",
        approverId: 2
      },
      {
        requestId: 2,
        level: 1,
        name: "level 1",
        status: "not_sent", 
        approverId: 2
      }
    ];

    // Delete existing approvals for clean test
    await prisma.requestApproval.deleteMany({
      where: { approverId: 2 }
    });

    // Create new test approvals
    for (const approval of testApprovals) {
      await prisma.requestApproval.create({
        data: approval
      });
    }

    console.log('✅ Created test approvals for user ID 2');
    
    // Verify the approvals
    const verifyApprovals = await prisma.requestApproval.findMany({
      where: { approverId: 2 },
      select: {
        id: true,
        requestId: true,
        status: true
      }
    });
    
    console.log('Test approvals created:', JSON.stringify(verifyApprovals, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupTestApprovals();
