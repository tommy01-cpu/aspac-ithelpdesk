const { PrismaClient } = require('@prisma/client');

async function testEmailTemplates() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Testing email_templates model...');
    const count = await prisma.email_templates.count();
    console.log('✅ email_templates model works! Count:', count);
    
    if (count > 0) {
      const sample = await prisma.email_templates.findFirst();
      console.log('Sample template:', {
        id: sample.id,
        title: sample.title,
        template_key: sample.template_key,
        is_active: sample.is_active
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing email_templates model:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testEmailTemplates();
