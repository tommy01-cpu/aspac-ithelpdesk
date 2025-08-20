const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSLADisplayData() {
  try {
    // Get the latest request with SLA data
    const request = await prisma.request.findFirst({
      where: {
        formData: {
          path: ['slaStartAt'],
          not: null
        }
      },
      orderBy: { id: 'desc' },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        formData: true
      }
    });
    
    if (!request) {
      console.log('❌ No requests found with SLA data');
      return;
    }
    
    console.log('✅ Latest request with SLA data:');
    console.log('Request ID:', request.id);
    console.log('Status:', request.status);
    console.log('Created:', request.createdAt);
    console.log('Updated:', request.updatedAt);
    
    const formData = request.formData;
    
    console.log('\n📅 SLA Timing Fields (stored in database):');
    console.log('- slaStartAt:', formData.slaStartAt);
    console.log('- slaDueDate:', formData.slaDueDate);  
    console.log('- slaCalculatedAt:', formData.slaCalculatedAt);
    console.log('- slaHours:', formData.slaHours);
    console.log('- slaSource:', formData.slaSource);
    
    console.log('\n🎯 What will be displayed in UI:');
    console.log('- Scheduled Start Time:', formData.slaDueDate ? 'Will show resolution due date' : 'Will show "-"');
    console.log('- SLA Start Time:', formData.slaStartAt ? 'Will show timer start time' : 'Will show "-"');
    console.log('- DueBy Date:', formData.slaDueDate ? 'Will show due date' : 'Will show "-"');
    
    console.log('\n🔗 View request at: http://localhost:3000/requests/view/' + request.id);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSLADisplayData();
