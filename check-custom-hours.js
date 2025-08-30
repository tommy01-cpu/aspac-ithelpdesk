const { PrismaClient } = require('@prisma/client');

async function checkCustomHours() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🕐 Checking Working Days Configuration...\n');
    
    // Check operational hours configuration
    const operationalHours = await prisma.operationalHours.findMany({
      include: {
        workingDays: {
          include: {
            breakHours: true
          },
          orderBy: { dayOfWeek: 'asc' }
        }
      },
      where: { isActive: true }
    });
    
    console.log('📊 Operational Hours Configurations Found:', operationalHours.length);
    
    if (operationalHours.length === 0) {
      console.log('❌ No active operational hours configuration found!');
      return;
    }
    
    const config = operationalHours[0]; // Get the first active config
    console.log(`\n✅ Using Operational Hours Config ID: ${config.id}`);
    console.log(`- Working Time Type: ${config.workingTimeType}`);
    console.log(`- Standard Hours: ${config.standardStartTime} - ${config.standardEndTime}`);
    console.log(`- Standard Break: ${config.standardBreakStart} - ${config.standardBreakEnd}`);
    
    console.log('\n� Working Days Configuration:');
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    config.workingDays.forEach(day => {
      const dayName = dayNames[day.dayOfWeek];
      console.log(`\n- ${dayName} (${day.dayOfWeek}):`);
      console.log(`  Enabled: ${day.isEnabled}`);
      console.log(`  Schedule Type: ${day.scheduleType}`);
      
      if (day.scheduleType === 'custom') {
        console.log(`  Custom Hours: ${day.customStartTime} - ${day.customEndTime}`);
      } else {
        console.log(`  Standard Hours: ${config.standardStartTime} - ${config.standardEndTime}`);
      }
      
      if (day.breakHours && day.breakHours.length > 0) {
        console.log(`  Break Hours:`);
        day.breakHours.forEach(brk => {
          console.log(`    ${brk.startTime} - ${brk.endTime}`);
        });
      } else if (config.standardBreakStart && config.standardBreakEnd) {
        console.log(`  Standard Break: ${config.standardBreakStart} - ${config.standardBreakEnd}`);
      }
    });
    
    // Focus on Friday (day 5)
    const friday = config.workingDays.find(d => d.dayOfWeek === 5);
    console.log('\n🎯 Friday (Start Day) Analysis:');
    if (friday) {
      console.log(`✅ Friday configuration found:`);
      console.log(`- Enabled: ${friday.isEnabled}`);
      console.log(`- Schedule Type: ${friday.scheduleType}`);
      
      const startTime = friday.scheduleType === 'custom' ? friday.customStartTime : config.standardStartTime;
      const endTime = friday.scheduleType === 'custom' ? friday.customEndTime : config.standardEndTime;
      
      console.log(`- Working Hours: ${startTime} - ${endTime}`);
      
      if (friday.breakHours && friday.breakHours.length > 0) {
        friday.breakHours.forEach(brk => {
          console.log(`- Break: ${brk.startTime} - ${brk.endTime}`);
        });
      } else if (config.standardBreakStart) {
        console.log(`- Break: ${config.standardBreakStart} - ${config.standardBreakEnd}`);
      }
      
      if (friday.isEnabled && friday.scheduleType !== 'not-set') {
        console.log('✅ Friday is properly configured as a working day');
      } else {
        console.log('❌ Friday is NOT properly configured');
      }
    } else {
      console.log('❌ No Friday configuration found!');
    }
    
    // Test the specific case
    console.log('\n🧮 SLA Calculation Test for your case:');
    console.log('- Start: Friday, Aug 30, 2025 at 10:13:41 AM');
    console.log('- SLA Hours: 4 hours');
    console.log('- Expected: Should complete on Friday afternoon');
    console.log('- Actual: Sunday, Sept 1, 2025 at 12:00 PM ❌');
    
    if (friday && friday.isEnabled) {
      const workingStart = friday.scheduleType === 'custom' ? friday.customStartTime : config.standardStartTime;
      const workingEnd = friday.scheduleType === 'custom' ? friday.customEndTime : config.standardEndTime;
      
      console.log('\n💡 What SHOULD happen:');
      console.log(`- 10:13 AM is within working hours (${workingStart} - ${workingEnd})`);
      console.log('- Add 4 working hours');
      console.log('- Account for lunch break if applicable');
      console.log('- Result should be Friday afternoon around 3:13 PM');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCustomHours();
