const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testEnumSystem() {
  try {
    console.log('🧪 Testing Enum System...\n');

    // Create a test user first
    const testUser = await prisma.user.upsert({
      where: { loginName: 'testuser' },
      update: {},
      create: {
        loginName: 'testuser',
        name: 'Test User',
        email: 'test@company.com',
        department: 'IT'
      }
    });
    console.log(`👤 Test user: ${testUser.name} (ID: ${testUser.id})`);

    // Create a test request with the new enum
    const testRequest = await prisma.request.create({
      data: {
        templateName: 'Test Request for Enum Validation',
        description: 'Testing the new enum system',
        priority: 'high',
        status: 'for_approval', // Using new enum value
        userId: testUser.id
      }
    });
    console.log(`📝 Created request: ${testRequest.templateName} (ID: ${testRequest.id})`);
    console.log(`📊 Request Status: ${testRequest.status}`);

    // Create test approvers
    const approver1 = await prisma.user.upsert({
      where: { loginName: 'approver1' },
      update: {},
      create: {
        loginName: 'approver1',
        name: 'Level 1 Approver',
        email: 'approver1@company.com',
        department: 'IT'
      }
    });

    const approver2 = await prisma.user.upsert({
      where: { loginName: 'approver2' },
      update: {},
      create: {
        loginName: 'approver2',
        name: 'Level 2 Approver',
        email: 'approver2@company.com',
        department: 'IT'
      }
    });

    // Create approval levels with new enum values
    const approval1 = await prisma.requestApproval.create({
      data: {
        requestId: testRequest.id,
        approverId: approver1.id,
        level: 1,
        name: 'Level 1 Approval',
        status: 'pending_approval' // Using new enum value
      }
    });

    const approval2 = await prisma.requestApproval.create({
      data: {
        requestId: testRequest.id,
        approverId: approver2.id,
        level: 2,
        name: 'Level 2 Approval',
        status: 'pending_approval' // Using new enum value
      }
    });

    console.log(`✅ Created approval levels:`);
    console.log(`   Level 1: ${approval1.name} - Status: ${approval1.status}`);
    console.log(`   Level 2: ${approval2.name} - Status: ${approval2.status}`);

    // Test different enum values
    console.log('\n🔄 Testing status updates...');

    // Update to for_clarification
    await prisma.requestApproval.update({
      where: { id: approval1.id },
      data: { status: 'for_clarification' }
    });
    console.log('✅ Updated Level 1 to: for_clarification');

    // Update to approved
    await prisma.requestApproval.update({
      where: { id: approval1.id },
      data: { status: 'approved' }
    });
    console.log('✅ Updated Level 1 to: approved');

    // Update request status to open
    await prisma.request.update({
      where: { id: testRequest.id },
      data: { status: 'open' }
    });
    console.log('✅ Updated Request status to: open');

    // Test rejected status
    await prisma.requestApproval.update({
      where: { id: approval2.id },
      data: { status: 'rejected' }
    });
    console.log('✅ Updated Level 2 to: rejected');

    // Auto-close request when rejected
    await prisma.request.update({
      where: { id: testRequest.id },
      data: { status: 'closed' }
    });
    console.log('✅ Updated Request status to: closed (due to rejection)');

    // Get final status
    const finalRequest = await prisma.request.findUnique({
      where: { id: testRequest.id },
      include: {
        approvals: true
      }
    });

    console.log('\n📋 Final Status Summary:');
    console.log(`Request Status: ${finalRequest.status}`);
    finalRequest.approvals.forEach(approval => {
      console.log(`   Level ${approval.level}: ${approval.status}`);
    });

    console.log('\n✅ Enum system test completed successfully!');
    console.log('🎯 All enum values working correctly:');
    console.log('   ApprovalStatus: pending_approval, for_clarification, approved, rejected');
    console.log('   RequestStatus: for_approval, open, closed');

  } catch (error) {
    console.error('❌ Error testing enum system:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testEnumSystem();
