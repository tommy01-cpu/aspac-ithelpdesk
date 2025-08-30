const { PrismaClient } = require('@prisma/client');
const { calculateSLADueDate, getOperationalHours } = require('./lib/sla-calculator.ts');

const prisma = new PrismaClient();

async function debugSLAIssue() {
  try {
    console.log('🔍 Debugging SLA Due Date Issue');
    console.log('=================================');
    
    // Your provided data
    const slaStartAt = new Date('2025-08-30 10:13:41');
    const slaHours = 4; // Top Priority SLA - 4 hours
    const expectedDueDate = new Date('2025-09-01 12:00:00');
    
    console.log('📊 Input Data:');
    console.log('- SLA Start At:', slaStartAt.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }));
    console.log('- SLA Hours:', slaHours);
    console.log('- Actual Due Date (from your data):', expectedDueDate.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }));
    
    // Get operational hours configuration
    const operationalHours = await getOperationalHours();
    
    if (!operationalHours) {
      console.log('❌ No operational hours configuration found');
      return;
    }
    
    console.log('\n🕐 Operational Hours Configuration:');
    console.log('- Working Time Type:', operationalHours.workingTimeType);
    console.log('- Standard Hours:', operationalHours.standardStartTime, '-', operationalHours.standardEndTime);
    console.log('- Break:', operationalHours.standardBreakStart, '-', operationalHours.standardBreakEnd);
    
    // Calculate SLA due date using our function
    console.log('\n🧮 Calculating SLA Due Date...');
    const calculatedDueDate = await calculateSLADueDate(slaStartAt, slaHours, { useOperationalHours: true });
    
    console.log('\n📈 Results:');
    console.log('- Calculated Due Date:', calculatedDueDate.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }));
    console.log('- Expected Due Date:', expectedDueDate.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }));
    
    // Calculate the difference
    const timeDiff = calculatedDueDate.getTime() - expectedDueDate.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    console.log('\n📊 Analysis:');
    console.log(`- Time Difference: ${hoursDiff.toFixed(2)} hours`);
    
    if (Math.abs(hoursDiff) < 1) {
      console.log('✅ SLA calculation is correct (within 1 hour tolerance)');
    } else {
      console.log('❌ SLA calculation has significant difference');
      
      // Manual step-by-step calculation
      console.log('\n🔍 Manual Step-by-Step Analysis:');
      
      // Check if start time is within working hours
      const startDay = slaStartAt.getDay(); // 0=Sunday, 1=Monday, etc.
      const startTime = slaStartAt.toTimeString().slice(0, 5); // "HH:MM"
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      console.log(`- Start Day: ${dayNames[startDay]} (${startDay})`);
      console.log(`- Start Time: ${startTime}`);
      
      // Check working day configuration for this day
      const workingDay = operationalHours.workingDays.find(d => d.dayOfWeek === startDay);
      if (workingDay) {
        console.log(`- Working Day Config: Enabled=${workingDay.isEnabled}, Schedule=${workingDay.scheduleType}`);
        
        const workingStart = workingDay.scheduleType === 'custom' 
          ? workingDay.customStartTime 
          : operationalHours.standardStartTime;
        const workingEnd = workingDay.scheduleType === 'custom' 
          ? workingDay.customEndTime 
          : operationalHours.standardEndTime;
          
        console.log(`- Working Hours: ${workingStart} - ${workingEnd}`);
        
        if (startTime < workingStart || startTime >= workingEnd) {
          console.log('- Status: Started OUTSIDE working hours');
          console.log('- Action: Should move to next working day start');
        } else {
          console.log('- Status: Started WITHIN working hours');
        }
      }
      
      // Check what day September 1st is
      const dueDay = expectedDueDate.getDay();
      console.log(`\n- Expected Due Day: ${dayNames[dueDay]} (${dueDay})`);
      console.log(`- Expected Due Time: ${expectedDueDate.toTimeString().slice(0, 5)}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugSLAIssue();
