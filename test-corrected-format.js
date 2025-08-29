// Test the corrected SLA calculation with Philippine time format
const fs = require('fs');
const path = require('path');

// Read and execute the TypeScript file as text (since we can't import TS directly)
const slaCalculatorPath = path.join(__dirname, 'lib', 'sla-calculator.ts');
const slaCalculatorContent = fs.readFileSync(slaCalculatorPath, 'utf8');

// Extract the functions we need - this is a simplified test
console.log('SLA Calculator file exists:', fs.existsSync(slaCalculatorPath));

// Test case: 16-hour SLA starting at 7:48 PM (outside working hours)
// Should start the next working day at 8:00 AM

const slaStartAtPH = "2025-08-29 03:48:38"; // This is what we'll save now (PH format, no Z)
const slaHours = 16;

console.log('=== Testing with corrected PH format (no Z suffix) ===');
console.log('SLA Start (PH format):', slaStartAtPH);
console.log('SLA Hours:', slaHours);
console.log('');

try {
  const dueDate = calculateSLADueDate(slaStartAtPH, slaHours);
  console.log('✅ Calculated Due Date:', dueDate.toISOString());
  console.log('✅ Due Date (PH time):', dueDate.toLocaleString('en-PH', { 
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }));
  
  // This should now be August 29th (Thursday) + 16 hours = August 30th afternoon
  console.log('Expected: Should be around August 30th afternoon (Friday)');
} catch (error) {
  console.error('❌ Error:', error.message);
}
