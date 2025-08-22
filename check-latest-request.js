// Simple test to check if the latest request has approver names stored
const { PrismaClient } = require('@prisma/client');

async function checkLatestRequest() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking latest request for approver names...');
    
    // Get the most recent request with approvals
    const latestRequest = await prisma.request.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        approvals: {
          select: {
            id: true,
            level: true,
            approverId: true,
            approverName: true,
            approverEmail: true,
            status: true,
            createdAt: true,
            approver: {
              select: {
                emp_fname: true,
                emp_lname: true,
                emp_email: true
              }
            }
          },
          orderBy: { level: 'asc' }
        }
      }
    });
    
    if (!latestRequest) {
      console.log('❌ No requests found');
      return;
    }
    
    console.log(`📋 Latest Request: ID ${latestRequest.id}, Created: ${latestRequest.createdAt}`);
    console.log(`📊 Approvals: ${latestRequest.approvals.length}`);
    console.log('');
    
    latestRequest.approvals.forEach((approval, index) => {
      const actualName = approval.approver ? 
        `${approval.approver.emp_fname} ${approval.approver.emp_lname}` : 
        'N/A';
      const actualEmail = approval.approver?.emp_email || 'N/A';
      
      console.log(`Level ${approval.level}:`);
      console.log(`  📝 Stored Name: "${approval.approverName || 'EMPTY'}"`);
      console.log(`  📧 Stored Email: "${approval.approverEmail || 'EMPTY'}"`);
      console.log(`  👤 Actual Name: "${actualName}"`);
      console.log(`  ✉️ Actual Email: "${actualEmail}"`);
      console.log(`  Status: ${approval.status}`);
      console.log(`  ✅ Names Match: ${approval.approverName === actualName ? 'YES' : 'NO'}`);
      console.log(`  ✅ Emails Match: ${approval.approverEmail === actualEmail ? 'YES' : 'NO'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLatestRequest();
