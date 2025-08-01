const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugPendingApprovals() {
  try {
    console.log('🔍 Debugging pending approvals...');
    
    // 1. Check if we can find the user
    const userEmail = 'jhon.sanchez@aspacphils.com.ph'; // Based on the screenshot
    console.log(`\n1. Looking for user: ${userEmail}`);
    
    const user = await prisma.users.findFirst({
      where: { emp_email: userEmail },
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`✅ User found: ${user.emp_fname} ${user.emp_lname} (ID: ${user.id})`);
    
    // 2. Check for any approval assignments for this user
    console.log(`\n2. Checking approval assignments for user ID: ${user.id}`);
    
    const allApprovals = await prisma.requestApproval.findMany({
      where: { approverId: user.id },
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
    
    console.log(`📋 Total approvals assigned to user: ${allApprovals.length}`);
    
    if (allApprovals.length > 0) {
      allApprovals.forEach((approval, index) => {
        console.log(`   ${index + 1}. Request #${approval.request.id} - ${approval.request.templateName} - Status: ${approval.status}`);
      });
    }
    
    // 3. Check specifically for pending approvals
    console.log(`\n3. Checking PENDING approvals...`);
    
    const pendingApprovals = await prisma.requestApproval.findMany({
      where: {
        approverId: user.id,
        status: {
          in: ['pending_approval', 'for_clarification']
        }
      },
      include: {
        request: {
          include: {
            user: {
              select: {
                emp_fname: true,
                emp_lname: true,
                emp_email: true,
                department: true
              }
            }
          }
        }
      }
    });
    
    console.log(`📋 Pending approvals: ${pendingApprovals.length}`);
    
    if (pendingApprovals.length > 0) {
      pendingApprovals.forEach((approval, index) => {
        console.log(`   ${index + 1}. Request #${approval.request.id} - ${approval.request.templateName}`);
        console.log(`      Status: ${approval.status}`);
        console.log(`      Requester: ${approval.request.user.emp_fname} ${approval.request.user.emp_lname}`);
        console.log(`      Level: ${approval.level} - ${approval.name}`);
        console.log('');
      });
    } else {
      console.log('❌ No pending approvals found');
      console.log('\n🔍 Let\'s check what approval statuses exist:');
      
      const statuses = await prisma.requestApproval.groupBy({
        by: ['status'],
        _count: { status: true },
        where: { approverId: user.id }
      });
      
      statuses.forEach(status => {
        console.log(`   ${status.status}: ${status._count.status} approvals`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugPendingApprovals();
