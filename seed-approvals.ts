import { PrismaClient, ApprovalStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function seedApprovalsAndHistory() {
  try {
    console.log('Starting to seed approvals and history...');

    // Get all existing requests
    const requests = await prisma.request.findMany({
      include: {
        user: {
          include: {
            reportingTo: true,
            departmentHead: true,
          }
        }
      }
    });

    console.log(`Found ${requests.length} requests to process`);

    for (const request of requests) {
      // Create approval workflow for each request
      const approvals = [
        {
          requestId: request.id,
          level: 1,
          name: 'Level One',
          status: 'approved' as ApprovalStatus,
          approverId: null, // System approval
          approverName: 'System',
          approverEmail: null,
          sentOn: request.createdAt,
          actedOn: request.createdAt,
          comments: 'Level approved in accordance with approval rule.',
          isAutoApproval: true,
        },
        {
          requestId: request.id,
          level: 2,
          name: 'Level Two',
          status: 'pending' as ApprovalStatus,
          approverId: request.user.reportingToId,
          approverName: request.user.reportingTo ? 
            `${request.user.reportingTo.emp_fname} ${request.user.reportingTo.emp_lname}` : 
            'Reporting Manager',
          approverEmail: request.user.reportingTo?.emp_email,
          sentOn: request.createdAt,
          actedOn: null,
          comments: null,
          isAutoApproval: false,
        },
        {
          requestId: request.id,
          level: 3,
          name: 'Level Three',
          status: 'not_sent' as ApprovalStatus,
          approverId: request.user.departmentHeadId,
          approverName: request.user.departmentHead ? 
            `${request.user.departmentHead.emp_fname} ${request.user.departmentHead.emp_lname}` : 
            'Department Head',
          approverEmail: request.user.departmentHead?.emp_email,
          sentOn: null,
          actedOn: null,
          comments: null,
          isAutoApproval: false,
        }
      ];

      // Create approvals
      for (const approval of approvals) {
        await prisma.requestApproval.create({
          data: approval
        });
      }

      // Create history entries
      const historyEntries = [
        {
          requestId: request.id,
          action: 'Request Created',
          details: `Request #${request.id} was created by ${request.user.emp_fname} ${request.user.emp_lname}`,
          actorId: request.userId,
          actorName: `${request.user.emp_fname} ${request.user.emp_lname}`,
          actorType: 'user',
          timestamp: request.createdAt,
        },
        {
          requestId: request.id,
          action: 'Approval Reminder sent',
          details: `Reminder mail sent to : ${approvals[1].approverName} [${approvals[1].approverEmail || 'email@company.com'}]`,
          actorId: null,
          actorName: 'System',
          actorType: 'system',
          timestamp: new Date(request.createdAt.getTime() + 3600000), // 1 hour later
        }
      ];

      for (const entry of historyEntries) {
        await prisma.requestHistory.create({
          data: entry
        });
      }

      console.log(`Created approvals and history for request #${request.id}`);
    }

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding approvals and history:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedApprovalsAndHistory();
