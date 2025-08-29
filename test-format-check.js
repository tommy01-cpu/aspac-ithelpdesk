// Test the exact format that should be saved
const startTime = new Date('2025-08-28T20:02:14.821Z');

console.log('Input UTC time:', startTime.toISOString());
console.log('');

// This is the exact same formatting code from the SLA assignment route
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

console.log('Should be saved as slaStartAt:', slaStartAtPH);
console.log('Your data shows:', '2025-08-28T20:02:14.821Z');
console.log('');
console.log('Check:');
console.log('- Has T?', slaStartAtPH.includes('T') ? 'YES (BAD)' : 'NO (GOOD)');
console.log('- Has Z?', slaStartAtPH.includes('Z') ? 'YES (BAD)' : 'NO (GOOD)');
console.log('- Format correct?', slaStartAtPH.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/) ? 'YES' : 'NO');
