const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testApprovalCompletion() {
  try {
    console.log('🧪 Testing Approval Completion Logic...\n');

    // Find a request with multiple approval levels
    const requestsWithApprovals = await prisma.request.findMany({
      include: {
        approvals: {
          orderBy: { level: 'asc' }
        }
      },
      where: {
        approvals: {
          some: {}
        }
      },
      take: 3
    });

    console.log(`📋 Found ${requestsWithApprovals.length} requests with approvals:\n`);

    for (const request of requestsWithApprovals) {
      console.log(`🎫 Request #${request.id} - ${request.templateName || 'No Template Name'}`);
      console.log(`   Current Status: ${request.status}`);
      console.log(`   Approval Levels: ${request.approvals.length}`);
      
      // Show approval status by level
      const approvalsByLevel = request.approvals.reduce((acc, approval) => {
        if (!acc[approval.level]) {
          acc[approval.level] = [];
        }
        acc[approval.level].push(approval);
        return acc;
      }, {});

      Object.keys(approvalsByLevel).sort((a, b) => parseInt(a) - parseInt(b)).forEach(level => {
        const levelApprovals = approvalsByLevel[level];
        console.log(`   Level ${level}:`);
        
        levelApprovals.forEach(approval => {
          console.log(`     - ${approval.name || `Approval ${approval.id}`}: ${approval.status}`);
        });

        // Check if all in this level are approved
        const allApproved = levelApprovals.every(approval => approval.status === 'approved');
        console.log(`     All Level ${level} Approved: ${allApproved ? '✅ YES' : '❌ NO'}`);
      });

      // Check overall approval status
      const allApprovals = request.approvals;
      const allApproved = allApprovals.every(approval => approval.status === 'approved');
      const anyRejected = allApprovals.some(approval => approval.status === 'rejected');
      const anyPending = allApprovals.some(approval => 
        approval.status === 'pending_approval' || 
        approval.status === 'for_clarification' ||
        approval.status === 'not_sent'
      );

      console.log(`   Overall Status:`);
      console.log(`     All Approved: ${allApproved ? '✅ YES' : '❌ NO'}`);
      console.log(`     Any Rejected: ${anyRejected ? '🚫 YES' : '✅ NO'}`);
      console.log(`     Any Pending: ${anyPending ? '⏳ YES' : '✅ NO'}`);

      // Determine what the request status should be
      let expectedStatus = request.status;
      if (anyRejected) {
        expectedStatus = 'closed';
      } else if (allApproved) {
        expectedStatus = 'open';
      } else {
        expectedStatus = 'for_approval';
      }

      console.log(`     Expected Request Status: ${expectedStatus}`);
      console.log(`     Actual Request Status: ${request.status}`);
      console.log(`     Status Match: ${expectedStatus === request.status ? '✅ YES' : '❌ NO'}`);

      // Check formData approval status field
      const formData = request.formData || {};
      const approvalStatusField = formData['5'] || 'pending approval';
      console.log(`     FormData Approval Status: ${approvalStatusField}`);

      console.log('');
    }

    console.log('✅ Approval completion logic test complete!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testApprovalCompletion();
