const { PrismaClient } = require('@prisma/client');

async function testHistory() {
  const prisma = new PrismaClient();
  
  try {
    // First, find a valid request ID
    const latestRequest = await prisma.request.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true, createdAt: true, updatedAt: true }
    });
    
    if (!latestRequest) {
      console.log('No requests found');
      return;
    }
    
    console.log('Latest request:', latestRequest);
    console.log('Request createdAt:', latestRequest.createdAt.toISOString());
    console.log('Request updatedAt:', latestRequest.updatedAt.toISOString());
    
    // Create Philippine time by manually adjusting UTC
    const now = new Date();
    // Add 8 hours to UTC to get Philippine time (UTC+8)
    const philippineTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    
    console.log('Current UTC time:', now.toISOString());
    console.log('Philippine time (calculated):', philippineTime.toISOString());
    
    // Test creating a history entry using the new method
    const historyEntry = await prisma.requestHistory.create({
      data: {
        requestId: latestRequest.id,
        action: 'Test Entry',
        details: 'Testing timestamp insertion with new method',
        actorId: null,
        actorName: 'Test Script',
        actorType: 'system',
        timestamp: philippineTime,
      }
    });
    
    console.log('Created history entry:', historyEntry);
    console.log('Stored timestamp:', historyEntry.timestamp.toISOString());
    
    // Also check what was actually stored in the database
    const storedEntry = await prisma.requestHistory.findFirst({
      where: { id: historyEntry.id },
      select: { timestamp: true, action: true, details: true }
    });
    
    console.log('Retrieved from DB:', storedEntry);
    console.log('Retrieved timestamp:', storedEntry.timestamp.toISOString());
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testHistory();
