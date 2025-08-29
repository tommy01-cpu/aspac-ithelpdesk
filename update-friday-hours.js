const { PrismaClient } = require('@prisma/client');

async function updateFridayHours() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking current Friday configuration...');
    
    // Get current operational hours config
    const config = await prisma.operationalHours.findFirst({
      where: { isActive: true }
    });
    
    if (!config) {
      console.log('❌ No active operational hours configuration found!');
      return;
    }
    
    console.log('Current config:', {
      workingTimeType: config.workingTimeType,
      standardStartTime: config.standardStartTime,
      standardEndTime: config.standardEndTime
    });
    
    // Parse working days
    let workingDays = [];
    if (config.workingDays) {
      workingDays = JSON.parse(config.workingDays);
    }
    
    console.log('Current working days count:', workingDays.length);
    
    // Find Friday (dayOfWeek = 5)
    let friday = workingDays.find(day => day.dayOfWeek === 5);
    
    if (friday) {
      console.log('📅 Current Friday config:', {
        enabled: friday.enabled,
        customStartTime: friday.customStartTime,
        customEndTime: friday.customEndTime,
        currentEndTime: friday.customEndTime || config.standardEndTime || '18:00'
      });
      
      // Check if Friday already ends at 17:00
      const currentEndTime = friday.customEndTime || config.standardEndTime || '18:00';
      
      if (currentEndTime === '17:00') {
        console.log('✅ Friday is already set to end at 5:00 PM (17:00)');
      } else {
        console.log('🔧 Updating Friday to end at 5:00 PM (17:00)...');
        
        // Update Friday's custom end time
        friday.customEndTime = '17:00';
        
        // Update the database
        await prisma.operationalHours.update({
          where: { id: config.id },
          data: {
            workingDays: JSON.stringify(workingDays)
          }
        });
        
        console.log('✅ Friday updated to 8:00 AM - 5:00 PM (17:00)!');
      }
    } else {
      console.log('❌ Friday configuration not found in working days');
      console.log('Available days:', workingDays.map(d => `Day ${d.dayOfWeek} (${d.enabled ? 'enabled' : 'disabled'})`));
    }
    
  } catch (error) {
    console.error('❌ Error updating Friday hours:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateFridayHours();
