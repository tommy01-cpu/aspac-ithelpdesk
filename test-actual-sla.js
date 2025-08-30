const { calculateSLADueDate } = require('./lib/sla-calculator.ts');

async function testActualSLA() {
  try {
    // Test the exact same scenario as the user's case
    const startDate = new Date('2025-08-30T10:13:41+08:00'); // Saturday 10:13 AM PHT
    const slaHours = 4;
    
    console.log('=== Testing Actual calculateSLADueDate Function ===');
    console.log('Start Date:', startDate.toISOString());
    console.log('Start Date (PH):', startDate.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }));
    console.log('SLA Hours:', slaHours);
    
    const result = await calculateSLADueDate(startDate, slaHours, { useOperationalHours: true });
    
    console.log('Result Date:', result.toISOString());
    console.log('Result Date (PH):', result.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }));
    
    // Format as expected in database
    const formattedResult = result.toLocaleString('en-PH', { 
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/, '$3-$1-$2 $4:$5:$6');
    
    console.log('Formatted Result (for DB):', formattedResult);
    
  } catch (error) {
    console.error('Error testing SLA:', error);
  }
}

testActualSLA();
