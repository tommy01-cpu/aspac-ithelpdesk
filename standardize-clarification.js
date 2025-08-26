const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function standardizeToClairification() {
  try {
    console.log('Standardizing to use ${Clarification} variable...');
    
    // Fix template 28 (requester response to approver)
    const template28 = await prisma.email_templates.findFirst({
      where: { id: 28 },
      select: { content_html: true }
    });
    
    if (template28) {
      const updatedContent28 = template28.content_html.replace(
        '${Requester_Response}',
        '${Clarification}'
      );
      
      await prisma.email_templates.update({
        where: { id: 28 },
        data: {
          content_html: updatedContent28,
          updated_at: new Date()
        }
      });
      
      console.log('✅ Updated template 28: ${Requester_Response} → ${Clarification}');
    }
    
    // Template 29 already uses ${Clarification}, so it's consistent
    console.log('✅ Template 29 already uses ${Clarification} - no change needed');
    
    console.log('✅ All templates now consistently use ${Clarification}');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

standardizeToClairification();
