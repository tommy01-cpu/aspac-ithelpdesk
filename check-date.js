// Check what day Aug 12, 2025 is
const date = new Date(); // 7:13 PM Philippine time
console.log('Date:', date.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }));
console.log('Philippine time:', date.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
console.log('Day of week:', date.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', weekday: 'long' }));
console.log('Day number:', new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Manila' })).getDay());


