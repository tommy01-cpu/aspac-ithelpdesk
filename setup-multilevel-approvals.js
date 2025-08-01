const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupApprovalLevels() {
  try {
    // First, let's check if request 2 exists
    const request = await prisma.request.findUnique({
      where: { id: 2 },
      include: {
        user: true
      }
    });

    if (!request) {
      console.log('Request 2 not found');
      return;
    }

    console.log('Request 2 found:', request.templateName);

    // Delete existing approvals for request 2
    await prisma.requestApproval.deleteMany({
      where: { requestId: 2 }
    });

    // Create multi-level approvals for request 2
    const approvals = [
      {
        requestId: 2,
        level: 1,
        name: 'Level One',
        approverId: 1, // Tom Mandapat
        status: 'approved',
        actedOn: new Date('2025-01-02T10:30:00Z'),
        comments: 'Approved at Level 1'
      },
      {
        requestId: 2,
        level: 2,
        name: 'Level Two',
        approverId: 1, // Tom Mandapat (for testing)
        status: 'pending clarification',
        sentOn: new Date('2025-01-02T11:00:00Z'),
        comments: null
      },
      {
        requestId: 2,
        level: 3,
        name: 'Level Three',
        approverId: 1, // Tom Mandapat (for testing)
        status: 'not_sent',
        sentOn: null,
        comments: null
      }
    ];

    // Create the approvals
    for (const approval of approvals) {
      await prisma.requestApproval.create({
        data: approval
      });
    }

    console.log('✅ Created multi-level approvals for request 2');

    // Verify the approvals
    const createdApprovals = await prisma.requestApproval.findMany({
      where: { requestId: 2 },
      include: {
        approver: {
          select: {
            emp_fname: true,
            emp_lname: true,
            emp_email: true
          }
        }
      },
      orderBy: { level: 'asc' }
    });

    console.log('Created approvals:');
    createdApprovals.forEach(approval => {
      console.log(`  Level ${approval.level}: ${approval.name} - ${approval.status} (${approval.approver?.emp_fname} ${approval.approver?.emp_lname})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupApprovalLevels();
