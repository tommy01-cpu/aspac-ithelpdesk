const { PrismaClient } = require('@prisma/client');

async function testSLAConversion() {
  const prisma = new PrismaClient();
  
  try {
    // Check SLA tables structure and data
    console.log('=== SLA Service Table ===');
    const slaServices = await prisma.sLAService.findMany({
      select: {
        id: true,
        name: true,
        resolutionTime: true,
        operationalHours: true
      }
    });
    console.log('SLA Services:', slaServices);
    
    console.log('\n=== SLA Incident Table ===');
    const slaIncidents = await prisma.sLAIncident.findMany({
      select: {
        id: true,
        name: true,
        resolutionDays: true,
        resolutionHours: true,
        resolutionMinutes: true,
        operationalHoursEnabled: true
      }
    });
    console.log('SLA Incidents:', slaIncidents);
    
    console.log('\n=== Priority SLA Mappings ===');
    const prioritySLAs = await prisma.prioritySLA.findMany({
      include: {
        slaIncident: true
      }
    });
    console.log('Priority SLA mappings:', prioritySLAs);
    
    console.log('\n=== Operational Hours Config ===');
    const operationalHours = await prisma.operationalHours.findFirst({
      where: { isActive: true },
      include: {
        workingDays: {
          include: {
            breakHours: true,
          },
          orderBy: {
            dayOfWeek: 'asc',
          },
        },
      },
    });
    
    if (operationalHours) {
      console.log('Active operational hours found');
      console.log('Working time type:', operationalHours.workingTimeType);
      
      // Calculate average working hours per day
      const enabledDays = operationalHours.workingDays.filter(d => d.isEnabled);
      console.log('Enabled working days:', enabledDays.length);
      
      let totalDailyHours = 0;
      enabledDays.forEach(day => {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const start = day.scheduleType === 'custom' 
          ? (day.customStartTime || operationalHours.standardStartTime || '08:00')
          : (operationalHours.standardStartTime || '08:00');
        const end = day.scheduleType === 'custom'
          ? (day.customEndTime || operationalHours.standardEndTime || '18:00')
          : (operationalHours.standardEndTime || '18:00');
          
        const [sh, sm] = start.split(':').map(n => parseInt(n, 10));
        const [eh, em] = end.split(':').map(n => parseInt(n, 10));
        let minutes = (eh * 60 + em) - (sh * 60 + sm);
        
        // Subtract breaks
        (day.breakHours || []).forEach(b => {
          const [bsh, bsm] = b.startTime.split(':').map(n => parseInt(n, 10));
          const [beh, bem] = b.endTime.split(':').map(n => parseInt(n, 10));
          minutes -= (beh * 60 + bem) - (bsh * 60 + bsm);
        });
        
        const hours = minutes / 60;
        totalDailyHours += hours;
        console.log(`${dayNames[day.dayOfWeek]}: ${hours} hours`);
      });
      
      const avgHoursPerDay = totalDailyHours / enabledDays.length;
      console.log(`Average working hours per day: ${avgHoursPerDay}`);
      
      // Test conversion examples
      console.log('\n=== SLA Conversion Examples ===');
      console.log('1 working day =', avgHoursPerDay, 'hours');
      console.log('2 working days =', avgHoursPerDay * 2, 'hours');
      console.log('4 working days =', avgHoursPerDay * 4, 'hours');
      
    } else {
      console.log('No active operational hours found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSLAConversion();
