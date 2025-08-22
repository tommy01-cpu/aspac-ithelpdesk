const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Recreate the addWorkingHoursToTimePHT function logic to test it
function addWorkingHoursToTimePHT(phtDate, hoursToAdd, workingDay) {
  // Convert hours to minutes for precision
  let minutesToAdd = hoursToAdd * 60;
  let currentPHT = new Date(phtDate);
  
  // Add minutes while accounting for breaks
  const breaks = workingDay.breakHours || [];
  
  console.log(`🕐 Starting: ${currentPHT.toLocaleString('en-US', { timeZone: 'Asia/Manila' })}`);
  console.log(`⏱️  Need to add: ${hoursToAdd} hours (${minutesToAdd} minutes)`);
  console.log(`🍽️  Breaks:`, breaks.map(b => `${b.startTime}-${b.endTime}`));
  
  let iteration = 0;
  while (minutesToAdd > 0 && iteration < 10) { // Safety limit
    iteration++;
    const currentTimeStr = currentPHT.toTimeString().slice(0, 5);
    
    console.log(`\n--- Iteration ${iteration} ---`);
    console.log(`Current time: ${currentTimeStr}`);
    console.log(`Minutes remaining: ${minutesToAdd}`);
    
    // Check if we're about to hit a break
    let nextBreak = null;
    for (const b of breaks) {
      if (currentTimeStr < b.startTime) {
        if (!nextBreak || b.startTime < nextBreak.startTime) {
          nextBreak = b;
        }
      }
    }
    
    if (nextBreak) {
      console.log(`🔍 Next break: ${nextBreak.startTime} - ${nextBreak.endTime}`);
      
      // Calculate minutes until break starts
      const [ch, cm] = currentTimeStr.split(':').map(n => parseInt(n, 10));
      const [bh, bm] = nextBreak.startTime.split(':').map(n => parseInt(n, 10));
      const minutesUntilBreak = (bh * 60 + bm) - (ch * 60 + cm);
      
      console.log(`⏰ Minutes until break: ${minutesUntilBreak}`);
      
      if (minutesToAdd <= minutesUntilBreak) {
        // We'll finish before the break
        console.log(`✅ Will finish before break - adding ${minutesToAdd} minutes`);
        currentPHT.setMinutes(currentPHT.getMinutes() + minutesToAdd);
        minutesToAdd = 0;
      } else {
        // We'll hit the break, skip over it
        console.log(`⏭️  Will hit break - jumping to end of break`);
        const [beh, bem] = nextBreak.endTime.split(':').map(n => parseInt(n, 10));
        currentPHT.setHours(beh, bem, 0, 0);
        minutesToAdd -= minutesUntilBreak;
        console.log(`⏰ Consumed ${minutesUntilBreak} minutes before break`);
        console.log(`⏰ ${minutesToAdd} minutes remaining after break`);
      }
    } else {
      // No more breaks, just add the remaining minutes
      console.log(`🏁 No more breaks - adding remaining ${minutesToAdd} minutes`);
      currentPHT.setMinutes(currentPHT.getMinutes() + minutesToAdd);
      minutesToAdd = 0;
    }
    
    console.log(`New time: ${currentPHT.toLocaleString('en-US', { timeZone: 'Asia/Manila' })}`);
  }
  
  return currentPHT;
}

async function testAddWorkingHours() {
  console.log('🧪 TESTING addWorkingHoursToTimePHT FUNCTION');
  console.log('='.repeat(60));
  
  try {
    // Get the actual working day configuration for Tuesday
    const operationalHours = await prisma.operationalHours.findFirst({
      where: { isActive: true },
      include: {
        workingDays: {
          include: {
            breakHours: true,
          },
        },
      },
    });
    
    const tuesdayConfig = operationalHours.workingDays.find(d => d.dayOfWeek === 2); // Tuesday
    
    console.log('📋 Tuesday Configuration:');
    console.log('- Enabled:', tuesdayConfig.isEnabled);
    console.log('- Schedule Type:', tuesdayConfig.scheduleType);
    console.log('- Standard Hours:', operationalHours.standardStartTime, '-', operationalHours.standardEndTime);
    console.log('- Breaks:', tuesdayConfig.breakHours.map(b => `${b.startTime}-${b.endTime}`));
    
    // Test adding 5 hours from Tuesday 8:00 AM
    const startTime = new Date('2025-08-26T08:00:00+08:00'); // Tuesday 8:00 AM
    const hoursToAdd = 5;
    
    console.log('\n🧪 TEST CASE: Tuesday 8:00 AM + 5 hours');
    const result = addWorkingHoursToTimePHT(startTime, hoursToAdd, tuesdayConfig);
    
    console.log('\n🎯 FINAL RESULT:');
    console.log('Expected: Tuesday 1:00 PM (if breaks don\'t extend time)');
    console.log('Expected: Tuesday 2:00 PM (if breaks extend time)');
    console.log('Actual  :', result.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    
    const finalHour = result.getHours();
    if (finalHour === 13) {
      console.log('✅ Result is 1:00 PM - breaks do NOT extend SLA time');
    } else if (finalHour === 14) {
      console.log('✅ Result is 2:00 PM - breaks DO extend SLA time');
    } else {
      console.log('❌ Unexpected result');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAddWorkingHours();
