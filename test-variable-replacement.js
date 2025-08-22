const { PrismaClient } = require('@prisma/client');
const { convertDatabaseTemplateToEmail, getEmailTemplateById } = require('./lib/database-email-templates');

const prisma = new PrismaClient();

async function testVariableReplacement() {
  try {
    console.log('=== TESTING EMAIL VARIABLE REPLACEMENT ===');
    
    // Get template 10 (acknowledge new request)
    const template = await getEmailTemplateById(10);
    if (!template) {
      console.error('Template not found');
      return;
    }
    
    console.log('Template subject:', template.subject);
    
    // Test variables
    const testVariables = {
      Request_ID: '123',
      Request_Subject: 'Test Request',
      Requester_Name: 'John Doe',
      Request_Status: 'for_approval'
    };
    
    console.log('Test variables:', testVariables);
    
    // Convert template with variables
    const result = convertDatabaseTemplateToEmail(template, testVariables);
    
    console.log('=== CONVERSION RESULT ===');
    console.log('Subject after replacement:', result.subject);
    console.log('HTML content preview (first 200 chars):');
    console.log(result.htmlContent.substring(0, 200));
    
    // Check if variables were replaced
    const hasUnreplacedVariables = result.subject.includes('${') || result.htmlContent.includes('${');
    console.log('Has unreplaced variables:', hasUnreplacedVariables);
    
    if (!hasUnreplacedVariables) {
      console.log('✅ Variable replacement is working correctly!');
    } else {
      console.log('❌ Some variables were not replaced');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testVariableReplacement();
