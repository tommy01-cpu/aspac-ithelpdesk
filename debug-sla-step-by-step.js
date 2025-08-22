const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Import the SLA calculator functions directly
async function debugSLACalculation() {
  console.log('🔍 DEBUGGING SLA CALCULATION STEP BY STEP');
  console.log('='.repeat(50));
  
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
      console.log('❌ No operational hours found');
      return;
    }
    
    console.log('📋 Operational Hours Found:');
    console.log('- Type:', operationalHours.workingTimeType);
    console.log('- Standard Hours:', operationalHours.standardStartTime, '-', operationalHours.standardEndTime);
    
    // Test the actual SLA calculation using the same logic from the calculator
    const startDate = new Date('2025-08-22T19:57:27+08:00'); // Friday 7:57 PM PHT
    const slaHours = 18;
    
    console.log('\n🧪 Testing with:');
    console.log('- Start:', startDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    console.log('- Day of week:', startDate.getDay(), '(0=Sun, 5=Fri)');
    console.log('- SLA Hours:', slaHours);
    
    // Simulate the SLA calculation logic step by step
    let remainingHours = slaHours;
    let currentPHT = new Date(startDate);
    let dayCount = 0;
    
    console.log('\n📅 STEP-BY-STEP CALCULATION:');
    console.log('Starting with', remainingHours, 'hours remaining');
    
    while (remainingHours > 0 && dayCount < 10) { // Safety limit
      const dayOfWeek = currentPHT.getDay();
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
      const currentTime = currentPHT.toTimeString().slice(0, 5);
      
      console.log(`\n--- Day ${dayCount + 1}: ${dayName} (${dayOfWeek}) at ${currentTime} ---`);
      
      // Find working day configuration
      const workingDay = operationalHours.workingDays.find(d => d.dayOfWeek === dayOfWeek);
      
      if (!workingDay || !workingDay.isEnabled || workingDay.scheduleType === 'not-set') {
        console.log('❌ Not a working day - skipping');
        currentPHT.setDate(currentPHT.getDate() + 1);
        currentPHT.setHours(8, 0, 0, 0);
        dayCount++;
        continue;
      }
      
      // Get working hours for this day
      let startTime, endTime;
      if (workingDay.scheduleType === 'custom') {
        startTime = workingDay.customStartTime || '08:00';
        endTime = workingDay.customEndTime || '18:00';
      } else {
        startTime = operationalHours.standardStartTime || '08:00';
        endTime = operationalHours.standardEndTime || '18:00';
      }
      
      console.log(`✅ Working day: ${startTime} - ${endTime}`);
      
      // Calculate available hours for this day
      const [sh, sm] = startTime.split(':').map(n => parseInt(n, 10));
      const [eh, em] = endTime.split(':').map(n => parseInt(n, 10));
      let totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
      
      // Subtract breaks
      const breaks = workingDay.breakHours || [];
      breaks.forEach(b => {
        const [bsh, bsm] = b.startTime.split(':').map(n => parseInt(n, 10));
        const [beh, bem] = b.endTime.split(':').map(n => parseInt(n, 10));
        totalMinutes -= (beh * 60 + bem) - (bsh * 60 + bsm);
        console.log(`  Break: ${b.startTime} - ${b.endTime}`);
      });
      
      const availableHours = totalMinutes / 60;
      console.log(`📊 Available hours: ${availableHours}`);
      
      // Calculate remaining hours for current day if we're in the middle of it
      let usableHours = availableHours;
      if (currentTime >= startTime && currentTime < endTime) {
        // We're in the middle of a working day
        const [ch, cm] = currentTime.split(':').map(n => parseInt(n, 10));
        let remainingMinutes = (eh * 60 + em) - (ch * 60 + cm);
        
        // Subtract future breaks
        breaks.forEach(b => {
          if (currentTime < b.startTime) {
            const [bsh, bsm] = b.startTime.split(':').map(n => parseInt(n, 10));
            const [beh, bem] = b.endTime.split(':').map(n => parseInt(n, 10));
            remainingMinutes -= (beh * 60 + bem) - (bsh * 60 + bsm);
          }
        });
        
        usableHours = Math.max(0, remainingMinutes / 60);
        console.log(`📊 Usable hours (from current time): ${usableHours}`);
      } else if (currentTime >= endTime) {
        // Past working hours for this day
        usableHours = 0;
        console.log(`📊 Past working hours - usable: 0`);
      }
      
      if (remainingHours <= usableHours) {
        // SLA completes in this day
        console.log(`🎯 SLA completes in this day with ${remainingHours} hours`);
        
        if (currentTime < startTime) {
          // Start from beginning of working day
          currentPHT.setHours(sh, sm, 0, 0);
        }
        
        // Add the remaining hours (need to account for breaks)
        let hoursToAdd = remainingHours;
        let finalTime = new Date(currentPHT);
        
        // Simple addition for now (breaks would need more complex logic)
        const finalMinutes = finalTime.getMinutes() + (hoursToAdd * 60);
        finalTime.setMinutes(finalMinutes);
        
        // Adjust for lunch break if crossing 12:00 PM
        if (breaks.length > 0) {
          const lunchBreak = breaks[0];
          const lunchStart = parseInt(lunchBreak.startTime.split(':')[0]);
          if (finalTime.getHours() >= lunchStart && currentPHT.getHours() < lunchStart) {
            finalTime.setHours(finalTime.getHours() + 1);
          }
        }
        
        console.log(`🏁 FINAL DUE DATE: ${finalTime.toLocaleString('en-US', { timeZone: 'Asia/Manila' })}`);
        remainingHours = 0;
      } else {
        // Use all available hours and move to next day
        remainingHours -= usableHours;
        console.log(`⏭️  Used ${usableHours} hours, ${remainingHours} remaining`);
        
        // Move to next day at start time
        currentPHT.setDate(currentPHT.getDate() + 1);
        currentPHT.setHours(8, 0, 0, 0);
      }
      
      dayCount++;
    }
    
    if (remainingHours > 0) {
      console.log('\n❌ Failed to complete SLA calculation within 10 days');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugSLACalculation();
