// Test timezone conversion methods
const now = new Date();
console.log('=== TIMEZONE CONVERSION TEST ===');
console.log('1. Raw Date():', now.toString());
console.log('2. UTC ISO:', now.toISOString());

// Method 1 - Current (wrong)
const method1 = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
console.log('3. Method 1 (current):', method1.toString());

// Method 2 - Correct UTC offset
const method2 = new Date(now.getTime() + (8 * 60 * 60 * 1000));
console.log('4. Method 2 (UTC+8):', method2.toString());

// Method 3 - Proper locale conversion
const method3 = new Date(now.toLocaleString('en-CA', { timeZone: 'Asia/Manila', hour12: false }));
console.log('5. Method 3 (locale):', method3.toString());

// Test what time it actually is in Manila right now
const manilaTime = now.toLocaleString('en-PH', { 
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
});
console.log('6. Manila time string:', manilaTime);
console.log('===============================');
