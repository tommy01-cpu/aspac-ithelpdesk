const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugApprovalIssue() {
  try {
    console.log('=== DEBUGGING LEVEL 2 AUTO-APPROVAL ISSUE ===');
    
    // Find recent requests with approvals to analyze
    const recentRequests = await prisma.request.findMany({
      where: {
        approvals: {
          some: {}
        }
      },
      include: {
        approvals: {
          select: {
            id: true,
            level: true,
            name: true,
            approverId: true,
            approverName: true,
            approverEmail: true,
            status: true,
            comments: true,
            actedOn: true,
            approver: {
              select: {
                id: true,
                emp_fname: true,
                emp_lname: true,
                emp_email: true
              }
            }
          },
          orderBy: { level: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    });

    console.log(`Found ${recentRequests.length} recent requests with approvals`);
    
    for (const request of recentRequests) {
      console.log(`\n--- Request ${request.id} Analysis ---`);
      console.log(`Status: ${request.status}`);
      console.log(`Total approval levels: ${request.approvals.length}`);
      
      // Group approvals by level
      const approvalsByLevel = {};
      request.approvals.forEach(approval => {
        if (!approvalsByLevel[approval.level]) {
          approvalsByLevel[approval.level] = [];
        }
        approvalsByLevel[approval.level].push(approval);
      });
      
      // Analyze each level
      Object.keys(approvalsByLevel).sort((a, b) => parseInt(a) - parseInt(b)).forEach(level => {
        const levelApprovals = approvalsByLevel[level];
        console.log(`\nLevel ${level} (${levelApprovals.length} approver(s)):`);
        
        levelApprovals.forEach((approval, index) => {
          const approverName = approval.approver 
            ? `${approval.approver.emp_fname} ${approval.approver.emp_lname}`
            : approval.approverName || 'Unknown';
          const approverEmail = approval.approver?.emp_email || approval.approverEmail || 'No email';
          
          console.log(`  ${index + 1}. ${approverName} (${approverEmail})`);
          console.log(`     Status: ${approval.status}`);
          console.log(`     Approver ID: ${approval.approverId}`);
          console.log(`     Comments: ${approval.comments || 'None'}`);
          console.log(`     Acted On: ${approval.actedOn || 'Not acted'}`);
          
          // Check for auto-approval indicators
          if (approval.comments && approval.comments.includes('Auto approved by System')) {
            console.log(`     🤖 AUTO-APPROVED: This was automatically approved!`);
          }
        });
      });
      
      // Check for duplicate approvers across levels
      console.log(`\n🔍 Duplicate Analysis for Request ${request.id}:`);
      const approversByEmail = {};
      const approversById = {};
      
      request.approvals.forEach(approval => {
        const email = (approval.approver?.emp_email || approval.approverEmail || '').toLowerCase();
        const id = approval.approverId;
        
        if (email) {
          if (!approversByEmail[email]) approversByEmail[email] = [];
          approversByEmail[email].push(`Level ${approval.level}`);
        }
        
        if (id) {
          if (!approversById[id]) approversById[id] = [];
          approversById[id].push(`Level ${approval.level}`);
        }
      });
      
      // Show duplicates
      let foundDuplicates = false;
      Object.entries(approversByEmail).forEach(([email, levels]) => {
        if (levels.length > 1) {
          console.log(`  📧 Email duplicate: ${email} appears in ${levels.join(', ')}`);
          foundDuplicates = true;
        }
      });
      
      Object.entries(approversById).forEach(([id, levels]) => {
        if (levels.length > 1) {
          console.log(`  🆔 ID duplicate: User ID ${id} appears in ${levels.join(', ')}`);
          foundDuplicates = true;
        }
      });
      
      if (!foundDuplicates) {
        console.log(`  ✅ No duplicate approvers found across levels`);
      }
    }
    
  } catch (error) {
    console.error('Error debugging approval issue:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugApprovalIssue();
