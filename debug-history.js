const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugHistory() {
  try {
    console.log('🔍 Debugging request history...');
    
    // 1. Check all requests and their history
    const requests = await prisma.request.findMany({
      select: {
        id: true,
        templateName: true,
        status: true,
        createdAt: true
      },
      orderBy: {
        id: 'desc'
      },
      take: 10
    });
    
    console.log(`\n📋 Recent requests:`);
    requests.forEach((req, index) => {
      console.log(`   ${index + 1}. Request #${req.id} - ${req.templateName} - Status: ${req.status}`);
      console.log(`      Created: ${req.createdAt.toLocaleDateString()}`);
    });
    
    // 2. Check if there are any history entries at all
    const allHistory = await prisma.requestHistory.findMany({
      take: 20,
      orderBy: {
        timestamp: 'desc'
      },
      include: {
        actor: {
          select: {
            emp_fname: true,
            emp_lname: true,
            emp_email: true
          }
        }
      }
    });
    
    console.log(`\n📊 Total history entries in database: ${allHistory.length}`);
    
    if (allHistory.length > 0) {
      console.log(`\n📝 Recent history entries:`);
      allHistory.forEach((hist, index) => {
        console.log(`   ${index + 1}. Request #${hist.requestId} - ${hist.action}`);
        console.log(`      Actor: ${hist.actorName || (hist.actor ? `${hist.actor.emp_fname} ${hist.actor.emp_lname}` : 'Unknown')}`);
        console.log(`      Timestamp: ${hist.timestamp.toLocaleString()}`);
        console.log(`      Details: ${hist.details || 'No details'}`);
        console.log('');
      });
    } else {
      console.log('❌ No history entries found in database');
      
      // Let's check if we need to create some sample history
      console.log('\n🔨 Creating sample history entries...');
      
      // Get the most recent request
      if (requests.length > 0) {
        const sampleRequest = requests[0];
        
        // Create a "Request Created" history entry
        await prisma.requestHistory.create({
          data: {
            requestId: sampleRequest.id,
            action: 'Request Created',
            actorName: 'System',
            actorType: 'system',
            details: `Request #${sampleRequest.id} was created and submitted for processing.`,
            timestamp: sampleRequest.createdAt
          }
        });
        
        console.log(`✅ Created history entry for Request #${sampleRequest.id}`);
        
        // If there are approvals, create history for them too
        const approvals = await prisma.requestApproval.findMany({
          where: { requestId: sampleRequest.id },
          include: {
            approver: {
              select: {
                emp_fname: true,
                emp_lname: true
              }
            }
          }
        });
        
        for (const approval of approvals) {
          if (approval.status !== 'pending_approval') {
            const action = approval.status === 'approved' ? 'Approved' : 
                         approval.status === 'rejected' ? 'Rejected' : 
                         'Requested Clarification';
            
            await prisma.requestHistory.create({
              data: {
                requestId: sampleRequest.id,
                action: action,
                actorName: approval.approverName || (approval.approver ? 
                  `${approval.approver.emp_fname} ${approval.approver.emp_lname}` : 'Unknown'),
                actorType: 'user',
                details: `Level ${approval.level} approval ${action.toLowerCase()} by ${approval.approverName || 'approver'}.`,
                timestamp: approval.actedOn || new Date()
              }
            });
            
            console.log(`✅ Created history entry for ${action} action`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugHistory();
