// Check the SLA calculation result from the logs
const slaStartUTC = new Date('2025-08-28T19:06:48.792Z'); // Start time UTC
const slaDueUTC = new Date('2025-08-28T23:06:48.792Z');   // Due time UTC

console.log('=== SLA CALCULATION RESULT ANALYSIS ===');
console.log('Start time (UTC):', slaStartUTC.toISOString());
console.log('Start time (PHT):', slaStartUTC.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));

console.log('\nDue time (UTC):', slaDueUTC.toISOString());
console.log('Due time (PHT):', slaDueUTC.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));

console.log('\nTime analysis:');
const startHourPHT = parseInt(slaStartUTC.toLocaleString('en-US', { timeZone: 'Asia/Manila', hour12: false }).split(' ')[1].split(':')[0]);
const dueHourPHT = parseInt(slaDueUTC.toLocaleString('en-US', { timeZone: 'Asia/Manila', hour12: false }).split(' ')[1].split(':')[0]);

console.log('Start hour (PHT):', startHourPHT);
console.log('Due hour (PHT):', dueHourPHT);

console.log('\n=== RESULT ===');
if (startHourPHT === 3 && dueHourPHT === 7) {
  console.log('❌ BUG STILL EXISTS: 3:06 AM + 4 hours = 7:06 AM');
  console.log('   The fix did not work - it just added 4 hours to the creation time');
  console.log('   Expected: Should move to 8:00 AM then add 4 hours = 12:00 PM');
} else if (dueHourPHT === 12) {
  console.log('✅ FIX WORKS: Due date shows 12:xx PM');
  console.log('   The SLA calculator correctly moved to working hours');
} else {
  console.log(`❓ UNEXPECTED: Due hour is ${dueHourPHT}`);
  console.log('   Need to investigate further');
}

console.log('\n🔍 Issue Analysis:');
console.log('The request was created at 3:06 AM (after working hours)');
console.log('Working hours: 8:00 AM - 6:00 PM');
console.log('Expected behavior:');
console.log('1. 3:06 AM is before working hours (< 8:00 AM)');
console.log('2. Should move to 8:00 AM (next working period)');
console.log('3. Add 4 hours: 8:00 AM + 4 hours = 12:00 PM');
console.log('4. Due date should be 12:00 PM same day');

if (dueHourPHT === 7) {
  console.log('\n🚨 The fix needs adjustment for BEFORE working hours case');
  console.log('Current logic may only handle AFTER working hours (> 6 PM)');
  console.log('Need to also handle BEFORE working hours (< 8 AM)');
}
