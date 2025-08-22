// Test script to check timestamp consistency
const { PrismaClient } = require('@prisma/client');

async function checkTimestamps() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🕐 Current server time:', new Date().toString());
    console.log('');
    
    // Get the most recent request with approvals
    const latestRequest = await prisma.request.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        approvals: {
          select: {
            id: true,
            level: true,
            approverName: true,
            status: true,
            createdAt: true,
            sentOn: true,
            actedOn: true,
          },
          orderBy: { level: 'asc' }
        }
      }
    });
    
    if (!latestRequest) {
      console.log('❌ No requests found');
      return;
    }
    
    console.log(`📋 Request ID: ${latestRequest.id}`);
    console.log(`🕐 Request created at: ${latestRequest.createdAt.toString()}`);
    console.log('');
    
    latestRequest.approvals.forEach((approval, index) => {
      console.log(`🔸 Level ${approval.level} (${approval.approverName || 'N/A'}):`);
      console.log(`   Created At: ${approval.createdAt.toString()}`);
      console.log(`   Sent On: ${approval.sentOn ? approval.sentOn.toString() : 'Not sent'}`);
      console.log(`   Acted On: ${approval.actedOn ? approval.actedOn.toString() : 'Not acted'}`);
      console.log(`   Status: ${approval.status}`);
      
      // Check if times match
      const requestTime = latestRequest.createdAt.getTime();
      const approvalTime = approval.createdAt.getTime();
      const timeDiff = Math.abs(requestTime - approvalTime);
      
      if (timeDiff < 5000) { // Within 5 seconds
        console.log(`   ✅ Time matches request creation (${timeDiff}ms difference)`);
      } else {
        console.log(`   ❌ Time mismatch: ${timeDiff}ms difference`);
      }
      
      if (approval.sentOn) {
        const sentTime = approval.sentOn.getTime();
        const sentDiff = Math.abs(requestTime - sentTime);
        if (sentDiff < 5000) {
          console.log(`   ✅ SentOn time is consistent (${sentDiff}ms difference)`);
        } else {
          console.log(`   ❌ SentOn time mismatch: ${sentDiff}ms difference`);
        }
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTimestamps();
