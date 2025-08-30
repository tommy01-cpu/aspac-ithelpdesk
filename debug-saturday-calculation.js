const { PrismaClient } = require('@prisma/client');

async function debugSaturdayCalculation() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Debugging Saturday SLA Calculation');
    console.log('=====================================');
    
    // Get operational hours
    const opHours = await prisma.operationalHours.findFirst({
      where: { isActive: true },
      include: {
        workingDays: {
          orderBy: { dayOfWeek: 'asc' },
          include: { breakHours: true }
        }
      }
    });
    
    if (!opHours) {
      console.log('❌ No operational hours found');
      return;
    }
    
    console.log('📅 Working Days Configuration:');
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    opHours.workingDays.forEach(day => {
      const name = dayNames[day.dayOfWeek];
      const startTime = day.scheduleType === 'custom' ? day.customStartTime : opHours.standardStartTime;
      const endTime = day.scheduleType === 'custom' ? day.customEndTime : opHours.standardEndTime;
      
      console.log(`\n${name} (${day.dayOfWeek}):`);
      console.log(`  Enabled: ${day.isEnabled}`);
      console.log(`  Hours: ${startTime} - ${endTime}`);
      
      if (day.breakHours.length > 0) {
        day.breakHours.forEach(b => {
          console.log(`  Break: ${b.startTime} - ${b.endTime}`);
        });
      } else if (opHours.standardBreakStart) {
        console.log(`  Standard Break: ${opHours.standardBreakStart} - ${opHours.standardBreakEnd}`);
      }
    });
    
    // Manual calculation for Saturday start
    console.log('\n🧮 Manual SLA Calculation:');
    console.log('Start: Saturday, Aug 30, 2025 at 10:13 AM');
    console.log('SLA Hours needed: 4');
    
    // Saturday configuration
    const saturday = opHours.workingDays.find(d => d.dayOfWeek === 6);
    const sunday = opHours.workingDays.find(d => d.dayOfWeek === 0);
    const monday = opHours.workingDays.find(d => d.dayOfWeek === 1);
    
    if (saturday?.isEnabled) {
      const satStart = saturday.scheduleType === 'custom' ? saturday.customStartTime : opHours.standardStartTime;
      const satEnd = saturday.scheduleType === 'custom' ? saturday.customEndTime : opHours.standardEndTime;
      
      console.log(`\nSaturday Working Hours: ${satStart} - ${satEnd}`);
      
      // Calculate remaining hours on Saturday
      const [startH, startM] = [10, 13]; // 10:13 AM
      const [endH, endM] = satEnd.split(':').map(n => parseInt(n));
      
      const remainingMinutes = (endH * 60 + endM) - (startH * 60 + startM);
      const remainingHours = remainingMinutes / 60;
      
      console.log(`Remaining time on Saturday: ${remainingHours.toFixed(2)} hours`);
      console.log(`SLA hours still needed: ${4 - remainingHours} hours`);
      
      if (remainingHours >= 4) {
        console.log('✅ SLA can be completed on Saturday');
        const dueMinutes = startH * 60 + startM + 4 * 60;
        const dueH = Math.floor(dueMinutes / 60);
        const dueM = dueMinutes % 60;
        console.log(`Expected due time: Saturday ${dueH}:${dueM.toString().padStart(2, '0')}`);
      } else {
        console.log('❌ SLA cannot be completed on Saturday, moves to next working day');
        
        // Check Sunday
        console.log(`\nSunday enabled: ${sunday?.isEnabled || false}`);
        if (!sunday?.isEnabled) {
          console.log('Sunday is not a working day, moving to Monday');
          
          // Check Monday
          console.log(`Monday enabled: ${monday?.isEnabled || false}`);
          if (monday?.isEnabled) {
            const monStart = monday.scheduleType === 'custom' ? monday.customStartTime : opHours.standardStartTime;
            const monEnd = monday.scheduleType === 'custom' ? monday.customEndTime : opHours.standardEndTime;
            
            console.log(`Monday Working Hours: ${monStart} - ${monEnd}`);
            
            const hoursNeeded = 4 - remainingHours;
            console.log(`Hours needed on Monday: ${hoursNeeded.toFixed(2)}`);
            
            const [monStartH] = monStart.split(':').map(n => parseInt(n));
            const dueMinutes = monStartH * 60 + hoursNeeded * 60;
            const dueH = Math.floor(dueMinutes / 60);
            const dueM = (dueMinutes % 60).toFixed(0);
            
            console.log(`Expected due time: Monday ${dueH}:${dueM.toString().padStart(2, '0')}`);
            console.log('✅ This should be the correct calculation');
          }
        }
      }
    }
    
    console.log('\n❌ But system shows: Sunday 12:00 PM');
    console.log('❌ This is wrong because:');
    console.log('1. Sunday is not enabled as a working day');
    console.log('2. Even if it were, the time calculation is incorrect');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugSaturdayCalculation();
