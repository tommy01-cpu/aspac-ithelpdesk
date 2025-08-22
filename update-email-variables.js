const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateEmailVariables() {
  try {
    console.log('=== UPDATING EMAIL VARIABLES ===');
    
    // 1. Add requester_name variable to the table (if it doesn't exist)
    console.log('1. Adding requester_name variable...');
    
    const existingVariable = await prisma.emailTemplateVariables.findFirst({
      where: { variableKey: 'requester_name' }
    });
    
    if (!existingVariable) {
      await prisma.emailTemplateVariables.create({
        data: {
          variableKey: 'requester_name',
          displayName: 'Requester Name',
          description: 'Full name of the person making the request',
          category: 'General',
          exampleValue: 'John Doe',
          isActive: true
        }
      });
      console.log('✅ Added requester_name variable');
    } else {
      console.log('ℹ️ requester_name variable already exists');
    }
    
    // 2. Fix template 10 subject - remove the extra variables
    console.log('2. Fixing template 10 subject...');
    
    const template10 = await prisma.email_templates.findUnique({
      where: { id: 10 },
      select: { subject: true }
    });
    
    console.log('Current subject:', template10.subject);
    
    // Update to clean subject
    await prisma.email_templates.update({
      where: { id: 10 },
      data: {
        subject: 'IT HELPDESK: Your New Request ID ${Request_ID}'
      }
    });
    
    console.log('✅ Updated template 10 subject');
    
    // 3. Verify the changes
    const updatedTemplate = await prisma.email_templates.findUnique({
      where: { id: 10 },
      select: { subject: true }
    });
    
    console.log('New subject:', updatedTemplate.subject);
    
    // 4. List all variables now
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
    
  } catch (error) {
    console.error('Error updating email variables:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateEmailVariables();
