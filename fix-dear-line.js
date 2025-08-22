const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDearLine() {
  try {
    const template = await prisma.email_templates.findUnique({
      where: { id: 10 }
    });
    
    if (template) {
      // Find and show the Dear line
      const dearIndex = template.content_html.toLowerCase().indexOf('dear');
      if (dearIndex !== -1) {
        console.log('Current Dear line:');
        console.log(template.content_html.substring(dearIndex, dearIndex + 100));
      }
      
      let fixedContent = template.content_html;
      
      // Fix Dear line - look for any pattern starting with "Dear" and ending with "}"
      fixedContent = fixedContent.replace(/Dear\s*\$\{[^}]*\}/g, 'Dear ${Requester_Name}');
      
      await prisma.email_templates.update({
        where: { id: 10 },
        data: { content_html: fixedContent }
      });
      
      console.log('\n✅ Dear line fixed');
      
      // Verify
      const updatedTemplate = await prisma.email_templates.findUnique({
        where: { id: 10 }
      });
      
      const updatedDearIndex = updatedTemplate.content_html.toLowerCase().indexOf('dear');
      if (updatedDearIndex !== -1) {
        console.log('\nUpdated Dear line:');
        console.log(updatedTemplate.content_html.substring(updatedDearIndex, updatedDearIndex + 100));
      }
      
      const matches = updatedTemplate.content_html.match(/\$\{[^}]+\}/g);
      console.log('\nAll variables in template:', matches);
      
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    try {
      await prisma.$disconnect();
    } catch (e) {}
  }
}

fixDearLine();
