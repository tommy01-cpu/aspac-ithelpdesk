const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTemplate() {
  try {
    const template = await prisma.email_templates.findFirst({
      where: { id: 28 },
      select: { content_html: true }
    });
    
    if (template) {
      console.log('Template 28 content (relevant section):');
      const content = template.content_html;
      
      // Find the section with Requester's Response
      const responseIndex = content.indexOf("Requester's Response");
      if (responseIndex !== -1) {
        const section = content.substring(responseIndex - 50, responseIndex + 150);
        console.log('...', section, '...');
      }
      
      // Look for variable patterns
      const variables = content.match(/\$\{[^}]+\}/g);
      console.log('\nAll variables found in template:');
      if (variables) {
        variables.forEach(v => console.log('-', v));
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTemplate();
