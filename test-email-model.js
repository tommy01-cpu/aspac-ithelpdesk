const { PrismaClient } = require('@prisma/client');

async function testEmailTemplates() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Testing email_templates model...');
    const templates = await prisma.email_templates.findMany({ take: 1 });
    console.log('✅ email_templates model works, found templates:', templates.length);
    
    if (templates.length > 0) {
      console.log('Sample template fields:', Object.keys(templates[0]));
    }
    
  } catch (error) {
    console.error('❌ Error testing email_templates model:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testEmailTemplates();
