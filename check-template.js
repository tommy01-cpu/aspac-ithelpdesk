const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTemplate() {
  try {
    const template = await prisma.email_templates.findUnique({
      where: { id: 13 }
    });
    
    if (template) {
      console.log('=== EMAIL TEMPLATE 13 VARIABLES ===');
      console.log('Subject:', template.subject);
      
      // Look for variables in the content
      const content = template.content_html;
      console.log('\n=== SEARCHING FOR APPROVAL LINK VARIABLES ===');
      
      // Search for request-related variables
      const requestMatches = content.match(/\${[^}]*request[^}]*}/gi);
      console.log('Request variables:', requestMatches);
      
      // Search for approval-related variables
      const approvalMatches = content.match(/\${[^}]*approval[^}]*}/gi);
      console.log('Approval variables:', approvalMatches);
      
      // Search for link variables
      const linkMatches = content.match(/\${[^}]*link[^}]*}/gi);
      console.log('Link variables:', linkMatches);
      
      // Search for URL variables
      const urlMatches = content.match(/\${[^}]*url[^}]*}/gi);
      console.log('URL variables:', urlMatches);
      
      // Show all variables
      const allVariables = content.match(/\${[^}]+}/g);
      console.log('\nAll variables found:', allVariables);
      
      // Show a snippet around where approval_link might be
      const linkIndex = content.toLowerCase().indexOf('approval');
      if (linkIndex !== -1) {
        const snippet = content.substring(Math.max(0, linkIndex - 100), linkIndex + 200);
        console.log('\n=== APPROVAL SECTION ===');
        console.log(snippet);
      }
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
