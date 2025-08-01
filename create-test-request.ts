import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestRequestWithApprovals() {
  try {
    console.log('Creating test request with approvals and history...');

    // Get the first user
    const user = await prisma.users.findFirst({
      include: {
        reportingTo: true,
        departmentHead: true,
      }
    });

    if (!user) {
      console.log('No users found. Please create a user first.');
      return;
    }

    console.log(`Creating request for user: ${user.emp_fname} ${user.emp_lname}`);

    // Create a test request
    const request = await prisma.request.create({
      data: {
        templateId: '1',
        templateName: 'Request a Special IT Project - Place TUV NORD ISO Logos in Aspac Website',
        type: 'service',
        status: 'pending_approval',
        priority: 'high',
        userId: user.id,
        formData: {
          category: 'IT Support',
          description: 'Place TUV NORD ISO Logos in Aspac Website as requested',
          details: 'This is a test request with proper approval workflow',
        },
        attachments: [],
      }
    });

    console.log(`Created request #${request.id}`);

    // Create approval workflow
    const approvals = [
      {
        requestId: request.id,
        level: 1,
        name: 'Level One',
        status: 'approved',
        approverId: null,
        approverName: 'System',
        approverEmail: null,
        sentOn: request.createdAt,
        actedOn: request.createdAt,
        comments: null,
        isAutoApproval: true,
      },
      {
        requestId: request.id,
        level: 2,
        name: 'Level Two',
        status: 'pending',
        approverId: user.reportingToId,
        approverName: user.reportingTo ? 
          `${user.reportingTo.emp_fname} ${user.reportingTo.emp_lname}` : 
          'Robert E. Baluyot',
        approverEmail: user.reportingTo?.emp_email || 'robert.baluyot@aspachris.com.ph',
        sentOn: request.createdAt,
        actedOn: null,
        comments: null,
        isAutoApproval: false,
      },
      {
        requestId: request.id,
        level: 3,
        name: 'Level Three',
        status: 'not_sent',
        approverId: user.departmentHeadId,
        approverName: user.departmentHead ? 
          `${user.departmentHead.emp_fname} ${user.departmentHead.emp_lname}` : 
          'IT Manager',
        approverEmail: user.departmentHead?.emp_email,
        sentOn: null,
        actedOn: null,
        comments: null,
        isAutoApproval: false,
      }
    ];

    // Create approvals
    for (const approval of approvals) {
      const createdApproval = await prisma.requestApproval.create({
        data: approval
      });
      console.log(`Created approval level ${createdApproval.level}: ${createdApproval.status}`);
    }

    // Create history entries
    const now = new Date();
    const historyEntries = [
      {
        requestId: request.id,
        action: 'Request Created',
        details: `Request #${request.id} has been created and submitted for approval.`,
        actorId: request.userId,
        actorName: `${user.emp_fname} ${user.emp_lname}`,
        actorType: 'user',
        timestamp: request.createdAt,
      },
      {
        requestId: request.id,
        action: 'Approval Reminder sent',
        details: `Reminder mail sent to : ${approvals[1].approverName} [${approvals[1].approverEmail}]`,
        actorId: null,
        actorName: 'System',
        actorType: 'system',
        timestamp: new Date(request.createdAt.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days ago
      },
      {
        requestId: request.id,
        action: 'Approval Reminder sent',
        details: `Reminder mail sent to : ${approvals[1].approverName} [${approvals[1].approverEmail}]`,
        actorId: null,
        actorName: 'System',
        actorType: 'system',
        timestamp: new Date(request.createdAt.getTime() + 4 * 24 * 60 * 60 * 1000), // 4 days ago
      },
      {
        requestId: request.id,
        action: 'Approval Reminder sent',
        details: `Reminder mail sent to : ${approvals[1].approverName} [${approvals[1].approverEmail}]`,
        actorId: null,
        actorName: 'System',
        actorType: 'system',
        timestamp: new Date(request.createdAt.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
      {
        requestId: request.id,
        action: 'Approval Reminder sent',
        details: `Reminder mail sent to : ${approvals[1].approverName} [${approvals[1].approverEmail}]`,
        actorId: null,
        actorName: 'System',
        actorType: 'system',
        timestamp: new Date(), // Today
      }
    ];

    for (const entry of historyEntries) {
      await prisma.requestHistory.create({
        data: entry
      });
    }

    console.log(`Created ${historyEntries.length} history entries`);
    console.log('Test request created successfully!');
    console.log(`Request ID: ${request.id}`);

  } catch (error) {
    console.error('Error creating test request:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestRequestWithApprovals();
