const { PrismaClient } = require('@prisma/client');
const { calculateSLADueDate, getOperationalHours } = require('./lib/sla-calculator');

const prisma = new PrismaClient();

async function testSLA() {
  try {
    console.log('🧪 Testing SLA calculation for Request 191...');
    
    // Get request 191
    const request = await prisma.request.findUnique({
      where: { id: 191 }
    });
    
    if (!request) {
      console.log('❌ Request 191 not found');
      return;
    }
    
    console.log('\n📋 Request 191:');
    console.log('- Created:', request.createdAt);
    console.log('- Updated:', request.updatedAt);
    console.log('- Status:', request.status);
    console.log('- Template ID:', request.templateId);
    
    // Check operational hours
    const operationalHours = await getOperationalHours();
    console.log('\n⚙️  Operational Hours:');
    console.log('- Working Time Type:', operationalHours?.workingTimeType);
    console.log('- Start Time:', operationalHours?.standardStartTime);
    console.log('- End Time:', operationalHours?.standardEndTime);
    
    // Test SLA calculation with different parameters
    const testStartTime = new Date('2025-08-19T14:59:00.000Z'); // 2:59 PM Philippine time (adjust for UTC)
    const slaHours = 16; // Example: 16 hours SLA
    
    console.log('\n🧮 Testing SLA calculation:');
    console.log('- Start Time:', testStartTime.toISOString());
    console.log('- Philippine Time:', testStartTime.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }));
    console.log('- SLA Hours:', slaHours);
    
    // Test with operational hours enabled
    console.log('\n⏰ With operational hours enabled:');
    const dueWithOH = await calculateSLADueDate(testStartTime, slaHours, { useOperationalHours: true });
    console.log('- Due Date (UTC):', dueWithOH.toISOString());
    console.log('- Due Date (PH):', dueWithOH.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }));
    
    // Test without operational hours
    console.log('\n⏰ Without operational hours (round-the-clock):');
    const dueWithoutOH = await calculateSLADueDate(testStartTime, slaHours, { useOperationalHours: false });
    console.log('- Due Date (UTC):', dueWithoutOH.toISOString());
    console.log('- Due Date (PH):', dueWithoutOH.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }));
    
    // Calculate the difference
    const diffHours = (dueWithOH.getTime() - dueWithoutOH.getTime()) / (1000 * 60 * 60);
    console.log('\n📊 Difference:', diffHours.toFixed(2), 'hours');
    
    if (Math.abs(diffHours) < 0.1) {
      console.log('⚠️  WARNING: No difference detected - operational hours may not be working!');
    } else {
      console.log('✅ Operational hours are affecting the calculation');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSLA();
