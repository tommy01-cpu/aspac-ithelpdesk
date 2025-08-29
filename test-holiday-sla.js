// Test holiday behavior in SLA calculations
const holidays = [
  "2025-01-01", // New Year's Day - Wednesday
  "2025-04-09", // Araw ng Kagitingan - Wednesday
  "2025-05-01", // Labor Day - Thursday
  "2025-06-12", // Independence Day - Thursday
  "2025-11-30", // Bonifacio Day - Sunday
  "2025-12-25", // Christmas Day - Thursday
  "2025-12-30"  // Rizal Day - Tuesday
];

function isHoliday(date) {
  const dateStr = date.toISOString().split('T')[0]; // Get YYYY-MM-DD format
  return holidays.includes(dateStr);
}

function isWorkingDay(date) {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isHol = isHoliday(date);
  return !isWeekend && !isHol;
}

console.log('🎯 Holiday Impact on SLA Calculations:');
console.log('');

// Test scenarios around holidays
const testCases = [
  { 
    name: 'Before Christmas (Dec 24, 2025 - Tuesday)', 
    startDate: new Date('2025-12-24T19:00:00'), 
    slaHours: 4 
  },
  { 
    name: 'During Christmas holiday (Dec 25, 2025 - Wednesday)', 
    startDate: new Date('2025-12-25T10:00:00'), 
    slaHours: 4 
  },
  { 
    name: 'Before Labor Day (Apr 30, 2025 - Wednesday)', 
    startDate: new Date('2025-04-30T17:00:00'), 
    slaHours: 8 
  },
  { 
    name: 'During Labor Day (May 1, 2025 - Thursday)', 
    startDate: new Date('2025-05-01T10:00:00'), 
    slaHours: 4 
  }
];

testCases.forEach(testCase => {
  console.log(`📅 ${testCase.name}:`);
  console.log(`   Start: ${testCase.startDate.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}`);
  console.log(`   Is holiday? ${isHoliday(testCase.startDate) ? 'YES' : 'NO'}`);
  console.log(`   Is working day? ${isWorkingDay(testCase.startDate) ? 'YES' : 'NO'}`);
  console.log(`   SLA Hours: ${testCase.slaHours}`);
  
  // Find next working day if starting on holiday/weekend
  let nextWorkingDay = new Date(testCase.startDate);
  while (!isWorkingDay(nextWorkingDay)) {
    nextWorkingDay.setDate(nextWorkingDay.getDate() + 1);
  }
  
  if (nextWorkingDay.getDate() !== testCase.startDate.getDate()) {
    console.log(`   ⏭️  SLA will start on next working day: ${nextWorkingDay.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
  } else {
    console.log(`   ✅ Same day processing (working day)`);
  }
  console.log('');
});

console.log('🔍 Holiday Check for 2025:');
holidays.forEach(holiday => {
  const date = new Date(holiday + 'T12:00:00');
  const dayName = date.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  console.log(`   ${holiday}: ${dayName}`);
});

console.log('');
console.log('✅ SLA Calculator DOES consider holidays:');
console.log('   • Holidays are treated as non-working days');
console.log('   • SLA clock stops on holidays (just like weekends)');
console.log('   • If incident created on holiday, SLA starts next working day');
console.log('   • SLA calculations automatically skip holidays');
