// Test the getNextWorkingDayStart function logic
const testTime = new Date('2025-08-29T03:06:48'); // 3:06 AM Friday

console.log('🧪 Testing getNextWorkingDayStart function...');
console.log('Input time:', testTime.toString());
console.log('Input hour:', testTime.getHours());
console.log('Day of week:', testTime.getDay(), '(5 = Friday)');

// Mock operational hours
const mockOperationalHours = {
  workingTimeType: 'operational-hours',
  standardStartTime: '08:00',
  standardEndTime: '18:00',
  workingDays: [
    { dayOfWeek: 1, isEnabled: true, scheduleType: 'standard' }, // Monday
    { dayOfWeek: 2, isEnabled: true, scheduleType: 'standard' }, // Tuesday
    { dayOfWeek: 3, isEnabled: true, scheduleType: 'standard' }, // Wednesday
    { dayOfWeek: 4, isEnabled: true, scheduleType: 'standard' }, // Thursday
    { dayOfWeek: 5, isEnabled: true, scheduleType: 'standard' }, // Friday
    { dayOfWeek: 6, isEnabled: true, scheduleType: 'custom', customStartTime: '08:00', customEndTime: '12:00' }, // Saturday
    { dayOfWeek: 0, isEnabled: false, scheduleType: 'not-set' }, // Sunday
  ]
};

// Simulate the getNextWorkingDayStart function logic
function testGetNextWorkingDayStart(phtDate, operationalHours) {
  console.log('\n--- Testing getNextWorkingDayStart logic ---');
  
  let nextDay = new Date(phtDate);
  
  const currentTime = phtDate.toTimeString().slice(0, 5); // "HH:MM"
  const dayOfWeek = phtDate.getDay();
  
  console.log('Current time string:', currentTime);
  console.log('Day of week:', dayOfWeek);
  
  const workingDay = operationalHours.workingDays.find(
    (day) => day.dayOfWeek === dayOfWeek
  );
  
  console.log('Working day config:', workingDay);
  
  let startTime = '08:00';
  if (workingDay && workingDay.isEnabled && workingDay.scheduleType !== 'not-set') {
    if (workingDay.scheduleType === 'custom') {
      startTime = workingDay.customStartTime || '08:00';
    } else {
      startTime = operationalHours.standardStartTime || '08:00';
    }
    
    console.log('Start time for today:', startTime);
    console.log('Current time:', currentTime);
    console.log('Is current time < start time?', currentTime < startTime);
    
    // If it's before working hours today and today is a working day, use today
    if (currentTime < startTime) {
      const [sh, sm] = startTime.split(':').map(n => parseInt(n, 10));
      nextDay.setHours(sh, sm, 0, 0);
      console.log('Using today at', startTime);
      console.log('Result:', nextDay.toString());
      return nextDay;
    }
  }
  
  console.log('Need to find next working day...');
  // Otherwise, find next working day
  for (let i = 1; i <= 7; i++) {
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayOfWeek = nextDay.getDay();
    
    const nextWorkingDay = operationalHours.workingDays.find(
      (day) => day.dayOfWeek === nextDayOfWeek
    );
    
    if (nextWorkingDay && nextWorkingDay.isEnabled && nextWorkingDay.scheduleType !== 'not-set') {
      // Found next working day
      if (nextWorkingDay.scheduleType === 'custom') {
        startTime = nextWorkingDay.customStartTime || '08:00';
      } else {
        startTime = operationalHours.standardStartTime || '08:00';
      }
      
      const [sh, sm] = startTime.split(':').map(n => parseInt(n, 10));
      nextDay.setHours(sh, sm, 0, 0);
      console.log('Found next working day:', nextDay.toString());
      return nextDay;
    }
  }
  
  // Fallback to 8 AM next day if no working day found
  nextDay.setHours(8, 0, 0, 0);
  console.log('Fallback:', nextDay.toString());
  return nextDay;
}

const result = testGetNextWorkingDayStart(testTime, mockOperationalHours);
console.log('\nFinal result:', result.toString());
console.log('Result hour:', result.getHours());

if (result.getHours() === 8) {
  console.log('✅ getNextWorkingDayStart correctly returns 8:00 AM');
  console.log('✅ Now we need to add 4 hours: 8:00 AM + 4 = 12:00 PM');
} else {
  console.log('❌ getNextWorkingDayStart returns incorrect hour:', result.getHours());
}

console.log('\n🤔 If both functions are working correctly, why is the API still showing 7:06 AM?');
console.log('🔍 Let me check the actual SLA calculation in the API route...');
