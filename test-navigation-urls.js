console.log('Testing navigation URLs...');

// Test 1: My Assigned Requests
const params1 = new URLSearchParams();
params1.set('assignedToMe', 'true');
params1.set('status', 'on_hold,open');
const myAssignedUrl = `/technician/requests?${params1.toString()}`;
console.log('My Assigned Requests URL:', myAssignedUrl);

// Test 2: Technician On-Hold Requests
const params2 = new URLSearchParams();
params2.set('assignedTo', 'Jonel Calimlim');
params2.set('status', 'on_hold');
const techOnHoldUrl = `/technician/requests?${params2.toString()}`;
console.log('Technician On-Hold URL:', techOnHoldUrl);

// Test 3: Technician Open Requests
const params3 = new URLSearchParams();
params3.set('assignedTo', 'Jonel Calimlim');
params3.set('status', 'open');
const techOpenUrl = `/technician/requests?${params3.toString()}`;
console.log('Technician Open URL:', techOpenUrl);

console.log('\nExpected results:');
console.log('- My Assigned: Should show requests assigned to current user with status on_hold OR open');
console.log('- Technician On-Hold: Should show on_hold requests assigned to selected technician');
console.log('- Technician Open: Should show open requests assigned to selected technician');
