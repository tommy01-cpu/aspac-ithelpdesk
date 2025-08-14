const { PrismaClient } = require('@prisma/client');

async function checkSLAData() {
  const prisma = new PrismaClient();
  
  try {
    // Get the latest request with SLA data
    const request = await prisma.request.findFirst({
      orderBy: { id: 'desc' },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        formData: true
      }
    });
    
    if (!request) {
      console.log('No requests found');
      return;
    }
    
    console.log('Latest request:');
    console.log('ID:', request.id);
    console.log('Created:', request.createdAt.toISOString());
    console.log('Updated:', request.updatedAt.toISOString());
    console.log('FormData SLA fields:');
    
    const formData = request.formData;
    if (formData) {
      console.log('- slaHours:', formData.slaHours);
      console.log('- slaDueDate:', formData.slaDueDate);
      console.log('- slaStartAt:', formData.slaStartAt);
      console.log('- slaCalculatedAt:', formData.slaCalculatedAt);
      console.log('- slaSource:', formData.slaSource);
      console.log('- slaName:', formData.slaName);
      
      if (formData.slaDueDate) {
        const dueDate = new Date(formData.slaDueDate);
        console.log('Due date (Philippine):', dueDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
        console.log('Due date day:', dueDate.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', weekday: 'long' }));
      }
    } else {
      console.log('No formData found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSLAData();
