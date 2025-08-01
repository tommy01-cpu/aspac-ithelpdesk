const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkApprovals() {
  try {
    // Get approvals for this user
    const approvals = await prisma.requestApproval.findMany({
      where: {
        OR: [
          { approverEmail: 'tom.mandapat@aspacphils.com.ph' },
          { approverId: 1 }
        ]
      },
      select: {
        id: true,
        requestId: true,
        level: true,
        status: true,
        approverEmail: true,
        approverId: true
      }
    });
    console.log('Approvals found:', JSON.stringify(approvals, null, 2));
    
    // Check if conversation table exists
    const result = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'approval_conversations'
    `;
    console.log('Conversation table exists:', result.length > 0);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkApprovals();
