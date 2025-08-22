const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkApprovalStructure() {
  try {
    console.log('=== Checking Request Approval Structure ===');
    
    // Check if we have any requests with approvals
    const requestWithApprovals = await prisma.request.findFirst({
      include: {
        approvals: {
          orderBy: { level: 'asc' },
          include: {
            approver: {
              select: {
                id: true,
                emp_fname: true,
                emp_lname: true,
                emp_email: true
              }
            }
          }
        }
      },
      where: {
        approvals: {
          some: {}
        }
      }
    });
    
    if (requestWithApprovals) {
      console.log('Found request with approvals:');
      console.log('Request ID:', requestWithApprovals.id);
      console.log('Status:', requestWithApprovals.status);
      console.log('');
      console.log('Approvals structure:');
      requestWithApprovals.approvals.forEach(approval => {
        console.log(`Level ${approval.level}: ${approval.name}`);
        console.log(`  - Approver ID: ${approval.approverId}`);
        console.log(`  - Approver Name: ${approval.approverName}`);
        console.log(`  - Approver Email: ${approval.approverEmail}`);
        console.log(`  - Status: ${approval.status}`);
        if (approval.approver) {
          console.log(`  - User Info: ${approval.approver.emp_fname} ${approval.approver.emp_lname} (${approval.approver.emp_email})`);
        }
        console.log('');
      });
      
      // Show current approval level logic
      const currentLevel = requestWithApprovals.approvals.find(a => a.status === 'pending_approval');
      if (currentLevel) {
        console.log('🎯 CURRENT APPROVAL LEVEL:', currentLevel.level);
        console.log('📧 Should send email to:', currentLevel.approverName || 'Unknown');
        console.log('📧 Email address:', currentLevel.approverEmail || currentLevel.approver?.emp_email || 'No email');
      } else {
        console.log('⚠️ No pending approvals found');
      }
    } else {
      console.log('No requests with approvals found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkApprovalStructure();
