const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugApprovalVisibility() {
  try {
    console.log('🔍 Debugging why you cannot view approvals...\n');

    // Step 1: Check what user you're logged in as
    console.log('1️⃣ CHECKING CURRENT USER SESSION');
    console.log('   Please check your browser developer tools > Application > Cookies');
    console.log('   Look for next-auth.session-token to see if you\'re logged in\n');

    // Step 2: Check all users in the system
    console.log('2️⃣ ALL USERS IN THE SYSTEM:');
    const allUsers = await prisma.users.findMany({
      select: {
        id: true,
        emp_fname: true,
        emp_lname: true,
        emp_email: true,
        isServiceApprover: true,
        isTechnician: true
      },
      orderBy: { id: 'asc' }
    });

    allUsers.forEach(user => {
      console.log(`   ID ${user.id}: ${user.emp_fname} ${user.emp_lname}`);
      console.log(`      Email: ${user.emp_email}`);
      console.log(`      Service Approver: ${user.isServiceApprover}`);
      console.log(`      Technician: ${user.isTechnician}`);
      console.log('');
    });

    // Step 3: Check all pending approvals with their assigned approvers
    console.log('3️⃣ ALL PENDING APPROVALS IN DATABASE:');
    const allPendingApprovals = await prisma.requestApproval.findMany({
      where: {
        status: {
          in: ['pending_approval', 'for_clarification']
        }
      },
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
        },
        approver: {
          select: {
            emp_fname: true,
            emp_lname: true,
            emp_email: true
          }
        }
      },
      orderBy: [
        { requestId: 'asc' },
        { level: 'asc' }
      ]
    });

    if (allPendingApprovals.length === 0) {
      console.log('   ❌ NO PENDING APPROVALS FOUND IN DATABASE');
      console.log('   This is why you see "No Pending Approvals"\n');
    } else {
      allPendingApprovals.forEach(approval => {
        console.log(`   Request #${approval.requestId}: ${approval.request.templateName}`);
        console.log(`      Level ${approval.level}: ${approval.name}`);
        console.log(`      Assigned to: ${approval.approver?.emp_fname || 'Unknown'} ${approval.approver?.emp_lname || 'User'}`);
        console.log(`      Approver Email: ${approval.approver?.emp_email || 'No email'}`);
        console.log(`      Approver ID: ${approval.approverId}`);
        console.log(`      Status: ${approval.status}`);
        console.log('');
      });
    }

    // Step 4: Test the sequential approval logic for each user
    console.log('4️⃣ TESTING SEQUENTIAL APPROVAL LOGIC:');
    
    for (const user of allUsers) {
      console.log(`\n👤 Testing for user: ${user.emp_fname} ${user.emp_lname} (${user.emp_email})`);
      
      // Get approvals assigned to this user
      const userApprovals = await prisma.requestApproval.findMany({
        where: {
          approverId: user.id,
          status: {
            in: ['pending_approval', 'for_clarification']
          }
        }
      });

      if (userApprovals.length === 0) {
        console.log(`   ❌ No approvals assigned to this user`);
        continue;
      }

      console.log(`   📋 ${userApprovals.length} approval(s) assigned to this user:`);

      for (const approval of userApprovals) {
        // Check if previous levels are approved
        const previousLevels = await prisma.requestApproval.findMany({
          where: {
            requestId: approval.requestId,
            level: { lt: approval.level }
          }
        });

        const allPreviousApproved = previousLevels.length === 0 || 
          previousLevels.every(prev => prev.status === 'approved');

        console.log(`      Request #${approval.requestId} Level ${approval.level}: ${allPreviousApproved ? '✅ VISIBLE' : '❌ HIDDEN'}`);
        
        if (!allPreviousApproved) {
          const blocking = previousLevels.filter(prev => prev.status !== 'approved');
          console.log(`         Blocked by: Level ${blocking.map(b => `${b.level} (${b.status})`).join(', ')}`);
        }
      }
    }

    // Step 5: Check common login emails
    console.log('\n5️⃣ TESTING COMMON LOGIN SCENARIOS:');
    const commonEmails = [
      'tom.mandapat@aspacphils.com.ph',
      'jhon.sanchez@aspacphils.com.ph', 
      'enelyn.bactad@a.com.ph',
      'annie.paeldon@a.com.ph',
      'robert.baluyot@aspacphils.com.ph'
    ];

    for (const email of commonEmails) {
      const user = await prisma.users.findFirst({
        where: { emp_email: email }
      });

      if (user) {
        const userApprovals = await prisma.requestApproval.findMany({
          where: {
            approverId: user.id,
            status: {
              in: ['pending_approval', 'for_clarification']
            }
          }
        });

        // Apply sequential filter
        const validApprovals = [];
        for (const approval of userApprovals) {
          const previousLevels = await prisma.requestApproval.findMany({
            where: {
              requestId: approval.requestId,
              level: { lt: approval.level }
            }
          });

          const allPreviousApproved = previousLevels.length === 0 || 
            previousLevels.every(prev => prev.status === 'approved');

          if (allPreviousApproved) {
            validApprovals.push(approval);
          }
        }

        console.log(`   ${email}: ${validApprovals.length} visible approval(s)`);
      } else {
        console.log(`   ${email}: ❌ User not found`);
      }
    }

    console.log('\n💡 TROUBLESHOOTING STEPS:');
    console.log('1. Check if you\'re logged in with the correct email');
    console.log('2. Verify your user has approvals assigned in the database');
    console.log('3. Check if previous approval levels are blocking your level');
    console.log('4. If no approvals exist, create test data or check request creation');

  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugApprovalVisibility();
