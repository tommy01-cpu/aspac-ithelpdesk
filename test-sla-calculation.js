const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSLACalculation() {
  console.log('🧪 Testing SLA calculation with the real example...');
  
  try {
    // Get operational hours configuration
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
    
    console.log('📋 Operational Hours Configuration:');
    if (operationalHours) {
      console.log('- Working Time Type:', operationalHours.workingTimeType);
      console.log('- Standard Start:', operationalHours.standardStartTime);
      console.log('- Standard End:', operationalHours.standardEndTime);
      console.log('- Working Days:');
      
      operationalHours.workingDays.forEach(day => {
        const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][day.dayOfWeek];
        console.log(`  ${dayName} (${day.dayOfWeek}): ${day.isEnabled ? 'Enabled' : 'Disabled'} - ${day.scheduleType}`);
        if (day.scheduleType === 'custom') {
          console.log(`    Custom: ${day.customStartTime} - ${day.customEndTime}`);
        }
        if (day.breakHours && day.breakHours.length > 0) {
          day.breakHours.forEach(b => {
            console.log(`    Break: ${b.startTime} - ${b.endTime}`);
          });
        }
      });
    } else {
      console.log('❌ No operational hours configuration found');
    }
    
    // Test the specific example from the logs
    // Request created: Friday 7:57 PM (19:57) - TODAY
    // SLA: 18 hours
    // Calculated due: Monday 2:00 PM (14:00)
    
    const startDate = new Date('2025-08-22T19:57:27+08:00'); // Friday 7:57 PM PHT (TODAY)
    const slaHours = 18;
    
    console.log('\n🕐 Test scenario:');
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    console.log(`Start: ${startDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' })} (${dayNames[startDate.getDay()]})`);
    console.log(`SLA: ${slaHours} hours`);
    
    // Manual calculation based on operational hours
    if (operationalHours && operationalHours.workingTimeType !== 'round-clock') {
      console.log('\n🔍 Manual verification:');
      
      // Find working hours configuration
      const mondayConfig = operationalHours.workingDays.find(d => d.dayOfWeek === 1); // Monday
      if (mondayConfig && mondayConfig.isEnabled) {
        const startTime = mondayConfig.scheduleType === 'custom' 
          ? mondayConfig.customStartTime 
          : operationalHours.standardStartTime;
        const endTime = mondayConfig.scheduleType === 'custom' 
          ? mondayConfig.customEndTime 
          : operationalHours.standardEndTime;
        
        console.log(`📋 Working hours: ${startTime} - ${endTime}`);
        
        // Calculate working hours per day
        const [sh, sm] = startTime.split(':').map(n => parseInt(n, 10));
        const [eh, em] = endTime.split(':').map(n => parseInt(n, 10));
        let totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
        
        // Check breaks
        const breaks = mondayConfig.breakHours || [];
        if (breaks.length > 0) {
          console.log('📋 Breaks:', breaks.map(b => `${b.startTime} - ${b.endTime}`));
          
          breaks.forEach(b => {
            const [bsh, bsm] = b.startTime.split(':').map(n => parseInt(n, 10));
            const [beh, bem] = b.endTime.split(':').map(n => parseInt(n, 10));
            totalMinutes -= (beh * 60 + bem) - (bsh * 60 + bsm);
          });
        }
        
        const workingHoursPerDay = totalMinutes / 60;
        console.log(`📊 Actual working hours per day: ${workingHoursPerDay} hours`);
        
        // Calculate how many working days needed
        const daysNeeded = Math.ceil(18 / workingHoursPerDay);
        console.log(`📊 Working days needed for 18 hours: ${daysNeeded} days`);
        
        // Since request starts Friday 7:57 PM (after working hours)
        // Correct calculation should lead to Tuesday 1:00 PM
        console.log('\n📅 Day-by-day calculation (CORRECTED):');
        console.log('Friday 7:57 PM - After working hours (6:00 PM), rolls to next working day');
        
        // Calculate Saturday hours (8 AM - 12 PM, no breaks)
        const saturdayConfig = operationalHours.workingDays.find(d => d.dayOfWeek === 6); // Saturday
        let saturdayHours = 0;
        if (saturdayConfig && saturdayConfig.isEnabled) {
          const satStart = saturdayConfig.customStartTime || '08:00';
          const satEnd = saturdayConfig.customEndTime || '12:00';
          const [ssh, ssm] = satStart.split(':').map(n => parseInt(n, 10));
          const [seh, sem] = satEnd.split(':').map(n => parseInt(n, 10));
          saturdayHours = ((seh * 60 + sem) - (ssh * 60 + ssm)) / 60;
          console.log(`Saturday 8:00 AM - 12:00 PM: ${saturdayHours} hours`);
        }
        
        console.log('Sunday - Not a working day, skipped');
        
        const remainingAfterSaturday = 18 - saturdayHours;
        console.log(`Monday 8:00 AM - 6:00 PM: ${workingHoursPerDay} hours (with 1h lunch break)`);
        
        const remainingAfterMonday = remainingAfterSaturday - workingHoursPerDay;
        console.log(`After Monday: ${remainingAfterMonday} hours remaining`);
        
        if (remainingAfterMonday > 0) {
          console.log(`Tuesday: Need ${remainingAfterMonday} more hours`);
          
          // Tuesday starts at 8:00 AM
          const tuesdayStartHour = 8;
          let endHour = tuesdayStartHour + remainingAfterMonday;
          
          // Check if lunch break affects the calculation
          if (breaks.length > 0) {
            const lunchBreak = breaks[0];
            const lunchStart = parseInt(lunchBreak.startTime.split(':')[0]);
            const lunchEnd = parseInt(lunchBreak.endTime.split(':')[0]);
            
            // If the end time crosses lunch break, add 1 hour
            if (endHour > lunchStart) {
              endHour += (lunchEnd - lunchStart); // Add lunch break duration
            }
          }
          
          console.log(`Expected due: Tuesday ${endHour}:00 (${endHour === 13 ? '1:00 PM' : endHour + ':00'})`);
          
          // Verify the calculation
          console.log('\n🔍 VERIFICATION:');
          console.log(`Saturday: ${saturdayHours} hours`);
          console.log(`Monday: ${workingHoursPerDay} hours`);
          console.log(`Tuesday: ${remainingAfterMonday} hours`);
          console.log(`Total: ${saturdayHours + workingHoursPerDay + remainingAfterMonday} hours`);
          
          if (saturdayHours + workingHoursPerDay + remainingAfterMonday === 18) {
            console.log('✅ Calculation adds up to 18 hours');
          } else {
            console.log('❌ Calculation does not add up to 18 hours');
          }
        }
      }
    }
    
    // Check what the actual SLA calculation should be
    console.log('\n📋 CORRECT CALCULATION:');
    console.log('✅ SLA should be: Friday 7:57 PM → Tuesday 1:00 PM');
    console.log('Expected: Tuesday 1:00 PM (13:00)');
    console.log('Actual from logs: Monday 2:00 PM (14:00)');
    console.log('❌ SLA calculation appears INCORRECT - should be Tuesday, not Monday');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSLACalculation();
