const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function finalFixTemplate() {
  try {
    const template = await prisma.email_templates.findUnique({
      where: { id: 10 }
    });
    
    if (template) {
      let fixedContent = template.content_html;
      
      // Show the problematic section
      const problematicIndex = fixedContent.indexOf('${Request_Status},');
      if (problematicIndex !== -1) {
        console.log('Found problematic section:');
        console.log(fixedContent.substring(problematicIndex - 100, problematicIndex + 100));
      }
      
      // Fix the specific issue: "Ticket ID: ${Request_Status}," should be "Ticket ID: ${Request_ID}"
      fixedContent = fixedContent.replace('${Request_Status},', '${Request_ID}');
      
      // Also ensure Dear line is fixed
      fixedContent = fixedContent.replace(/Dear \$\{[^}]*\}/g, 'Dear ${Requester_Name}');
      
      await prisma.email_templates.update({
        where: { id: 10 },
        data: { content_html: fixedContent }
      });
      
      console.log('\n✅ Template fixed successfully');
      
      // Verify the fix
      const updatedTemplate = await prisma.email_templates.findUnique({
        where: { id: 10 }
      });
      
      const matches = updatedTemplate.content_html.match(/\$\{[^}]+\}/g);
      console.log('Variables found after final fix:', matches);
      
      // Show the fixed section
      const fixedIndex = updatedTemplate.content_html.indexOf('${Request_ID}');
      if (fixedIndex !== -1) {
        console.log('\nFixed section:');
        console.log(updatedTemplate.content_html.substring(fixedIndex - 50, fixedIndex + 50));
      }
      
    } else {
      console.log('Template not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    try {
      await prisma.$disconnect();
    } catch (e) {
      // Ignore disconnect errors
    }
  }
}

finalFixTemplate();
