const { PrismaClient } = require('@prisma/client');
const { calculateSLADueDate } = require('./lib/sla-calculator.ts');

const prisma = new PrismaClient();

async function testSLACalculation() {
  try {
    // Test case: Aug 14, 2025 at 4:00 PM Philippine time with 49 hours SLA
    const startDate = new Date('2025-08-14T16:00:00+08:00'); // 4:00 PM Philippine time
    const slaHours = 49;
    
    console.log('🧪 Testing SLA Due Date Calculation');
    console.log('📅 Start Date:', startDate.toISOString(), '(Philippine Time: 4:00 PM Aug 14, 2025)');
    console.log('⏰ SLA Hours:', slaHours);
    
    const dueDate = await calculateSLADueDate(startDate, slaHours, { useOperationalHours: true });
    
    console.log('📍 Calculated Due Date:', dueDate.toISOString());
    
    // Convert to Philippine time for display
    const dueDatePH = new Date(dueDate.getTime() + (8 * 60 * 60 * 1000));
    console.log('🇵🇭 Due Date (Philippine Time):', dueDatePH.toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }));
    
    // Expected: Aug 21, 2025 at 4:00 PM
    const expectedPH = new Date('2025-08-21T16:00:00+08:00');
    console.log('✅ Expected Due Date:', expectedPH.toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }));
    
    const isCorrect = Math.abs(dueDate.getTime() - expectedPH.getTime()) < 60000; // Within 1 minute
    console.log(isCorrect ? '✅ PASS: Calculation is correct!' : '❌ FAIL: Calculation is incorrect!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSLACalculation();
