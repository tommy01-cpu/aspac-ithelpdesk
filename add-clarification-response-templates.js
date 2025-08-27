const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addClarificationResponseTemplates() {
  try {
    console.log('Adding clarification response email templates...');

    // Template 1: Notify approver when requester responds to clarification
    const approverNotificationTemplate = await prisma.email_templates.create({
      data: {
        template_key: 'clarification_response_to_approver',
        title: 'Clarification Response - Notify Approver',
        description: 'Email sent to approver when requester responds to clarification request',
        subject: 'Response Received for Clarification Request - ${Request_Subject}',
        content_html: `<table style="background: rgb(58, 93, 115); margin: 0; padding-top: 40px; padding-bottom: 40px" align="center" width="100%">
  <tbody>
    <tr>
      <td align="center">
        <div style="max-width: 600px; background-color: rgb(238, 242, 243)">
          <table cellpadding="0" cellspacing="0" border="0" width="600" align="center" style="margin: 0px auto; font-family: Arial, sans-serif; border-collapse: collapse; max-width: 600px; border-spacing: 0; background-color: rgb(255, 255, 255)">
            <tbody>
              <!-- Header -->
              <tr>
                <td valign="top" bgcolor="#28313a" align="left" style="padding: 20px 15px 20px 65px">
                  <h1 style="margin: 0; font-family: Arial, sans-serif; font-size: 24px; color: #fff; font-weight: normal">
                    Aspac IT Help Desk
                  </h1>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding-bottom: 40px; background-color: rgb(238, 242, 243)">
                  <div style="background-color: rgb(238, 242, 243)">
                    <table cellpadding="0" cellspacing="0" border="0" width="600" align="center" style="margin: 0 auto; border-collapse: collapse; max-width: 600px; border-spacing: 0" bgcolor="#eef2f3">
                      <tbody>
                        <tr>
                          <td style="padding: 25px 65px 10px 65px">

                            <!-- Message -->
                            <div style="font-size:13px; color:#777; font-family:Tahoma, Arial, Helvetica, sans-serif;">
                              <p style="margin: 8px 0">Dear <strong style="color: black;">\${Approver_Name}</strong>,</p>
                              <p style="margin: 8px 0">
                                The requester has responded to your clarification request. Please review their response to proceed with the approval process.
                              </p>

                              <p style="margin: 8px 0"><b>Requester's Response:</b><br><strong style="color: black;">\${Requester_Response}</strong></p>
                              <p style="margin: 8px 0"><b>Request ID:</b>&nbsp;<strong style="color: black;">\${Request_ID}</strong></p>
                              <p style="margin: 8px 0"><b>Status:</b>&nbsp;<strong style="color: black;">\${Request_Status}</strong></p>
                              <p style="margin: 8px 0"><b>Subject:</b>&nbsp;<strong style="color: black;">\${Request_Subject}</strong></p>
                              <p style="margin: 8px 0"><b>Description:</b><br><strong style="color: black;">\${Request_Description}</strong></p>

                              <p style="margin: 8px 0">
                                Login to your IT Helpdesk portal to review and take action on this request:<br>
                                <strong style="color: black;">\${Request_Link}</strong>
                              </p><br><br>

                              <p style="margin: 8px 0; color:red">
                                <i>This mailbox is not monitored. Please do not reply to this message.</i>
                              </p>
                            </div>

                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td bgcolor="#28313a">
                  <table style="border-collapse: collapse; width: 600px; max-width: 600px; margin: 0 auto" cellspacing="0" cellpadding="0" border="0">
                    <tbody>
                      <tr>
                        <td style="font-family: sans-serif; padding: 25px 0; font-size: 16px; color: #fff; background-color: #28313a; text-align: center">
                          <b style="color:#0065cc">Keep Calm &amp; Use the IT Help Desk!</b>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>

            </tbody>
          </table>
        </div>
      </td>
    </tr>
  </tbody>
</table>`,
        is_active: true
      }
    });

    console.log('✅ Created template 16: Clarification Response to Approver');

    // Template 2: Notify requester when approver sends clarification request
    const requesterNotificationTemplate = await prisma.email_templates.create({
      data: {
        template_key: 'clarification_request_to_requester',
        title: 'Clarification Request - Notify Requester',
        description: 'Email sent to requester when approver needs clarification',
        subject: 'Clarification Required for Your Request - ${Request_Subject}',
        content_html: `<table style="background: rgb(58, 93, 115); margin: 0; padding-top: 40px; padding-bottom: 40px" align="center" width="100%">
  <tbody>
    <tr>
      <td align="center">
        <div style="max-width: 600px; background-color: rgb(238, 242, 243)">
          <table cellpadding="0" cellspacing="0" border="0" width="600" align="center" style="margin: 0px auto; font-family: Arial, sans-serif; border-collapse: collapse; max-width: 600px; border-spacing: 0; background-color: rgb(255, 255, 255)">
            <tbody>
              <!-- Header -->
              <tr>
                <td valign="top" bgcolor="#28313a" align="left" style="padding: 20px 15px 20px 65px">
                  <h1 style="margin: 0; font-family: Arial, sans-serif; font-size: 24px; color: #fff; font-weight: normal">
                    Aspac IT Help Desk
                  </h1>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding-bottom: 40px; background-color: rgb(238, 242, 243)">
                  <div style="background-color: rgb(238, 242, 243)">
                    <table cellpadding="0" cellspacing="0" border="0" width="600" align="center" style="margin: 0 auto; border-collapse: collapse; max-width: 600px; border-spacing: 0" bgcolor="#eef2f3">
                      <tbody>
                        <tr>
                          <td style="padding: 25px 65px 10px 65px">

                            <!-- Message -->
                            <div style="font-size:13px; color:#777; font-family:Tahoma, Arial, Helvetica, sans-serif;">
                              <p style="margin: 8px 0">Dear <strong style="color: black;">\${Requester_Name}</strong>,</p>
                              <p style="margin: 8px 0">
                                A clarification request was raised by an Approver as part of the approval process for your request.  
                                Your response is needed for the approval process to continue.
                              </p>

                              <p style="margin: 8px 0"><b>Clarification Comments:</b><br><strong style="color: black;">\${Clarification}</strong></p>
                              <p style="margin: 8px 0"><b>Request ID:</b>&nbsp;<strong style="color: black;">\${Request_ID}</strong></p>
                              <p style="margin: 8px 0"><b>Status:</b>&nbsp;<strong style="color: black;">\${Request_Status}</strong></p>
                              <p style="margin: 8px 0"><b>Subject:</b>&nbsp;<strong style="color: black;">\${Request_Subject}</strong></p>
                              <p style="margin: 8px 0"><b>Description:</b><br><strong style="color: black;">\${Request_Description}</strong></p>

                              <p style="margin: 8px 0">
                                Login to your IT Helpdesk portal to respond to the clarification request:<br>
                                <strong style="color: black;">\${Request_Link}</strong>
                              </p><br><br>

                              <p style="margin: 8px 0; color:red">
                                <i>This mailbox is not monitored. Please do not reply to this message.</i>
                              </p>
                            </div>

                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td bgcolor="#28313a">
                  <table style="border-collapse: collapse; width: 600px; max-width: 600px; margin: 0 auto" cellspacing="0" cellpadding="0" border="0">
                    <tbody>
                      <tr>
                        <td style="font-family: sans-serif; padding: 25px 0; font-size: 16px; color: #fff; background-color: #28313a; text-align: center">
                          <b style="color:#0065cc">Keep Calm &amp; Use the IT Help Desk!</b>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>

            </tbody>
          </table>
        </div>
      </td>
    </tr>
  </tbody>
</table>`,
        is_active: true
      }
    });

    console.log('✅ Created template 17: Clarification Request to Requester');

    console.log('\n📧 Email template summary:');
    console.log('Template 16: clarification_response_to_approver - Notifies approver when requester responds');
    console.log('Template 17: clarification_request_to_requester - Notifies requester of clarification request');
    console.log('\n✅ All clarification response templates added successfully!');

  } catch (error) {
    console.error('❌ Error adding templates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addClarificationResponseTemplates();
