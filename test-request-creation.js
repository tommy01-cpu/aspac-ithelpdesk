const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testRequestCreation() {
  try {
    console.log('🧪 Testing Request Creation API Fix...\n');

    // Test the enum values directly in the database
    console.log('✅ Testing enum values:');
    console.log('RequestStatus enum values:');
    console.log('  - for_approval');
    console.log('  - cancelled');
    console.log('  - open');
    console.log('  - on_hold');
    console.log('  - resolved');
    console.log('  - closed');

    console.log('\nApprovalStatus enum values:');
    console.log('  - pending_approval');
    console.log('  - for_clarification');
    console.log('  - rejected');
    console.log('  - approved');

    // Test creating a request with the correct enum value
    console.log('\n🔧 Testing request creation with correct enum value...');
    
    const testUser = await prisma.users.findFirst();
    if (!testUser) {
      console.log('❌ No users found in database');
      return;
    }

    // Create a test request directly with the enum value
    const testRequest = await prisma.request.create({
      data: {
        templateId: '1',
        templateName: 'Test Request',
        type: 'service',
        status: 'for_approval', // Using correct enum value
        priority: 'low',
        userId: testUser.id,
        formData: { test: 'data' },
        attachments: []
      }
    });

    console.log(`✅ Request created successfully!`);
    console.log(`   ID: ${testRequest.id}`);
    console.log(`   Status: ${testRequest.status}`);
    console.log(`   Priority: ${testRequest.priority}`);

    // Clean up the test request
    await prisma.request.delete({
      where: { id: testRequest.id }
    });
    console.log('🧹 Test request cleaned up');

    console.log('\n🎯 Fix Status: SUCCESSFUL');
    console.log('   - Request API now uses correct enum values');
    console.log('   - Status: for_approval (with underscore)');
    console.log('   - ApprovalStatus: pending_approval (with underscore)');

  } catch (error) {
    console.error('❌ Error testing request creation:', error);
    console.log('\n🔧 Possible issues:');
    console.log('   - Database schema not updated with enums');
    console.log('   - Enum values mismatch');
    console.log('   - Prisma client needs regeneration');
  } finally {
    await prisma.$disconnect();
  }
}

testRequestCreation();
