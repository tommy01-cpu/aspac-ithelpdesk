const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testActualEmailSend() {
  try {
    console.log('=== TESTING ACTUAL EMAIL SEND TO tom.mandapat@aspacphils.com ===');
    
    // Create a test request entry in the database
    console.log('1. Creating test request...');
    
    const testRequest = await prisma.requests.create({
      data: {
        templateId: 1, // Assuming template ID 1 exists
        status: 'for_approval',
        formData: {
          "1": "Jose Tommy Mandapat Jr.",
          "2": "Low",
          "3": "self-service-portal", 
          "4": "Service",
          "5": "for_approval",
          "6": "Test Category 2",
          "8": "Install LOGiX+ Client App - Email Test",
          "9": "<p>This is a test email notification request</p>",
          "10": ["tom.mandapat@aspacphils.com"],
          "12": []
        },
        userId: 1, // Assuming user ID 1 exists
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Test request created with ID:', testRequest.id);
    
    // Test the send-email API endpoint
    console.log('2. Testing send-email API...');
    
    const emailData = {
      requestId: testRequest.id,
      templateKey: 'acknowledge-cc-new-request'
    };
    
    console.log('Sending email data:', emailData);
    
    // Make API call to our send-email endpoint
    const response = await fetch('http://localhost:3000/api/notifications/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData)
    });
    
    const result = await response.json();
    
    console.log('3. API Response Status:', response.status);
    console.log('API Response:', result);
    
    if (response.ok) {
      console.log('✅ Email API call successful!');
      console.log('Emails sent:', result.emailsSent);
      console.log('Emails failed:', result.emailsFailed);
      console.log('Results:', result.results);
    } else {
      console.log('❌ Email API call failed:', result.error);
    }
    
    // Clean up - delete the test request
    console.log('4. Cleaning up test request...');
    await prisma.requests.delete({
      where: { id: testRequest.id }
    });
    console.log('✅ Test request cleaned up');
    
  } catch (error) {
    console.error('❌ Error testing actual email send:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testActualEmailSend();
