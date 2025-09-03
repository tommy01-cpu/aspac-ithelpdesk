const { PrismaClient } = require('@prisma/client');

async function fixTemplate29() {
  const prisma = new PrismaClient();
  
  try {
    // Clean HTML content without excessive Tailwind classes
    const cleanContent = `<table style="background:#eabb29; margin: 0; padding-top: 40px; padding-bottom: 40px" align="center" width="100%">
  <tbody>
    <tr>
      <td align="center">
        <div style="max-width: 600px; background-color: rgb(238, 242, 243)">
          <table cellpadding="0" cellspacing="0" border="0" width="600" align="center" style="margin: 0px auto; font-family: Arial, sans-serif; border-collapse: collapse; max-width: 600px; border-spacing: 0; background-color: rgb(255, 255, 255)">
            <tbody>
              <!-- Header -->
              <tr>
                <td valign="top" bgcolor="#28313a" align="left" style="padding: 20px 15px 20px 65px">
                  <h1 style="margin: 0px; font-size: 24px; color: rgb(255, 255, 255); font-weight: normal;"><font face="Verdana">
                    Aspac IT Helpdesk
                  </font></h1>
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
                              
                              <p style="margin: 8px 0;"><i>You are receiving this message because the Requester wanted you to get notified about this request.</i></p><br>
                              
                              <p style="margin: 8px 0;">The following IT Helpdesk request has been <span style="font-weight: bolder; color: red;">CANCELLED</span>.</p>
                              
                              <p style="margin: 8px 0;"><b>Request ID:</b>&nbsp;<strong style="color: black;">\${Request_ID}</strong></p>
                              <p style="margin: 8px 0;"><b>Status:</b>&nbsp;<strong style="color: black;">\${Request_Status}</strong></p>
                              <p style="margin: 8px 0;"><b>Requester:</b>&nbsp;<strong style="color: black;">\${Requester_Name}</strong></p>
                              <p style="margin: 8px 0;"><b>Subject:</b>&nbsp;<strong style="color: black;">\${Request_Subject}</strong></p>
                              <p style="margin: 8px 0;"><b>Description:</b><br><span style="color: black;">\${Request_Description}</span></p>

                              <br>
                              <p style="margin: 8px 0; color:red;"><i>This mailbox is not monitored. Please do not reply to this message.</i></p>
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
                        <td style="padding: 25px 0px; font-size: 16px; color: rgb(255, 255, 255); background-color: rgb(40, 49, 58); text-align: center;">
                          <b style="color: rgb(0, 101, 204);"><font face="Verdana">Keep Calm &amp; Use the IT Help Desk!</font></b>
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
</table>`;
    
    // Update template 29 with clean content
    const result = await prisma.email_templates.update({
      where: { id: 29 },
      data: {
        content_html: cleanContent,
        updated_at: new Date(),
        updated_by: 1
      }
    });
    
    console.log('✅ Template 29 updated successfully!');
    console.log('Removed excessive Tailwind CSS classes and cleaned up the HTML');
    console.log('The email should now display proper colors in email clients');
    
  } catch (error) {
    console.error('❌ Error updating template 29:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTemplate29();
