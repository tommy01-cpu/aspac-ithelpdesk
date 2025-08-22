const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugBreakHandling() {
  console.log('🔍 DEBUGGING BREAK TIME HANDLING');
  console.log('='.repeat(50));
  
  try {
    // Test Tuesday calculation specifically
    console.log('🧪 Testing Tuesday calculation:');
    console.log('Starting Tuesday at 8:00 AM');
    console.log('Need to add 5 hours');
    console.log('Working hours: 8:00 AM - 6:00 PM');
    console.log('Lunch break: 12:00 PM - 1:00 PM');
    
    // Manual calculation
    let currentTime = new Date('2025-08-26T08:00:00+08:00'); // Tuesday 8:00 AM
    console.log('\nStart time:', currentTime.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    
    // Add 5 hours
    const targetTime = new Date(currentTime);
    targetTime.setHours(targetTime.getHours() + 5); // 8 + 5 = 13:00 (1:00 PM)
    console.log('Adding 5 hours (no break adjustment):', targetTime.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    
    // Check if this crosses lunch break (12:00-13:00)
    const startHour = currentTime.getHours(); // 8
    const endHour = targetTime.getHours(); // 13
    
    console.log('\nBreak analysis:');
    console.log('Start hour:', startHour);
    console.log('End hour (before break adjustment):', endHour);
    console.log('Lunch break: 12:00 - 13:00');
    
    if (startHour < 12 && endHour > 12) {
      console.log('✅ Crosses lunch break - need to add 1 hour');
      targetTime.setHours(targetTime.getHours() + 1); // Add 1 hour for lunch
      console.log('Final time (with break):', targetTime.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    } else {
      console.log('❌ Does not cross lunch break');
    }
    
    // The issue might be that 8 AM + 5 hours = 1 PM, which is exactly when lunch ends
    // So the calculation might be off by whether we include the break or not
    
    console.log('\n🤔 Analysis:');
    console.log('8:00 AM + 5 hours = 1:00 PM');
    console.log('But 1:00 PM is exactly when lunch break ends (12:00-13:00)');
    console.log('So the question is: should it be 1:00 PM or 2:00 PM?');
    
    console.log('\n📋 Expected behavior:');
    console.log('If we work from 8:00 AM for 5 hours:');
    console.log('- 8:00-12:00 = 4 hours');
    console.log('- 12:00-13:00 = lunch break (not counted)');
    console.log('- 13:00-14:00 = 1 more hour');
    console.log('- Total working time: 5 hours');
    console.log('- End time: 2:00 PM');
    
    console.log('\n🎯 BUT if breaks are not counted in the middle:');
    console.log('8:00 AM + 5 working hours = 1:00 PM (assuming breaks are excluded from SLA time)');
    
    // Check what the actual SLA calculator is doing
    console.log('\n🔍 Checking actual SLA calculator logic...');
    
    // Let's examine the break handling in the SLA calculator
    console.log('\nThe issue might be in how addWorkingHoursToTimePHT handles breaks');
    console.log('Need to check if breaks are being properly accounted for during time addition');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugBreakHandling();
