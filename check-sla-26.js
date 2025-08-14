const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSLA() {
  try {
    const sla = await prisma.sLAService.findUnique({
      where: { id: 26 },
      select: {
        id: true,
        name: true,
        resolutionDays: true,
        resolutionHours: true,
        resolutionMinutes: true,
        operationalHours: true
      }
    });
    
    console.log('SLA Service ID 26 Configuration:');
    console.log(JSON.stringify(sla, null, 2));
    
    if (sla) {
      const { resolutionDays, resolutionHours, resolutionMinutes, operationalHours } = sla;
      
      console.log('\nCalculation:');
      console.log(`Resolution Days: ${resolutionDays}`);
      console.log(`Resolution Hours: ${resolutionHours}`);
      console.log(`Resolution Minutes: ${resolutionMinutes}`);
      console.log(`Operational Hours Enabled: ${operationalHours}`);
      
      if (operationalHours) {
        // Working hours calculation (assuming 8 hours per day)
        const totalHours = (resolutionDays * 8) + resolutionHours + (resolutionMinutes / 60);
        console.log(`Total Working Hours: ${totalHours}h`);
      } else {
        // Calendar hours calculation
        const totalHours = (resolutionDays * 24) + resolutionHours + (resolutionMinutes / 60);
        console.log(`Total Calendar Hours: ${totalHours}h`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSLA();
