const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkData() {
  try {
    const requests = await prisma.request.findMany({
      select: {
        id: true,
        templateName: true,
        status: true,
        createdAt: true
      },
      orderBy: { id: 'asc' }
    });

    console.log('Available requests:');
    requests.forEach(req => {
      console.log(`  ID: ${req.id}, Template: ${req.templateName}, Status: ${req.status}`);
    });

    if (requests.length > 0) {
      const requestId = requests[0].id;
      console.log(`\nUsing request ID ${requestId} for approval setup...`);

      // Delete existing approvals
      await prisma.requestApproval.deleteMany({
        where: { requestId: requestId }
      });

      // Create multi-level approvals
      const approvals = [
        {
          requestId: requestId,
          level: 1,
          name: 'Level One - Direct Manager',
          approverId: 1,
          status: 'approved',
          actedOn: new Date('2025-01-02T10:30:00Z'),
          comments: 'Approved at Level 1'
        },
        {
          requestId: requestId,
          level: 2,
          name: 'Level Two - Department Head',
          approverId: 1,
          status: 'pending clarification',
          sentOn: new Date('2025-01-02T11:00:00Z'),
          comments: null
        },
        {
          requestId: requestId,
          level: 3,
          name: 'Level Three - Finance',
          approverId: 1,
          status: 'not_sent',
          sentOn: null,
          comments: null
        }
      ];

      for (const approval of approvals) {
        await prisma.requestApproval.create({
          data: approval
        });
      }

      console.log(`✅ Created multi-level approvals for request ${requestId}`);

      // Add some conversation data for Level 2 (the one with pending clarification)
      const level2Approval = await prisma.requestApproval.findFirst({
        where: { requestId: requestId, level: 2 }
      });

      if (level2Approval) {
        console.log(`Adding conversations for approval ${level2Approval.id}...`);
        
        // Add a clarification message from approver
        const convId1 = `conv_${Date.now()}_1`;
        await prisma.$executeRaw`
          INSERT INTO approval_conversations (id, "approvalId", "authorId", type, message, "isRead", "readBy", "createdAt", "updatedAt")
          VALUES (${convId1}, ${level2Approval.id}, ${1}, 'approver', 'Need clarification on the budget allocation for this request.', false, ${JSON.stringify([1])}::jsonb, ${new Date('2025-01-02T11:05:00Z')}, ${new Date('2025-01-02T11:05:00Z')})
        `;

        console.log('✅ Added conversation for level 2 approval');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
