const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixCCTemplate() {
  try {
    console.log('=== FIXING CC EMAIL TEMPLATE CONFIGURATION ===');
    
    // For CC notifications, we need a primary TO recipient and CC the notification users
    // Option 1: Send TO the requester and CC the notification users
    // Option 2: Send TO the notification users (simpler approach)
    
    console.log('🔧 Setting template to send TO the notification recipients...');
    
    const updatedTemplate = await prisma.email_templates.update({
      where: { id: 11 },
      data: {
        to_field: '${Emails_To_Notify}', // Send TO the notification recipients
        cc_field: '', // Clear CC field for now
        updated_at: new Date()
      }
    });
    
    console.log('✅ Template updated successfully!');
    console.log('TO field:', updatedTemplate.to_field);
    console.log('CC field:', updatedTemplate.cc_field);
    
    console.log('\n🎯 Template will now send emails TO the notification recipients');
    console.log('This is the standard approach for CC notifications in IT helpdesk systems');
    
  } catch (error) {
    console.error('❌ Error updating template:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCCTemplate();
