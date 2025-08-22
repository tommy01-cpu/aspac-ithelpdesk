const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkOperationalHours() {
  console.log('🔍 Checking operational hours configuration...');
  
  try {
    const operationalHours = await prisma.operationalHours.findMany({
      orderBy: { id: 'desc' },
      take: 10
    });
    
    console.log('📋 Operational Hours Records:');
    operationalHours.forEach((hour, index) => {
      console.log(`${index + 1}. ID: ${hour.id}, Day: ${hour.dayOfWeek}, Start: ${hour.startTime}, End: ${hour.endTime}, Is Working: ${hour.isWorkingDay}`);
    });
    
    // Check SLA calculation for the specific example
    console.log('\n🕐 Testing SLA calculation for the example:');
    console.log('Start: Thursday 7:57 PM (19:57)');
    console.log('SLA: 18 hours');
    console.log('Expected due: Monday 2:00 PM');
    
    // Calculate working hours per day
    const workingDays = operationalHours.filter(h => h.isWorkingDay);
    if (workingDays.length > 0) {
      const sampleDay = workingDays[0];
      const startHour = parseInt(sampleDay.startTime.split(':')[0]);
      const endHour = parseInt(sampleDay.endTime.split(':')[0]);
      const workingHoursPerDay = endHour - startHour;
      
      console.log(`\n📊 Working hours per day: ${workingHoursPerDay} hours`);
      console.log(`📊 Working days: ${workingDays.map(d => d.dayOfWeek).join(', ')}`);
      
      // Check if there's a break configured
      const breakInfo = operationalHours.find(h => h.dayOfWeek === 'BREAK');
      if (breakInfo) {
        console.log(`📊 Break time: ${breakInfo.startTime} - ${breakInfo.endTime}`);
        const breakHours = parseInt(breakInfo.endTime.split(':')[0]) - parseInt(breakInfo.startTime.split(':')[0]);
        const actualWorkingHours = workingHoursPerDay - breakHours;
        console.log(`📊 Break duration: ${breakHours} hours`);
        console.log(`📊 Actual working hours per day (with break): ${actualWorkingHours} hours`);
        
        // Calculate how many working days needed for 18 hours
        const daysNeeded = Math.ceil(18 / actualWorkingHours);
        console.log(`📊 Days needed for 18 hours: ${daysNeeded} working days`);
      }
    }
    
    // Show SLA breakdown configuration
    console.log('\n🎯 Checking SLA breakdown configuration...');
    const slaBreakdowns = await prisma.sLABreakdown.findMany({
      where: { id: 23 }, // The SLA ID from the log
      take: 1
    });
    
    if (slaBreakdowns.length > 0) {
      const sla = slaBreakdowns[0];
      console.log(`📋 SLA ID 23: ${sla.days}d ${sla.hours}h ${sla.minutes}m = ${sla.totalHours}h, Operational: ${sla.useOperationalHours}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOperationalHours();
