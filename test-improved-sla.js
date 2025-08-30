console.log('🧪 Testing the improved SLA calculation');
console.log('======================================');

// Create a new incident request to test the fix
fetch('http://localhost:3000/api/requests', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    templateId: '106',
    priority: 'high',
    description: 'Test improved SLA calculation',
    formData: {
      title: 'Test Request - Improved SLA',
      description: 'Testing the improved SLA calculation logic'
    }
  })
})
.then(response => response.json())
.then(data => {
  console.log('✅ Request created:', data);
  
  if (data.id) {
    // Now trigger SLA assignment
    console.log('\n🎯 Triggering SLA assignment...');
    
    return fetch(`http://localhost:3000/api/requests/${data.id}/sla-assignment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestId: data.id,
        templateId: '106'
      })
    });
  }
})
.then(response => response.json())
.then(result => {
  console.log('✅ SLA assignment result:', result);
  
  if (result.sla && result.sla.dueDate) {
    const dueDate = new Date(result.sla.dueDate + '+08:00');
    console.log('\n🎯 NEW SLA CALCULATION RESULT:');
    console.log('Due Date:', dueDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    console.log('Due Day:', dueDate.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', weekday: 'long' }));
    console.log('Due Time:', dueDate.toTimeString().slice(0, 5));
    
    const hour = dueDate.getHours();
    const minute = dueDate.getMinutes();
    
    if (dueDate.getDay() === 1) { // Monday
      console.log('✅ SUCCESS: Due date is on Monday!');
      
      if (hour === 10 && minute >= 45 && minute <= 49) {
        console.log('✅ PERFECT: Due time is around 10:47 AM as expected!');
        console.log('🎉 The improved SLA calculation is working correctly!');
      } else if (hour === 12 && minute === 0) {
        console.log('❌ STILL WRONG: Due time is 12:00 PM (same as before)');
        console.log('❌ The fix needs more work');
      } else {
        console.log(`❓ Due time ${hour}:${minute.toString().padStart(2, '0')} is unexpected`);
      }
    } else {
      console.log(`❌ Due date is on ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dueDate.getDay()]} instead of Monday`);
    }
  }
})
.catch(error => {
  console.error('❌ Error:', error);
});
