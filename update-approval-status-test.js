const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testApprovalStatusUpdate() {
  try {
    console.log('🧪 Testing Approval Status Update Logic...\n');

    // Find request #13 which should have all approvals completed
    const request = await prisma.request.findUnique({
      where: { id: 13 },
      include: {
        approvals: {
          orderBy: { level: 'asc' }
        }
      }
    });

    if (!request) {
      console.log('❌ Request #13 not found');
      return;
    }

    console.log(`🎫 Request #${request.id} - ${request.templateName}`);
    console.log(`   Current Status: ${request.status}`);
    console.log(`   FormData Approval Status: ${request.formData?.['5'] || 'not set'}`);
    console.log('');

    // Check if all approvals are approved
    const allApproved = request.approvals.every(approval => approval.status === 'approved');
    console.log(`All approvals approved: ${allApproved ? '✅ YES' : '❌ NO'}`);

    if (allApproved) {
      console.log('\n🔄 Updating formData approval status to "approved"...');
      
      const updatedRequest = await prisma.request.update({
        where: { id: request.id },
        data: {
          formData: {
            ...(request.formData || {}),
            '5': 'approved'
          }
        }
      });

      console.log('✅ FormData approval status updated!');
      console.log(`   New FormData Approval Status: ${updatedRequest.formData?.['5']}`);
    }

    console.log('\n✅ Test complete!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testApprovalStatusUpdate();
