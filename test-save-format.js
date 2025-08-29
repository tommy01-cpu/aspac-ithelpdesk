// Test the exact format that should be saved
const startTime = new Date(); // Current time

console.log('=== WHAT SHOULD BE SAVED ===');

// This is what the SLA assignment route SHOULD save
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

const slaCalculatedAtPH = startTime.toLocaleString('en-PH', { 
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: '2-digit', 
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
}).replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/, '$3-$1-$2 $4:$5:$6');

const assignedDatePH = startTime.toLocaleString('en-PH', { 
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
console.log('slaStartAt should be:', slaStartAtPH);
console.log('slaCalculatedAt should be:', slaCalculatedAtPH);
console.log('assignedDate should be:', assignedDatePH);
console.log('');
console.log('=== WHAT YOU CURRENTLY SEE (WRONG) ===');
console.log('slaStartAt: "2025-08-28T19:48:38.328Z"');
console.log('slaCalculatedAt: "2025-08-28T19:48:38.328Z"');
console.log('assignedDate: "2025-08-28T19:48:38.328Z"');
console.log('');
console.log('Problem: The Z suffix means these are still in UTC/ISO format');
console.log('Solution: These should be in PH format without T and Z like shown above');
