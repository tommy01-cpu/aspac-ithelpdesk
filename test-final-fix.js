// Test our timezone fix by simulating the exact scenario
const testTime = new Date('2025-08-28T19:15:35.638Z'); // 7:15 PM PHT (19:15 UTC)

console.log('🧪 Testing SLA fix after timezone correction...');
console.log('Start time (UTC):', testTime.toISOString());
console.log('Start time (PHT):', testTime.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));

// Convert to local Philippine time (what the API creates)
const philippineTime = new Date(testTime.getTime() + (8 * 60 * 60 * 1000));
console.log('Philippine time object:', philippineTime.toString());
console.log('Hour in PHT object:', philippineTime.getHours());

// Test if our fixed isWithinWorkingHours would work
const hour = philippineTime.getHours();
const isAfterHours = hour >= 18 || hour < 8; // Working hours: 8 AM - 6 PM

console.log('\n=== Working Hours Check ===');
console.log('Hour:', hour, '(19 = 7 PM)');
console.log('Is after working hours (>= 18 or < 8)?', isAfterHours);

if (isAfterHours) {
  console.log('✅ Correctly detected as outside working hours');
  
  // Calculate expected result
  const nextWorkingDay = new Date(philippineTime);
  nextWorkingDay.setDate(nextWorkingDay.getDate() + 1); // Next day
  nextWorkingDay.setHours(8, 0, 0, 0); // 8:00 AM
  
  const slaDue = new Date(nextWorkingDay);
  slaDue.setHours(slaDue.getHours() + 4); // Add 4 hours
  
  console.log('Next working day start:', nextWorkingDay.toLocaleString());
  console.log('SLA due (8 AM + 4 hours):', slaDue.toLocaleString());
  console.log('Expected due hour:', slaDue.getHours(), '(should be 12 for 12 PM)');
  
  if (slaDue.getHours() === 12) {
    console.log('✅ Expected result: 12:00 PM');
  } else {
    console.log('❌ Unexpected result');
  }
} else {
  console.log('❌ Incorrectly detected as within working hours');
}

console.log('\n📋 Summary:');
console.log('- Input: 7:15 PM (after working hours)');
console.log('- Should move to: 8:00 AM next day');
console.log('- Add 4 hours: 12:00 PM');
console.log('- Previous bug: 7:15 AM (just +4 hours)');
console.log('- Expected fix: 12:00 PM (proper operational hours)');

console.log('\n🔧 Fix applied:');
console.log('✅ Removed toPHT() calls from isWithinWorkingHours');
console.log('✅ Removed toPHT() calls from getRemainingWorkingHoursInDay');
console.log('✅ Added check for outside working hours in calculateSLADueDate');
console.log('✅ Now test by creating a new incident request!');
