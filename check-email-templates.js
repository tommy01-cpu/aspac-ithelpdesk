const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEmailTemplates() {
  try {
    const requesterTemplate = await prisma.email_templates.findUnique({
      where: { id: 20 }
    });
    
    const ccTemplate = await prisma.email_templates.findUnique({
      where: { id: 21 }
    });
    
    console.log('Template ID 20 (Requester Resolved):', requesterTemplate ? '✅ Found' : '❌ Missing');
    if (requesterTemplate) {
      console.log('  Subject:', requesterTemplate.subject);
      console.log('  Template Key:', requesterTemplate.template_key);
    }
    
    console.log('Template ID 21 (CC Resolved):', ccTemplate ? '✅ Found' : '❌ Missing');
    if (ccTemplate) {
      console.log('  Subject:', ccTemplate.subject);
      console.log('  Template Key:', ccTemplate.template_key);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkEmailTemplates();
