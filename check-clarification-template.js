const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkClarificationTemplate() {
  try {
    const template = await prisma.email_templates.findUnique({
      where: { id: 15 }, // CLARIFICATION_REQUIRED template ID
      select: {
        id: true,
        template_key: true,
        title: true,
        subject: true,
        content_html: true
      }
    });
    
    if (template) {
      console.log('=== CLARIFICATION EMAIL TEMPLATE ===');
      console.log('ID:', template.id);
      console.log('Key:', template.template_key);
      console.log('Title:', template.title);
      console.log('Subject:', template.subject);
      console.log('Content HTML (first 500 chars):');
      console.log(template.content_html.substring(0, 500));
      
      // Find all variables in the template
      const subjectVars = template.subject.match(/\$\{[^}]+\}/g) || [];
      const contentVars = template.content_html.match(/\$\{[^}]+\}/g) || [];
      const allVars = [...new Set([...subjectVars, ...contentVars])];
      
      console.log('\n=== VARIABLES USED IN TEMPLATE ===');
      allVars.forEach(v => console.log(v));
    } else {
      console.log('Template not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkClarificationTemplate();
