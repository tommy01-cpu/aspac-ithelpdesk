const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testApproverNameFix() {
  console.log('🧪 TESTING APPROVER NAME FIX');
  console.log('='.repeat(50));
  
  try {
    // Find a request with pending approvals
    const requestWithApprovals = await prisma.request.findFirst({
      where: {
        status: 'for_approval'
      },
      include: {
        approvals: {
          where: { status: 'pending_approval' },
          include: {
            approver: {
              select: {
                emp_fname: true,
                emp_lname: true,
                emp_email: true
              }
            }
          }
        },
        user: {
          select: {
            emp_fname: true,
            emp_lname: true,
            emp_email: true
          }
        }
      }
    });
    
    if (!requestWithApprovals || !requestWithApprovals.approvals.length) {
      console.log('❌ No request with pending approvals found');
      return;
    }
    
    const approval = requestWithApprovals.approvals[0];
    
    console.log('📋 Test Data:');
    console.log('- Request ID:', requestWithApprovals.id);
    console.log('- Approval ID:', approval.id);
    console.log('- Approver ID:', approval.approverId);
    console.log('- Stored Approver Name:', approval.approverName);
    console.log('- Stored Approver Email:', approval.approverEmail);
    
    if (approval.approver) {
      console.log('- User Record Name:', `${approval.approver.emp_fname} ${approval.approver.emp_lname}`);
      console.log('- User Record Email:', approval.approver.emp_email);
    }
    
    // Test the approver notification API
    console.log('\n🔧 Testing approver notification API...');
    
    const response = await fetch('http://localhost:3000/api/notifications/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestId: requestWithApprovals.id,
        templateKey: 'notify-approver-approval'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ API Response:', result);
      
      if (result.approverName) {
        console.log('✅ SUCCESS: Approver name is now included:', result.approverName);
      } else {
        console.log('❌ FAILED: Approver name still missing');
      }
    } else {
      console.log('❌ API call failed:', response.status, await response.text());
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testApproverNameFix();
