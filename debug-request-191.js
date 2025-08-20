const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testTemplateAndSLA() {
  try {
    console.log('🧪 Testing Request 191 and Template 151...');
    
    // Get request 191
    const request = await prisma.request.findUnique({
      where: { id: 191 }
    });
    
    console.log('\n📋 Request 191:');
    console.log('- Template ID:', request?.templateId);
    console.log('- Status:', request?.status);
    console.log('- Created:', request?.createdAt);
    console.log('- Updated:', request?.updatedAt);
    console.log('- Form Data:', JSON.stringify(request?.formData, null, 2));
    
    // Check if template 151 exists as service or incident
    console.log('\n🔍 Checking template 151...');
    
    try {
      const serviceTemplate = await prisma.serviceCatalogItem.findUnique({
        where: { id: '151' },
        include: {
          slaService: true
        }
      });
      
      if (serviceTemplate) {
        console.log('✅ Found Service Template 151:');
        console.log('- Name:', serviceTemplate.name);
        console.log('- Type:', serviceTemplate.type);
        console.log('- SLA Service ID:', serviceTemplate.slaServiceId);
        
        if (serviceTemplate.slaService) {
          console.log('- SLA Resolution Days:', serviceTemplate.slaService.resolutionDays);
          console.log('- SLA Resolution Hours:', serviceTemplate.slaService.resolutionHours);
          console.log('- SLA Resolution Minutes:', serviceTemplate.slaService.resolutionMinutes);
        }
      } else {
        console.log('❌ No service template found');
      }
      
    } catch (error) {
      console.log('❌ Error checking service template:', error.message);
    }
    
    try {
      const incidentTemplate = await prisma.incidentCatalogItem.findUnique({
        where: { id: '151' }
      });
      
      if (incidentTemplate) {
        console.log('✅ Found Incident Template 151:');
        console.log('- Name:', incidentTemplate.name);
        console.log('- Type:', incidentTemplate.type);
        console.log('- Impact:', incidentTemplate.impact);
        console.log('- Urgency:', incidentTemplate.urgency);
        console.log('- Priority:', incidentTemplate.priority);
      } else {
        console.log('❌ No incident template found');
      }
      
    } catch (error) {
      console.log('❌ Error checking incident template:', error.message);
    }
    
    // Check operational hours
    const operationalHours = await prisma.operationalHours.findFirst({
      where: { isActive: true }
    });
    
    console.log('\n⚙️  Operational Hours:');
    console.log('- Working Time Type:', operationalHours?.workingTimeType);
    console.log('- Standard Start:', operationalHours?.standardStartTime);
    console.log('- Standard End:', operationalHours?.standardEndTime);
    console.log('- Is Active:', operationalHours?.isActive);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTemplateAndSLA();
