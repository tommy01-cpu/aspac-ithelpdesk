console.log('Testing UPDATED navigation URLs with technician ID...');

// Test 1: My Assigned Requests (Current User)
const params1 = new URLSearchParams();
params1.set('assignedToCurrentUser', 'true');
params1.set('status', 'on_hold,open');
const myAssignedUrl = `/technician/requests?${params1.toString()}`;
console.log('My Assigned Requests URL:', myAssignedUrl);

// Test 2: Technician On-Hold Requests by ID
const params2 = new URLSearchParams();
params2.set('assignedTechnicianId', '5'); // Jonel's ID
params2.set('status', 'on_hold');
const techOnHoldUrl = `/technician/requests?${params2.toString()}`;
console.log('Technician On-Hold URL (ID=5):', techOnHoldUrl);

// Test 3: Technician Open Requests by ID
const params3 = new URLSearchParams();
params3.set('assignedTechnicianId', '5'); // Jonel's ID
params3.set('status', 'open');
const techOpenUrl = `/technician/requests?${params3.toString()}`;
console.log('Technician Open URL (ID=5):', techOpenUrl);

// Test 4: Unassigned requests
const params4 = new URLSearchParams();
params4.set('assignedTechnicianId', 'unassigned');
params4.set('status', 'on_hold');
const unassignedUrl = `/technician/requests?${params4.toString()}`;
console.log('Unassigned Requests URL:', unassignedUrl);

console.log('\nExpected results:');
console.log('- My Assigned: assignedToCurrentUser=true&status=on_hold,open');
console.log('- Technician Specific: assignedTechnicianId=5&status=on_hold');
console.log('- More reliable filtering using IDs instead of names');
console.log('- Unassigned: assignedTechnicianId=unassigned');
