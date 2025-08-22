const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCCTemplate() {
  try {
    console.log('=== CHECKING acknowledge-cc-new-request TEMPLATE ===');
    
    // Check if the template exists
    const template = await prisma.email_templates.findFirst({
      where: { 
        template_key: 'acknowledge-cc-new-request'
      }
    });
    
    if (template) {
      console.log('✅ Template found!');
      console.log('Template details:');
      console.log('  ID:', template.id);
      console.log('  Template Key:', template.template_key);
      console.log('  Title:', template.title);
      console.log('  Subject:', template.subject);
      console.log('  TO field:', template.to_field);
      console.log('  CC field:', template.cc_field);
      console.log('  BCC field:', template.bcc_field);
      console.log('  Is Active:', template.is_active);
      console.log('  Created At:', template.created_at);
      console.log('  Updated At:', template.updated_at);
      
      // Check if it matches the expected ID from our mapping
      if (template.id === 11) {
        console.log('✅ Template ID matches expected mapping (ID: 11)');
      } else {
        console.log(`⚠️ Template ID (${template.id}) does not match expected mapping (ID: 11)`);
        console.log('You may need to update the TEMPLATE_ID_MAPPING in database-email-templates.ts');
      }
      
    } else {
      console.log('❌ Template with key "acknowledge-cc-new-request" NOT FOUND');
      
      // Check if there are any templates with similar names
      console.log('\nSearching for similar templates...');
      const similarTemplates = await prisma.email_templates.findMany({
        where: {
          OR: [
            { template_key: { contains: 'cc' } },
            { template_key: { contains: 'acknowledge' } },
            { title: { contains: 'cc' } },
            { title: { contains: 'acknowledge' } }
          ]
        },
        select: {
          id: true,
          template_key: true,
          title: true,
          is_active: true
        }
      });
      
      if (similarTemplates.length > 0) {
        console.log('Found similar templates:');
        similarTemplates.forEach(t => {
          console.log(`  ID: ${t.id} | Key: ${t.template_key} | Title: ${t.title} | Active: ${t.is_active}`);
        });
      } else {
        console.log('No similar templates found');
      }
      
      // List all templates
      console.log('\nAll available templates:');
      const allTemplates = await prisma.email_templates.findMany({
        select: {
          id: true,
          template_key: true,
          title: true,
          is_active: true
        },
        orderBy: { id: 'asc' }
      });
      
      allTemplates.forEach(t => {
        console.log(`  ID: ${t.id} | Key: ${t.template_key} | Active: ${t.is_active}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking template:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCCTemplate();
