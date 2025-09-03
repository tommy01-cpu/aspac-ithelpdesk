const { PrismaClient } = require('@prisma/client');

async function checkTemplate29() {
  const prisma = new PrismaClient();
  
  try {
    const template = await prisma.email_templates.findUnique({
      where: { id: 29 }
    });
    
    if (template) {
      console.log('=== Template 29 Details ===');
      console.log('ID:', template.id);
      console.log('Title:', template.title);
      console.log('Subject:', template.subject);
      console.log('\n=== Header HTML ===');
      console.log(template.header_html || 'No header');
      console.log('\n=== Content HTML ===');
      console.log(template.content_html);
      console.log('\n=== Footer HTML ===');
      console.log(template.footer_html || 'No footer');
      console.log('\n=== Template Key ===');
      console.log(template.template_key);
      console.log('\n=== Active Status ===');
      console.log(template.is_active);
    } else {
      console.log('Template 29 not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTemplate29();
