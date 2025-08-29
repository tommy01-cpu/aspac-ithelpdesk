// Test if our isWithinWorkingHours function is working correctly
const testTime = new Date('2025-08-29T03:06:48'); // 3:06 AM

console.log('🧪 Testing isWithinWorkingHours function...');
console.log('Test time:', testTime.toString());
console.log('Test time hour:', testTime.getHours());

// Mock operational hours to match our system
const mockOperationalHours = {
  workingTimeType: 'operational-hours',
  standardStartTime: '08:00',
  standardEndTime: '18:00',
  workingDays: [
    { dayOfWeek: 1, isEnabled: true, scheduleType: 'standard', breakHours: [{ startTime: '12:00', endTime: '13:00' }] }, // Monday
    { dayOfWeek: 2, isEnabled: true, scheduleType: 'standard', breakHours: [{ startTime: '12:00', endTime: '13:00' }] }, // Tuesday
    { dayOfWeek: 3, isEnabled: true, scheduleType: 'standard', breakHours: [{ startTime: '12:00', endTime: '13:00' }] }, // Wednesday
    { dayOfWeek: 4, isEnabled: true, scheduleType: 'standard', breakHours: [{ startTime: '12:00', endTime: '13:00' }] }, // Thursday
    { dayOfWeek: 5, isEnabled: true, scheduleType: 'standard', breakHours: [{ startTime: '12:00', endTime: '13:00' }] }, // Friday
    { dayOfWeek: 6, isEnabled: true, scheduleType: 'custom', customStartTime: '08:00', customEndTime: '12:00', breakHours: [] }, // Saturday
    { dayOfWeek: 0, isEnabled: false, scheduleType: 'not-set', breakHours: [] }, // Sunday
  ]
};

// Simulate the isWithinWorkingHours function logic
function testIsWithinWorkingHours(date, operationalHours) {
  console.log('\n--- Testing isWithinWorkingHours logic ---');
  
  // Mock toPHT function (assume it returns the same date for now)
  const pht = new Date(date);
  const dayOfWeek = pht.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  const timeString = pht.toTimeString().slice(0, 5); // "HH:MM"
  
  console.log('Day of week:', dayOfWeek, '(0=Sun, 1=Mon, ..., 6=Sat)');
  console.log('Time string:', timeString);
  
  // If it's round-the-clock, always return true
  if (operationalHours.workingTimeType === 'round-clock') {
    console.log('Round-the-clock mode: true');
    return true;
  }
  
  // Find working day configuration
  const workingDay = operationalHours.workingDays.find(
    (day) => day.dayOfWeek === dayOfWeek
  );
  
  console.log('Working day config:', workingDay);
  
  // If day is not enabled, it's not working hours
  if (!workingDay || !workingDay.isEnabled || workingDay.scheduleType === 'not-set') {
    console.log('Day not enabled or not set: false');
    return false;
  }
  
  // Get working hours for the day
  let startTime;
  let endTime;
  
  if (workingDay.scheduleType === 'custom') {
    startTime = workingDay.customStartTime || '08:00';
    endTime = workingDay.customEndTime || '18:00';
  } else {
    startTime = operationalHours.standardStartTime || '08:00';
    endTime = operationalHours.standardEndTime || '18:00';
  }
  
  console.log('Working hours:', startTime, '-', endTime);
  
  // Check if current time is within working hours
  if (timeString < startTime || timeString >= endTime) {
    console.log(`Time ${timeString} is outside working hours ${startTime}-${endTime}: false`);
    return false;
  }
  
  // Check if current time is within break hours
  const breakHours = workingDay.breakHours || [];
  for (const breakHour of breakHours) {
    if (timeString >= breakHour.startTime && timeString < breakHour.endTime) {
      console.log(`Time ${timeString} is within break ${breakHour.startTime}-${breakHour.endTime}: false`);
      return false;
    }
  }
  
  console.log('Time is within working hours: true');
  return true;
}

const isWithin = testIsWithinWorkingHours(testTime, mockOperationalHours);
console.log('\nResult:', isWithin);

if (!isWithin) {
  console.log('✅ Function correctly detects 3:06 AM is outside working hours');
  console.log('✅ Our fix should trigger and move to next working period');
} else {
  console.log('❌ Function incorrectly thinks 3:06 AM is within working hours');
  console.log('❌ This explains why our fix is not working');
}

console.log('\n🔧 Expected fix behavior:');
console.log('1. isWithinWorkingHours(3:06 AM) should return false');
console.log('2. getNextWorkingDayStart() should return 8:00 AM same day');
console.log('3. addWorkingHours(8:00 AM, 4 hours) should return 12:00 PM');

// Test what day Thursday is
const thursday = new Date('2025-08-29'); // August 29, 2025
console.log('\nThursday test:');
console.log('Date:', thursday.toString());
console.log('Day of week:', thursday.getDay()); // Should be 4 for Thursday
