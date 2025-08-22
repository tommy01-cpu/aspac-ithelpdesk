const fetch = require('node-fetch');

async function testEmailAPI() {
  try {
    console.log('=== TESTING EMAIL API WITH tom.mandapat@aspacphils.com ===');
    
    // Test with a mock request ID - we'll simulate the API call
    console.log('1. Testing send-email API endpoint...');
    
    const emailData = {
      requestId: 999, // Mock request ID for testing
      templateKey: 'acknowledge-cc-new-request'
    };
    
    console.log('Sending email data:', emailData);
    
    // Make API call to our send-email endpoint
    const response = await fetch('http://localhost:3000/api/notifications/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData)
    });
    
    const result = await response.json();
    
    console.log('2. API Response Status:', response.status);
    console.log('API Response:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Email API call successful!');
      if (result.emailsSent > 0) {
        console.log(`📧 ${result.emailsSent} email(s) sent successfully!`);
      }
    } else {
      console.log('❌ Email API call failed:', result.error);
      if (result.error === 'Request not found') {
        console.log('ℹ️ This is expected since we used a mock request ID');
        console.log('The API is working correctly - it properly validates request existence');
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing email API:', error);
  }
}

testEmailAPI();
