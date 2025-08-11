const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Test the fixed count API logic
async function testFixedCountAPI() {
  try {
    console.log('🔍 Testing Fixed Count API Logic for Robert Baluyot...\n');

    // Simulate the same logic as the fixed count API
    const user = await prisma.users.findFirst({
      where: { emp_email: 'robert.baluyot@aspacphils.com.ph' }
    });

    if (!user) {
      console.log('❌ Robert not found');
      return;
    }

    console.log(`👤 Testing for: ${user.emp_fname} ${user.emp_lname} (ID: ${user.id})`);
    
    // Step 1: Get potential approvals
    const potentialApprovals = await prisma.requestApproval.findMany({
      where: {
        approverId: user.id,
        status: {
          in: ['pending_approval', 'for_clarification']
        }
      }
    });

    console.log(`📋 Potential approvals: ${potentialApprovals.length}`);
    potentialApprovals.forEach(approval => {
      console.log(`   Request #${approval.requestId} - Level ${approval.level} - Status: ${approval.status}`);
    });
    console.log('');

    // Step 2: Apply sequential filtering
    console.log('🔍 Applying sequential filtering...\n');
    const validApprovals = [];
    
    for (const approval of potentialApprovals) {
      console.log(`Checking Request #${approval.requestId}, Level ${approval.level}:`);
      
      // Check if all previous levels are approved
      const previousLevelApprovals = await prisma.requestApproval.findMany({
        where: {
          requestId: approval.requestId,
          level: { lt: approval.level }
        }
      });

      console.log(`  Previous levels: ${previousLevelApprovals.length}`);
      if (previousLevelApprovals.length > 0) {
        previousLevelApprovals.forEach(prev => {
          console.log(`    Level ${prev.level}: ${prev.status}`);
        });
      }

      const allPreviousApproved = previousLevelApprovals.length === 0 || 
        previousLevelApprovals.every(prevApproval => prevApproval.status === 'approved');

      console.log(`  All previous approved: ${allPreviousApproved ? 'YES' : 'NO'}`);
      
      if (allPreviousApproved) {
        validApprovals.push(approval);
        console.log(`  ✅ INCLUDED in count`);
      } else {
        console.log(`  ❌ EXCLUDED from count`);
      }
      console.log('');
    }

    // Step 3: Count unique requests
    const uniqueRequestIds = new Set(validApprovals.map(approval => approval.requestId));
    const uniqueCount = uniqueRequestIds.size;

    console.log(`🎯 FINAL COUNT RESULT:`);
    console.log(`   Valid approvals: ${validApprovals.length}`);
    console.log(`   Unique requests: ${uniqueCount}`);
    console.log(`   API will return: { count: ${uniqueCount} }`);
    console.log('');

    if (uniqueCount === 0) {
      console.log('✅ SUCCESS: Count API will now return 0 for Robert');
      console.log('✅ This should fix the sidebar count issue');
    } else {
      console.log('❌ Issue: Count API will still show non-zero count');
    }

  } catch (error) {
    console.error('❌ Error testing count API:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFixedCountAPI();
