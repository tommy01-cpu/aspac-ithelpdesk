// Test script to verify the status matching fix
console.log('🔍 Testing Status Matching Fix...\n');

// Test data that mimics what the API returns
const testApproval = {
  id: '54',
  level: 1,
  name: 'Approval Stage 1',
  status: 'for_clarification', // This is what comes from the database
  approver: 'Floi Neri',
  approverEmail: 'floi.neri@aspacphils.com.ph'
};

console.log('Test Approval Data:');
console.log(`  Status from DB: "${testApproval.status}"`);
console.log('');

// Test the status matching logic (before fix)
const oldCondition = testApproval.status === 'for-clarification';
console.log('❌ OLD CONDITION (with hyphen):');
console.log(`  approval.status === 'for-clarification': ${oldCondition}`);
console.log(`  Would show "For Clarification": ${oldCondition ? 'YES' : 'NO'}`);
console.log('');

// Test the status matching logic (after fix)
const newCondition = testApproval.status === 'for_clarification';
console.log('✅ NEW CONDITION (with underscore):');
console.log(`  approval.status === 'for_clarification': ${newCondition}`);
console.log(`  Will show "For Clarification": ${newCondition ? 'YES' : 'NO'}`);
console.log('');

// Test all status conditions
function getStatusDisplay(status) {
  if (status === 'approved') {
    return { icon: 'CheckCircle', text: 'Approved', color: 'green' };
  } else if (status === 'rejected') {
    return { icon: 'AlertCircle', text: 'Rejected', color: 'red' };
  } else if (status === 'for_clarification') { // Fixed condition
    return { icon: 'Clock', text: 'For Clarification', color: 'sky' };
  } else {
    return { icon: 'Clock', text: 'Pending Approval', color: 'orange' };
  }
}

console.log('🎨 Status Display Test:');
const statuses = ['pending_approval', 'for_clarification', 'approved', 'rejected'];
statuses.forEach(status => {
  const display = getStatusDisplay(status);
  console.log(`  "${status}" → "${display.text}" (${display.color} ${display.icon})`);
});

console.log('\n✅ Fix Summary:');
console.log('  • Changed: approval.status === \'for-clarification\'');
console.log('  • To: approval.status === \'for_clarification\'');
console.log('  • This matches the database enum value');
console.log('  • Floi Neri\'s approval will now show "For Clarification" instead of "Pending Approval"');
