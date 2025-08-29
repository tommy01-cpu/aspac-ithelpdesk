const { PrismaClient } = require('@prisma/client');

async function testHolidayIntegration() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🎯 Testing Holiday Integration with Database');
    console.log('');
    
    // Check current holidays in database
    const holidays = await prisma.holiday.findMany({
      where: { isActive: true },
      orderBy: { date: 'asc' }
    });
    
    console.log('📅 Holidays in Database:');
    holidays.forEach(holiday => {
      const date = new Date(holiday.date);
      const dayName = date.toLocaleDateString('en-PH', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      console.log(`   ${holiday.date.toISOString().split('T')[0]}: ${holiday.name} (${dayName})`);
    });
    
    console.log('');
    console.log('✅ Benefits of Database Holiday Integration:');
    console.log('   • Dynamic holiday management through admin interface');
    console.log('   • Can add/remove holidays without code changes');
    console.log('   • Supports holiday activation/deactivation');
    console.log('   • Real-time holiday updates for SLA calculations');
    console.log('   • Cached for 5 minutes to improve performance');
    
    if (holidays.length === 0) {
      console.log('');
      console.log('⚠️  No active holidays found in database!');
      console.log('   You can add holidays through the admin interface at:');
      console.log('   /admin/settings/service-desk/holidays');
    }
    
  } catch (error) {
    console.error('❌ Error testing holiday integration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testHolidayIntegration();
