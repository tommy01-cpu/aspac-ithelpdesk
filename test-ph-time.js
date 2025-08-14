// Test Philippine time formatting
const testDate = new Date();

console.log('Original Date:', testDate);
console.log('ISO String (with Z):', testDate.toISOString());

// Test the Philippine time formatting
const slaStartAtPH = testDate.toLocaleString('en-PH', { 
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: '2-digit', 
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
}).replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/, '$3-$1-$2 $4:$5:$6');

console.log('Philippine Time (formatted):', slaStartAtPH);

// Test with a specific date
const specificDate = new Date('2025-08-14T10:30:00Z');
console.log('\nSpecific Date Test:');
console.log('Original:', specificDate.toISOString());

const specificPH = specificDate.toLocaleString('en-PH', { 
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: '2-digit', 
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
}).replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/, '$3-$1-$2 $4:$5:$6');

console.log('Philippine formatted:', specificPH);
