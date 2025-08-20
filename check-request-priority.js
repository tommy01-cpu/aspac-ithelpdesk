const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkRequestPriority() {
  try {
    console.log('Checking priority data for request 156...');
    
    // Get the request data
    const request = await prisma.$queryRaw`
      SELECT id, "templateId", "userId", status, "formData"::text as form_data_text
      FROM requests 
      WHERE id = 156;
    `;
    
    if (request.length > 0) {
      const req = request[0];
      console.log('Request ID:', req.id);
      console.log('Template ID:', req.templateId);
      console.log('Status:', req.status);
      
      // Parse formData to see what's inside
      try {
        const formData = JSON.parse(req.form_data_text);
        console.log('\nForm Data:');
        console.log(JSON.stringify(formData, null, 2));
        
        // Check specific fields that might contain priority
        console.log('\nPriority-related fields:');
        if (formData.priority) console.log('formData.priority:', formData.priority);
        if (formData.Priority) console.log('formData.Priority:', formData.Priority);
        if (formData['2']) console.log('formData["2"]:', formData['2']);
        if (formData['1']) console.log('formData["1"]:', formData['1']);
        if (formData['3']) console.log('formData["3"]:', formData['3']);
        
      } catch (e) {
        console.error('Error parsing formData:', e);
      }
    } else {
      console.log('Request 156 not found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRequestPriority();
