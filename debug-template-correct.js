const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugTemplate151() {
  try {
    console.log('🔍 Checking template 151 with correct ID type...');
    
    // Try as integer
    try {
      const incidentTemplate = await prisma.incidentCatalogItem.findUnique({
        where: { id: 151 }
      });
      
      if (incidentTemplate) {
        console.log('✅ Found Incident Template 151:');
        console.log('- Name:', incidentTemplate.name);
        console.log('- Type:', incidentTemplate.type);
        console.log('- Priority:', incidentTemplate.priority);
        console.log('- Full template:', JSON.stringify(incidentTemplate, null, 2));
        
        // Check for priority-based SLA
        const prioritySLA = await prisma.prioritySLA.findUnique({
          where: { priority: incidentTemplate.priority || 'Medium' },
          include: {
            slaIncident: true
          }
        });
        
        if (prioritySLA) {
          console.log('\n📊 Priority SLA for', incidentTemplate.priority, ':');
          console.log('- SLA Incident:', JSON.stringify(prioritySLA.slaIncident, null, 2));
        }
        
      } else {
        console.log('❌ No incident template found with ID 151');
      }
      
    } catch (error) {
      console.log('❌ Error checking incident template:', error.message);
    }
    
    // Also check service template
    try {
      const serviceTemplate = await prisma.serviceCatalogItem.findUnique({
        where: { id: 151 }
      });
      
      if (serviceTemplate) {
        console.log('✅ Found Service Template 151:');
        console.log(JSON.stringify(serviceTemplate, null, 2));
      } else {
        console.log('❌ No service template found with ID 151');
      }
      
    } catch (error) {
      console.log('❌ Error checking service template:', error.message);
    }
    
    // Check the actual times conversion
    console.log('\n🕐 Time analysis for Request 191:');
    const startUTC = new Date('2025-08-19T14:59:13.142Z');
    const dueUTC = new Date('2025-08-20T06:59:13.142Z');
    
    console.log('Start UTC:', startUTC.toISOString());
    console.log('Start PH:', startUTC.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }));
    console.log('Due UTC:', dueUTC.toISOString());  
    console.log('Due PH:', dueUTC.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }));
    
    const diffHours = (dueUTC.getTime() - startUTC.getTime()) / (1000 * 60 * 60);
    console.log('Difference:', diffHours, 'hours');
    
    if (diffHours === 16) {
      console.log('⚠️  This is exactly 16 hours - ROUND-THE-CLOCK calculation!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugTemplate151();
