const { PrismaClient } = require('@prisma/client');

async function checkTemplate() {
  const prisma = new PrismaClient();
  try {
    console.log('🔍 Checking Template 10 variables...');
    
    const template = await prisma.emailTemplate.findUnique({
      where: { id: 10 }
    });
    
    if (!template) {
      console.log('❌ Template 10 not found');
      return;
    }
    
    console.log('✅ Template found:', template.name);
    console.log('📝 Subject:', template.subject);
    
    // Check the template content for description variable
    if (template.content.includes('Request_Description')) {
      console.log('✅ Template uses Request_Description variable');
    } else {
      console.log('❌ Template does NOT use Request_Description variable');
    }
    
    // Show first 1000 chars of template content
    console.log('📄 Template content preview:');
    console.log(template.content.substring(0, 1000) + '...');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTemplate();
