const { PrismaClient } = require('@prisma/client');

async function checkOperationalHours() {
  const prisma = new PrismaClient();
  
  try {
    const config = await prisma.operationalHours.findFirst({
      where: { isActive: true }
    });
    
    console.log('📋 Operational Hours Configuration:');
    console.log('Working Time Type:', config?.workingTimeType);
    console.log('Standard Hours:', config?.standardStartTime, 'to', config?.standardEndTime);
    console.log('');
    console.log('📅 Working Days Configuration:');
    
    if (config?.workingDays) {
      const workingDays = JSON.parse(config.workingDays);
      workingDays.forEach((day, index) => {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[day.dayOfWeek] || `Day ${day.dayOfWeek}`;
        
        if (day.enabled) {
          const startTime = day.customStartTime || config.standardStartTime || '08:00';
          const endTime = day.customEndTime || config.standardEndTime || '18:00';
          console.log(`${dayName}: ${startTime} - ${endTime} ${day.customStartTime ? '(custom)' : '(standard)'}`);
          
          if (day.breakHours && day.breakHours.length > 0) {
            console.log(`  Breaks: ${day.breakHours.map(b => `${b.startTime}-${b.endTime}`).join(', ')}`);
          }
        } else {
          console.log(`${dayName}: DISABLED`);
        }
      });
    }
    
    // Specifically check Friday
    if (config?.workingDays) {
      const workingDays = JSON.parse(config.workingDays);
      const friday = workingDays.find(day => day.dayOfWeek === 5); // Friday is day 5
      
      console.log('');
      console.log('🔍 Friday Specific Check:');
      if (friday) {
        console.log('Friday enabled:', friday.enabled);
        if (friday.enabled) {
          const startTime = friday.customStartTime || config.standardStartTime || '08:00';
          const endTime = friday.customEndTime || config.standardEndTime || '18:00';
          console.log('Friday hours:', startTime, 'to', endTime);
          
          // Check if it's 8-5 specifically
          if (startTime === '08:00' && endTime === '17:00') {
            console.log('✅ Friday is 8:00 AM - 5:00 PM (8-5)');
          } else if (startTime === '08:00' && endTime === '18:00') {
            console.log('❌ Friday is 8:00 AM - 6:00 PM (8-6), NOT 8-5');
          } else {
            console.log(`❓ Friday has custom hours: ${startTime} - ${endTime}`);
          }
        }
      } else {
        console.log('❌ Friday configuration not found');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOperationalHours();
