const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupTestApprovalScenario() {
  try {
    console.log('🧪 Setting up Test Approval Scenario...\n');

    // Create a test request with multiple approvals to test the workflow
    const testRequest = await prisma.request.create({
      data: {
        templateId: '1',
        templateName: 'Test Approval Workflow',
        type: 'service',
        status: 'for_approval',
        priority: 'medium',
        userId: 1, // Tom Mandapat
        formData: {
          'description': 'Test request to verify approval completion workflow',
          'priority': 'medium',
          '5': 'for-approval' // Initial approval status
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log(`✅ Created test request #${testRequest.id}`);

    // Create multiple approval levels
    const approvals = [
      {
        requestId: testRequest.id,
        level: 1,
        name: 'Level 1 Approval A',
        status: 'pending_approval',
        approverId: 2, // Sample approver
        approverEmail: 'approver1@test.com',
        sentOn: new Date()
      },
      {
        requestId: testRequest.id,
        level: 1,
        name: 'Level 1 Approval B',
        status: 'pending_approval',
        approverId: 3, // Sample approver
        approverEmail: 'approver2@test.com',
        sentOn: new Date()
      },
      {
        requestId: testRequest.id,
        level: 2,
        name: 'Level 2 Final Approval',
        status: 'pending_approval', // Use valid enum value
        approverId: 4, // Sample approver
        approverEmail: 'approver3@test.com',
        sentOn: new Date() // Changed to new Date() since enum doesn't allow null for sent status
      }
    ];

    for (const approval of approvals) {
      const created = await prisma.requestApproval.create({
        data: approval
      });
      console.log(`✅ Created approval: Level ${approval.level} - ${approval.name} (ID: ${created.id})`);
    }

    // Create initial history
    await prisma.requestHistory.create({
      data: {
        requestId: testRequest.id,
        action: 'Request Created',
        actorName: 'Tom Mandapat',
        actorType: 'user',
        details: 'Test request created for approval workflow testing',
        actorId: 1,
        timestamp: new Date()
      }
    });

    console.log('\n📋 Test Scenario Setup Complete!');
    console.log(`   Request ID: ${testRequest.id}`);
    console.log(`   Initial Status: ${testRequest.status}`);
    console.log(`   Initial Approval Status: ${testRequest.formData?.['5']}`);
    console.log(`   Total Approvals: ${approvals.length}`);
    console.log(`   Level 1 Approvals: 2 (pending)`);
    console.log(`   Level 2 Approvals: 1 (not sent)`);

    console.log('\n🎯 Next Steps:');
    console.log('1. Approve Level 1 approvals → Level 2 should activate');
    console.log('2. Approve Level 2 approval → Request should be marked as "approved"');
    console.log(`\nTest Request ID: ${testRequest.id}`);

  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupTestApprovalScenario();
