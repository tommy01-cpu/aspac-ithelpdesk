console.log('🗓️ Checking what day August 30, 2025 actually is...');

const date1 = new Date('2025-08-30'); // Without time
const date2 = new Date('2025-08-30T10:13:41'); // With time but no timezone
const date3 = new Date('2025-08-30T10:13:41+08:00'); // With Philippine timezone

console.log('\nDifferent date interpretations:');
console.log('Date("2025-08-30"):', date1.toDateString(), '- Day of week:', date1.getDay(), '(' + ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date1.getDay()] + ')');
console.log('Date("2025-08-30T10:13:41"):', date2.toDateString(), '- Day of week:', date2.getDay(), '(' + ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date2.getDay()] + ')');
console.log('Date("2025-08-30T10:13:41+08:00"):', date3.toDateString(), '- Day of week:', date3.getDay(), '(' + ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date3.getDay()] + ')');

console.log('\nActual calendar check:');
console.log('August 30, 2025 is a:', new Date('2025-08-30T12:00:00+08:00').toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Manila' }));

console.log('\nThe stored SLA start time from database: "2025-08-30 10:13:41"');
console.log('When parsed as Date("2025-08-30 10:13:41"), it becomes:');
const storedDate = new Date('2025-08-30 10:13:41');
console.log('- UTC time:', storedDate.toISOString());
console.log('- Day of week:', storedDate.getDay(), '(' + ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][storedDate.getDay()] + ')');
console.log('- Local time zone:', storedDate.toString());

console.log('\n🔍 TIMEZONE BUG DETECTED:');
console.log('The date string "2025-08-30 10:13:41" without timezone info');
console.log('is being interpreted as UTC time, which shifts the day!');
console.log('August 30, 2025 is actually a FRIDAY, not Saturday!');
