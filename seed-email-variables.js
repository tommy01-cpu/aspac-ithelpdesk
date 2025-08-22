const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedEmailTemplateVariables() {
  const variables = [
    {
      variableKey: 'Request_ID',
      displayName: 'Request ID',
      description: 'Unique identifier for the request',
      category: 'Request',
      exampleValue: '',
      isActive: true
    },
    {
      variableKey: 'Request_Approval_Status', 
      displayName: 'Request Approval Status',
      description: 'Approval status (APPROVED/REJECTED)',
      category: 'Request',
      exampleValue: '',
      isActive: true
    },
    {
      variableKey: 'Request_Status',
      displayName: 'Request Status', 
      description: 'Current status of the request',
      category: 'Request',
      exampleValue: '',
      isActive: true
    },
    {
      variableKey: 'Request_Approval_Comment',
      displayName: 'Request Approval Comment',
      description: 'Approval comment from approver (only appears when rejected)',
      category: 'Request',
      exampleValue: '',
      isActive: true
    },
    {
      variableKey: 'Request_Title',
      displayName: 'Request Title',
      description: 'Title of the request',
      category: 'Request', 
      exampleValue: '',
      isActive: true
    },
    {
      variableKey: 'Request_Description',
      displayName: 'Request Description',
      description: 'Detailed description of the request',
      category: 'Request',
      exampleValue: '',
      isActive: true
    },
    {
      variableKey: 'Requester_Email',
      displayName: 'Requester Email',
      description: 'Email address of the requester',
      category: 'User',
      exampleValue: '',
      isActive: true
    },
    {
      variableKey: 'Technician_Name',
      displayName: 'Technician Name',
      description: 'Name of the assigned technician',
      category: 'User',
      exampleValue: '',
      isActive: true
    },
    {
      variableKey: 'Due_By_Date',
      displayName: 'Due By Date',
      description: 'SLA due date for the request',
      category: 'Request',
      exampleValue: '',
      isActive: true
    },
    {
      variableKey: 'Emails_To_Notify',
      displayName: 'Emails To Notify',
      description: 'List of email addresses to notify',
      category: 'System',
      exampleValue: '',
      isActive: true
    },
    {
      variableKey: 'Request_Resolution',
      displayName: 'Request Resolution',
      description: 'Resolution description for the request',
      category: 'Request',
      exampleValue: '',
      isActive: true
    },
    {
      variableKey: 'Request_Subject',
      displayName: 'Request Subject',
      description: 'Subject/title of the request',
      category: 'Request',
      exampleValue: '',
      isActive: true
    }
  ];

  try {
    // Delete existing variables first
    await prisma.emailTemplateVariables.deleteMany({});
    console.log('Cleared existing variables');

    // Insert new variables
    for (const variable of variables) {
      await prisma.emailTemplateVariables.create({
        data: variable
      });
    }

    console.log(`Added ${variables.length} email template variables`);
    console.log('Variables added:', variables.map(v => v.variableKey));

  } catch (error) {
    console.error('Error seeding variables:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedEmailTemplateVariables();
