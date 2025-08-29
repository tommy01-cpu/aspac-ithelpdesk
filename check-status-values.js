const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStatusValues() {
  try {
    // Check recent requests for their status values in formData
    const recentRequests = await prisma.request.findMany({
      select: {
        id: true,
        status: true,
        formData: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log('Recent requests and their status values:');
    recentRequests.forEach(req => {
      const statusFieldValue = req.formData['5']; // Field ID 5 is status
      console.log(`Request ${req.id}: DB status='${req.status}', formData[5]='${statusFieldValue}', created=${req.createdAt}`);
    });
    
    // Also check templates for their field options
    console.log('\n--- Template Status Field Options ---');
    const templates = await prisma.template.findMany({
      select: {
        id: true,
        name: true,
        fields: true
      }
    });
    
    templates.forEach(template => {
      try {
        const fields = typeof template.fields === 'string' ? JSON.parse(template.fields) : template.fields;
        const statusField = fields.find(f => f.type === 'status');
        if (statusField) {
          console.log(`Template ${template.id} (${template.name}): status options = ${JSON.stringify(statusField.options)}`);
        }
      } catch (e) {
        console.log(`Template ${template.id}: Error parsing fields`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStatusValues();
