const { PrismaClient } = require('@prisma/client');

async function checkHistory() {
  const prisma = new PrismaClient();
  
  try {
    // Get recent history entries for the latest request
    const history = await prisma.requestHistory.findMany({
      where: { requestId: 66 },
      orderBy: { timestamp: 'desc' },
      take: 10,
      select: {
        timestamp: true,
        action: true,
        details: true,
        actorName: true,
        actorType: true
      }
    });
    
    console.log('Recent history entries for request 66:');
    history.forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.timestamp.toISOString()} (${entry.timestamp.toString()}) - ${entry.action} by ${entry.actorName || 'N/A'}`);
      if (entry.details) {
        console.log(`   Details: ${entry.details}`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkHistory();
