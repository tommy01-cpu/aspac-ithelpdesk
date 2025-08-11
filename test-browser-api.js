// Test the actual API endpoint for current session
async function testCurrentSession() {
  try {
    console.log('🔍 Testing current session and pending approvals...\n');
    
    // Make a direct API call to test the endpoint
    const response = await fetch('/api/approvals/pending');
    
    if (!response.ok) {
      console.log(`❌ API call failed: ${response.status} ${response.statusText}`);
      const error = await response.text();
      console.log('Error details:', error);
      return;
    }
    
    const data = await response.json();
    console.log('📊 API Response:');
    console.log(`Approvals count: ${data.approvals?.length || 0}`);
    
    if (data.approvals && data.approvals.length > 0) {
      console.log('\n✅ Found approvals:');
      data.approvals.forEach((approval, idx) => {
        console.log(`\nApproval ${idx + 1}:`);
        console.log(`  ID: ${approval.id}`);
        console.log(`  Request: #${approval.requestId} - ${approval.requestTitle}`);
        console.log(`  Status: ${approval.status}`);
        console.log(`  Level: ${approval.level} - ${approval.levelName}`);
        console.log(`  Requester: ${approval.requesterName}`);
      });
      console.log('\n🎉 These should appear in the UI!');
    } else {
      console.log('\n❌ No pending approvals found');
      console.log('This means either:');
      console.log('1. You are not logged in as the correct user');
      console.log('2. The user has no pending approvals');
      console.log('3. There is a session/authentication issue');
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
}

// Run in browser console when logged in
testCurrentSession();
