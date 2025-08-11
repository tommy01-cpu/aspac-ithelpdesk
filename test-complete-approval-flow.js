const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCompleteApprovalFlow() {
  try {
    console.log('🧪 Testing Complete Approval Flow...\n');

    // Find request #12 which has pending approvals
    const request = await prisma.request.findUnique({
      where: { id: 12 },
      include: {
        approvals: {
          orderBy: { level: 'asc' }
        }
      }
    });

    if (!request) {
      console.log('❌ Request #12 not found');
      return;
    }

    console.log(`🎫 Request #${request.id} - ${request.templateName}`);
    console.log(`   Current Status: ${request.status}`);
    console.log(`   FormData Approval Status: ${request.formData?.['5'] || 'not set'}`);
    console.log('   Approvals:');

    const pendingApprovals = request.approvals.filter(approval => 
      approval.status === 'pending_approval' || approval.status === 'not_sent'
    );

    request.approvals.forEach(approval => {
      console.log(`     Level ${approval.level}: ${approval.name} - ${approval.status} (ID: ${approval.id})`);
    });

    console.log(`\n📋 Found ${pendingApprovals.length} pending approvals`);

    if (pendingApprovals.length > 0) {
      console.log('\n🔄 Simulating approval of all pending approvals...');
      
      // Approve all pending approvals
      for (const approval of pendingApprovals) {
        console.log(`   Approving: Level ${approval.level} - ${approval.name}`);
        
        await prisma.requestApproval.update({
          where: { id: approval.id },
          data: {
            status: 'approved',
            actedOn: new Date(),
            comments: 'Auto-approved for testing'
          }
        });
      }

      console.log('✅ All approvals marked as approved');

      // Now check if all approvals are approved and simulate the API logic
      const allRequestApprovals = await prisma.requestApproval.findMany({
        where: { requestId: request.id }
      });

      const allApproved = allRequestApprovals.every(app => app.status === 'approved');
      console.log(`\n📊 All approvals approved: ${allApproved ? '✅ YES' : '❌ NO'}`);

      if (allApproved) {
        console.log('\n🔄 Updating request status and formData...');
        
        const updatedRequest = await prisma.request.update({
          where: { id: request.id },
          data: {
            status: 'open',
            formData: {
              ...(request.formData || {}),
              '5': 'approved'
            }
          }
        });

        await prisma.requestHistory.create({
          data: {
            requestId: request.id,
            action: 'Request Approved - Ready for Work',
            actorName: 'System',
            actorType: 'system',
            details: 'All approvals completed successfully, request is now open for work',
            timestamp: new Date()
          }
        });

        console.log('✅ Request updated successfully!');
        console.log(`   New Status: ${updatedRequest.status}`);
        console.log(`   New FormData Approval Status: ${updatedRequest.formData?.['5']}`);
      }
    } else {
      console.log('\n ℹ️ No pending approvals to process');
    }

    console.log('\n✅ Test complete!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCompleteApprovalFlow();
