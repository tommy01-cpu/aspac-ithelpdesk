const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestRequest() {
  console.log('🧪 CREATING TEST REQUEST TO VERIFY SLA FIX');
  console.log('='.repeat(50));
  
  try {
    // Create a simple test request with 5-hour SLA starting Tuesday 8 AM
    // This should be due Tuesday 1 PM (not 2 PM) if the fix works
    
    const testFormData = {
      '1': 'Test User',
      '2': 'Low',
      '3': 'test',
      '4': 'Service',
      '5': 'for_approval',
      '6': 'Test Category',
      '8': 'SLA Test Request',
      '9': 'Testing SLA calculation fix',
      '10': [],
      '12': []
    };
    
    // Create the request with a specific time
    const customTime = new Date('2025-08-26T08:00:00+08:00'); // Tuesday 8:00 AM
    
    console.log('📋 Creating test request:');
    console.log('- Start Time:', customTime.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    console.log('- Expected SLA: 5 hours');
    console.log('- Expected Due: Tuesday 1:00 PM (if fix works)');
    
    const request = await prisma.request.create({
      data: {
        userId: 1, // Use existing user
        templateId: 106, // Use existing template
        status: 'for_approval',
        type: 'service',
        formData: testFormData,
        createdAt: customTime,
        updatedAt: customTime
      }
    });
    
    console.log('✅ Request created with ID:', request.id);
    
    // Now trigger the SLA assignment manually
    console.log('\n🔧 Calling SLA assignment API...');
    
    const response = await fetch('http://localhost:3000/api/requests/' + request.id + '/sla-assignment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestId: request.id,
        templateId: 106
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ SLA assignment result:', result);
      
      // Check the calculated due date
      if (result.sla && result.sla.dueDate) {
        const dueDate = new Date(result.sla.dueDate + '+08:00'); // Convert to PHT
        console.log('\n🎯 SLA CALCULATION RESULT:');
        console.log('Due Date:', dueDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
        
        const hour = dueDate.getHours();
        if (hour === 13) {
          console.log('✅ SUCCESS: SLA due at 1:00 PM (fix worked!)');
        } else if (hour === 14) {
          console.log('❌ FAILED: SLA due at 2:00 PM (fix not working)');
        } else {
          console.log('🤔 Unexpected time:', hour);
        }
      }
    } else {
      console.log('❌ SLA assignment failed:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestRequest();
