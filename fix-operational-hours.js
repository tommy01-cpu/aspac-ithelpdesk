const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAndFixOperationalHours() {
  try {
    console.log('🔍 Checking current operational hours configuration...');
    
    // Get current operational hours
    const currentConfig = await prisma.operationalHours.findFirst({
      where: { isActive: true }
    });
    
    if (!currentConfig) {
      console.log('❌ No active operational hours configuration found!');
      return;
    }
    
    console.log('📋 Current configuration:');
    console.log('- workingTimeType:', currentConfig.workingTimeType);
    console.log('- standardStartTime:', currentConfig.standardStartTime);
    console.log('- standardEndTime:', currentConfig.standardEndTime);
    
    if (currentConfig.workingTimeType === 'round-clock') {
      console.log('\n⚠️  Found the problem! workingTimeType is set to "round-clock"');
      console.log('🔧 Updating to "standard" to use working hours...');
      
      await prisma.operationalHours.update({
        where: { id: currentConfig.id },
        data: {
          workingTimeType: 'standard',
          standardStartTime: currentConfig.standardStartTime || '08:00',
          standardEndTime: currentConfig.standardEndTime || '17:00'
        }
      });
      
      console.log('✅ Updated operational hours to use standard working time!');
      console.log('📅 Working hours: 8:00 AM - 5:00 PM');
    } else {
      console.log('✅ Operational hours are already configured for working time');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndFixOperationalHours();
