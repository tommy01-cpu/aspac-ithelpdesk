const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testEmailSendingDebug() {
  try {
    console.log('=== DEBUGGING EMAIL SENDING ISSUE ===');
    
    // Check if any requests exist with field 10 having email data
    console.log('1. Checking recent requests with email notifications...');
    
    const recentRequests = await prisma.requests.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            emp_fname: true,
            emp_lname: true,
            emp_email: true
          }
        }
      }
    });
    
    console.log(`Found ${recentRequests.length} recent requests`);
    
    recentRequests.forEach((req, index) => {
      console.log(`\nRequest ${index + 1}:`);
      console.log(`  ID: ${req.id}`);
      console.log(`  Status: ${req.status}`);
      console.log(`  User: ${req.user?.emp_fname} ${req.user?.emp_lname}`);
      console.log(`  FormData field 10:`, req.formData?.['10']);
      
      if (req.formData?.['10']) {
        const emails = Array.isArray(req.formData['10']) ? req.formData['10'] : [req.formData['10']];
        console.log(`  ✅ Has email notifications for: ${emails.join(', ')}`);
      } else {
        console.log(`  ❌ No email notifications configured`);
      }
    });
    
    // Check email configuration
    console.log('\n2. Checking email configuration...');
    
    // Check if we have email settings in environment or database
    const mailSettings = await prisma.mail_server_settings.findFirst({
      where: { is_active: true }
    });
    
    if (mailSettings) {
      console.log('✅ Mail server settings found:');
      console.log(`  Host: ${mailSettings.smtp_host}`);
      console.log(`  Port: ${mailSettings.smtp_port}`);
      console.log(`  Security: ${mailSettings.smtp_security}`);
      console.log(`  Username: ${mailSettings.smtp_username}`);
      console.log(`  From Email: ${mailSettings.from_email}`);
      console.log(`  From Name: ${mailSettings.from_name}`);
      console.log(`  Is Active: ${mailSettings.is_active}`);
    } else {
      console.log('❌ No active mail server settings found');
    }
    
    // Test template processing
    console.log('\n3. Testing template processing with real data...');
    
    const testRequest = recentRequests.find(req => req.formData?.['10']);
    if (testRequest) {
      console.log(`Using request ID ${testRequest.id} for testing`);
      
      // Test our API endpoint
      console.log('\n4. Testing send-email API endpoint...');
      
      const apiUrl = 'http://localhost:3000/api/notifications/send-email';
      const requestBody = {
        requestId: testRequest.id,
        templateKey: 'acknowledge-cc-new-request'
      };
      
      console.log('API URL:', apiUrl);
      console.log('Request body:', requestBody);
      
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });
        
        const result = await response.json();
        
        console.log('API Response Status:', response.status);
        console.log('API Response:', JSON.stringify(result, null, 2));
        
        if (response.ok) {
          console.log('✅ API call successful');
          if (result.emailsSent > 0) {
            console.log(`📧 ${result.emailsSent} email(s) reported as sent`);
          } else {
            console.log('⚠️ No emails were sent');
          }
        } else {
          console.log('❌ API call failed');
        }
        
      } catch (apiError) {
        console.log('❌ API call error:', apiError.message);
      }
      
    } else {
      console.log('❌ No requests found with email notification data to test');
    }
    
  } catch (error) {
    console.error('❌ Error in debugging:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testEmailSendingDebug();
