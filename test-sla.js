const { PrismaClient } = require('@prisma/client');

async function testCurrentSLA() {
  const prisma = new PrismaClient();
  
  try {
    // Import the SLA calculator functions
    const { calculateSLADueDate, getOperationalHours, getDailyWorkingMinutes, componentsToWorkingHours } = require('./lib/sla-calculator.ts');
    
    // Get operational hours
    const operationalHours = await getOperationalHours();
    
    if (!operationalHours) {
      console.log('No operational hours found');
      return;
    }
    
    // Test with the actual scenario
    const startTime = new Date('2025-08-12T18:55:00.000Z'); // 6:55 PM Philippine time (2:55 AM next day local display bug)
    console.log('Ticket created:', startTime.toISOString());
    console.log('Ticket created (Philippine):', startTime.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    
    // Calculate daily working minutes
    const dailyMinutes = getDailyWorkingMinutes(operationalHours);
    console.log('Daily working minutes (average):', dailyMinutes);
    console.log('Daily working hours (average):', dailyMinutes / 60);
    
    // Convert 4 days to working hours
    const slaWorkingHours = componentsToWorkingHours(4, 0, 0, operationalHours);
    console.log('4-day SLA converted to working hours:', slaWorkingHours);
    
    // Calculate due date
    const dueDate = await calculateSLADueDate(startTime, slaWorkingHours);
    console.log('Calculated due date:', dueDate.toISOString());
    console.log('Calculated due date (Philippine):', dueDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    
    // Manual calculation verification
    console.log('\n--- Manual Verification ---');
    console.log('Start: Wednesday 6:55 PM (outside working hours)');
    console.log('Next working time: Thursday 8:00 AM');
    console.log('Working hours needed: 36 hours');
    console.log('Thursday 8AM-6PM (minus lunch): 9 hours, remaining: 27 hours');
    console.log('Friday 8AM-6PM (minus lunch): 9 hours, remaining: 18 hours');
    console.log('Saturday 8AM-12PM: 4 hours, remaining: 14 hours');
    console.log('Monday 8AM-6PM (minus lunch): 9 hours, remaining: 5 hours');
    console.log('Tuesday 8AM-1PM: 5 hours, remaining: 0 hours');
    console.log('Expected due date: Tuesday 1:00 PM');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCurrentSLA();
