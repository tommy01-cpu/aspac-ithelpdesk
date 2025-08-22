const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTemplate() {
  try {
    const template = await prisma.email_templates.findUnique({
      where: { id: 11 }
    });
    
    if (template) {
      console.log('=== TEMPLATE ID 11 CONFIGURATION ===');
      console.log('Title:', template.title);
      console.log('Template Key:', template.template_key);
      console.log('TO field:', template.to_field);
      console.log('CC field:', template.cc_field);
      console.log('BCC field:', template.bcc_field);
      console.log('Subject:', template.subject);
      console.log('Is Active:', template.is_active);
      
      console.log('\n=== ANALYSIS ===');
      if (template.to_field) {
        console.log('✅ TO field is configured:', template.to_field);
      }
      if (template.cc_field) {
        console.log('✅ CC field is configured:', template.cc_field);
      }
      if (template.bcc_field) {
        console.log('✅ BCC field is configured:', template.bcc_field);
      }
      
      if (!template.to_field && !template.cc_field && !template.bcc_field) {
        console.log('❌ No recipient fields configured!');
      }
      
    } else {
      console.log('❌ Template ID 11 not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTemplate();
