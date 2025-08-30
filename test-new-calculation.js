const { PrismaClient } = require('@prisma/client');

async function testNewSLACalculation() {
  console.log('🧪 Testing NEW SLA Calculation');
  console.log('===============================');
  
  try {
    // Test by calling the debug endpoint which uses the same calculation
    const response = await fetch('http://localhost:3000/api/debug-sla-manual');
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Debug endpoint responded successfully');
      console.log('Start Date:', result.startDate);
      console.log('End Date:', result.endDate);
      console.log('\nCalculation steps:');
      result.calculation.forEach((step, index) => {
        console.log(`${index + 1}. ${step}`);
      });
      
      // Check if the end date is reasonable
      const endDate = new Date(result.endDate);
      if (endDate.getDay() === 1) { // Monday
        console.log('\n✅ SUCCESS: Calculation ends on Monday!');
      } else if (endDate.getDay() === 0) { // Sunday
        console.log('\n❌ STILL BROKEN: Calculation ends on Sunday');
      } else {
        console.log(`\n❓ UNEXPECTED: Calculation ends on ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][endDate.getDay()]}`);
      }
      
    } else {
      console.log('❌ Debug endpoint failed:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Wait a moment for server to start
setTimeout(() => {
  testNewSLACalculation();
}, 3000);
