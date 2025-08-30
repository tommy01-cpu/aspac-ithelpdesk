const { PrismaClient } = require('@prisma/client');

async function debugLatestRequest() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Debugging Latest Request SLA Calculation');
    console.log('===========================================');
    
    // Find the most recent request
    const latestRequest = await prisma.request.findFirst({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        formData: true
      }
    });
    
    if (latestRequest) {
      console.log('📊 Latest Request Details:');
      console.log(`ID: ${latestRequest.id}`);
      console.log(`Status: ${latestRequest.status}`);
      console.log(`Created: ${latestRequest.createdAt.toISOString()}`);
      console.log(`Updated: ${latestRequest.updatedAt.toISOString()}`);
      
      const formData = latestRequest.formData;
      if (formData && typeof formData === 'object') {
        console.log('\n📋 SLA Information:');
        if (formData.slaStartAt) console.log(`SLA Start: ${formData.slaStartAt}`);
        if (formData.slaDueDate) console.log(`SLA Due: ${formData.slaDueDate}`);
        if (formData.slaHours) console.log(`SLA Hours: ${formData.slaHours}`);
        if (formData.slaCalculatedAt) console.log(`Calculated At: ${formData.slaCalculatedAt}`);
        
        // Analyze the calculation
        if (formData.slaStartAt && formData.slaDueDate) {
          const startTime = new Date(formData.slaStartAt + '+08:00');
          const dueTime = new Date(formData.slaDueDate + '+08:00');
          
          console.log('\n🔬 Analysis:');
          console.log(`Start Day: ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][startTime.getDay()]}`);
          console.log(`Due Day: ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dueTime.getDay()]}`);
          console.log(`Start Time: ${startTime.toLocaleString('en-PH')}`);
          console.log(`Due Time: ${dueTime.toLocaleString('en-PH')}`);
          
          if (dueTime.getDay() === 0) { // Sunday
            console.log('\n❌ BUG CONFIRMED: Due date is on Sunday!');
            console.log('❌ This indicates the fix has not taken effect yet.');
            console.log('💡 The SLA calculation might be cached or server needs restart.');
          } else if (dueTime.getDay() === 1) { // Monday
            console.log('\n✅ SUCCESS: Due date is on Monday!');
            console.log('✅ The fix appears to be working.');
          }
        }
      }
    } else {
      console.log('❌ No requests found');
    }
    
    // Also check if the operational hours are correct
    console.log('\n📅 Current Operational Hours:');
    const opHours = await prisma.operationalHours.findFirst({
      where: { isActive: true },
      include: {
        workingDays: {
          where: { dayOfWeek: { in: [0, 1, 6] } }, // Sunday, Monday, Saturday
          include: { breakHours: true }
        }
      }
    });
    
    if (opHours) {
      opHours.workingDays.forEach(day => {
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day.dayOfWeek];
        console.log(`${dayName}: Enabled=${day.isEnabled}, Hours=${day.customStartTime || opHours.standardStartTime}-${day.customEndTime || opHours.standardEndTime}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugLatestRequest();
