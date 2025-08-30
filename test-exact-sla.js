// Test the exact SLA calculation scenario
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSLACalculation() {
    try {
        console.log('🧪 Testing SLA calculation with your exact data...\n');
        
        // Import the SLA calculator
        const { calculateSLADueDate } = require('./lib/sla-calculator.ts');
        
        // Your exact scenario
        const startTime = new Date('2025-08-30T10:57:21.000Z'); // Saturday 10:57:21 AM
        const requestId = 101;
        const serviceCategory = 'Software Issues';
        
        console.log('📅 Input:');
        console.log('- Start time:', startTime.toISOString());
        console.log('- Start time (Manila):', startTime.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
        console.log('- Request ID:', requestId);
        console.log('- Service category:', serviceCategory);
        console.log('- Use operational hours: true\n');
        
        // Calculate SLA
        const result = await calculateSLADueDate(
            startTime,
            requestId,
            serviceCategory,
            true // useOperationalHours
        );
        
        console.log('📊 Result:');
        console.log('- Due date (UTC):', result?.toISOString());
        console.log('- Due date (Manila):', result?.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
        
        // Expected: Monday around 10:57 AM Manila time
        const expectedDay = 'Monday';
        const actualDay = result?.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Manila' });
        const actualTime = result?.toLocaleTimeString('en-US', { timeZone: 'Asia/Manila' });
        
        console.log('\n✅ Validation:');
        console.log('- Expected day: Monday');
        console.log('- Actual day:', actualDay);
        console.log('- Day correct:', actualDay === 'Monday' ? '✅' : '❌');
        console.log('- Expected time: ~10:57 AM');
        console.log('- Actual time:', actualTime);
        
    } catch (error) {
        console.error('❌ Error testing SLA calculation:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testSLACalculation();
