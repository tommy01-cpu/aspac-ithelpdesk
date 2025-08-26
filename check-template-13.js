const { PrismaClient } = require('@prisma/client');

async function checkTemplate() {
  const prisma = new PrismaClient();
  
  try {
    const template = await prisma.email_templates.findUnique({
      where: { id: 13 }
    });
    
    if (template) {
      console.log('=== EMAIL TEMPLATE 13 ===');
      console.log('ID:', template.id);
      console.log('Name:', template.name);
      console.log('Subject:', template.subject);
      console.log('\n=== CONTENT ===');
      console.log(template.content);
      
      // Check for variable patterns
      console.log('\n=== VARIABLE ANALYSIS ===');
      const variables = template.content.match(/\$\{[^}]+\}/g) || [];
      console.log('Variables found:', variables);
      
      // Check specifically for approval link variations
      const approvalLinkVariations = [
        '${approval_link}',
        '${Approval_Link}', 
        '${approval_Link}',
        '${Approval_link}'
      ];
      
      approvalLinkVariations.forEach(variation => {
        if (template.content.includes(variation)) {
          console.log(`✅ Found: ${variation}`);
        } else {
          console.log(`❌ Not found: ${variation}`);
        }
      });
      
    } else {
      console.log('Template not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTemplate();
