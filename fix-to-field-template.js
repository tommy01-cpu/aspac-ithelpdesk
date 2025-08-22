const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateTemplateToField() {
  try {
    console.log('=== UPDATING CC TEMPLATE TO USE TO FIELD ===');
    
    // Update template ID 11 to use TO field for direct email sending
    const updatedTemplate = await prisma.email_templates.update({
      where: { id: 11 },
      data: {
        to_field: '${Emails_To_Notify}',
        cc_field: '',
        bcc_field: '',
        updated_at: new Date()
      }
    });
    
    console.log('✅ Template updated successfully!');
    console.log('Template ID:', updatedTemplate.id);
    console.log('Template Key:', updatedTemplate.template_key);
    console.log('Title:', updatedTemplate.title);
    console.log('TO field:', updatedTemplate.to_field);
    console.log('CC field:', updatedTemplate.cc_field);
    console.log('BCC field:', updatedTemplate.bcc_field);
    
    console.log('\n=== CONFIGURATION ===');
    console.log('✅ TO field set to: ${Emails_To_Notify}');
    console.log('✅ This means both recipients will receive the email directly');
    console.log('✅ No CC/BCC fields needed for this use case');
    
  } catch (error) {
    console.error('❌ Error updating template:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateTemplateToField();
