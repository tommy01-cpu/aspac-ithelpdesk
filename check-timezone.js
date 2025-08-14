console.log('Server timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log('Current time:', new Date().toString());
console.log('UTC time:', new Date().toISOString());
console.log('Local time:', new Date().toLocaleString());
console.log('Local time (PH format):', new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }));

// Test what happens with manual +8 hours
const now = new Date();
const manualPH = new Date(now.getTime() + (8 * 60 * 60 * 1000));
console.log('Manual +8 hours:', manualPH.toString());
console.log('Manual +8 hours ISO:', manualPH.toISOString());
