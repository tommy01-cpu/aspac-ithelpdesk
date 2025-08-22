const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkLatestRequestApprovals() {
  console.log('🔍 CHECKING LATEST REQUEST APPROVALS');
  console.log('='.repeat(50));
  
  try {
    // Get the latest request
    const latestRequest = await prisma.request.findFirst({
      orderBy: { id: 'desc' },
      include: {
        approvals: {
          include: {
            approver: {
              select: {
                emp_fname: true,
                emp_lname: true,
                emp_email: true
              }
            }
          }
        }
      }
    });
    
    if (!latestRequest) {
      console.log('❌ No requests found');
      return;
    }
    
    console.log('📋 Latest Request:', latestRequest.id);
    console.log('📊 Number of approvals:', latestRequest.approvals.length);
    
    latestRequest.approvals.forEach((approval, index) => {
      console.log(`\n--- Approval ${index + 1} (Level ${approval.level}) ---`);
      console.log('- Approval ID:', approval.id);
      console.log('- Status:', approval.status);
      console.log('- Approver ID:', approval.approverId);
      console.log('- Stored Name:', approval.approverName);
      console.log('- Stored Email:', approval.approverEmail);
      
      if (approval.approver) {
        console.log('- User Record Name:', `${approval.approver.emp_fname} ${approval.approver.emp_lname}`);
        console.log('- User Record Email:', approval.approver.emp_email);
      } else {
        console.log('- User Record: NOT FOUND');
      }
      
      // Check if stored vs user record matches
      if (approval.approver) {
        const expectedName = `${approval.approver.emp_fname} ${approval.approver.emp_lname}`.trim();
        const expectedEmail = approval.approver.emp_email;
        
        const nameMatches = approval.approverName === expectedName;
        const emailMatches = approval.approverEmail === expectedEmail;
        
        console.log('- Name matches:', nameMatches ? '✅' : '❌');
        console.log('- Email matches:', emailMatches ? '✅' : '❌');
      }
    });
    
    // Test notification for the first pending approval
    const pendingApproval = latestRequest.approvals.find(a => a.status === 'pending_approval');
    if (pendingApproval) {
      console.log('\n🧪 Testing notification for pending approval...');
      console.log('Pending approval level:', pendingApproval.level);
      
      const response = await fetch('http://localhost:3000/api/notifications/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: latestRequest.id,
          templateKey: 'notify-approver-approval'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Notification sent successfully');
        console.log('Approver Name in email:', result.approverName);
        console.log('Approver Email in email:', result.approverEmail);
      } else {
        console.log('❌ Notification failed:', response.status);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLatestRequestApprovals();
