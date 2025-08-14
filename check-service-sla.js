const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkServiceSLA() {
  try {
    console.log('=== SLA Service Records ===');
    const slaServices = await prisma.sLAService.findMany();
    
    slaServices.forEach(sla => {
      console.log(`ID: ${sla.id}`);
      console.log(`Name: ${sla.name}`);
      console.log(`Resolution Time: ${sla.resolutionTime} hours`);
      console.log(`Operational Hours: ${sla.operationalHours}`);
      console.log('---');
    });
    
    console.log('\n=== Templates using SLA Services ===');
    const templates = await prisma.template.findMany({
      where: {
        type: 'service',
        slaServiceId: { not: null }
      },
      include: {
        slaService: true
      }
    });
    
    templates.forEach(template => {
      console.log(`Template ID: ${template.id}, Name: ${template.name}`);
      console.log(`SLA Service: ${template.slaService?.name} (${template.slaService?.resolutionTime} hours)`);
      console.log(`Operational Hours: ${template.slaService?.operationalHours}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkServiceSLA();
