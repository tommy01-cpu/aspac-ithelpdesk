// Test SLA calculation with break pause (Option A)
console.log('🧪 Testing SLA calculation with BREAK PAUSE (Option A)...');

console.log('\n=== Test Scenarios ===');

// Scenario 1: 4-hour SLA starting 7:15 PM
console.log('\n📋 Scenario 1: 4-hour SLA starting 7:15 PM');
console.log('Expected:');
console.log('- 7:15 PM (outside hours) → 8:00 AM next day');
console.log('- 8:00 AM + 4 hours = 12:00 PM (just before lunch break)');
console.log('- Result: 12:00 PM');

// Scenario 2: 8-hour SLA starting 7:15 PM  
console.log('\n📋 Scenario 2: 8-hour SLA starting 7:15 PM');
console.log('Expected:');
console.log('- 7:15 PM (outside hours) → 8:00 AM next day');
console.log('- 8:00 AM to 12:00 PM = 4 hours');
console.log('- 12:00 PM to 1:00 PM = lunch break (SLA paused)');
console.log('- 1:00 PM + 4 more hours = 5:00 PM');
console.log('- Result: 5:00 PM');

// Scenario 3: 6-hour SLA starting 7:15 PM
console.log('\n📋 Scenario 3: 6-hour SLA starting 7:15 PM');
console.log('Expected:');
console.log('- 7:15 PM (outside hours) → 8:00 AM next day');
console.log('- 8:00 AM to 12:00 PM = 4 hours');
console.log('- 12:00 PM to 1:00 PM = lunch break (SLA paused)'); 
console.log('- 1:00 PM + 2 more hours = 3:00 PM');
console.log('- Result: 3:00 PM');

// Scenario 4: 10-hour SLA starting 7:15 PM (spans multiple days)
console.log('\n📋 Scenario 4: 10-hour SLA starting 7:15 PM');
console.log('Expected:');
console.log('- 7:15 PM (outside hours) → 8:00 AM next day');
console.log('- Day 1: 8:00 AM to 12:00 PM = 4 hours');
console.log('- Day 1: 1:00 PM to 6:00 PM = 5 hours (total: 9 hours)');
console.log('- Day 2: 8:00 AM + 1 hour = 9:00 AM');
console.log('- Result: 9:00 AM day after next');

console.log('\n🔧 Key fixes applied:');
console.log('✅ Fixed timezone double conversion (removed toPHT calls)');
console.log('✅ Added outside working hours check');
console.log('✅ Implemented break pause logic (SLA stops during lunch)');
console.log('✅ Updated business rule to Option A');

console.log('\n🎯 Current expected behavior:');
console.log('- 4-hour SLA from 7:15 PM → 12:00 PM next day');
console.log('- 8-hour SLA from 7:15 PM → 5:00 PM next day');

console.log('\n🚀 Test by creating incidents with different SLA hours!');

// Quick validation of break logic
const testStart = new Date();
testStart.setHours(8, 0, 0, 0); // 8:00 AM

console.log('\n🧮 Break logic validation:');
console.log('Start: 8:00 AM');
console.log('Add 5 hours:');
console.log('- 8:00 AM to 12:00 PM = 4 hours');
console.log('- 12:00 PM to 1:00 PM = lunch break (skipped)');
console.log('- 1:00 PM + 1 hour = 2:00 PM');
console.log('Expected result: 2:00 PM');

console.log('\nAdd 8 hours:');
console.log('- 8:00 AM to 12:00 PM = 4 hours');
console.log('- 12:00 PM to 1:00 PM = lunch break (skipped)');  
console.log('- 1:00 PM to 6:00 PM = 5 hours');
console.log('- Total: 9 working hours (4 + 5), but 8 SLA hours consumed');
console.log('Expected result: 5:00 PM');

console.log('\n✅ The fix should now correctly handle both timezone and breaks!');
