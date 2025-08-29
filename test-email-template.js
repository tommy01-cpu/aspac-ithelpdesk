const fs = require('fs');
const path = require('path');

// Test the email template processing
async function testEmailTemplate() {
  try {
    // Import the function
    const { convertDatabaseTemplateToEmail } = require('./lib/database-email-templates.ts');
    
    // Mock template data that matches the CC template structure
    const mockTemplate = {
      subject: 'IT HELPDESK: New Request ID #${Request_ID} from ${Requester_Name}',
      content_html: `<table style="background: rgb(58, 93, 115); margin: 0; padding-top: 40px; padding-bottom: 40px;" align="center" width="100%">
  <tbody>
    <tr>
      <td align="center">
        <div style="max-width: 600px; background-color: rgb(238, 242, 243);">
          <table cellpadding="0" cellspacing="0" border="0" width="600" align="center">
            <tbody>
              <tr>
                <td valign="top" bgcolor="#28313a" align="left" style="padding: 20px 15px 20px 65px;">
                  <h1 style="margin: 0; font-family: Arial, sans-serif; font-size: 24px; color: #fff; font-weight: normal;">
                    Aspac IT Help Desk
                  </h1>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom: 40px; background-color: rgb(238, 242, 243);">
                  <div style="background-color: rgb(238, 242, 243);">
                    <p>Request ID: \${Request_ID}</p>
                    <p>Requester: \${Requester_Name}</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  </tbody>
</table>`
    };

    const variables = {
      Request_ID: '123',
      Requester_Name: 'Test User'
    };

    const result = convertDatabaseTemplateToEmail(mockTemplate, variables);
    console.log('=== CONVERSION TEST RESULT ===');
    console.log('Subject:', result.subject);
    console.log('HTML Content preserved:', result.htmlContent.includes('<table'));
    console.log('Variables replaced:', result.htmlContent.includes('123') && result.htmlContent.includes('Test User'));
    console.log('Content length:', result.htmlContent.length);
    console.log('=== END TEST ===');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testEmailTemplate();
