// Test SLA Assignment directly
async function testSLAAssignment() {
  try {
    console.log('Testing SLA assignment...');
    
    const response = await fetch('http://localhost:3000/api/requests/100/sla-assignment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        requestId: 100
      }),
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ SLA Assignment Result:', JSON.stringify(result, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Error response:', errorText);
    }
  } catch (error) {
    console.error('❌ Fetch error:', error);
  }
}

testSLAAssignment();
