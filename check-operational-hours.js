const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOperationalHours() {
  try {
    console.log('=== OPERATIONAL HOURS CONFIGURATION ===');
    
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

    if (!operationalHours) {
      console.log('No active operational hours found');
      return;
    }

    console.log('Main Configuration:');
    console.log(`- Working Time Type: ${operationalHours.workingTimeType}`);
    console.log(`- Standard Start: ${operationalHours.standardStartTime}`);
    console.log(`- Standard End: ${operationalHours.standardEndTime}`);
    console.log(`- Standard Break Start: ${operationalHours.standardBreakStart}`);
    console.log(`- Standard Break End: ${operationalHours.standardBreakEnd}`);
    
    console.log('\nWorking Days:');
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    operationalHours.workingDays.forEach(day => {
      const dayName = dayNames[day.dayOfWeek];
      const startTime = day.scheduleType === 'custom' ? day.customStartTime : operationalHours.standardStartTime;
      const endTime = day.scheduleType === 'custom' ? day.customEndTime : operationalHours.standardEndTime;
      
      console.log(`- ${dayName}: ${day.isEnabled ? 'ENABLED' : 'DISABLED'} (${startTime}-${endTime})`);
      
      if (day.breakHours && day.breakHours.length > 0) {
        day.breakHours.forEach(breakHour => {
          console.log(`  Break: ${breakHour.startTime}-${breakHour.endTime}`);
        });
      }
      
      if (day.isEnabled && startTime && endTime) {
        // Calculate working hours for this day
        const [sh, sm] = startTime.split(':').map(n => parseInt(n, 10));
        const [eh, em] = endTime.split(':').map(n => parseInt(n, 10));
        let minutes = (eh * 60 + em) - (sh * 60 + sm);
        
        // Subtract breaks
        if (day.breakHours) {
          day.breakHours.forEach(b => {
            const [bsh, bsm] = b.startTime.split(':').map(n => parseInt(n, 10));
            const [beh, bem] = b.endTime.split(':').map(n => parseInt(n, 10));
            minutes -= (beh * 60 + bem) - (bsh * 60 + bsm);
          });
        }
        
        const hours = minutes / 60;
        console.log(`  Working Hours: ${hours}h`);
      }
    });

    // Check SLA Service 26
    console.log('\n=== SLA SERVICE 26 CONFIGURATION ===');
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
    
    if (sla) {
      console.log(`Name: ${sla.name}`);
      console.log(`Resolution Days: ${sla.resolutionDays}`);
      console.log(`Resolution Hours: ${sla.resolutionHours}`);
      console.log(`Resolution Minutes: ${sla.resolutionMinutes}`);
      console.log(`Uses Operational Hours: ${sla.operationalHours}`);
      
      if (sla.operationalHours && operationalHours.workingTimeType !== 'round-clock') {
        // Calculate average working hours per day
        const enabledDays = operationalHours.workingDays.filter(d => d.isEnabled);
        let totalDailyHours = 0;
        
        enabledDays.forEach(day => {
          const startTime = day.scheduleType === 'custom' ? day.customStartTime : operationalHours.standardStartTime;
          const endTime = day.scheduleType === 'custom' ? day.customEndTime : operationalHours.standardEndTime;
          
          if (startTime && endTime) {
            const [sh, sm] = startTime.split(':').map(n => parseInt(n, 10));
            const [eh, em] = endTime.split(':').map(n => parseInt(n, 10));
            let minutes = (eh * 60 + em) - (sh * 60 + sm);
            
            // Subtract breaks
            if (day.breakHours) {
              day.breakHours.forEach(b => {
                const [bsh, bsm] = b.startTime.split(':').map(n => parseInt(n, 10));
                const [beh, bem] = b.endTime.split(':').map(n => parseInt(n, 10));
                minutes -= (beh * 60 + bem) - (bsh * 60 + bsm);
              });
            }
            
            totalDailyHours += minutes / 60;
          }
        });
        
        const avgDailyHours = totalDailyHours / enabledDays.length;
        const calculatedSlaHours = (sla.resolutionDays * avgDailyHours) + sla.resolutionHours + (sla.resolutionMinutes / 60);
        
        console.log(`\nCalculated SLA Hours:`);
        console.log(`- Average working hours per day: ${avgDailyHours}h`);
        console.log(`- ${sla.resolutionDays} days × ${avgDailyHours}h + ${sla.resolutionHours}h + ${sla.resolutionMinutes/60}h = ${calculatedSlaHours}h`);
      } else {
        // Calendar time calculation
        const calculatedSlaHours = (sla.resolutionDays * 24) + sla.resolutionHours + (sla.resolutionMinutes / 60);
        console.log(`\nCalculated SLA Hours (Calendar Time): ${calculatedSlaHours}h`);
      }
    } else {
      console.log('SLA Service 26 not found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOperationalHours();
