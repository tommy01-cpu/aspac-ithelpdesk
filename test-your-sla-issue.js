const { PrismaClient } = require('@prisma/client');
const { calculateSLADueDate } = require('./lib/sla-calculator.ts');

async function testYourSLAIssue() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Testing Your Exact SLA Issue');
    console.log('================================');
    
    // Your exact scenario
    const slaStartAt = new Date('2025-08-30T10:13:41+08:00'); // Friday 10:13 AM PHT
    const slaHours = 4; // Top Priority SLA
    
    console.log('📊 Input:');
    console.log('- Start Time:', slaStartAt.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }));
    console.log('- Day of Week:', ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][slaStartAt.getDay()]);
    console.log('- SLA Hours:', slaHours);
    
    // Test the calculation 
    console.log('\n🧮 Calculating...');
    const calculatedDueDate = await calculateSLADueDate(slaStartAt, slaHours, { 
      useOperationalHours: true 
    });
    
    console.log('\n📈 Results:');
    console.log('- Calculated Due Date (UTC):', calculatedDueDate.toISOString());
    console.log('- Calculated Due Date (PHT):', calculatedDueDate.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }));
    
    // Your actual result from the system
    const actualSystemResult = new Date('2025-09-01T12:00:00+08:00'); // Sunday 12:00 PM
    console.log('- System Result (PHT):', actualSystemResult.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }));
    
    // What it SHOULD be
    console.log('\n💡 What it SHOULD be:');
    console.log('- Friday 10:13 AM + 4 hours = Friday 3:13 PM (accounting for lunch break)');
    console.log('- But got: Sunday 12:00 PM (completely wrong)');
    
    // Check if they match
    const timeDiff = Math.abs(calculatedDueDate.getTime() - actualSystemResult.getTime());
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    console.log('\n🔍 Analysis:');
    console.log('- Time Difference:', hoursDiff.toFixed(2), 'hours');
    
    if (hoursDiff < 1) {
      console.log('❌ The calculateSLADueDate function is also producing the wrong result');
      console.log('❌ This means the bug is in the SLA calculation function itself');
    } else {
      console.log('✅ The calculateSLADueDate function produces a different result');
      console.log('✅ This means the bug might be in how it\'s being called or stored');
    }
    
    // Manual step by step validation
    console.log('\n🔬 Manual Validation:');
    console.log('- Start: Friday Aug 30, 2025 at 10:13:41 AM');
    console.log('- Friday working hours: 08:00 - 17:00');
    console.log('- Friday break: 12:00 - 13:00');
    console.log('- Remaining time on Friday: 10:13 AM to 12:00 PM = 1h 47m');
    console.log('- Break: 12:00 PM to 1:00 PM = 1h (no work)');
    console.log('- After break: 1:00 PM to 5:00 PM = 4h available');
    console.log('- Total Friday hours: 1h 47m + 4h = 5h 47m');
    console.log('- SLA needs: 4h');
    console.log('- Expected result: 10:13 AM + 4h + 1h break = Friday 3:13 PM');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testYourSLAIssue();
