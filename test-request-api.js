const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testRequestAPI() {
  try {
    console.log('🔍 Testing Request API data for Request #28...\n');

    // Simulate what the /api/requests/28 endpoint returns
    const requestId = 28;

    // Get the request data
    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        user: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_email: true,
            department: true,
          }
        }
      }
    });

    if (!request) {
      console.log('❌ Request #28 not found');
      return;
    }

    console.log('📄 Request Data:');
    console.log(`   ID: ${request.id}`);
    console.log(`   Template: ${request.templateName}`);
    console.log(`   Status: ${request.status}`);
    console.log(`   Requester: ${request.user.emp_fname} ${request.user.emp_lname}`);
    console.log('');

    // Fetch request approvals from database (same as API)
    const approvals = await prisma.requestApproval.findMany({
      where: {
        requestId: requestId,
      },
      include: {
        approver: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_email: true,
          }
        }
      },
      orderBy: {
        level: 'asc'
      }
    });

    console.log('🔖 Raw Approval Data from Database:');
    if (approvals.length === 0) {
      console.log('   ❌ No approvals found for this request');
    } else {
      approvals.forEach(approval => {
        console.log(`   Level ${approval.level}: ${approval.name || `Level ${approval.level}`}`);
        console.log(`     Approver: ${approval.approver?.emp_fname || 'Unknown'} ${approval.approver?.emp_lname || 'User'} (${approval.approver?.emp_email || 'no-email'})`);
        console.log(`     Status: ${approval.status}`);
        console.log(`     Approval ID: ${approval.id}`);
        console.log(`     Sent On: ${approval.sentOn}`);
        console.log(`     Acted On: ${approval.actedOn}`);
        console.log(`     Comments: ${approval.comments || 'None'}`);
        console.log('');
      });
    }

    // Format approvals like the API does
    const formattedApprovals = approvals.map(approval => ({
      id: approval.id.toString(),
      level: approval.level,
      name: approval.name,
      status: approval.status,
      approver: approval.approverName || (approval.approver ? 
        `${approval.approver.emp_fname} ${approval.approver.emp_lname}` : 'Unknown'),
      approverEmail: approval.approverEmail || approval.approver?.emp_email,
      sentOn: approval.sentOn?.toISOString(),
      actedOn: approval.actedOn?.toISOString(),
      comments: approval.comments,
    }));

    console.log('📋 Formatted Approval Data (what frontend receives):');
    formattedApprovals.forEach(approval => {
      console.log(`   Level ${approval.level}: ${approval.name || `Level ${approval.level}`}`);
      console.log(`     Approver: ${approval.approver}`);
      console.log(`     Email: ${approval.approverEmail}`);
      console.log(`     Status: ${approval.status}`);
      console.log(`     Approval ID: ${approval.id}`);
      console.log('');
    });

    // Check if Floi Neri's approval has the correct status
    const floiApproval = formattedApprovals.find(approval => 
      approval.approverEmail === 'floi.neri@aspacphils.com.ph'
    );

    if (floiApproval) {
      console.log('✅ Floi Neri\'s approval found in API response:');
      console.log(`   Level: ${floiApproval.level}`);
      console.log(`   Status: ${floiApproval.status}`);
      console.log(`   Should show "For Clarification" in UI: ${floiApproval.status === 'for_clarification' ? 'YES' : 'NO'}`);
    } else {
      console.log('❌ Floi Neri\'s approval NOT found in API response');
    }

  } catch (error) {
    console.error('❌ Error testing request API:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRequestAPI();
