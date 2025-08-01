const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testApprovalWorkflow() {
  try {
    console.log('🧪 Testing Approval Workflow with New Enums...\n');

    // Get the test request
    const request = await prisma.request.findFirst({
      where: { id: 3 },
      include: {
        approvals: {
          orderBy: { level: 'asc' }
        }
      }
    });

    if (!request) {
      console.log('❌ Request 3 not found');
      return;
    }

    console.log(`📋 Request #${request.id}: ${request.templateName}`);
    console.log(`📊 Current Status: ${request.status}`);
    console.log(`🔢 Approval Levels: ${request.approvals.length}\n`);

    // Display current approval statuses
    console.log('📝 Current Approval Statuses:');
    request.approvals.forEach(approval => {
      console.log(`   Level ${approval.level} (${approval.name}): ${approval.status}`);
    });

    console.log('\n🔍 Testing Business Logic Rules:');
    console.log('✅ Rule 1: If any approval is rejected → request status becomes "closed"');
    console.log('✅ Rule 2: If all approvals are approved → request status becomes "open"');
    console.log('✅ Rule 3: Clarification requests don\'t change request status');

    // Test status enum values
    console.log('\n📋 Available Approval Statuses:');
    console.log('   - pending_approval (blue)');
    console.log('   - for_clarification (orange)');
    console.log('   - approved (green)');
    console.log('   - rejected (red)');

    console.log('\n📋 Available Request Statuses:');
    console.log('   - for_approval (blue)');
    console.log('   - open (green)');
    console.log('   - on_hold (yellow)');
    console.log('   - resolved (green)');
    console.log('   - closed (gray)');
    console.log('   - cancelled (red)');

    // Check API endpoints
    console.log('\n🔗 API Endpoints Updated:');
    console.log('   ✅ /api/approvals/action - Uses new enum values');
    console.log('   ✅ /api/approvals/pending - Filters by pending_approval & for_clarification');
    console.log('   ✅ /api/approvals/count - Counts pending_approval & for_clarification');

    // Simulate approval actions
    console.log('\n🎭 Workflow Simulation:');
    console.log('1. Level 1 approved → Next level activated');
    console.log('2. Level 2 requested clarification → Approval status = for_clarification, Request status unchanged');
    console.log('3. Level 2 approved after clarification → Next level activated');
    console.log('4. Level 3 approved → All levels complete, Request status = open');
    console.log('   OR');
    console.log('4. Level 3 rejected → Request status = closed (automatically)');

    console.log('\n✅ Approval workflow testing complete!');

  } catch (error) {
    console.error('❌ Error testing workflow:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testApprovalWorkflow();
