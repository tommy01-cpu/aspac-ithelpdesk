const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Read the TypeScript file and eval it as JavaScript (for testing purposes)
const slaCalculatorPath = path.join(__dirname, 'lib', 'sla-calculator.ts');
let slaCalculatorCode = fs.readFileSync(slaCalculatorPath, 'utf8');

// Convert basic TypeScript to JavaScript for testing
slaCalculatorCode = slaCalculatorCode
  .replace(/export /g, '')
  .replace(/: [^=,;{}()]+/g, '') // Remove type annotations
  .replace(/interface [^{]+{[^}]+}/g, '') // Remove interfaces
  .replace(/\/\*\*[\s\S]*?\*\//g, '') // Remove JSDoc comments
  .replace(/import[^;]+;/g, ''); // Remove imports

// Mock the dependencies
const mockPrisma = {
  operationalHours: {
    findFirst: async () => ({
      workingTimeType: 'operational-hours',
      standardStartTime: '08:00',
      standardEndTime: '18:00',
      workingDays: [
        { dayOfWeek: 1, isEnabled: true, scheduleType: 'standard', breakHours: [{ startTime: '12:00', endTime: '13:00' }] }, // Monday
        { dayOfWeek: 2, isEnabled: true, scheduleType: 'standard', breakHours: [{ startTime: '12:00', endTime: '13:00' }] }, // Tuesday
        { dayOfWeek: 3, isEnabled: true, scheduleType: 'standard', breakHours: [{ startTime: '12:00', endTime: '13:00' }] }, // Wednesday
        { dayOfWeek: 4, isEnabled: true, scheduleType: 'standard', breakHours: [{ startTime: '12:00', endTime: '13:00' }] }, // Thursday
        { dayOfWeek: 5, isEnabled: true, scheduleType: 'standard', breakHours: [{ startTime: '12:00', endTime: '13:00' }] }, // Friday
        { dayOfWeek: 6, isEnabled: true, scheduleType: 'custom', customStartTime: '08:00', customEndTime: '12:00', breakHours: [] }, // Saturday
        { dayOfWeek: 0, isEnabled: false, scheduleType: 'not-set', breakHours: [] }, // Sunday
      ]
    })
  }
};

// Add mock functions
slaCalculatorCode = `
const prisma = ${JSON.stringify(mockPrisma)};

function toPHT(date) {
  // Assume input is already in PHT for testing
  return new Date(date);
}

function isHoliday(date) {
  return false; // No holidays for testing
}

${slaCalculatorCode}
`;

// Execute the code
eval(slaCalculatorCode);

async function testSLA() {
  console.log('🧪 Testing SLA calculation fix...');
  
  try {
    // Test case 1: 6:55 PM Wednesday (outside working hours) + 4 hours = Thursday 12:00 PM
    console.log('\n=== TEST CASE 1: After hours incident ===');
    const testDate1 = new Date('2025-08-28T18:55:05'); // 6:55 PM Wednesday
    console.log('Start:', testDate1.toLocaleString());
    console.log('Day:', testDate1.toLocaleDateString('en-US', { weekday: 'long' }));
    
    const result1 = await calculateSLADueDate(testDate1, 4, { useOperationalHours: true });
    console.log('Due:', result1.toLocaleString());
    console.log('Due day:', result1.toLocaleDateString('en-US', { weekday: 'long' }));
    
    const expectedHour = 12; // 12:00 PM
    const actualHour = result1.getHours();
    
    if (actualHour === expectedHour) {
      console.log('✅ CORRECT: Shows 12:00 PM as expected');
    } else if (actualHour === 6) {
      console.log('❌ BUG STILL EXISTS: Shows 6:00 AM instead of 12:00 PM');
    } else {
      console.log(`❓ UNEXPECTED: Shows ${actualHour}:00 instead of 12:00 PM`);
    }
    
    // Test case 2: 10:00 AM Wednesday (during working hours) + 4 hours = Wednesday 2:00 PM (with lunch break)
    console.log('\n=== TEST CASE 2: During working hours ===');
    const testDate2 = new Date('2025-08-28T10:00:00'); // 10:00 AM Wednesday
    console.log('Start:', testDate2.toLocaleString());
    
    const result2 = await calculateSLADueDate(testDate2, 4, { useOperationalHours: true });
    console.log('Due:', result2.toLocaleString());
    
    // 10 AM + 4 hours = 2 PM (same day, lunch break doesn't extend SLA)
    const expected2Hour = 14; // 2:00 PM
    const actual2Hour = result2.getHours();
    
    if (actual2Hour === expected2Hour) {
      console.log('✅ CORRECT: Shows 2:00 PM as expected (10 AM + 4 hours)');
    } else {
      console.log(`❓ Shows ${actual2Hour}:00 instead of 2:00 PM`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSLA();
