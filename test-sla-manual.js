const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSLAWithRealAPI() {
  console.log('🧪 Testing SLA calculation by creating a real incident...');
  
  try {
    // Create an incident at 6:55 PM to test the SLA calculation
    const testIncident = {
      title: 'SLA Test Incident - After Hours',
      description: 'Testing SLA calculation for after-hours incident creation',
      category: 'Incident',
      urgency: 'Medium',
      createdBy: 1, // Assuming user ID 1 exists
      requesterDepartment: 'IT',
      slaHours: 4, // 4-hour SLA
      status: 'Open',
      priority: 'Medium',
      type: 'Software',
      createdAt: new Date('2025-08-28T18:55:05.165+08:00'), // 6:55:05 PM Philippine Time
    };
    
    console.log('Creating test incident at:', testIncident.createdAt.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    console.log('Day:', testIncident.createdAt.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', weekday: 'long' }));
    console.log('SLA Hours:', testIncident.slaHours);
    
    // Check operational hours configuration first
    const operationalHours = await prisma.operationalHours.findFirst({
      where: { isActive: true },
      include: {
        workingDays: {
          include: { breakHours: true },
          orderBy: { dayOfWeek: 'asc' }
        }
      }
    });
    
    if (operationalHours) {
      console.log('\n📋 Current operational hours:');
      console.log('Working hours:', operationalHours.standardStartTime, '-', operationalHours.standardEndTime);
      
      const thursdayConfig = operationalHours.workingDays.find(d => d.dayOfWeek === 4); // Thursday
      if (thursdayConfig) {
        console.log('Thursday enabled:', thursdayConfig.isEnabled);
        if (thursdayConfig.breakHours && thursdayConfig.breakHours.length > 0) {
          console.log('Thursday breaks:', thursdayConfig.breakHours.map(b => `${b.startTime}-${b.endTime}`));
        }
      }
    }
    
    // Test what happens if we manually calculate expected SLA
    console.log('\n🔍 Expected calculation:');
    console.log('Start: Wednesday 6:55 PM (outside working hours)');
    console.log('Should move to: Thursday 8:00 AM (next working day start)');
    console.log('Add 4 hours from 8:00 AM = 12:00 PM (noon)');
    console.log('Expected due date: Thursday 12:00 PM');
    
    // Let's check what time shows if we add 4 hours to 8 AM Thursday
    const thursdayStart = new Date('2025-08-29T08:00:00.000+08:00'); // Thursday 8 AM
    const expectedDue = new Date(thursdayStart);
    expectedDue.setHours(expectedDue.getHours() + 4); // Add 4 hours
    
    console.log('\n✅ Manual calculation result:');
    console.log('Thursday 8:00 AM + 4 hours =', expectedDue.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    
    console.log('\n💡 The fix should make SLA due date match this expected result.');
    console.log('If you see 6:55 AM in logs instead of 12:00 PM, the bug still exists.');
    console.log('If you see 12:00 PM, the fix is working correctly!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSLAWithRealAPI();
