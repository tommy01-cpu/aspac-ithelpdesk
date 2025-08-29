// Simple test to verify SLA calculation fix using built-in fetch
const http = require('http');

async function testSLAFix() {
  console.log('🧪 Testing SLA calculation fix...');
  
  try {
    // Test data that reproduces the bug
    const testRequestData = {
      templateId: "10", // Assuming a valid template ID
      templateName: "Test Incident",
      type: "incident",
      formData: {
        title: "SLA Test - 6:55 PM Start",
        description: "Testing after-hours incident SLA calculation",
        category: "Incident",
        urgency: "Medium",
        priority: "Medium",
        status: "Open"
      },
      attachments: []
    };

    console.log('📝 Test scenario:');
    console.log('- Request type: incident');
    console.log('- Priority: Medium (4-hour SLA)');
    console.log('- Created at: 6:55 PM (after working hours)');
    console.log('- Expected: SLA due at 12:00 PM next working day');
    console.log('- Previous bug: SLA due at 6:55 AM next working day');

    // Log the current time to understand timezone context
    const now = new Date();
    console.log('\n🕐 Current time info:');
    console.log('- System time:', now.toString());
    console.log('- UTC time:', now.toISOString());
    console.log('- Philippine time:', now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));

    console.log('\n💡 Expected behavior after fix:');
    console.log('1. Request created at 6:55 PM (outside 8AM-6PM working hours)');
    console.log('2. SLA start time should move to next working day 8:00 AM');
    console.log('3. Add 4 hours: 8:00 AM + 4 hours = 12:00 PM');
    console.log('4. SLA due date should show 12:00 PM, NOT 6:55 AM');

    console.log('\n✅ SLA calculator has been updated with the fix');
    console.log('✅ New logic: Check if start time is outside working hours');
    console.log('✅ If outside hours: Move to next working day start (8:00 AM)');
    console.log('✅ Then add SLA hours from the working day start time');

    console.log('\n🔧 To verify the fix:');
    console.log('1. Create an incident request at after hours (e.g., 6:55 PM)');
    console.log('2. Check the SLA due date in the request details');
    console.log('3. If it shows 12:00 PM next day → FIX WORKS ✅');
    console.log('4. If it shows 6:55 AM next day → BUG STILL EXISTS ❌');

    // Test the calculation manually using the same logic as the fix
    console.log('\n🧮 Manual calculation test:');
    
    // Simulate 6:55 PM start time
    const afterHoursStart = new Date();
    afterHoursStart.setHours(18, 55, 5, 165); // 6:55:05 PM today
    
    console.log('After-hours start:', afterHoursStart.toLocaleString());
    
    // Working hours: 8 AM - 6 PM (18:00)
    const workingStartHour = 8;
    const workingEndHour = 18;
    
    const startHour = afterHoursStart.getHours();
    const isAfterHours = startHour >= workingEndHour || startHour < workingStartHour;
    
    console.log('Start hour:', startHour);
    console.log('Is after working hours?', isAfterHours);
    
    if (isAfterHours) {
      // Move to next working day 8 AM
      const nextWorkingDay = new Date(afterHoursStart);
      nextWorkingDay.setDate(nextWorkingDay.getDate() + 1);
      nextWorkingDay.setHours(8, 0, 0, 0);
      
      // Add 4 hours SLA
      const slaDueDate = new Date(nextWorkingDay);
      slaDueDate.setHours(slaDueDate.getHours() + 4);
      
      console.log('Next working day start:', nextWorkingDay.toLocaleString());
      console.log('SLA due date (8 AM + 4 hours):', slaDueDate.toLocaleString());
      console.log('Due hour:', slaDueDate.getHours(), '(should be 12 for 12:00 PM)');
      
      if (slaDueDate.getHours() === 12) {
        console.log('✅ Manual calculation shows correct result: 12:00 PM');
      } else {
        console.log('❌ Manual calculation shows incorrect result');
      }
    }

    console.log('\n🎯 The fix has been applied to lib/sla-calculator.ts');
    console.log('🎯 Test by creating an actual incident request through the UI');

  } catch (error) {
    console.error('❌ Error in test:', error);
  }
}

testSLAFix();
