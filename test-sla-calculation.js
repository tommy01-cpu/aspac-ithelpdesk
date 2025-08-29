const { calculateSLADueDate } = require('./lib/sla-calculator');

async function testSLACalculation() {
  try {
    // Test case: Request created at 6:55 PM on Aug 28, 2025 (Wednesday)
    // SLA: 4 hours
    // Expected: Should start from next working day (Thursday 8 AM) and finish at 12 PM
    
    const startTime = new Date('2025-08-28T18:55:05.165Z'); // 6:55 PM Philippine time
    const slaHours = 4;
    
    console.log('=== SLA CALCULATION TEST ===');
    console.log('Start time (UTC):', startTime.toISOString());
    console.log('Start time (Philippine):', startTime.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    console.log('Start day:', startTime.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', weekday: 'long' }));
    console.log('SLA Hours:', slaHours);
    
    const dueDate = await calculateSLADueDate(startTime, slaHours, { useOperationalHours: true });
    
    console.log('\nResult:');
    console.log('Due date (UTC):', dueDate.toISOString());
    console.log('Due date (Philippine):', dueDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    console.log('Due date day:', dueDate.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', weekday: 'long' }));
    
    console.log('\nExpected vs Actual:');
    console.log('Expected: Thursday 12:00 PM (noon)');
    console.log('Actual  :', dueDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    
    // Test another case: 6:55 PM start time (as you mentioned)
    console.log('\n=== TESTING YOUR SPECIFIC CASE ===');
    const userStartTime = new Date();
    userStartTime.setHours(18, 55, 5, 165); // 6:55 PM today
    
    console.log('Your start time (local):', userStartTime.toLocaleString());
    const userDueDate = await calculateSLADueDate(userStartTime, 4, { useOperationalHours: true });
    console.log('Your due date (local):', userDueDate.toLocaleString());
    
    // Check what hour it shows
    const hour = userDueDate.getHours();
    console.log('Due hour:', hour);
    if (hour === 6) {
      console.log('❌ BUG CONFIRMED: Shows 6:55 AM instead of 12:00 PM');
    } else if (hour === 12) {
      console.log('✅ CORRECT: Shows 12:00 PM as expected');
    } else {
      console.log('❓ UNEXPECTED: Shows', hour + ':' + userDueDate.getMinutes());
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testSLACalculation();
