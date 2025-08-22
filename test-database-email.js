const { getTemplateIdByType, getEmailTemplateById, convertDatabaseTemplateToEmail } = require('./lib/database-email-templates');

async function testDatabaseEmail() {
  console.log('🧪 Testing database email template system...\n');
  
  try {
    // Test 1: Get template ID for REQUEST_CREATED_REQUESTER
    console.log('1. Testing getTemplateIdByType for REQUEST_CREATED_REQUESTER...');
    const templateId = getTemplateIdByType('REQUEST_CREATED_REQUESTER');
    console.log(`   ✅ Template ID: ${templateId}\n`);
    
    if (!templateId) {
      console.log('   ❌ Template ID not found');
      return;
    }
    
    // Test 2: Get template from database
    console.log('2. Testing getEmailTemplateById...');
    const dbTemplate = await getEmailTemplateById(templateId);
    console.log(`   ✅ Database template found: ${dbTemplate?.title || 'N/A'}\n`);
    
    if (!dbTemplate) {
      console.log('   ❌ Database template not found');
      return;
    }
    
    // Test 3: Convert template to email format
    console.log('3. Testing convertDatabaseTemplateToEmail...');
    const variables = {
      Request_ID: '123',
      Requester_Name: 'John Doe',
      Request_Status: 'Pending',
      Request_Subject: 'Test Request',
      Request_Description: 'This is a test request',
      Base_URL: 'http://localhost:3000',
      Encoded_Request_URL: 'http%3A//localhost%3A3000/requests/view/123'
    };
    
    const emailContent = convertDatabaseTemplateToEmail(dbTemplate, variables);
    console.log('   ✅ Email conversion successful:');
    console.log(`   - Subject: ${emailContent.subject}`);
    console.log(`   - Text Content Length: ${emailContent.textContent.length} chars`);
    console.log(`   - HTML Content Length: ${emailContent.htmlContent.length} chars\n`);
    
    console.log('📧 Sample Text Content:');
    console.log(emailContent.textContent.substring(0, 200) + '...\n');
    
    console.log('🎉 All tests passed! Database email system is working.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Test other template types
async function testOtherTemplates() {
  console.log('\n🔍 Testing other template types...\n');
  
  const templateTypes = [
    'REQUEST_CREATED_CC',
    'APPROVAL_REQUIRED',
    'APPROVAL_REMINDER',
    'REQUEST_APPROVED_REJECTED',
    'REQUEST_ASSIGNED_REQUESTER',
    'REQUEST_ASSIGNED_TECHNICIAN',
    'REQUEST_RESOLVED_REQUESTER',
    'SLA_ESCALATION',
    'CLARIFICATION_REMINDER'
  ];
  
  for (const templateType of templateTypes) {
    try {
      const templateId = getTemplateIdByType(templateType);
      if (templateId) {
        const dbTemplate = await getEmailTemplateById(templateId);
        console.log(`   ✅ ${templateType}: ID ${templateId} - ${dbTemplate?.title || 'Not found'}`);
      } else {
        console.log(`   ❌ ${templateType}: No template ID found`);
      }
    } catch (error) {
      console.log(`   ❌ ${templateType}: Error - ${error.message}`);
    }
  }
}

// Run tests
testDatabaseEmail().then(() => {
  return testOtherTemplates();
}).finally(() => {
  process.exit(0);
});
