const { PrismaClient } = require('@prisma/client');
const { sendRequestCancelledCCEmail } = require('./lib/database-email-templates.ts');

const prisma = new PrismaClient();

async function testTemplate29() {
  try {
    console.log('🧪 Testing Template 29 - Cancellation CC Email');
    
    // Test variables that would be passed when a request is cancelled
    const testVariables = {
      Request_ID: '457',
      Request_Status: 'Cancelled',
      Requester_Name: 'Jose Tommy Mandapat',
      Request_Subject: 'Create an Email Account',
      Request_Description: 'test',
      Request_URL: 'http://192.168.1.85:3000/requests/view/457'
    };
    
    console.log('Variables:', testVariables);
    
    // Test CC recipients (use dummy emails for testing)
    const ccRecipients = ['test@example.com', 'cc@example.com'];
    
    console.log('CC Recipients:', ccRecipients);
    
    // This will test the template preparation but not actually send emails
    console.log('📧 Testing email preparation...');
    
    const result = await sendRequestCancelledCCEmail(ccRecipients, testVariables);
    
    if (result) {
      console.log('✅ Template 29 test completed successfully!');
    } else {
      console.log('❌ Template 29 test failed!');
    }
    
  } catch (error) {
    console.error('Error testing template 29:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTemplate29();
