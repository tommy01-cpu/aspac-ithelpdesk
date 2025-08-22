const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateCCTemplate() {
  try {
    console.log('=== UPDATING CC EMAIL TEMPLATE CONFIGURATION ===');
    
    // Get current template
    const template = await prisma.email_templates.findUnique({
      where: { id: 11 }
    });
    
    if (!template) {
      console.log('❌ Template ID 11 not found');
      return;
    }
    
    console.log('Current template configuration:');
    console.log('TO field:', template.to_field);
    console.log('CC field:', template.cc_field);
    console.log('BCC field:', template.bcc_field);
    
    // Update template to use CC field for notifications
    console.log('\n🔧 Updating template to use CC field...');
    
    const updatedTemplate = await prisma.email_templates.update({
      where: { id: 11 },
      data: {
        to_field: '', // Clear TO field
        cc_field: '${Emails_To_Notify}', // Move to CC field
        updated_at: new Date()
      }
    });
    
    console.log('✅ Template updated successfully!');
    console.log('New TO field:', updatedTemplate.to_field);
    console.log('New CC field:', updatedTemplate.cc_field);
    console.log('New BCC field:', updatedTemplate.bcc_field);
    
    console.log('\n🎯 Template is now configured to send emails as CC');
    
  } catch (error) {
    console.error('❌ Error updating template:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateCCTemplate();
