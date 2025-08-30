const { PrismaClient } = require('@prisma/client');

async function testFixedSLACalculation() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🧪 Testing FIXED SLA Calculation');
    console.log('================================');
    
    // Create a test request for your exact scenario
    console.log('Creating test request with Saturday 10:13 AM start...');
    
    const testRequest = await prisma.request.create({
      data: {
        status: 'pending',
        type: 'incident',
        description: 'Test SLA calculation fix',
        priority: 'high',
        templateId: '106', // Using existing template
        formData: {
          title: 'Test Request for SLA Fix',
          description: 'Testing Saturday 10:13 AM with 4-hour SLA'
        },
        createdAt: new Date('2025-08-30T10:13:41+08:00'),
        updatedAt: new Date('2025-08-30T10:13:41+08:00')
      }
    });
    
    console.log('✅ Test request created with ID:', testRequest.id);
    
    // Now call the SLA assignment API
    console.log('\n🎯 Calling SLA assignment API...');
    
    const response = await fetch(`http://localhost:3000/api/requests/${testRequest.id}/sla-assignment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestId: testRequest.id,
        templateId: 106 // Assuming this is your incident template
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ SLA assignment result:', JSON.stringify(result, null, 2));
      
      // Check the calculated due date
      if (result.sla && result.sla.dueDate) {
        const dueDate = new Date(result.sla.dueDate + '+08:00');
        console.log('\n🎯 SLA CALCULATION RESULT:');
        console.log('Start Time: Saturday, Aug 30, 2025 at 10:13 AM');
        console.log('Due Date:', dueDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
        console.log('Due Day:', dueDate.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', weekday: 'long' }));
        
        // Analyze the result
        if (dueDate.getDay() === 1) { // Monday
          console.log('✅ SUCCESS: Due date is on Monday (correct!)');
          const hour = dueDate.getHours();
          if (hour >= 8 && hour <= 12) {
            console.log('✅ SUCCESS: Due time is reasonable for Monday morning');
            console.log('✅ The fix appears to be working!');
          } else {
            console.log(`❓ Due time ${hour}:00 seems unexpected`);
          }
        } else if (dueDate.getDay() === 0) { // Sunday
          console.log('❌ STILL BROKEN: Due date is on Sunday (should be Monday)');
        } else {
          console.log(`❓ Due date is on ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dueDate.getDay()]} - unexpected`);
        }
      }
    } else {
      console.log('❌ API call failed:', response.status, response.statusText);
    }
    
    // Clean up - delete test request
    await prisma.request.delete({
      where: { id: testRequest.id }
    });
    console.log('\n🧹 Test request cleaned up');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFixedSLACalculation();
