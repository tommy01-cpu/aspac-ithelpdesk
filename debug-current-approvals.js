const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugCurrentApprovals() {
  try {
    console.log('🔍 Debugging current approvals in database...\n');

    // Check all pending approvals
    const allPendingApprovals = await prisma.requestApproval.findMany({
      where: {
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
        },
        approver: {
          select: {
            emp_fname: true,
            emp_lname: true,
            emp_email: true
          }
        }
      },
      orderBy: [
        { requestId: 'asc' },
        { level: 'asc' }
      ]
    });

    console.log(`📋 Total pending approvals: ${allPendingApprovals.length}\n`);

    if (allPendingApprovals.length === 0) {
      console.log('❌ No pending approvals found in database');
      console.log('This explains why the UI shows "No Pending Approvals"');
      return;
    }

    // Group by request to show the hierarchy
    const approvalsByRequest = {};
    allPendingApprovals.forEach(approval => {
      if (!approvalsByRequest[approval.requestId]) {
        approvalsByRequest[approval.requestId] = [];
      }
      approvalsByRequest[approval.requestId].push(approval);
    });

    console.log('📊 Approvals grouped by request:\n');
    
    for (const [requestId, approvals] of Object.entries(approvalsByRequest)) {
      const firstApproval = approvals[0];
      console.log(`🎫 Request #${requestId}: ${firstApproval.request.templateName}`);
      console.log(`   Requester: ${firstApproval.request.user.emp_fname} ${firstApproval.request.user.emp_lname}`);
      console.log(`   Department: ${firstApproval.request.user.department || 'Unknown'}`);
      console.log(`   Priority: ${firstApproval.request.priority || 'Medium'}`);
      console.log(`   Approval Levels:`);
      
      approvals.forEach(approval => {
        console.log(`     Level ${approval.level}: ${approval.name || `Level ${approval.level}`}`);
        console.log(`       Approver: ${approval.approver?.emp_fname || 'Unknown'} ${approval.approver?.emp_lname || 'User'} (${approval.approver?.emp_email || 'no-email'})`);
        console.log(`       Status: ${approval.status}`);
        console.log(`       Created: ${approval.createdAt}`);
      });
      console.log('');
    }

    // Check what the sequential filter would return
    console.log('🔍 Testing sequential approval filter...\n');
    
    for (const [requestId, approvals] of Object.entries(approvalsByRequest)) {
      console.log(`📋 Request #${requestId} sequential analysis:`);
      
      for (const approval of approvals) {
        // Check previous levels
        const previousLevels = await prisma.requestApproval.findMany({
          where: {
            requestId: parseInt(requestId),
            level: { lt: approval.level }
          }
        });

        const allPreviousApproved = previousLevels.length === 0 || 
          previousLevels.every(prev => prev.status === 'approved');

        console.log(`   Level ${approval.level}: ${allPreviousApproved ? '✅ WOULD SHOW' : '❌ HIDDEN'}`);
        
        if (!allPreviousApproved) {
          const unapprovedPrevious = previousLevels.filter(prev => prev.status !== 'approved');
          console.log(`     Blocked by: Level ${unapprovedPrevious.map(p => p.level).join(', ')} (status: ${unapprovedPrevious.map(p => p.status).join(', ')})`);
        }
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugCurrentApprovals();
