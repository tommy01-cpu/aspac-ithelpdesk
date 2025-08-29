// Test script to check if there's any filtering logic applied to history entries
// This simulates what might be happening in the frontend

const sampleHistory = [
  {
    "id": "1614",
    "action": "WorkLog Added",
    "details": "Owner: Jose Tommy Mandapat\nTime Taken: 01 hr 00 min",
    "timestamp": "2025-08-29 21:17:46.244",
    "actor": "Jose Tommy Mandapat",
    "actorName": "Jose Tommy Mandapat",
    "actorType": "technician",
    "actorId": 1
  },
  {
    "id": "1611",
    "action": "WorkLog Deleted",
    "details": "Owner: Jose Tommy Mandapat",
    "timestamp": "2025-08-29 21:12:33.998",
    "actor": "Jose Tommy Mandapat",
    "actorName": "Jose Tommy Mandapat",
    "actorType": "technician",
    "actorId": 1
  },
  {
    "id": "1608",
    "action": "WorkLog Added",
    "details": "Owner: Jose Tommy Mandapat\nTime Taken: 01 hr 00 min",
    "timestamp": "2025-08-29 21:06:42.351",
    "actor": "Jose Tommy Mandapat",
    "actorName": "Jose Tommy Mandapat",
    "actorType": "technician",
    "actorId": 1
  }
];

console.log('=== TESTING POSSIBLE FILTERING SCENARIOS ===\n');

// Test 1: Check for any string-based filtering
console.log('1. Basic action filtering:');
console.log('All entries:', sampleHistory.length);
console.log('WorkLog Added entries:', sampleHistory.filter(h => h.action === 'WorkLog Added').length);
console.log('WorkLog Deleted entries:', sampleHistory.filter(h => h.action === 'WorkLog Deleted').length);
console.log('');

// Test 2: Check case sensitivity
console.log('2. Case sensitivity test:');
console.log('Case-sensitive "WorkLog Added":', sampleHistory.filter(h => h.action === 'WorkLog Added').length);
console.log('Case-insensitive "worklog added":', sampleHistory.filter(h => h.action.toLowerCase().includes('worklog added')).length);
console.log('');

// Test 3: Check for exclusion patterns
console.log('3. Potential exclusion patterns:');
console.log('Entries NOT containing "Added":', sampleHistory.filter(h => !h.action.includes('Added')).length);
console.log('Entries containing "Deleted":', sampleHistory.filter(h => h.action.includes('Deleted')).length);
console.log('');

// Test 4: Check for word boundary issues
console.log('4. Word boundary checks:');
console.log('Exact "WorkLog Added":', sampleHistory.filter(h => h.action === 'WorkLog Added').length);
console.log('Contains "WorkLog":', sampleHistory.filter(h => h.action.includes('WorkLog')).length);
console.log('Contains "Added":', sampleHistory.filter(h => h.action.includes('Added')).length);
console.log('');

// Test 5: Check for any hidden characters or formatting issues
console.log('5. Character analysis:');
sampleHistory.forEach(entry => {
  console.log(`ID ${entry.id}: "${entry.action}" (length: ${entry.action.length})`);
  console.log(`  Char codes: [${Array.from(entry.action).map(c => c.charCodeAt(0)).join(', ')}]`);
});
