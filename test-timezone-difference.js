// Simple test to show the difference between timezone formats
console.log('=== Testing Timezone Format Impact ===');

const utcWithZ = "2025-08-28T19:48:38.328Z";      // What you currently have
const phFormat = "2025-08-29 03:48:38";            // What we'll save now

console.log('1. Current format (UTC with Z):', utcWithZ);
console.log('   Parsed as Date:', new Date(utcWithZ));
console.log('   Day of week:', new Date(utcWithZ).getDay(), '(0=Sunday, 1=Monday, ... 6=Saturday)');
console.log('');

console.log('2. New format (PH time, no Z):', phFormat);
console.log('   Parsed as Date:', new Date(phFormat));
console.log('   Day of week:', new Date(phFormat).getDay(), '(0=Sunday, 1=Monday, ... 6=Saturday)');
console.log('');

console.log('=== Analysis ===');
console.log('UTC format:', utcWithZ, '→ Date object sees it as', new Date(utcWithZ).toLocaleDateString());
console.log('PH format: ', phFormat, '→ Date object sees it as', new Date(phFormat).toLocaleDateString());
console.log('');

// Test what day of week each format produces
const utcDate = new Date(utcWithZ);
const phDate = new Date(phFormat);

console.log('UTC day (in local browser time):', utcDate.getDay());
console.log('PH day (treated as local time):  ', phDate.getDay());
console.log('');

// Check if it's a working day (Monday=1 to Friday=5)
const isWorkingDay = (dayOfWeek) => dayOfWeek >= 1 && dayOfWeek <= 5;
console.log('UTC format → Working day?', isWorkingDay(utcDate.getDay()));
console.log('PH format  → Working day?', isWorkingDay(phDate.getDay()));

console.log('');
console.log('Expected fix: PH format should properly identify the working day');
console.log('and calculate SLA from the correct starting point.');
