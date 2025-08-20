const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugSLA() {
  try {
    console.log('🔍 Checking recent requests with SLA issues...');
    
    // Get recent requests
    const requests = await prisma.request.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: {
        approvals: true
      }
    });
    
    if (requests.length === 0) {
      console.log('❌ No requests found');
      return;
    }
    
    console.log('\n📋 Recent requests:');
    requests.forEach((req, index) => {
      console.log(`${index + 1}. Request ID: ${req.id}`);
      console.log(`   Status: ${req.status}`);
      console.log(`   Created: ${req.createdAt}`);
      console.log(`   Updated: ${req.updatedAt}`);
      console.log(`   Template: ${req.templateId}`);
      
      const allApproved = req.approvals.every(approval => approval.status === 'approved');
      console.log(`   All Approved: ${allApproved}`);
      console.log('');
    });
    
    // Check operational hours again
    const operationalHours = await prisma.operationalHours.findFirst({
      where: { isActive: true }
    });
    
    console.log('⚙️  Current operational hours:');
    console.log('- Working Type:', operationalHours?.workingTimeType);
    console.log('- Start Time:', operationalHours?.standardStartTime);
    console.log('- End Time:', operationalHours?.standardEndTime);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugSLA();
