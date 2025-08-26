const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixTemplate() {
  try {
    console.log('Fixing template 28 variable...');
    
    // Get current template
    const template = await prisma.email_templates.findFirst({
      where: { id: 28 },
      select: { content_html: true }
    });
    
    if (template) {
      // Replace ${Clarification} with ${Requester_Response}
      const updatedContent = template.content_html.replace(
        '${Clarification}',
        '${Requester_Response}'
      );
      
      // Update the template
      await prisma.email_templates.update({
        where: { id: 28 },
        data: {
          content_html: updatedContent,
          updated_at: new Date()
        }
      });
      
      console.log('✅ Fixed template 28: ${Clarification} → ${Requester_Response}');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTemplate();
