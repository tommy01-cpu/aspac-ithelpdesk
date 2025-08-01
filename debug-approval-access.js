const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugApprovalAccess() {
  try {
    console.log('🔍 Debugging Approval Access Issue...\n');

    // Check request 1 details
    const request = await prisma.request.findUnique({
      where: { id: 1 },
      include: {
        user: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_email: true
          }
        },
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                emp_fname: true,
                emp_lname: true,
                emp_email: true
              }
            }
          }
        }
      }
    });

    if (!request) {
      console.log('❌ Request 1 not found');
      return;
    }

    console.log('📋 Request 1 Details:');
    console.log(`   Created by: ${request.user.emp_fname} ${request.user.emp_lname} (ID: ${request.user.id})`);
    console.log(`   Status: ${request.status}`);
    console.log(`   Template: ${request.templateName}`);

    console.log('\n👥 Approvers for Request 1:');
    if (request.approvals.length === 0) {
      console.log('   ❌ No approvals found for this request');
    } else {
      request.approvals.forEach(approval => {
        console.log(`   Level ${approval.level}: ${approval.approver?.emp_fname || 'Unknown'} ${approval.approver?.emp_lname || 'Approver'} (ID: ${approval.approverId}) - Status: ${approval.status}`);
      });
    }

    // Check if user 3 (Angelbert) has any approval assignments
    console.log('\n🔍 User 3 (Angelbert) Approval Assignments:');
    const angelbertsApprovals = await prisma.requestApproval.findMany({
      where: { approverId: 3 },
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

    if (angelbertsApprovals.length === 0) {
      console.log('   ❌ Angelbert has no approval assignments');
    } else {
      angelbertsApprovals.forEach(approval => {
        console.log(`   Request ${approval.requestId}: ${approval.request.templateName} - Level ${approval.level} - Status: ${approval.status}`);
      });
    }

    // Check all users with approval permissions
    console.log('\n👨‍💼 All Users with Approval Permissions:');
    const approvers = await prisma.users.findMany({
      where: { isServiceApprover: true },
      select: {
        id: true,
        emp_fname: true,
        emp_lname: true,
        emp_email: true
      }
    });

    if (approvers.length === 0) {
      console.log('   ❌ No users have isServiceApprover = true');
    } else {
      approvers.forEach(approver => {
        console.log(`   ${approver.emp_fname} ${approver.emp_lname} (ID: ${approver.id})`);
      });
    }

  } catch (error) {
    console.error('❌ Error debugging approval access:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugApprovalAccess();
