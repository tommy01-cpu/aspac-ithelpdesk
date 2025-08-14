const { PrismaClient } = require('@prisma/client');
const { calculateSLADueDate, getOperationalHours, componentsToWorkingHours } = require('./lib/sla-calculator.ts');

const prisma = new PrismaClient();

async function testServiceSLA() {
  try {
    console.log('=== Testing Service SLA Conversion ===');
    
    // Get operational hours
    const oh = await getOperationalHours();
    console.log('Operational Hours Config:', JSON.stringify(oh, null, 2));
    
    // Test different SLA hour values
    const testCases = [
      { name: "Password Reset", hours: 24, description: "Should be reasonable for calendar time" },
      { name: "Email Services", hours: 48, description: "Borderline - could be calendar or working" },
      { name: "Software Install", hours: 72, description: "Borderline - could be calendar or working" },
      { name: "Hardware Request", hours: 120, description: "Too long for calendar - likely working hours" },
      { name: "Special Services", hours: 168, description: "Definitely working hours (7 calendar days is too long)" }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n--- ${testCase.name} (${testCase.hours} hours) ---`);
      console.log(`Description: ${testCase.description}`);
      
      // Simulate the logic from the route
      let convertedHours;
      let useOperationalHours;
      
      if (testCase.hours > 72) {
        // Convert from working hours
        const estimatedDays = Math.ceil(testCase.hours / 8);
        convertedHours = componentsToWorkingHours(estimatedDays, 0, 0, oh);
        useOperationalHours = true;
        console.log(`Conversion: ${testCase.hours}h -> ${estimatedDays} working days -> ${convertedHours}h`);
      } else {
        convertedHours = testCase.hours;
        useOperationalHours = false;
        console.log(`No conversion: ${testCase.hours}h (calendar time)`);
      }
      
      // Calculate due date from Wednesday 7:13 PM
      const startDate = new Date('2025-01-15T19:13:00+08:00'); // Wednesday 7:13 PM Philippine time
      const dueDate = await calculateSLADueDate(startDate, convertedHours, { useOperationalHours });
      
      console.log(`Start: ${startDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' })}`);
      console.log(`Due: ${dueDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' })}`);
      console.log(`Total hours: ${convertedHours}, Operational: ${useOperationalHours}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testServiceSLA();
