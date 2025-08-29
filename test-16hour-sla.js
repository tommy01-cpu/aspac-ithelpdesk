// Test the 16-hour SLA calculation scenario

// Convert the TS file content to test the logic
const startTime = new Date('2025-08-28T19:48:38.328Z');
const slaHours = 16;

console.log('=== 16-Hour SLA Test ===');
console.log('Start Time (UTC):', startTime.toISOString());
console.log('Start Time (PHT):', startTime.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }));
console.log('SLA Hours:', slaHours);
console.log('');

// Manual calculation logic based on our implemented rules
function toPHT(date) {
  return new Date(date.getTime());
}

function isWithinWorkingHours(date) {
  const phtDate = toPHT(date);
  const hour = phtDate.getHours();
  const minute = phtDate.getMinutes();
  const timeInMinutes = hour * 60 + minute;
  
  // Working hours: 8:00 AM to 6:00 PM (480 to 1080 minutes)
  // Excluding lunch break: 12:00 PM to 1:00 PM (720 to 780 minutes)
  const workStart = 8 * 60; // 480 minutes (8:00 AM)
  const workEnd = 18 * 60;   // 1080 minutes (6:00 PM)
  const lunchStart = 12 * 60; // 720 minutes (12:00 PM)
  const lunchEnd = 13 * 60;   // 780 minutes (1:00 PM)
  
  if (timeInMinutes < workStart || timeInMinutes >= workEnd) {
    return false; // Outside working hours
  }
  
  if (timeInMinutes >= lunchStart && timeInMinutes < lunchEnd) {
    return false; // During lunch break
  }
  
  // Check if it's a weekday (Monday = 1, Sunday = 0)
  const dayOfWeek = phtDate.getDay();
  return dayOfWeek >= 1 && dayOfWeek <= 5;
}

function getNextWorkingDayStart(date) {
  const phtDate = toPHT(date);
  let nextDay = new Date(phtDate);
  
  do {
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(8, 0, 0, 0); // 8:00 AM
  } while (!isWithinWorkingHours(nextDay));
  
  return nextDay;
}

function addWorkingHoursToTimePHT(startTime, hoursToAdd) {
  if (hoursToAdd <= 0) return startTime;
  
  let currentTime = new Date(startTime);
  let minutesToAdd = hoursToAdd * 60;
  
  while (minutesToAdd > 0) {
    // If outside working hours, jump to next working period
    if (!isWithinWorkingHours(currentTime)) {
      const nextWorkStart = getNextWorkingDayStart(currentTime);
      currentTime = nextWorkStart;
      continue;
    }
    
    // Calculate how much time we can add in current working period
    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();
    const currentMinutes = hour * 60 + minute;
    
    let nextBreakMinutes;
    
    // Determine next break or end of day
    if (currentMinutes < 12 * 60) { // Before lunch
      nextBreakMinutes = 12 * 60; // Lunch at 12:00 PM
    } else { // After lunch (13:00-18:00)
      nextBreakMinutes = 18 * 60; // End of day at 6:00 PM
    }
    
    const minutesUntilBreak = nextBreakMinutes - currentMinutes;
    const minutesToAddNow = Math.min(minutesToAdd, minutesUntilBreak);
    
    // Add the minutes
    currentTime.setMinutes(currentTime.getMinutes() + minutesToAddNow);
    minutesToAdd -= minutesToAddNow;
    
    // If we hit a break and still have time to add
    if (minutesToAdd > 0 && minutesToAddNow === minutesUntilBreak) {
      if (currentMinutes < 12 * 60) {
        // Hit lunch break, jump to 1:00 PM
        currentTime.setHours(13, 0, 0, 0);
      } else {
        // Hit end of day, jump to next working day
        currentTime = getNextWorkingDayStart(currentTime);
      }
    }
  }
  
  return currentTime;
}

// Test the calculation
console.log('Is start time within working hours?', isWithinWorkingHours(startTime));

if (!isWithinWorkingHours(startTime)) {
  const nextStart = getNextWorkingDayStart(startTime);
  console.log('Next working day starts at (PHT):', nextStart.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }));
  
  const dueDate = addWorkingHoursToTimePHT(nextStart, slaHours);
  console.log('Due date (PHT):', dueDate.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }));
  console.log('Due date (UTC):', dueDate.toISOString());
} else {
  const dueDate = addWorkingHoursToTimePHT(startTime, slaHours);
  console.log('Due date (PHT):', dueDate.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }));
  console.log('Due date (UTC):', dueDate.toISOString());
}

console.log('');
console.log('=== Expected Calculation ===');
console.log('Start: Aug 28, 7:48 PM (outside working hours)');
console.log('Next working day: Aug 29, 8:00 AM');
console.log('Working hours per day: 9 hours (8AM-12PM + 1PM-6PM)');
console.log('16 hours = 1 day (9 hours) + 7 additional hours');
console.log('After first day: Aug 29, 6:00 PM');
console.log('Second day start: Aug 30, 8:00 AM');
console.log('After 7 more hours: Aug 30, 4:00 PM');
console.log('Expected: Aug 30, 4:00 PM');
