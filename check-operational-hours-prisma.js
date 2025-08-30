const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkOperationalHours() {
  try {
    console.log('🔍 CHECKING OPERATIONAL HOURS CONFIGURATION');
    console.log('============================================================');
    
    // Get operational hours configuration
    const operationalHours = await prisma.operationalHours.findMany({
      include: {
        workingDays: {
          include: {
            breakHours: true
          }
        },
        exclusionRules: true
      }
    });

    console.log(`📊 Found ${operationalHours.length} operational hours configurations:`);
    
    operationalHours.forEach((config, index) => {
      console.log(`\n🏢 Configuration ${index + 1} (ID: ${config.id}):`);
      console.log(`  Working Time Type: ${config.workingTimeType}`);
      console.log(`  Standard Hours: ${config.standardStartTime} - ${config.standardEndTime}`);
      console.log(`  Standard Break: ${config.standardBreakStart} - ${config.standardBreakEnd}`);
      console.log(`  Is Active: ${config.isActive}`);
      
      console.log(`\n  📅 Working Days (${config.workingDays.length} configured):`);
      config.workingDays.forEach(day => {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        console.log(`    ${dayNames[day.dayOfWeek]}: ${day.isEnabled ? 'Enabled' : 'Disabled'}`);
        if (day.scheduleType === 'custom') {
          console.log(`      Custom hours: ${day.customStartTime} - ${day.customEndTime}`);
        }
        if (day.breakHours.length > 0) {
          console.log(`      Breaks: ${day.breakHours.map(b => `${b.startTime}-${b.endTime}`).join(', ')}`);
        }
      });
    });

    // If no operational hours found, check if there's old data
    if (operationalHours.length === 0) {
      console.log('\n❌ NO OPERATIONAL HOURS CONFIGURATION FOUND!');
      console.log('This explains why SLA calculation is not working.');
      
      // Check if there are any tables that might have old operational hours data
      console.log('\n🔍 Checking for any existing operational hours data...');
      
      try {
        const result = await prisma.$queryRaw`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = current_schema() 
          AND table_name LIKE '%operational%' OR table_name LIKE '%working%' OR table_name LIKE '%hours%'
        `;
        console.log('Tables with "hours" in name:', result);
      } catch (e) {
        console.log('Could not check for alternative tables:', e.message);
      }
    }

    console.log('\n🎯 ANALYSIS:');
    if (operationalHours.length === 0) {
      console.log('❌ No operational hours configured - this is why SLA calculation fails');
    } else {
      const activeConfig = operationalHours.find(config => config.isActive);
      if (!activeConfig) {
        console.log('❌ No active operational hours configuration found');
      } else {
        const enabledDays = activeConfig.workingDays.filter(day => day.isEnabled);
        console.log(`✅ Active configuration found with ${enabledDays.length} enabled working days`);
        
        if (enabledDays.length === 0) {
          console.log('❌ No working days are enabled in the active configuration');
        }
      }
    }

  } catch (error) {
    console.error('❌ Error checking operational hours:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkOperationalHours();
