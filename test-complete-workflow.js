const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCompleteApprovalCountWorkflow() {
  try {
    console.log('🔍 COMPLETE APPROVAL COUNT WORKFLOW TEST\n');

    // Test for Robert Baluyot (Level 2 approver - should see 0)
    console.log('1️⃣ Testing Robert Baluyot (Level 2 Approver)');
    console.log('   Expected: Count = 0 (Level 1 not complete)\n');
    
    const robert = await prisma.users.findFirst({
      where: { emp_email: 'robert.baluyot@aspacphils.com.ph' }
    });

    const robertResult = await testUserApprovalCount(robert);
    console.log(`   ✅ Robert's Count: ${robertResult.count}`);
    console.log(`   Badge Display: ${robertResult.count > 0 ? 'SHOWN' : 'HIDDEN'}\n`);

    // Test for Floi Neri (Level 1 approver - should see 1)
    console.log('2️⃣ Testing Floi Neri (Level 1 Approver)');
    console.log('   Expected: Count = 1 (has for_clarification status)\n');

    const floi = await prisma.users.findFirst({
      where: { emp_email: 'floi.neri@aspacphils.com.ph' }
    });

    const floiResult = await testUserApprovalCount(floi);
    console.log(`   ✅ Floi's Count: ${floiResult.count}`);
    console.log(`   Badge Display: ${floiResult.count > 0 ? 'SHOWN' : 'HIDDEN'}\n`);

    // Test for Daisy Barquin (Level 1 approver - should see 1)
    console.log('3️⃣ Testing Daisy Barquin (Level 1 Approver)');
    console.log('   Expected: Count = 1 (has pending_approval status)\n');

    const daisy = await prisma.users.findFirst({
      where: { emp_email: 'daisy.barquin@a.com.ph' }
    });

    const daisyResult = await testUserApprovalCount(daisy);
    console.log(`   ✅ Daisy's Count: ${daisyResult.count}`);
    console.log(`   Badge Display: ${daisyResult.count > 0 ? 'SHOWN' : 'HIDDEN'}\n`);

    // Summary
    console.log('📋 SUMMARY:');
    console.log('┌─────────────────┬───────┬──────────────┬──────────┐');
    console.log('│ User            │ Level │ Status       │ Count    │');
    console.log('├─────────────────┼───────┼──────────────┼──────────┤');
    console.log(`│ Robert Baluyot  │   2   │ Blocked      │    ${robertResult.count}     │`);
    console.log(`│ Floi Neri       │   1   │ Active       │    ${floiResult.count}     │`);
    console.log(`│ Daisy Barquin   │   1   │ Active       │    ${daisyResult.count}     │`);
    console.log('└─────────────────┴───────┴──────────────┴──────────┘');
    console.log('');

    console.log('🎯 EXPECTED BEHAVIOR:');
    console.log('   • Robert sees NO red badge (count = 0)');
    console.log('   • Floi sees red badge with "1"');
    console.log('   • Daisy sees red badge with "1"');
    console.log('   • Only Level 1 approvers can take action until all Level 1 is complete');

  } catch (error) {
    console.error('❌ Error in workflow test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function testUserApprovalCount(user) {
  if (!user) {
    return { count: 0, message: 'User not found' };
  }

  // Apply the same logic as the fixed count API
  const potentialApprovals = await prisma.requestApproval.findMany({
    where: {
      approverId: user.id,
      status: {
        in: ['pending_approval', 'for_clarification']
      }
    }
  });

  const validApprovals = [];
  
  for (const approval of potentialApprovals) {
    const previousLevelApprovals = await prisma.requestApproval.findMany({
      where: {
        requestId: approval.requestId,
        level: { lt: approval.level }
      }
    });

    const allPreviousApproved = previousLevelApprovals.length === 0 || 
      previousLevelApprovals.every(prevApproval => prevApproval.status === 'approved');

    if (allPreviousApproved) {
      validApprovals.push(approval);
    }
  }

  const uniqueRequestIds = new Set(validApprovals.map(approval => approval.requestId));
  return { count: uniqueRequestIds.size };
}

testCompleteApprovalCountWorkflow();
