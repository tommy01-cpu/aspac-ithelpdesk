// Test import of componentsToWorkingHours
const { componentsToWorkingHours, getOperationalHours, getDailyWorkingMinutes } = require('./lib/sla-calculator.ts');

console.log('Testing import...');
console.log('componentsToWorkingHours:', typeof componentsToWorkingHours);
console.log('getOperationalHours:', typeof getOperationalHours);
console.log('getDailyWorkingMinutes:', typeof getDailyWorkingMinutes);
