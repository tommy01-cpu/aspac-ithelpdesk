const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugSLAIssue() {
  try {
    console.log('🔍 Debugging SLA Due Date Issue');
    console.log('=================================');
    
    // Your provided data
    const slaStartAt = new Date('2025-08-30 10:13:41');
    const slaHours = 4; // Top Priority SLA - 4 hours
    const actualDueDate = new Date('2025-09-01 12:00:00');
    
    console.log('📊 Input Data:');
    console.log('- SLA Start At:', slaStartAt.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }));
    console.log('- SLA Hours:', slaHours);
    console.log('- Actual Due Date (from your data):', actualDueDate.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }));
    
    // Manual Analysis
    console.log('\n🔍 Manual Step-by-Step Analysis:');
    
    const startDay = slaStartAt.getDay(); // 0=Sunday, 1=Monday, etc.
    const startTime = slaStartAt.toTimeString().slice(0, 5); // "HH:MM"
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    console.log(`- Start Day: ${dayNames[startDay]} (${startDay}) - This is Friday`);
    console.log(`- Start Time: ${startTime} - 10:13 AM`);
    
    // Get operational hours from database
    const operationalHours = await prisma.operationalHours.findFirst({
      where: { isActive: true },
      include: {
        workingDays: {
          include: { breakHours: true },
          orderBy: { dayOfWeek: 'asc' }
        }
      }
    });
    
    if (!operationalHours) {
      console.log('❌ No operational hours configuration found');
      return;
    }
    
    console.log('\n🕐 Working Hours Configuration:');
    console.log(`- Standard Hours: ${operationalHours.standardStartTime} - ${operationalHours.standardEndTime}`);
    console.log(`- Break: ${operationalHours.standardBreakStart} - ${operationalHours.standardBreakEnd}`);
    
    // Check Friday working hours
    const fridayConfig = operationalHours.workingDays.find(d => d.dayOfWeek === 5); // Friday = 5
    if (fridayConfig) {
      const workingStart = fridayConfig.scheduleType === 'custom' 
        ? fridayConfig.customStartTime 
        : operationalHours.standardStartTime;
      const workingEnd = fridayConfig.scheduleType === 'custom' 
        ? fridayConfig.customEndTime 
        : operationalHours.standardEndTime;
        
      console.log(`\n📅 Friday (Start Day) Configuration:`);
      console.log(`- Enabled: ${fridayConfig.isEnabled}`);
      console.log(`- Working Hours: ${workingStart} - ${workingEnd}`);
      
      if (fridayConfig.breakHours && fridayConfig.breakHours.length > 0) {
        fridayConfig.breakHours.forEach(b => {
          console.log(`- Break: ${b.startTime} - ${b.endTime}`);
        });
      }
      
      // Calculate working hours remaining on Friday
      if (startTime >= workingStart && startTime < workingEnd) {
        console.log(`- Status: Started WITHIN working hours on Friday`);
        
        // Calculate hours from 10:13 AM to end of Friday (17:00 minus break)
        const endTime = workingEnd;
        const [startH, startM] = startTime.split(':').map(n => parseInt(n));
        const [endH, endM] = endTime.split(':').map(n => parseInt(n));
        
        let remainingMinutes = (endH * 60 + endM) - (startH * 60 + startM);
        
        // Subtract lunch break if it hasn't passed yet
        if (fridayConfig.breakHours) {
          fridayConfig.breakHours.forEach(b => {
            if (startTime < b.startTime) {
              const [bsH, bsM] = b.startTime.split(':').map(n => parseInt(n));
              const [beH, beM] = b.endTime.split(':').map(n => parseInt(n));
              const breakMinutes = (beH * 60 + beM) - (bsH * 60 + bsM);
              remainingMinutes -= breakMinutes;
              console.log(`- Deducting break: ${breakMinutes} minutes`);
            }
          });
        }
        
        const remainingHours = remainingMinutes / 60;
        console.log(`- Remaining hours on Friday: ${remainingHours.toFixed(2)} hours`);
        
        if (remainingHours >= slaHours) {
          // SLA should complete on Friday
          const slaEndTime = new Date(slaStartAt);
          slaEndTime.setMinutes(slaEndTime.getMinutes() + (slaHours * 60));
          
          // Account for break
          if (fridayConfig.breakHours) {
            fridayConfig.breakHours.forEach(b => {
              const breakStart = new Date(slaStartAt);
              const [bsH, bsM] = b.startTime.split(':').map(n => parseInt(n));
              breakStart.setHours(bsH, bsM, 0, 0);
              
              const breakEnd = new Date(slaStartAt);
              const [beH, beM] = b.endTime.split(':').map(n => parseInt(n));
              breakEnd.setHours(beH, beM, 0, 0);
              
              if (slaEndTime > breakStart) {
                const breakDuration = (beH * 60 + beM) - (bsH * 60 + bsM);
                slaEndTime.setMinutes(slaEndTime.getMinutes() + breakDuration);
                console.log(`- Adding break time: ${breakDuration} minutes`);
              }
            });
          }
          
          console.log(`- Expected SLA completion on Friday: ${slaEndTime.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}`);
        } else {
          console.log(`- SLA will continue to next working day`);
          console.log(`- Hours used on Friday: ${remainingHours.toFixed(2)}`);
          console.log(`- Remaining SLA hours: ${(slaHours - remainingHours).toFixed(2)}`);
        }
      } else {
        console.log(`- Status: Started OUTSIDE working hours on Friday`);
      }
    }
    
    // Check what day September 1st is
    const dueDay = actualDueDate.getDay();
    console.log(`\n📅 Actual Due Date Analysis:`);
    console.log(`- Due Day: ${dayNames[dueDay]} (${dueDay}) - This is Sunday`);
    console.log(`- Due Time: ${actualDueDate.toTimeString().slice(0, 5)} - 12:00 PM`);
    
    // Check Sunday configuration
    const sundayConfig = operationalHours.workingDays.find(d => d.dayOfWeek === 0); // Sunday = 0
    if (sundayConfig) {
      console.log(`- Sunday Enabled: ${sundayConfig.isEnabled}`);
      if (!sundayConfig.isEnabled) {
        console.log(`❌ ISSUE FOUND: Due date is set to Sunday, but Sunday is not a working day!`);
      }
    }
    
    console.log(`\n🧮 Expected Calculation (if working properly):`);
    console.log(`- Start: Friday 10:13 AM`);
    console.log(`- Remaining on Friday: ~6 hours (10:13 AM to 5:00 PM minus 1hr break)`);
    console.log(`- Since 4 hours < 6 hours, SLA should complete on Friday`);
    console.log(`- Expected completion: Friday around 3:13 PM (10:13 AM + 4 hours + 1hr break)`);
    console.log(`- But actual shows: Sunday 12:00 PM`);
    console.log(`\n❌ CONCLUSION: There's definitely an issue with the SLA calculation logic!`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugSLAIssue();
