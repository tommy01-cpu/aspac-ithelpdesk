const { PrismaClient } = require('@prisma/client');

async function recalculateSLA() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Recalculating SLA for Request ID: 365');
    console.log('========================================');
    
    // Call the SLA assignment API for the existing request
    const response = await fetch('http://localhost:3000/api/requests/365/sla-assignment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestId: '365',
        templateId: '106'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ SLA recalculation result:');
      
      if (result.sla && result.sla.dueDate) {
        const dueDate = new Date(result.sla.dueDate + '+08:00');
        console.log('\n🎯 NEW SLA CALCULATION:');
        console.log('Start: Saturday, Aug 30, 2025 at 10:13 AM');
        console.log('Due Date:', dueDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
        console.log('Due Day:', dueDate.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', weekday: 'long' }));
        
        if (dueDate.getDay() === 1 && dueDate.getHours() >= 8 && dueDate.getHours() <= 12) {
          console.log('✅ SUCCESS: SLA now correctly calculates to Monday morning!');
          console.log('✅ The bug has been fixed!');
        } else if (dueDate.getDay() === 0) {
          console.log('❌ Still showing Sunday - more debugging needed');
        } else {
          console.log('❓ Unexpected result - needs investigation');
        }
      }
    } else {
      const errorText = await response.text();
      console.log('❌ API call failed:', response.status, errorText);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

recalculateSLA();
