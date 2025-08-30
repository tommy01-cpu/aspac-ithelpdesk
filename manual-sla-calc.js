const { PrismaClient } = require('@prisma/client');

async function manualSLACalculation() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🧮 Manual SLA Calculation for Saturday 10:47 AM');
    console.log('================================================');
    
    // Get operational hours
    const opHours = await prisma.operationalHours.findFirst({
      where: { isActive: true },
      include: {
        workingDays: {
          include: { breakHours: true }
        }
      }
    });
    
    // Saturday calculation
    const saturday = opHours.workingDays.find(d => d.dayOfWeek === 6);
    console.log('\n📅 Saturday:');
    console.log(`Working hours: ${saturday.customStartTime}-${saturday.customEndTime}`);
    console.log(`Start time: 10:47 AM`);
    
    const satStartMinutes = 8 * 60; // 08:00 = 480 minutes
    const satEndMinutes = 12 * 60; // 12:00 = 720 minutes  
    const startMinutes = 10 * 60 + 47; // 10:47 = 647 minutes
    
    const satRemainingMinutes = satEndMinutes - startMinutes;
    const satRemainingHours = satRemainingMinutes / 60;
    
    console.log(`Available time: ${satRemainingMinutes} minutes = ${satRemainingHours.toFixed(2)} hours`);
    
    const slaHours = 4;
    const remainingAfterSat = slaHours - satRemainingHours;
    console.log(`SLA remaining after Saturday: ${remainingAfterSat.toFixed(2)} hours`);
    
    // Monday calculation
    const monday = opHours.workingDays.find(d => d.dayOfWeek === 1);
    console.log('\n📅 Monday:');
    console.log(`Working hours: ${monday.scheduleType === 'custom' ? monday.customStartTime : opHours.standardStartTime}-${monday.scheduleType === 'custom' ? monday.customEndTime : opHours.standardEndTime}`);
    
    const monStartHour = 8; // 08:00 AM
    const remainingMinutes = remainingAfterSat * 60;
    const dueHour = monStartHour + Math.floor(remainingMinutes / 60);
    const dueMinute = Math.round(remainingMinutes % 60);
    
    console.log(`Expected due time: ${dueHour}:${dueMinute.toString().padStart(2, '0')}`);
    
    // Check if this hits break time
    if (monday.breakHours && monday.breakHours.length > 0) {
      monday.breakHours.forEach(brk => {
        console.log(`Break time: ${brk.startTime}-${brk.endTime}`);
        
        const dueTimeStr = `${dueHour.toString().padStart(2, '0')}:${dueMinute.toString().padStart(2, '0')}`;
        if (dueTimeStr >= brk.startTime && dueTimeStr < brk.endTime) {
          console.log(`⚠️  Due time ${dueTimeStr} falls during break!`);
          console.log(`⚠️  Should be moved to after break: ${brk.endTime}`);
        }
      });
    }
    
    console.log(`\n🎯 Expected result: Monday ${dueHour}:${dueMinute.toString().padStart(2, '0')}`);
    console.log(`🔍 Actual result: Monday 12:00 PM`);
    
    if (dueHour === 12 && dueMinute === 0) {
      console.log('✅ Manual calculation matches actual result');
    } else {
      console.log('❌ Manual calculation differs from actual result');
      console.log('❌ There might be an issue with break hour handling');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

manualSLACalculation();
