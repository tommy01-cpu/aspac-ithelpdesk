const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Simple status formatting function 
function formatStatusForDisplay(status) {
  switch (status?.toLowerCase().trim()) {
    case 'for_approval':
      return 'For Approval';
    case 'for_clarification':
      return 'For Clarification';
    case 'cancelled':
      return 'Cancelled';
    case 'open':
      return 'Open';
    case 'on_hold':
      return 'On Hold';
    case 'resolved':
      return 'Resolved';
    case 'closed':
      return 'Closed';
    case 'new':
      return 'New';
    case 'in_progress':
    case 'in-progress':
      return 'In Progress';
    case 'assigned':
      return 'Assigned';
    case 'approved':
      return 'Approved';
    case 'completed':
      return 'Completed';
    default:
      // Capitalize first letter for unknown statuses
      return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
  }
}

async function testClarificationEmail() {
  try {
    console.log('=== TESTING CLARIFICATION EMAIL VARIABLES ===');
    
    // Test variables that should be passed to the email
    const testVariables = {
      Request_ID: '259',
      Request_Subject: 'Test Request Subject',
      Request_Description: 'This is a test request description with some details about the issue.',
      Request_Status: formatStatusForDisplay('for_approval'), // Should show "For Approval"
      Requester_Name: 'Jose Tommy Mandapat',
      Requester_Email: 'jose@example.com',
      Clarification: 'New message from Jane Doe: test again and again'
    };
    
    console.log('Test variables to be passed:');
    Object.entries(testVariables).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    
    console.log('\n=== STATUS FORMATTING TEST ===');
    console.log(`for_approval -> ${formatStatusForDisplay('for_approval')}`);
    console.log(`for_clarification -> ${formatStatusForDisplay('for_clarification')}`);
    console.log(`approved -> ${formatStatusForDisplay('approved')}`);
    console.log(`rejected -> ${formatStatusForDisplay('rejected')}`);
    
    // Get the template to verify it has the variables we're providing
    const template = await prisma.email_templates.findUnique({
      where: { id: 15 }, // CLARIFICATION_REQUIRED template
      select: {
        subject: true,
        content_html: true
      }
    });
    
    if (template) {
      console.log('\n=== TEMPLATE VARIABLE VALIDATION ===');
      const subjectVars = template.subject.match(/\$\{[^}]+\}/g) || [];
      const contentVars = template.content_html.match(/\$\{[^}]+\}/g) || [];
      const allTemplateVars = [...new Set([...subjectVars, ...contentVars])];
      
      console.log('Variables in template:');
      allTemplateVars.forEach(v => console.log(`  ${v}`));
      
      console.log('\nVariable validation:');
      allTemplateVars.forEach(templateVar => {
        const varName = templateVar.replace('${', '').replace('}', '');
        const hasVariable = testVariables.hasOwnProperty(varName);
        console.log(`  ${templateVar}: ${hasVariable ? '✅ PROVIDED' : '❌ MISSING'}`);
      });
    }
    
  } catch (error) {
    console.error('Error testing clarification email:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testClarificationEmail();
