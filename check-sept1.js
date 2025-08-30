console.log('🗓️ Checking what day September 1, 2025 actually is...');

const sept1 = new Date('2025-09-01');
console.log('September 1, 2025 is a:', sept1.toLocaleDateString('en-US', { weekday: 'long' }));
console.log('Day of week number:', sept1.getDay(), '(0=Sunday, 1=Monday, etc.)');

const aug30 = new Date('2025-08-30');
console.log('August 30, 2025 is a:', aug30.toLocaleDateString('en-US', { weekday: 'long' }));
console.log('Day of week number:', aug30.getDay());

console.log('\nSo the calculation is:');
console.log('- Start: Saturday Aug 30 at 10:57 AM');
console.log('- Due: Monday Sep 1 at 12:00 PM');
console.log('- This means it IS going to the correct next working day (Monday)');
console.log('- But the TIME is wrong (should be ~10:57 AM, not 12:00 PM)');
