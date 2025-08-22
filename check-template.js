const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTemplate() {
  try {
    const template = await prisma.email_templates.findUnique({
      where: { id: 10 }
    });
    
    if (template) {
      console.log('Template 10 content:');
      console.log('Subject:', template.subject);
      console.log('Content preview:');
      console.log(template.content_html.substring(0, 1000));
    } else {
      console.log('Template not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTemplate();
