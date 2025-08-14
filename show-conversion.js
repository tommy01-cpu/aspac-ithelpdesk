const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showConversion() {
  try {
    console.log('=== Current SLA Service Data (before conversion) ===');
    const slaServices = await prisma.sLAService.findMany({
      select: {
        id: true,
        name: true,
        resolutionTime: true
      },
      orderBy: { id: 'asc' }
    });
    
    console.log('Current values:');
    slaServices.forEach(sla => {
      const days = Math.floor(sla.resolutionTime / 24);
      console.log(`ID ${sla.id}: ${sla.resolutionTime} hours -> ${days} days, 0 hours, 0 minutes`);
    });
    
    console.log('\n=== Examples ===');
    console.log('24 hours -> 1 day, 0 hours, 0 minutes');
    console.log('48 hours -> 2 days, 0 hours, 0 minutes');
    console.log('72 hours -> 3 days, 0 hours, 0 minutes');
    console.log('96 hours -> 4 days, 0 hours, 0 minutes');
    console.log('120 hours -> 5 days, 0 hours, 0 minutes');
    console.log('168 hours -> 7 days, 0 hours, 0 minutes');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

showConversion();
