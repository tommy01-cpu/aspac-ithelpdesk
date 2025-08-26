const { PrismaClient } = require('@prisma/client');

async function checkTemplateColumns() {
  const prisma = new PrismaClient();
  
  try {
    // Get all columns from the template
    const template = await prisma.email_templates.findUnique({
      where: { id: 13 }
    });
    
    console.log('=== FULL TEMPLATE OBJECT ===');
    console.log(JSON.stringify(template, null, 2));
    
    if (template) {
      // Check all possible content column names
      const possibleContentFields = ['content', 'body', 'template', 'html', 'message'];
      
      console.log('\n=== CHECKING CONTENT FIELDS ===');
      possibleContentFields.forEach(field => {
        if (template[field] !== undefined) {
          console.log(`✅ Found content in field: ${field}`);
          console.log(`Content length: ${template[field]?.length || 0}`);
          
          if (template[field] && typeof template[field] === 'string') {
            // Check for approval_link variations
            const approvalLinkVariations = [
              '${approval_link}',
              '${Approval_Link}', 
              '${approval_Link}',
              '${Approval_link}'
            ];
            
            console.log('\n=== APPROVAL LINK ANALYSIS ===');
            approvalLinkVariations.forEach(variation => {
              if (template[field].includes(variation)) {
                console.log(`✅ Found: ${variation}`);
              } else {
                console.log(`❌ Not found: ${variation}`);
              }
            });
            
            // Show variables in template
            const variables = template[field].match(/\$\{[^}]+\}/g) || [];
            console.log('\n=== ALL VARIABLES FOUND ===');
            variables.forEach(variable => console.log(`- ${variable}`));
          }
        }
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTemplateColumns();
