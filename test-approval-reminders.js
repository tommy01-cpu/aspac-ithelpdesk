// Test script for daily approval reminders
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testApprovalReminders() {
  try {
    console.log('🔍 Testing Daily Approval Reminders System');
    console.log('================================================\n');

    // 1. Check pending approvals (matching API query exactly)
    const pendingApprovals = await prisma.requestApproval.findMany({
      where: {
        status: 'pending_approval',
        request: {
          status: 'for_approval'
        }
      },
      include: {
        request: {
          include: {
            user: true
          }
        },
        approver: true
      }
    });

    console.log(`📊 Found ${pendingApprovals.length} pending approvals (matching API query)`);
    
    // Also check the previous query for comparison
    const allPendingApprovals = await prisma.requestApproval.findMany({
      where: {
        status: 'pending_approval'
      },
      include: {
        request: {
          include: {
            user: true
          }
        },
        approver: true
      }
    });

    console.log(`📊 Found ${allPendingApprovals.length} total pending approvals (without request status filter)`);
    
    if (pendingApprovals.length === 0 && allPendingApprovals.length > 0) {
      console.log('⚠️ No pending approvals have requests with status "for_approval"');
      console.log('📋 Request statuses for pending approvals:');
      allPendingApprovals.forEach(approval => {
        console.log(`   - Request #${approval.request.id}: status "${approval.request.status}"`);
      });
    }
    
    if (pendingApprovals.length === 0) {
      console.log('✅ No pending approvals found - reminders would not be sent');
      return;
    }

    // 2. Group by approver
    const approverGroups = new Map();
    
    pendingApprovals.forEach(approval => {
      const approverId = approval.approverId;
      if (approverId) {
        if (!approverGroups.has(approverId)) {
          approverGroups.set(approverId, []);
        }
        approverGroups.get(approverId).push(approval);
      }
    });

    console.log(`👥 Unique approvers to notify: ${approverGroups.size}\n`);

    // 3. Show details for each approver
    for (const [approverId, approvals] of approverGroups.entries()) {
      const approver = approvals[0].approver;
      
      if (approver && approver.emp_email) {
        console.log(`👤 Approver: ${approver.emp_fname} ${approver.emp_lname}`);
        console.log(`📧 Email: ${approver.emp_email}`);
        console.log(`📋 Pending approvals: ${approvals.length}`);
        
        approvals.forEach(approval => {
          const request = approval.request;
          const requesterName = `${request.user.emp_fname} ${request.user.emp_lname}`.trim();
          const requestSubject = getRequestSubject(request.formData);
          console.log(`   - Request #${request.id}: "${requestSubject}" from ${requesterName}`);
        });
        console.log('');
      } else {
        console.log(`⚠️ Approver ID ${approverId} - no email found`);
      }
    }

    // 4. Check email template
    console.log('📧 Checking email template...');
    const template = await prisma.email_templates.findUnique({
      where: { id: 13 } // APPROVAL_REMINDER template ID
    });

    if (template) {
      console.log(`✅ Template found: "${template.name}"`);
      console.log(`📋 Subject: ${template.subject}`);
    } else {
      console.log('❌ Approval reminder template not found (ID: 13)');
    }

    console.log('\n🧪 Test the actual API endpoint:');
    console.log('POST http://192.168.1.85:3000/api/scheduled-tasks/approval-reminders');
    console.log('\n💡 Tip: Set up Windows Task Scheduler to call this endpoint daily at 8 AM');

  } catch (error) {
    console.error('❌ Error testing approval reminders:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Helper function to extract request subject from formData
function getRequestSubject(formData) {
  if (typeof formData === 'object' && formData !== null) {
    return formData['8'] || formData['name'] || formData['title'] || formData['subject'] || 'Untitled Request';
  }
  return 'Untitled Request';
}

testApprovalReminders();
