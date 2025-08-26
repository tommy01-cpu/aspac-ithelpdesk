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
      variableKey: 'Clarification',
      displayName: 'Clarification',
      description: 'Comment/message when clarification is requested from the approver',
      category: 'Approval',
      exampleValue: 'Please provide more details about the hardware specifications',
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
      variableKey: 'Requester_Name',
      displayName: 'Requester Name',
      description: 'Full name of the person who created the request',
      category: 'User',
      exampleValue: 'John Doe',
      isActive: true
    },
    {
      variableKey: 'Approver_Name',
      displayName: 'Approver Name',
      description: 'Full name of the approver',
      category: 'User',
      exampleValue: 'Jane Smith',
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
    },
    {
      variableKey: 'approval_link',
      displayName: 'Approval Link',
      description: 'Direct link to approval action page',
      category: 'System',
      exampleValue: 'https://helpdesk.example.com/approvals?requestId=123',
      isActive: true
    },
    {
      variableKey: 'Base_URL',
      displayName: 'Base URL',
      description: 'Base URL of the IT Helpdesk system',
      category: 'System',
      exampleValue: 'https://helpdesk.example.com',
      isActive: true
    },
    {
      variableKey: 'Request_URL',
      displayName: 'Request URL',
      description: 'Direct link to view the request',
      category: 'System',
      exampleValue: 'https://helpdesk.example.com/requests/view/123',
      isActive: true
    },
    {
      variableKey: 'Service_Name',
      displayName: 'Service Name',
      description: 'Name of the service being requested',
      category: 'Service',
      exampleValue: 'Hardware Request',
      isActive: true
    },
    {
      variableKey: 'Category_Name',
      displayName: 'Category Name',
      description: 'Category of the service',
      category: 'Service',
      exampleValue: 'IT Equipment',
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
