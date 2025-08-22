const { calculateSLADueDate } = require('./lib/sla-calculator.ts');

async function testFixedSLA() {
  console.log('🧪 TESTING FIXED SLA CALCULATION');
  console.log('='.repeat(50));
  
  try {
    // Test the specific case
    const startDate = new Date('2025-08-22T19:57:27+08:00'); // Friday 7:57 PM PHT
    const slaHours = 18;
    
    console.log('📋 Test Case:');
    console.log('Start:', startDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    console.log('SLA Hours:', slaHours);
    
    // Calculate due date with the fixed logic
    const dueDate = await calculateSLADueDate(startDate, slaHours, { useOperationalHours: true });
    
    console.log('\n🎯 RESULT:');
    console.log('Calculated Due Date:', dueDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dueDate.getDay()];
    const hour = dueDate.getHours();
    
    console.log(`Day: ${dayName}`);
    console.log(`Time: ${hour}:${dueDate.getMinutes().toString().padStart(2, '0')}`);
    
    if (dayName === 'Tuesday' && hour === 13) {
      console.log('✅ SUCCESS: Fixed to Tuesday 1:00 PM');
    } else if (dayName === 'Monday' && hour === 14) {
      console.log('❌ Still showing Monday 2:00 PM - fix not working');
    } else {
      console.log('🤔 Unexpected result');
    }
    
    // Let's also test a simpler case to verify the fix
    console.log('\n🧪 SIMPLE TEST: Tuesday 8:00 AM + 5 hours');
    const simpleStart = new Date('2025-08-26T08:00:00+08:00'); // Tuesday 8:00 AM
    const simpleDue = await calculateSLADueDate(simpleStart, 5, { useOperationalHours: true });
    
    console.log('Simple Start:', simpleStart.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    console.log('Simple Due:', simpleDue.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    
    if (simpleDue.getHours() === 13) {
      console.log('✅ Simple test: Tuesday 1:00 PM (breaks don\'t extend SLA)');
    } else if (simpleDue.getHours() === 14) {
      console.log('❌ Simple test: Tuesday 2:00 PM (breaks still extending SLA)');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testFixedSLA();
