const { PrismaClient } = require('@prisma/client');
const { calculateSLADueDate, componentsToWorkingHours, getOperationalHours } = require('./lib/sla-calculator.ts');

const prisma = new PrismaClient();

async function testSLAWithOperationalHours() {
  try {
    console.log('=== Testing SLA Calculation with Operational Hours Always Enabled ===');
    
    // Test case: Low priority with 16 hours SLA
    const startTime = new Date(); // Current time
    const slaHours = 16; // 16 hours for low priority
    
    console.log('Start Time:', startTime.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }));
    console.log('SLA Hours:', slaHours);
    
    // Get operational hours
    const operationalHours = await getOperationalHours();
    console.log('Operational Hours Config:', operationalHours ? 'Found' : 'Not found');
    if (operationalHours) {
      console.log('Working Time Type:', operationalHours.workingTimeType);
      console.log('Standard Hours:', operationalHours.standardStartTime, '-', operationalHours.standardEndTime);
    }
    
    // Calculate SLA due date with operational hours enabled
    const dueDate = await calculateSLADueDate(startTime, slaHours, { useOperationalHours: true });
    
    console.log('\n=== Results ===');
    console.log('Due Date:', dueDate.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }));
    
    // Calculate the difference
    const diffMs = dueDate.getTime() - startTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = Math.floor(diffHours / 24);
    const remainingHours = diffHours % 24;
    
    console.log('Total Time Difference:');
    console.log('- Hours:', diffHours.toFixed(2));
    console.log('- Days:', diffDays, 'days', remainingHours.toFixed(2), 'hours');
    
    // Test if it falls on a working day and working hours
    const dueDatePH = new Date(dueDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const dayOfWeek = dueDatePH.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = dueDatePH.getHours();
    
    console.log('\n=== Validation ===');
    console.log('Due Date Day of Week:', ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]);
    console.log('Due Date Hour:', hour);
    console.log('Is Working Day?', dayOfWeek >= 1 && dayOfWeek <= 6 ? 'Yes' : 'No');
    console.log('Is Working Hour?', hour >= 8 && hour < 18 ? 'Yes' : 'No');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSLAWithOperationalHours();
