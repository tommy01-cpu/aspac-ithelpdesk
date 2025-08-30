const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugExactIssue() {
  try {
    console.log('🔍 DEBUGGING THE EXACT SLA ISSUE');
    console.log('='.repeat(60));
    
    // Your exact data from the request
    const slaStartAt = new Date('2025-08-30 10:13:41'); // Friday 10:13 AM
    const slaHours = 4; // Top Priority SLA
    const actualDueDate = new Date('2025-09-01 12:00:00'); // Sunday 12:00 PM (the wrong result)
    
    console.log('📊 Input Data:');
    console.log('- SLA Start:', slaStartAt.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    console.log('- SLA Hours:', slaHours);
    console.log('- Actual Due Date (wrong):', actualDueDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    
    // Check what day of the week it is
    const startDay = slaStartAt.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    const dueDay = actualDueDate.getDay();
    
    console.log('\n📅 Day Analysis:');
    console.log('- Start Day:', ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][startDay]);
    console.log('- Due Day:', ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dueDay]);
    
    // Get operational hours to see the configuration
    const operationalHours = await prisma.operationalHours.findFirst();
    
    if (operationalHours) {
      console.log('\n🕐 Working Days Configuration:');
      console.log('- Monday:', operationalHours.mondayEnabled ? 'Yes' : 'No');
      console.log('- Tuesday:', operationalHours.tuesdayEnabled ? 'Yes' : 'No');
      console.log('- Wednesday:', operationalHours.wednesdayEnabled ? 'Yes' : 'No');
      console.log('- Thursday:', operationalHours.thursdayEnabled ? 'Yes' : 'No');
      console.log('- Friday:', operationalHours.fridayEnabled ? 'Yes' : 'No');
      console.log('- Saturday:', operationalHours.saturdayEnabled ? 'Yes' : 'No');
      console.log('- Sunday:', operationalHours.sundayEnabled ? 'Yes' : 'No');
      
      console.log('\n🕐 Friday Working Hours:');
      console.log('- Start:', operationalHours.fridayStartTime);
      console.log('- End:', operationalHours.fridayEndTime);
      console.log('- Break Start:', operationalHours.fridayBreakStart);
      console.log('- Break End:', operationalHours.fridayBreakEnd);
    }
    
    // Manual calculation of what SHOULD happen
    console.log('\n🧮 CORRECT CALCULATION:');
    console.log('- Start: Friday 10:13 AM');
    console.log('- Friday working hours: 8:00 AM - 5:00 PM (with 12:00-1:00 PM break)');
    console.log('- Time remaining on Friday from 10:13 AM:');
    console.log('  - From 10:13 AM to 12:00 PM: 1 hour 47 minutes');
    console.log('  - From 1:00 PM to 5:00 PM: 4 hours');
    console.log('  - Total remaining: 5 hours 47 minutes');
    console.log('- SLA needed: 4 hours');
    console.log('- Since 4 hours < 5h47m, SLA should complete on Friday');
    console.log('- Expected completion: Friday ~3:13 PM (10:13 AM + 4 hours + 1 hour break)');
    
    console.log('\n❌ PROBLEM IDENTIFIED:');
    console.log('- Actual result: Sunday 12:00 PM');
    console.log('- Expected result: Friday ~3:13 PM');
    console.log('- The calculation is extending to a non-working day (Sunday)');
    console.log('- This suggests a bug in the SLA calculation logic');
    
    // Test if the issue might be timezone related
    console.log('\n🌍 TIMEZONE ANALYSIS:');
    console.log('- slaStartAt timezone:', slaStartAt.getTimezoneOffset() / -60, 'hours from UTC');
    console.log('- actualDueDate timezone:', actualDueDate.getTimezoneOffset() / -60, 'hours from UTC');
    
    // Check if dates are being interpreted as UTC when they should be PHT
    const startAsUTC = new Date(slaStartAt.toISOString());
    const startAsPHT = new Date(slaStartAt.getTime() + 8 * 60 * 60 * 1000);
    
    console.log('- If slaStartAt interpreted as UTC:', startAsUTC.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    console.log('- If slaStartAt interpreted as PHT:', startAsPHT.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugExactIssue();
