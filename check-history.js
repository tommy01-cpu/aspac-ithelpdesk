const { PrismaClient } = require('@prisma/client');

async function checkHistory() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking for worklog history entries...');
    
    // Get recent worklog history entries
    const worklogHistory = await prisma.requestHistory.findMany({
      where: {
        action: {
          contains: 'WorkLog'
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 10,
      select: {
        requestId: true,
        timestamp: true,
        action: true,
        details: true,
        actorName: true,
        actorType: true,
        actorId: true
      }
    });
    
    console.log(`Found ${worklogHistory.length} worklog history entries:`);
    worklogHistory.forEach((entry, index) => {
      console.log(`${index + 1}. Request ${entry.requestId} - ${entry.action} by ${entry.actorName} (ID: ${entry.actorId}) at ${entry.timestamp}`);
      console.log(`   Details: ${entry.details}`);
      console.log('');
    });
    
    // Get total history count
    const totalHistory = await prisma.requestHistory.count();
    console.log(`\nTotal history entries in database: ${totalHistory}`);
    
    // Check most recent requests to find active ones
    const recentRequests = await prisma.request.findMany({
      select: { id: true, status: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 5
    });
    
    console.log('\nMost recent requests:');
    recentRequests.forEach(req => {
      console.log(`Request ${req.id} - Status: ${req.status} - Updated: ${req.updatedAt}`);
    });
    
    // Check history for the most recent request
    if (recentRequests.length > 0) {
      const requestId = recentRequests[0].id;
      const requestHistory = await prisma.requestHistory.findMany({
        where: { requestId: requestId },
        orderBy: { timestamp: 'desc' },
        take: 10
      });
      
      console.log(`\nHistory for most recent request ${requestId}:`);
      requestHistory.forEach((entry, index) => {
        console.log(`${index + 1}. ${entry.action} by ${entry.actorName} at ${entry.timestamp}`);
        console.log(`   Details: ${entry.details || 'No details'}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkHistory();
