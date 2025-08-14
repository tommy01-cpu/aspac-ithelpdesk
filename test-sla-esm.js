
import { calculateSLADueDate } from './lib/sla-calculator.js';

async function testActualSLA() {
  try {
    console.log('=== Testing Actual SLA Calculation Function ===');
    
    const startDate = new Date('2025-08-13T15:30:06.185Z');
    const slaHours = 124;
    
    console.log('Start Date UTC:', startDate.toISOString());
    console.log('Philippine Start Time:', new Date(startDate.getTime() + 8*60*60*1000).toLocaleString('en-PH', {
      timeZone: 'Asia/Manila',
      hour12: true,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }));
    console.log('SLA Hours:', slaHours);
    
    const result = await calculateSLADueDate(startDate, slaHours);
    
    console.log('\n=== Results ===');
    console.log('Due Date UTC:', result.toISOString());
    
    const phDueTime = new Date(result.getTime() + 8*60*60*1000);
    console.log('Philippine Due Date:', phDueTime.toLocaleString('en-PH', {
      timeZone: 'Asia/Manila',
      hour12: true,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }));
    
    // Validation
    const dueHour = phDueTime.getHours();
    const dueMinute = phDueTime.getMinutes();
    const dayOfWeek = phDueTime.getDay();
    
    const isWithinWorkingHours = (dueHour >= 8 && dueHour < 18) && !(dueHour >= 12 && dueHour < 13);
    const isWorkingDay = dayOfWeek >= 1 && dayOfWeek <= 6; // Mon-Sat
    
    console.log('\n=== Validation ===');
    console.log('Due Hour (24h):', dueHour);
    console.log('Due Minute:', dueMinute);
    console.log('Day of Week:', ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek]);
    console.log('Within working hours (8-12, 13-18):', isWithinWorkingHours ? '✅ YES' : '❌ NO');
    console.log('Is working day (Mon-Sat):', isWorkingDay ? '✅ YES' : '❌ NO');
    
    // Manual calculation verification
    console.log('\n=== Manual Calculation Check ===');
    console.log('Start: Wed Aug 13, 2025 11:30 PM → Adjusted to Thu Aug 14, 8:00 AM');
    console.log('124 hours ÷ 9 hours/weekday = 13.78 weekdays');
    console.log('13 full weekdays + 0.78 * 9 = 7 remaining hours');
    
    // Expected result should be around Monday Sept 2nd or Tuesday Sept 3rd
    console.log('Expected range: Early September 2025, within working hours');
    
  } catch (error) {
    console.error('Error in SLA calculation test:', error);
  }
}

testActualSLA();
