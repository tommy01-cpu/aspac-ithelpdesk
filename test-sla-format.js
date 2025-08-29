// Test what format slaStartAt is actually being saved as
const startTime = new Date('2025-08-28T19:48:38.328Z');

// This is what should be saved (matching the code in sla-assignment route)
const slaStartAtPH = startTime.toLocaleString('en-PH', { 
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: '2-digit', 
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
}).replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/, '$3-$1-$2 $4:$5:$6');

console.log('Original UTC time:', startTime.toISOString());
console.log('Should be saved as (PH format):', slaStartAtPH);
console.log('Your data shows:', '2025-08-28T19:48:38.328Z');
console.log('');
console.log('Problem: Your data still has the Z suffix, which means:');
console.log('1. Either the frontend is not saving the formatted version');
console.log('2. Or the data is getting converted back to ISO somewhere');
console.log('3. Or you\'re looking at a different field (like updatedAt or createdAt)');
