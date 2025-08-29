const axios = require('axios');

async function testSLAFixViaAPI() {
  console.log('🧪 Testing SLA calculation fix via API...');
  
  const testData = {
    title: 'SLA Test - After Hours Incident',
    description: 'Testing SLA calculation for incident created at 6:55 PM (outside working hours)',
    category: 'Incident',
    urgency: 'Medium', 
    priority: 'Medium',
    type: 'Software',
    requesterDepartment: 'IT',
    createdBy: 1,
    // Force the creation time to 6:55 PM for testing
    customCreatedAt: '2025-08-28T18:55:05.165+08:00'
  };
  
  try {
    console.log('📤 Sending POST request to create incident...');
    console.log('Test time:', new Date(testData.customCreatedAt).toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    
    const response = await axios.post('http://localhost:3000/api/requests', testData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200 || response.status === 201) {
      console.log('✅ Request created successfully!');
      
      const result = response.data;
      if (result.request) {
        console.log('\n📋 SLA Calculation Result:');
        console.log('Request ID:', result.request.id);
        console.log('Created at:', result.request.createdAt);
        console.log('SLA Start:', result.request.slaStartTime);
        console.log('SLA Due:', result.request.slaDueDate);
        
        // Check if our fix worked
        const dueDate = new Date(result.request.slaDueDate);
        const dueTime = dueDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' });
        const hour = dueDate.getHours();
        
        console.log('\n🔍 Analysis:');
        console.log('Due date (PHT):', dueTime);
        console.log('Due hour:', hour);
        
        if (hour === 12) {
          console.log('✅ SUCCESS: SLA due at 12:00 PM (noon) - Fix is working!');
          console.log('✅ The after-hours incident correctly defers to next working day 8 AM + 4 hours = 12 PM');
        } else if (hour === 6) {
          console.log('❌ BUG STILL EXISTS: SLA due at 6:00 AM instead of 12:00 PM');
          console.log('❌ The fix did not work - still using 6:55 PM + 4 hours = 6:55 AM logic');
        } else {
          console.log(`❓ UNEXPECTED: SLA due at ${hour}:00 - not the expected 12:00 PM`);
        }
        
        // Also check the day
        const dueDay = dueDate.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', weekday: 'long' });
        const startDay = new Date(testData.customCreatedAt).toLocaleDateString('en-US', { timeZone: 'Asia/Manila', weekday: 'long' });
        
        console.log('\nDay analysis:');
        console.log('Start day:', startDay);
        console.log('Due day:', dueDay);
        
        if (startDay === 'Wednesday' && dueDay === 'Thursday') {
          console.log('✅ Correct day progression: Wednesday evening → Thursday noon');
        } else {
          console.log('❓ Unexpected day progression');
        }
        
      } else {
        console.log('❌ No request data in response');
      }
    } else {
      console.log('❌ Failed to create request:', response.status);
    }
    
  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Network Error:', error.message);
    }
  }
}

testSLAFixViaAPI();
