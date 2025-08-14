const { PrismaClient } = require('@prisma/client');

async function checkSLACalculation() {
  const prisma = new PrismaClient();
  
  try {
    // Get operational hours
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
        exclusionRules: true,
      },
    });
    
    if (!operationalHours) {
      console.log('No operational hours found');
      return;
    }
    
    console.log('Operational Hours Configuration:');
    console.log('Working Time Type:', operationalHours.workingTimeType);
    console.log('Standard Hours:', operationalHours.standardStartTime, 'to', operationalHours.standardEndTime);
    console.log('Standard Break:', operationalHours.standardBreakStart, 'to', operationalHours.standardBreakEnd);
    
    console.log('\nWorking Days:');
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    operationalHours.workingDays.forEach(day => {
      const dayName = dayNames[day.dayOfWeek];
      console.log(`${dayName} (${day.dayOfWeek}): ${day.isEnabled ? 'Enabled' : 'Disabled'}, Schedule: ${day.scheduleType}`);
      
      if (day.isEnabled && day.scheduleType === 'custom') {
        console.log(`  Custom hours: ${day.customStartTime} to ${day.customEndTime}`);
      } else if (day.isEnabled && day.scheduleType === 'standard') {
        console.log(`  Standard hours: ${operationalHours.standardStartTime} to ${operationalHours.standardEndTime}`);
      }
      
      if (day.breakHours.length > 0) {
        console.log('  Breaks:', day.breakHours.map(b => `${b.startTime}-${b.endTime}`).join(', '));
      }
      
      // Calculate working hours for this day
      if (day.isEnabled && day.scheduleType !== 'not-set') {
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
        day.breakHours.forEach(b => {
          const [bsh, bsm] = b.startTime.split(':').map(n => parseInt(n, 10));
          const [beh, bem] = b.endTime.split(':').map(n => parseInt(n, 10));
          minutes -= (beh * 60 + bem) - (bsh * 60 + bsm);
        });
        
        console.log(`  Working hours: ${minutes / 60} hours`);
      }
    });
    
    // Test SLA calculation
    console.log('\n--- SLA Calculation Test ---');
    const startTime = new Date('2025-08-12T18:55:00.000Z'); // 6:55 PM Philippine time
    console.log('Start time:', startTime.toISOString());
    console.log('Start time (Philippine):', startTime.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    
    // Calculate 4-day SLA (assuming 36 hours based on user's calculation)
    const slaHours = 36;
    console.log(`SLA requirement: ${slaHours} hours (4 working days)`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSLACalculation();
