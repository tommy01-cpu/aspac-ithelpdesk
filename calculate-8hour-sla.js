// Calculate 8-hour SLA with lunch break consideration
console.log('🧮 Calculating 8-hour SLA from 7:15 PM with lunch break...');

// Working hours: 8 AM - 6 PM with 12 PM - 1 PM lunch break = 9 working hours per day
const workingHoursPerDay = 9;
const lunchBreakStart = 12; // 12:00 PM
const lunchBreakEnd = 13;   // 1:00 PM

console.log('📋 Business rules:');
console.log('- Working hours: 8:00 AM - 6:00 PM');
console.log('- Lunch break: 12:00 PM - 1:00 PM');
console.log('- Working hours per day: 9 hours (10 hours - 1 hour lunch)');
console.log('- SLA clock: Continues through lunch break (does NOT pause)');

console.log('\n🕐 Scenario: 7:15 PM start + 8-hour SLA');

// Start: 7:15 PM (outside working hours)
console.log('\n📅 Day-by-day calculation:');
console.log('1. Start: 7:15 PM (outside working hours)');
console.log('   → Move to next working day: 8:00 AM');

// Day 1: How many hours can we complete?
console.log('\n2. Day 1 (next day): 8:00 AM - 6:00 PM');
console.log('   Available working hours: 9 hours (with lunch break)');
console.log('   SLA needed: 8 hours');
console.log('   Since 8 < 9, SLA will complete on Day 1');

// Calculate exact time
console.log('\n⏰ Exact time calculation:');
console.log('   Start: 8:00 AM');
console.log('   Add 8 hours: 8:00 AM + 8 hours = 4:00 PM');

// Check if we cross lunch break
console.log('\n🍽️ Lunch break check:');
console.log('   Lunch: 12:00 PM - 1:00 PM');
console.log('   SLA due: 4:00 PM');
console.log('   Does SLA cross lunch? 8:00 AM → 4:00 PM crosses 12:00-1:00 PM');

// According to business rule: SLA clock continues through lunch
console.log('\n📖 Business rule: SLA clock continues through lunch');
console.log('   8:00 AM + 8 hours = 4:00 PM (no adjustment for lunch)');

console.log('\n✅ RESULT: 8-hour SLA from 7:15 PM should be due at 4:00 PM next day');

console.log('\n📊 Summary:');
console.log('- 4-hour SLA: 8:00 AM + 4 hours = 12:00 PM (noon)');
console.log('- 8-hour SLA: 8:00 AM + 8 hours = 4:00 PM');
console.log('- Lunch break: SLA clock continues (no pause)');

console.log('\n🔍 If your system shows different times, the bug is still there!');

// Test different SLA durations
console.log('\n📋 SLA Reference Table (from 7:15 PM start):');
const slaHours = [1, 2, 4, 6, 8, 10, 12];

slaHours.forEach(hours => {
  if (hours <= 9) {
    // Same day completion
    const startHour = 8; // 8 AM
    const endHour = startHour + hours;
    let displayHour = endHour;
    let period = 'AM';
    
    if (endHour >= 12) {
      period = 'PM';
      if (endHour > 12) displayHour = endHour - 12;
    }
    
    console.log(`${hours}-hour SLA: 8:00 AM + ${hours} hours = ${displayHour}:00 ${period}`);
  } else {
    // Multi-day calculation needed
    console.log(`${hours}-hour SLA: Spans multiple days (need complex calculation)`);
  }
});
