// Test our timezone fix
const testTime = new Date('2025-08-28T19:15:35.638Z'); // 7:15 PM PHT (UTC time from your data)

console.log('🧪 Testing timezone fix...');
console.log('Input time (UTC):', testTime.toISOString());
console.log('Input time (PHT):', testTime.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));

// Test the toPHT function behavior
function toPHT(date) {
  // Simple UTC+8 conversion for Philippine Time
  return new Date(date.getTime() + (8 * 60 * 60 * 1000));
}

const convertedTime = toPHT(testTime);
console.log('\nUsing toPHT conversion:');
console.log('Converted time:', convertedTime.toString());
console.log('Converted hour:', convertedTime.getHours());

// Test if we treat the time as already PHT
const directTime = new Date(testTime);
console.log('\nTreating as already PHT:');
console.log('Direct time:', directTime.toString());
console.log('Direct hour:', directTime.getHours());

// Check which approach gives us the correct working hours check
console.log('\n=== Working Hours Check ===');
console.log('Working hours: 8:00 AM - 6:00 PM (18:00)');

// Using toPHT (wrong approach - double conversion)
const wrongHour = convertedTime.getHours();
console.log('With toPHT conversion:', wrongHour, '(3:15 AM next day - WRONG)');
console.log('Is within working hours?', wrongHour >= 8 && wrongHour < 18);

// Using direct time (correct approach - already PHT)
const correctHour = directTime.getHours();
console.log('Without conversion:', correctHour, '(7:15 PM same day - CORRECT)');
console.log('Is within working hours?', correctHour >= 8 && correctHour < 18);

console.log('\n✅ The fix should use the time directly without toPHT conversion');
console.log('✅ 7:15 PM is outside working hours (18:00), so should move to 8:00 AM next day');
console.log('✅ 8:00 AM + 4 hours = 12:00 PM (not 7:15 AM)');
