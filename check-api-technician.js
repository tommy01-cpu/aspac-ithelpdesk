const fetch = require('node-fetch');

async function checkTechnicianAPIData() {
  try {
    console.log('=== CHECKING TECHNICIAN DATA FROM API ===');
    
    // Make a request to the reports API (you might need to adjust the URL)
    const response = await fetch('http://localhost:3000/api/reports');
    
    if (!response.ok) {
      console.log('API response not ok:', response.status);
      return;
    }
    
    const data = await response.json();
    
    if (data.requests && data.requests.length > 0) {
      console.log(`Found ${data.requests.length} requests from API`);
      console.log('');
      
      // Check first few requests for technician data
      data.requests.slice(0, 5).forEach((request, index) => {
        console.log(`Request #${request.id}:`);
        console.log(`  Technician field: ${JSON.stringify(request.technician)}`);
        console.log(`  Subject: ${request.subject}`);
        console.log(`  Status: ${request.status}`);
        console.log('  ---');
      });
    } else {
      console.log('No requests found in API response');
    }
    
  } catch (error) {
    console.error('Error checking API technician data:', error.message);
  }
}

checkTechnicianAPIData();
