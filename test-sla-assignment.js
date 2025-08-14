// Test SLA Assignment API call
const fetch = require('node-fetch');

async function testSLAAssignment() {
  try {
    console.log('Testing SLA assignment for request ID 100...');
    
    const response = await fetch('http://localhost:3000/api/requests/100/sla-assignment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        requestId: 100, 
        templateId: undefined // Let it try to get from request
      }),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());
    
    if (response.ok) {
      const result = await response.json();
      console.log('SLA Assignment Result:', JSON.stringify(result, null, 2));
    } else {
      const errorText = await response.text();
      console.log('Error response:', errorText);
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testSLAAssignment();
