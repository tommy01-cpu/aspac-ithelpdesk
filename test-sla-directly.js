const { PrismaClient } = require('@prisma/client');

async function testSLADirectly() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Direct SLA Database Debugging');
    console.log('=================================');
    
    // Let's look at the exact request that has the wrong SLA
    console.log('Looking for requests with SLA issues...');
    
    // Find recent requests with calculated SLA data
    const recentRequests = await prisma.request.findMany({
      where: {
        status: 'open',
        formData: {
          path: ['slaDueDate'],
          not: null
        }
      },
      select: {
        id: true,
        status: true,
        updatedAt: true,
        formData: true
      },
      orderBy: { updatedAt: 'desc' },
      take: 5
    });
    
    console.log(`\n📊 Found ${recentRequests.length} recent requests with SLA data:`);
    
    recentRequests.forEach((req, index) => {
      const formData = req.formData;
      console.log(`\n--- Request ${index + 1} (ID: ${req.id}) ---`);
      console.log(`Status: ${req.status}`);
      console.log(`Updated At: ${req.updatedAt.toISOString()}`);
      
      if (formData.slaStartAt) console.log(`SLA Start: ${formData.slaStartAt}`);
      if (formData.slaDueDate) console.log(`SLA Due: ${formData.slaDueDate}`);
      if (formData.slaHours) console.log(`SLA Hours: ${formData.slaHours}`);
      if (formData.slaCalculatedAt) console.log(`Calculated At: ${formData.slaCalculatedAt}`);
      
      // Check if this matches your case
      if (formData.slaStartAt && formData.slaStartAt.includes('2025-08-30 10:13')) {
        console.log('🎯 THIS MATCHES YOUR CASE!');
        
        // Analyze the calculation
        const startTime = new Date(formData.slaStartAt + '+08:00');
        const dueTime = new Date(formData.slaDueDate + '+08:00');
        const slaHours = formData.slaHours;
        
        console.log('\n🔬 Detailed Analysis:');
        console.log(`Start Day: ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][startTime.getDay()]}`);
        console.log(`Due Day: ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dueTime.getDay()]}`);
        
        const timeDiff = dueTime.getTime() - startTime.getTime();
        const actualHours = timeDiff / (1000 * 60 * 60);
        
        console.log(`Expected SLA Hours: ${slaHours}`);
        console.log(`Actual Time Span: ${actualHours.toFixed(2)} hours`);
        console.log(`Difference: ${(actualHours - slaHours).toFixed(2)} hours`);
        
        if (startTime.getDay() === 5 && dueTime.getDay() === 0) {
          console.log('❌ BUG CONFIRMED: Started on Friday, ended on Sunday!');
          console.log('❌ This should complete on Friday afternoon, not Sunday!');
        }
      }
    });
    
    // Check operational hours data that was actually used
    console.log('\n📅 Checking Operational Hours Configuration:');
    const opHours = await prisma.operationalHours.findFirst({
      where: { isActive: true },
      include: {
        workingDays: {
          where: { dayOfWeek: 5 }, // Friday
          include: { breakHours: true }
        }
      }
    });
    
    if (opHours && opHours.workingDays.length > 0) {
      const friday = opHours.workingDays[0];
      console.log('\n🗓️ Friday Configuration Used:');
      console.log(`- Enabled: ${friday.isEnabled}`);
      console.log(`- Schedule Type: ${friday.scheduleType}`);
      console.log(`- Working Hours: ${friday.customStartTime || opHours.standardStartTime} - ${friday.customEndTime || opHours.standardEndTime}`);
      
      if (friday.breakHours.length > 0) {
        friday.breakHours.forEach(b => {
          console.log(`- Break: ${b.startTime} - ${b.endTime}`);
        });
      }
      
      if (friday.isEnabled && friday.scheduleType !== 'not-set') {
        console.log('✅ Friday is properly configured as working day');
        console.log('❌ So the bug is in the calculation logic, not the configuration');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSLADirectly();
