const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showAndFixTemplate() {
  try {
    const template = await prisma.email_templates.findUnique({
      where: { id: 10 }
    });
    
    if (template) {
      console.log('Current template content (searching for issues):');
      
      // Show context around each variable
      const problematicPatterns = [
        'Dear ${',
        'Ticket ID: ${',
        'Request_Status}',
        'Due_By_Date}',
        'Requester_Name}'
      ];
      
      for (const pattern of problematicPatterns) {
        const index = template.content_html.indexOf(pattern);
        if (index !== -1) {
          const start = Math.max(0, index - 50);
          const end = Math.min(template.content_html.length, index + 100);
          console.log(`\nFound "${pattern}" at position ${index}:`);
          console.log(template.content_html.substring(start, end));
        }
      }
      
      // Now fix the template properly
      let fixedContent = template.content_html;
      
      // Fix the Dear line (should be Requester_Name)
      fixedContent = fixedContent.replace(/Dear \$\{[^}]*\}/g, 'Dear ${Requester_Name}');
      
      // Fix the Ticket ID line (should be Request_ID)
      fixedContent = fixedContent.replace(/Ticket ID: \$\{Request_Status\}/g, 'Ticket ID: ${Request_ID}');
      
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
      console.log('\nVariables found after fix:', matches);
      
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

showAndFixTemplate();
