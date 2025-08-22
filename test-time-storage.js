// Test to verify what time is actually stored in the database
const { PrismaClient } = require('@prisma/client');

async function testTimeStorage() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🕐 Current server time:', new Date().toString());
    console.log('🕐 Current server UTC:', new Date().toISOString());
    
    // Get the most recent request
    const latestRequest = await prisma.request.findFirst({
      orderBy: { id: 'desc' },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        approvals: {
          select: {
            level: true,
            createdAt: true,
            sentOn: true,
          },
          orderBy: { level: 'asc' }
        }
      }
    });
    
    if (!latestRequest) {
      console.log('❌ No requests found');
      return;
    }
    
    console.log('📋 Latest Request Analysis:');
    console.log('Request ID:', latestRequest.id);
    console.log('Request createdAt (raw):', latestRequest.createdAt);
    console.log('Request createdAt (string):', latestRequest.createdAt.toString());
    console.log('Request createdAt (ISO):', latestRequest.createdAt.toISOString());
    console.log('Request updatedAt (raw):', latestRequest.updatedAt);
    console.log('Request updatedAt (string):', latestRequest.updatedAt.toString());
    console.log('');
    
    latestRequest.approvals.forEach((approval, index) => {
      console.log(`Level ${approval.level}:`);
      console.log(`  createdAt (raw): ${approval.createdAt}`);
      console.log(`  createdAt (string): ${approval.createdAt.toString()}`);
      console.log(`  createdAt (ISO): ${approval.createdAt.toISOString()}`);
      if (approval.sentOn) {
        console.log(`  sentOn (string): ${approval.sentOn.toString()}`);
        console.log(`  sentOn (ISO): ${approval.sentOn.toISOString()}`);
      } else {
        console.log(`  sentOn: null`);
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTimeStorage();
