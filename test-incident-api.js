const http = require('http');

async function testIncidentAPI() {
  try {
    console.log('Testing incident catalog API...');
    
    // Test category 7 (Test Category 2)
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/incident-catalog?categoryId=7',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', data);
        
        if (res.statusCode === 200) {
          const response = JSON.parse(data);
          console.log('Incident catalog items:', response.incidentCatalogItems?.length || 0);
          if (response.incidentCatalogItems) {
            response.incidentCatalogItems.forEach(item => {
              console.log(`- ${item.name} (Template: ${item.templateName})`);
            });
          }
        }
      });
    });

    req.on('error', (e) => {
      console.error('Error:', e.message);
    });

    req.end();
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testIncidentAPI();
