const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugApprovalCounting() {
  try {
    console.log('🔍 Debugging Approval Counting Issue for Robert Baluyot...\n');

    // Get Robert Baluyot's user info
    const robert = await prisma.users.findFirst({
      where: { emp_email: 'robert.baluyot@aspacphils.com.ph' }
    });

    if (!robert) {
      console.log('❌ Robert Baluyot not found');
      return;
    }

    console.log('👤 Robert Baluyot:');
    console.log(`   ID: ${robert.id}`);
    console.log(`   Name: ${robert.emp_fname} ${robert.emp_lname}`);
    console.log(`   Email: ${robert.emp_email}`);
    console.log('');

    // Get all approvals assigned to Robert
    const robertsApprovals = await prisma.requestApproval.findMany({
      where: { approverId: robert.id },
      include: {
        request: {
          include: {
            user: {
              select: {
                emp_fname: true,
                emp_lname: true,
                emp_email: true
              }
            }
          }
        }
      },
      orderBy: [
        { requestId: 'asc' },
        { level: 'asc' }
      ]
    });

    console.log(`📋 All Approvals Assigned to Robert: ${robertsApprovals.length}`);
    if (robertsApprovals.length === 0) {
      console.log('   No approvals assigned to Robert');
      return;
    }

    robertsApprovals.forEach(approval => {
      console.log(`   Request #${approval.requestId} - Level ${approval.level} - Status: ${approval.status}`);
      console.log(`     Requester: ${approval.request.user.emp_fname} ${approval.request.user.emp_lname}`);
    });
    console.log('');

    // Filter approvals with pending statuses
    const pendingStatusApprovals = robertsApprovals.filter(approval => 
      approval.status === 'pending_approval' || approval.status === 'for_clarification'
    );

    console.log(`📋 Robert's Approvals with Pending Status: ${pendingStatusApprovals.length}`);
    pendingStatusApprovals.forEach(approval => {
      console.log(`   Request #${approval.requestId} - Level ${approval.level} - Status: ${approval.status}`);
    });
    console.log('');

    // Now apply sequential logic for each approval
    console.log('🔍 Applying Sequential Approval Logic...\n');
    
    const validApprovals = [];
    
    for (const approval of pendingStatusApprovals) {
      console.log(`Checking Request #${approval.requestId}, Level ${approval.level}:`);
      
      // Check if all previous levels are approved
      const previousLevelApprovals = await prisma.requestApproval.findMany({
        where: {
          requestId: approval.requestId,
          level: { lt: approval.level } // levels less than current level
        }
      });

      console.log(`  Previous levels (< ${approval.level}): ${previousLevelApprovals.length}`);
      
      if (previousLevelApprovals.length > 0) {
        console.log('  Previous level statuses:');
        previousLevelApprovals.forEach(prev => {
          console.log(`    Level ${prev.level}: ${prev.status}`);
        });
      }

      // Check if all previous levels are approved
      const allPreviousApproved = previousLevelApprovals.length === 0 || 
        previousLevelApprovals.every(prevApproval => prevApproval.status === 'approved');

      console.log(`  All previous levels approved: ${allPreviousApproved ? 'YES' : 'NO'}`);
      
      if (allPreviousApproved) {
        validApprovals.push(approval);
        console.log(`  ✅ VALID: This approval should appear for Robert`);
      } else {
        console.log(`  ❌ BLOCKED: Previous levels not completed yet`);
      }
      console.log('');
    }

    console.log(`🎯 FINAL RESULT:`);
    console.log(`   Total approvals assigned to Robert: ${robertsApprovals.length}`);
    console.log(`   Approvals with pending status: ${pendingStatusApprovals.length}`);
    console.log(`   Valid approvals (after sequential filter): ${validApprovals.length}`);
    console.log('');

    if (validApprovals.length > 0) {
      console.log('📝 Valid approvals that should appear:');
      validApprovals.forEach(approval => {
        console.log(`   Request #${approval.requestId} - Level ${approval.level} - ${approval.status}`);
      });
    } else {
      console.log('✅ NO approvals should appear for Robert (Level 1 not completed)');
    }

    // Check specifically for Request #28 Level 1 status
    console.log('\n🔍 Checking Request #28 Level 1 Status:');
    const level1Approvals = await prisma.requestApproval.findMany({
      where: {
        requestId: 28,
        level: 1
      },
      include: {
        approver: {
          select: {
            emp_fname: true,
            emp_lname: true,
            emp_email: true
          }
        }
      }
    });

    console.log(`   Level 1 approvals for Request #28: ${level1Approvals.length}`);
    level1Approvals.forEach(approval => {
      console.log(`     ${approval.approver?.emp_fname} ${approval.approver?.emp_lname}: ${approval.status}`);
    });

    const allLevel1Approved = level1Approvals.every(app => app.status === 'approved');
    console.log(`   All Level 1 approved: ${allLevel1Approved ? 'YES' : 'NO'}`);

  } catch (error) {
    console.error('❌ Error debugging approval counting:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugApprovalCounting();
