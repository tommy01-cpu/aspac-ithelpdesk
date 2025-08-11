const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPendingApprovalsAPI() {
  try {
    console.log('🔍 TESTING: Pending Approvals API Logic...\n');
    
    // Simulate the API logic for Floi Neri
    const floiEmail = 'floi.neri@aspacphils.com.ph';
    
    console.log(`1️⃣ Finding user by email: ${floiEmail}`);
    const user = await prisma.users.findFirst({
      where: { emp_email: floiEmail },
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`✅ Found user: ${user.emp_fname} ${user.emp_lname} (ID: ${user.id})\n`);

    // Check if user has any approval assignments (exactly like the API)
    console.log('2️⃣ Getting potential approvals...');
    const potentialApprovals = await prisma.requestApproval.findMany({
      where: {
        approverId: user.id,
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
                emp_email: true,
                department: true
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
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Found ${potentialApprovals.length} potential approvals\n`);

    potentialApprovals.forEach((approval, idx) => {
      console.log(`Potential Approval ${idx + 1}:`);
      console.log(`  Request ID: ${approval.requestId}`);
      console.log(`  Level: ${approval.level}`);
      console.log(`  Status: ${approval.status}`);
      console.log(`  Requester: ${approval.request.user.emp_fname} ${approval.request.user.emp_lname}`);
      console.log('');
    });

    // Filter approvals to ensure sequential workflow
    console.log('3️⃣ Filtering for sequential workflow...');
    const validApprovals = [];
    
    for (const approval of potentialApprovals) {
      console.log(`\nChecking approval for Request #${approval.requestId}, Level ${approval.level}:`);
      
      // Check if all previous levels are approved
      const previousLevelApprovals = await prisma.requestApproval.findMany({
        where: {
          requestId: approval.requestId,
          level: { lt: approval.level } // levels less than current level
        }
      });

      console.log(`  Previous levels count: ${previousLevelApprovals.length}`);

      // If there are no previous levels, or all previous levels are approved, include this approval
      const allPreviousApproved = previousLevelApprovals.length === 0 || 
        previousLevelApprovals.every(prevApproval => prevApproval.status === 'approved');

      console.log(`  All previous approved: ${allPreviousApproved}`);
      console.log(`  Will be included: ${allPreviousApproved ? '✅ YES' : '❌ NO'}`);

      if (allPreviousApproved) {
        validApprovals.push(approval);
      } else {
        console.log(`  Blocking approvals:`);
        previousLevelApprovals
          .filter(prev => prev.status !== 'approved')
          .forEach(prev => {
            console.log(`    Level ${prev.level}: ${prev.status}`);
          });
      }
    }

    console.log(`\n4️⃣ Final valid approvals: ${validApprovals.length}`);

    if (validApprovals.length === 0) {
      console.log('❌ NO VALID APPROVALS - This is why it\'s not showing!');
      return;
    }

    // Format the approvals for the frontend (exactly like the API)
    console.log('\n5️⃣ Formatting approvals for frontend...');
    const formattedApprovals = validApprovals.map(approval => ({
      id: approval.id,
      requestId: approval.request.id,
      requestTitle: approval.request.templateName || `Request #${approval.request.id}`,
      requestType: approval.request.type || 'Request',
      requesterName: `${approval.request.user.emp_fname} ${approval.request.user.emp_lname}`,
      requesterEmail: approval.request.user.emp_email,
      department: approval.request.user.department || 'Unknown',
      createdDate: approval.request.createdAt,
      dueDate: null,
      priority: approval.request.priority,
      status: approval.status,
      level: approval.level,
      levelName: approval.name || `Level ${approval.level}`,
      description: approval.request.formData?.description || ''
    }));

    console.log('Formatted approvals:');
    formattedApprovals.forEach((approval, idx) => {
      console.log(`\nFormatted Approval ${idx + 1}:`);
      console.log(`  ID: ${approval.id}`);
      console.log(`  Request ID: ${approval.requestId}`);
      console.log(`  Title: ${approval.requestTitle}`);
      console.log(`  Requester: ${approval.requesterName}`);
      console.log(`  Status: ${approval.status}`);
      console.log(`  Level: ${approval.level} - ${approval.levelName}`);
    });

    // Group by requestId to avoid duplicate requests and take the first approval per request
    console.log('\n6️⃣ Deduplicating by request ID...');
    const uniqueApprovals = [];
    const seenRequestIds = new Set();
    
    for (const approval of formattedApprovals) {
      if (!seenRequestIds.has(approval.requestId)) {
        seenRequestIds.add(approval.requestId);
        uniqueApprovals.push(approval);
        console.log(`  ✅ Including Request #${approval.requestId}`);
      } else {
        console.log(`  ⏭️ Skipping duplicate Request #${approval.requestId}`);
      }
    }

    console.log(`\n📊 FINAL RESULT: ${uniqueApprovals.length} unique approvals would be returned`);
    
    if (uniqueApprovals.length > 0) {
      console.log('✅ These approvals SHOULD appear in the UI!');
      console.log('\n🔍 If they\'re not showing, check:');
      console.log('1. Are you logged in as floi.neri@aspacphils.com.ph?');
      console.log('2. Is the frontend filtering or session working correctly?');
      console.log('3. Check browser console for any JavaScript errors');
    } else {
      console.log('❌ No approvals would be returned - this explains the issue!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPendingApprovalsAPI();
