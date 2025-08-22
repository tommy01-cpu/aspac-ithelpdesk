const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addRequestLinkVariable() {
  try {
    console.log('=== ADDING REQUEST_LINK VARIABLE ===');
    
    // 1. Add Request_Link variable to the table
    console.log('1. Adding Request_Link variable...');
    
    const existingVariable = await prisma.emailTemplateVariables.findFirst({
      where: { variableKey: 'Request_Link' }
    });
    
    if (!existingVariable) {
      await prisma.emailTemplateVariables.create({
        data: {
          variableKey: 'Request_Link',
          displayName: 'Request Link',
          description: 'Direct link to view the request (with auto-login if needed)',
          category: 'System',
          exampleValue: 'http://localhost:3000/login?callbackUrl=%2Frequests%2Fview%2F123',
          isActive: true
        }
      });
      console.log('✅ Added Request_Link variable');
    } else {
      console.log('ℹ️ Request_Link variable already exists');
    }
    
    // 2. Update the template content to use ${Request_Link} instead of $RequestLink
    console.log('2. Updating template 10 content...');
    
    const template10 = await prisma.email_templates.findUnique({
      where: { id: 10 },
      select: { content_html: true }
    });
    
    // Replace $RequestLink with ${Request_Link}
    const updatedContent = template10.content_html
      .replace(/\$RequestLink/g, '${Request_Link}')
      .replace(/\$\{requester\.name\}/g, '${Requester_Name}')
      .replace(/\$\{id\}/g, '${Request_ID}')
      .replace(/\$\{subject\}/g, '${Request_Subject}');
    
    await prisma.email_templates.update({
      where: { id: 10 },
      data: {
        content_html: updatedContent
      }
    });
    
    console.log('✅ Updated template 10 content with correct variables');
    
    // 3. List all variables
    console.log('3. Current email template variables:');
    const allVariables = await prisma.emailTemplateVariables.findMany({
      where: { isActive: true },
      select: {
        variableKey: true,
        displayName: true,
        category: true
      },
      orderBy: [
        { category: 'asc' },
        { displayName: 'asc' }
      ]
    });
    
    console.log('Total variables:', allVariables.length);
    allVariables.forEach(v => {
      console.log(`  - ${v.variableKey} (${v.displayName}) [${v.category}]`);
    });
    
    console.log('=== UPDATE COMPLETE ===');
    console.log('');
    console.log('📝 NOTE: The Request_Link variable will be automatically populated with:');
    console.log('   http://localhost:3000/login?callbackUrl=/requests/view/[REQUEST_ID]');
    console.log('   This ensures users are logged in before viewing the request.');
    
  } catch (error) {
    console.error('Error adding Request_Link variable:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addRequestLinkVariable();
