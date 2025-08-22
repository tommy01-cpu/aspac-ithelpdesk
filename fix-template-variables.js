const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixTemplateVariables() {
  try {
    // Check current template 10 content
    console.log('=== CHECKING TEMPLATE 10 ===');
    const template = await prisma.email_templates.findUnique({
      where: { id: 10 },
      select: { 
        id: true,
        template_key: true,
        title: true,
        subject: true,
        content_html: true
      }
    });
    
    console.log('Current subject:', template.subject);
    console.log('Template key:', template.template_key);
    
    // Check if content has the problematic variables
    const hasOldVariables = template.content_html.includes('$RequesterName') || 
                           template.content_html.includes('${id}') || 
                           template.content_html.includes('${subject}');
    
    console.log('Has old variable format:', hasOldVariables);
    
    if (hasOldVariables) {
      console.log('Found old variables in content, need to fix...');
      
      // Replace old variables with new format
      let updatedContent = template.content_html
        .replace(/\$RequesterName/g, '${Requester_Name}')
        .replace(/\$\{id\}/g, '${Request_ID}')
        .replace(/\$\{subject\}/g, '${Request_Subject}');
      
      console.log('Updating content with correct variables...');
      
      await prisma.email_templates.update({
        where: { id: 10 },
        data: {
          subject: 'IT HELPDESK: Your New Request ID ${Request_ID}',
          content_html: updatedContent
        }
      });
      
      console.log('✅ Template 10 updated successfully');
    } else {
      // Just fix the subject
      await prisma.email_templates.update({
        where: { id: 10 },
        data: {
          subject: 'IT HELPDESK: Your New Request ID ${Request_ID}'
        }
      });
      
      console.log('✅ Template 10 subject updated');
    }
    
    // Verify the update
    const updatedTemplate = await prisma.email_templates.findUnique({
      where: { id: 10 },
      select: { subject: true }
    });
    
    console.log('Updated subject:', updatedTemplate.subject);
    
  } catch (error) {
    console.error('Error fixing template variables:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTemplateVariables();
