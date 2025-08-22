const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addApproverEmailVariable() {
  try {
    console.log('Adding approver_email variable to EmailTemplateVariables table...');
    
    // Check if the variable already exists
    const existingVariable = await prisma.emailTemplateVariables.findFirst({
      where: {
        variableKey: 'approver_email'
      }
    });
    
    if (existingVariable) {
      console.log('✅ approver_email variable already exists with ID:', existingVariable.id);
      console.log('Current description:', existingVariable.description);
      console.log('Current example value:', existingVariable.exampleValue);
      return;
    }
    
    // Insert the new approver_email variable
    const newVariable = await prisma.emailTemplateVariables.create({
      data: {
        variableKey: 'approver_email',
        displayName: 'Approver Email',
        description: 'Email address of the person who approved or is assigned to approve the request',
        category: 'Approval Information',
        defaultValue: '',
        exampleValue: 'john.doe@company.com',
        isActive: true
      }
    });
    
    console.log('✅ Successfully added approver_email variable');
    console.log('Variable ID:', newVariable.id);
    console.log('Variable Key:', newVariable.variableKey);
    console.log('Display Name:', newVariable.displayName);
    console.log('Description:', newVariable.description);
    console.log('Example Value:', newVariable.exampleValue);
    console.log('Category:', newVariable.category);
    
    // Show approval-related variables
    console.log('\n--- Approval-Related Email Template Variables ---');
    const approvalVariables = await prisma.emailTemplateVariables.findMany({
      where: {
        OR: [
          { category: 'Approval Information' },
          { variableKey: { contains: 'approval' } },
          { variableKey: { contains: 'approver' } }
        ]
      },
      orderBy: { variableKey: 'asc' }
    });
    
    approvalVariables.forEach(variable => {
      console.log(`${variable.variableKey} - ${variable.displayName} (ID: ${variable.id})`);
    });
    
  } catch (error) {
    console.error('Error adding approver_email variable:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addApproverEmailVariable();
