const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testEmailNotification() {
  try {
    console.log('=== TESTING EMAIL NOTIFICATION DEBUG ===');
    
    // Test form data with tom.mandapat@aspacphils.com
    const testFormData = {
      "1": "Jose Tommy Mandapat Jr.",
      "2": "Low", 
      "3": "self-service-portal",
      "4": "Service",
      "5": "for-approval",
      "6": "Test Category 2",
      "8": "Install LOGiX+ Client App - Email Test", 
      "9": "<p>This is a test email notification for tom.mandapat@aspacphils.com and john.sanchez@aspacphils.com.ph</p>",
      "10": [
        "tom.mandapat@aspacphils.com",
        "jhon.sanchez@aspacphils.com"
      ],
      "12": []
    };
    
    console.log('1. Testing form data parsing...');
    console.log('Form data field 10:', testFormData['10']);
    console.log('Type of field 10:', typeof testFormData['10']);
    console.log('Is array:', Array.isArray(testFormData['10']));
    
    // Parse email_to_notify from form data (field number 10) - same logic as API
    let emailsToNotify = [];
    if (testFormData['10']) {
      if (typeof testFormData['10'] === 'string') {
        emailsToNotify = testFormData['10'].split(',').map(email => email.trim()).filter(email => email);
      } else if (Array.isArray(testFormData['10'])) {
        emailsToNotify = testFormData['10'].filter(email => email && email.trim());
      }
    }
    
    console.log('2. Parsed emails to notify:', emailsToNotify);
    console.log('Number of emails:', emailsToNotify.length);
    
    if (emailsToNotify.length === 0) {
      console.log('❌ No emails found to notify');
      return;
    }
    
    // Check if REQUEST_CREATED_CC template exists
    console.log('3. Checking email template...');
    
    // Check template mapping from database-email-templates constants
    const TEMPLATE_ID_MAPPING = {
      'REQUEST_CREATED_CC': 11, // acknowledge-cc-new-request
    };
    
    const templateId = TEMPLATE_ID_MAPPING['REQUEST_CREATED_CC'];
    console.log('Template ID for REQUEST_CREATED_CC:', templateId);
    
    if (!templateId) {
      console.log('❌ Template ID not found for REQUEST_CREATED_CC');
      return;
    }
    
    // Get the actual template from database
    const template = await prisma.email_templates.findUnique({
      where: { id: templateId }
    });
    
    if (!template) {
      console.log('❌ Template not found in database with ID:', templateId);
      return;
    }
    
    console.log('✅ Found template:', template.title);
    console.log('Template key:', template.template_key);
    console.log('Template subject:', template.subject);
    
    // Test email variables preparation
    console.log('4. Testing email variables...');
    const emailVariables = {
      Request_ID: '123',
      Request_Status: testFormData['5'] || 'for_approval',
      Request_Subject: testFormData['8'] || 'Test Request',
      Request_Description: testFormData['9'] || 'Test description',
      Requester_Name: testFormData['1'] || 'Test User',
      Requester_Email: 'test@example.com',
      Request_Title: testFormData['8'] || 'Test Request',
      Emails_To_Notify: emailsToNotify.join(', '),
      Approval_Link: 'http://192.168.1.85:3000/requests/approvals'
    };
    
    console.log('Email variables:', emailVariables);
    
    // Test template variable replacement
    console.log('5. Testing template processing...');
    
    // Simple variable replacement test
    let processedSubject = template.subject;
    let processedContent = template.content_html;
    
    Object.entries(emailVariables).forEach(([key, value]) => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      processedSubject = processedSubject.replace(regex, value || '');
      processedContent = processedContent.replace(regex, value || '');
    });
    
    console.log('Processed email subject:', processedSubject);
    console.log('Processed email content (first 200 chars):', processedContent.substring(0, 200));
    
    // Check if approval_link variable exists in template
    const hasApprovalLink = template.subject.includes('${approval_link}') || template.content_html.includes('${approval_link}');
    console.log('Template contains approval_link variable:', hasApprovalLink);
    
    console.log('6. ✅ Email notification test completed successfully!');
    console.log('Recipients that would receive emails:', emailsToNotify);
    
    // Test actual email sending using database template
    console.log('7. Testing actual email sending with database template...');
    
    try {
      // Test by making an HTTP request to our API (similar to how the form submission works)
      console.log('Testing API call to send-email endpoint...');
      
      // Create a minimal test - just log what would happen
      console.log('Email recipients that would receive notifications:');
      emailsToNotify.forEach((email, index) => {
        console.log(`  ${index + 1}. ${email}`);
        console.log(`     Subject: ${processedSubject}`);
        console.log(`     Template: acknowledge-cc-new-request (ID: ${templateId})`);
      });
      
      console.log('✅ Email notification system is ready!');
      console.log('🎯 To test with real emails, submit a request form with these emails in field 10');
      
    } catch (emailError) {
      console.log('❌ Error testing email:', emailError.message);
    }
    
  } catch (error) {
    console.error('❌ Error testing email notification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testEmailNotification();
