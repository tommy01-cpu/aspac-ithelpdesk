const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addApprovalLinkVariable() {
  try {
    console.log('Adding approval_link variable to EmailTemplateVariables table...');
    
    // Check if the variable already exists
    const existingVariable = await prisma.emailTemplateVariables.findFirst({
      where: {
        variableKey: 'approval_link'
      }
    });
    
    if (existingVariable) {
      console.log('✅ approval_link variable already exists with ID:', existingVariable.id);
      console.log('Current description:', existingVariable.description);
      console.log('Current example value:', existingVariable.exampleValue);
      return;
    }
    
    // Insert the new approval_link variable
    const newVariable = await prisma.emailTemplateVariables.create({
      data: {
        variableKey: 'approval_link',
        displayName: 'Approval Link',
        description: 'Link to the approvals page where users can view and manage request approvals',
        category: 'System Links',
        defaultValue: 'http://192.168.1.85:3000/requests/approvals',
        exampleValue: 'http://192.168.1.85:3000/requests/approvals',
        isActive: true
      }
    });
    
    console.log('✅ Successfully added approval_link variable');
    console.log('Variable ID:', newVariable.id);
    console.log('Variable Key:', newVariable.variableKey);
    console.log('Display Name:', newVariable.displayName);
    console.log('Description:', newVariable.description);
    console.log('Example Value:', newVariable.exampleValue);
    console.log('Category:', newVariable.category);
    
    // Show all current variables for reference
    console.log('\n--- All Email Template Variables ---');
    const allVariables = await prisma.emailTemplateVariables.findMany({
      orderBy: { variableKey: 'asc' }
    });
    
    allVariables.forEach(variable => {
      console.log(`${variable.variableKey} - ${variable.displayName} (${variable.category})`);
    });
    
  } catch (error) {
    console.error('Error adding approval_link variable:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addApprovalLinkVariable();
