import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/database-email-templates';
import { 
  sendEmailWithTemplateId, 
  getTemplateIdByType, 
  type TemplateType 
} from '@/lib/database-email-templates';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 === SEND-EMAIL API CALLED ===');
    
    const { requestId, templateKey } = await request.json();
    console.log('📥 Received data:', { requestId, templateKey });

    if (!requestId || !templateKey) {
      console.log('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: requestId, templateKey' },
        { status: 400 }
      );
    }

    // 🚫 PREVENT DUPLICATE CC EMAILS
    // Since CC emails are already sent by lib/notifications.ts during request creation,
    // we'll skip sending them again to prevent duplicates
    if (templateKey === 'acknowledge-cc-new-request') {
      console.log('⚠️ Skipping duplicate CC email - already sent by notifications.ts');
      return NextResponse.json({ 
        success: true, 
        message: 'CC email already sent during request creation - duplicate prevented' 
      });
    }

    console.log(`🔍 Processing email notification for request ${requestId} with template ${templateKey}`);

    // Fetch request data with user information
    console.log('📋 Fetching request data...');
    const requestData = await prisma.request.findUnique({
      where: { id: parseInt(requestId) },
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

    if (!requestData) {
      console.log('❌ Request not found:', requestId);
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }
    
    console.log('✅ Request found:', {
      id: requestData.id,
      status: requestData.status,
      userId: requestData.userId,
      user: requestData.user
    });

    // Get template data if available
    const templateData = await prisma.template.findUnique({
      where: { id: parseInt(requestData.templateId) || 0 }
    });

    // Parse email_to_notify from form data (field number 10)
    console.log('📧 Checking form data for email notifications...');
    console.log('Form data field 10:', (requestData.formData as any)?.['10']);
    
    let emailsToNotify = [];
    const emailField = (requestData.formData as any)?.['10'];
    
    if (emailField) {
      if (Array.isArray(emailField)) {
        // If it's already an array, use it directly
        emailsToNotify = emailField.filter((email: string) => email && email.trim());
      } else if (typeof emailField === 'string') {
        // If it's a string, split by comma
        emailsToNotify = emailField.split(',').map((email: string) => email.trim()).filter((email: string) => email);
      }
    }

    console.log('📬 Parsed emails to notify:', emailsToNotify);
    console.log('📊 Number of recipients:', emailsToNotify.length);

    if (emailsToNotify.length === 0) {
      console.log('⚠️ No email addresses to notify - ending process');
      return NextResponse.json(
        { message: 'No email addresses to notify' },
        { status: 200 }
      );
    }

    // Get template ID for REQUEST_CREATED_CC
    console.log('🎯 Getting template information...');
    const templateId = getTemplateIdByType('REQUEST_CREATED_CC');
    console.log('📋 Template ID:', templateId);
    
    if (!templateId) {
      console.log('❌ CC email template not found');
      return NextResponse.json(
        { error: 'CC email template not found' },
        { status: 404 }
      );
    }

    // Prepare email variables
    console.log('📝 Preparing email variables...');
    const requesterName = `${requestData.user.emp_fname} ${requestData.user.emp_lname}`.trim();
    const requestSubject = (requestData.formData as any)?.['8'] || templateData?.name || 'IT Helpdesk Request';
    const rawRequestDescription = (requestData.formData as any)?.['9'] || 'No description provided';
    
    console.log('👤 Requester:', requesterName);
    console.log('📑 Request subject:', requestSubject);
    
    // Keep images as base64 in emails - no file processing
    const requestDescription = rawRequestDescription;

    const emailVariables = {
      Request_ID: requestId.toString(),
      Request_Status: requestData.status || 'for_approval',
      Request_Subject: requestSubject,
      Request_Description: requestDescription,
      Requester_Name: requesterName,
      Requester_Email: requestData.user.emp_email || '',
      Request_Title: requestSubject,
      Emails_To_Notify: emailsToNotify.join(', '),
      Approval_Link: `${process.env.API_BASE_URL || process.env.NEXTAUTH_URL}/requests/approvals`
    };
    
    console.log('✅ Email variables prepared:', Object.keys(emailVariables));

    // Send email using database template (all recipients at once as template expects)
    console.log('📤 Starting email sending process...');
    const emailResults = [];
    try {
      console.log(`🎯 Preparing email using template ID ${templateId} for ${emailsToNotify.length} recipients`);
      
      const emailContent = await sendEmailWithTemplateId(templateId, emailVariables);
      
      if (emailContent) {
        console.log('✅ Email content prepared successfully');
        console.log('📋 Subject:', emailContent.subject);
        console.log('📧 TO field from template:', emailContent.to);
        console.log('📧 CC field from template:', emailContent.cc);
        
        // Use the template's TO field which should contain the processed ${Emails_To_Notify}
        const recipients = emailContent.to ? emailContent.to.split(',').map(email => email.trim()) : emailsToNotify;
        
        console.log('👥 Final recipients list:', recipients);
        
        console.log('🚀 Calling sendEmail function...');
        const sendResult = await sendEmail({
          to: recipients,
          subject: emailContent.subject,
          message: emailContent.htmlContent,
          variables: {} // Variables already processed
        });
        
        console.log('📬 SendEmail result:', sendResult);
        
        emailResults.push({ 
          recipients: recipients,
          status: 'sent',
          subject: emailContent.subject,
          templateUsed: templateId,
          sendResult: sendResult
        });
        console.log(`✅ CC email sent successfully to: ${recipients.join(', ')}`);
      } else {
        throw new Error('Failed to prepare email content from template');
      }
    } catch (error) {
      console.error(`❌ Failed to send CC email:`, error);
      emailResults.push({ 
        recipients: emailsToNotify,
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }

    return NextResponse.json({
      message: 'CC email notifications processed',
      requestId,
      templateKey,
      templateId,
      emailsSent: emailResults.filter(r => r.status === 'sent').length,
      emailsFailed: emailResults.filter(r => r.status === 'failed').length,
      totalRecipients: emailsToNotify.length,
      results: emailResults
    });

  } catch (error) {
    console.error('Error sending CC email notifications:', error);
    return NextResponse.json(
      { error: 'Failed to send email notifications', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
