import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendEmail } from '@/lib/email';
import { 
  sendEmailWithTemplateId, 
  getTemplateIdByType, 
  type TemplateType 
} from '@/lib/database-email-templates';
import { processImagesForEmailAuto } from '@/lib/email-image-processor-enhanced';

// Initialize Prisma client directly in this file
const prisma = new PrismaClient();

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

    console.log(`🔍 Processing email notification for request ${requestId} with template ${templateKey}`);

    // Determine which email flow to use
    if (templateKey === 'acknowledge-cc-new-request') {
      return await handleCCNotification(requestId, templateKey);
    } else if (templateKey === 'notify-approver' || templateKey === 'notify-approver-approval') {
      return await handleApproverNotification(requestId, templateKey);
    } else {
      console.log('❌ Unknown template key:', templateKey);
      return NextResponse.json(
        { error: 'Unknown template key' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error in send-email API:', error);
    return NextResponse.json(
      { error: 'Failed to send email notifications', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Handle CC notifications to email_to_notify recipients
async function handleCCNotification(requestId: string, templateKey: string) {
  try {
    console.log('📧 === HANDLING CC NOTIFICATION ===');
    
    // Fetch request data with user information
    console.log('📋 Fetching request data...');
    console.log('🔍 Prisma client check:', !!prisma);
    console.log('🔍 Prisma request model check:', !!prisma?.request);
    
    if (!prisma) {
      console.error('❌ Prisma client is undefined');
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }
    
    const requestData = await prisma.request.findUnique({
      where: { id: parseInt(requestId) },
      include: {
        user: {
          select: {
            emp_fname: true,
            emp_lname: true,
            emp_email: true
          }
        },
        approvals: {
          select: {
            id: true,
            level: true,
            name: true,
            approverName: true,
            approverEmail: true,
            status: true,
            approverId: true,
            approver: {
              select: {
                emp_fname: true,
                emp_lname: true,
                emp_email: true
              }
            }
          },
          orderBy: {
            level: 'asc'
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
      where: { id: parseInt(requestData.templateId) }
    });

    // Parse email_to_notify from form data (field number 10)
    console.log('📧 Checking form data for email notifications...');
    const formData = requestData.formData as any; // Type assertion for JSON field
    console.log('Form data field 10:', formData?.['10']);
    console.log('Form data field 10 type:', typeof formData?.['10']);
    console.log('Form data field 10 is array:', Array.isArray(formData?.['10']));
    
    let emailsToNotify = [];
    if (formData?.['10']) {
      // Check if it's already an array or a string
      if (Array.isArray(formData['10'])) {
        emailsToNotify = formData['10'].filter((email: string) => email && email.trim());
      } else if (typeof formData['10'] === 'string') {
        emailsToNotify = formData['10'].split(',').map((email: string) => email.trim()).filter((email: string) => email);
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
    const requestSubject = templateData?.name || 'IT Helpdesk Request';
    const rawRequestDescription = formData?.['9'] || 'No description provided';
    
    console.log('👤 Requester:', requesterName);
    console.log('📑 Request subject:', requestSubject);
    
    // Get approver information from the approvals
    console.log('👥 Processing approvals data...');
    console.log('Number of approvals:', requestData.approvals.length);
    
    let approverName = 'IT Administrator'; // Default
    let approverEmail = ''; // Default
    
    if (requestData.approvals.length > 0) {
      // Get the first approver (level 1) or the first available approver
      const primaryApproval = requestData.approvals[0];
      console.log('Primary approval:', primaryApproval);
      
      if (primaryApproval.approverName) {
        approverName = primaryApproval.approverName;
      } else if (primaryApproval.approver) {
        approverName = `${primaryApproval.approver.emp_fname} ${primaryApproval.approver.emp_lname}`.trim();
      }
      
      if (primaryApproval.approverEmail) {
        approverEmail = primaryApproval.approverEmail;
      } else if (primaryApproval.approver?.emp_email) {
        approverEmail = primaryApproval.approver.emp_email;
      }
    }
    
    console.log('🎯 Approver Name:', approverName);
    console.log('📧 Approver Email:', approverEmail);
    
    // Process images in the description for email compatibility
    const { processedHtml: requestDescription } = await processImagesForEmailAuto(rawRequestDescription, parseInt(requestId));

    const emailVariables = {
      Request_ID: requestId.toString(),
      Request_Status: requestData.status || 'for_approval',
      Request_Subject: requestSubject,
      Request_Description: requestDescription,
      Requester_Name: requesterName,
      Requester_Email: requestData.user.emp_email || '',
      Request_Title: requestSubject,
      Emails_To_Notify: emailsToNotify.join(', '),
      Approval_Link: 'http://192.168.1.85:3000/requests/approvals',
      Approver_Name: approverName,
      Approver_Email: approverEmail
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
          to: recipients, // Send TO the CC notification recipients
          subject: emailContent.subject,
          htmlMessage: emailContent.htmlContent,
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

// Handle approver notifications - send to current level approver
async function handleApproverNotification(requestId: string, templateKey: string) {
  try {
    console.log('👨‍💼 === HANDLING APPROVER NOTIFICATION ===');
    
    if (!prisma) {
      console.error('❌ Prisma client is undefined');
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }
    
    // Fetch request data with approvals
    const requestData = await prisma.request.findUnique({
      where: { id: parseInt(requestId) },
      include: {
        user: {
          select: {
            emp_fname: true,
            emp_lname: true,
            emp_email: true
          }
        },
        approvals: {
          select: {
            id: true,
            level: true,
            name: true,
            approverName: true,
            approverEmail: true,
            status: true,
            approverId: true,
            approver: {
              select: {
                emp_fname: true,
                emp_lname: true,
                emp_email: true
              }
            }
          },
          orderBy: {
            level: 'asc'
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
      totalApprovals: requestData.approvals.length
    });

    // Find the current pending approval level
    const currentApproval = requestData.approvals.find(approval => approval.status === 'pending_approval');
    
    if (!currentApproval) {
      console.log('⚠️ No pending approvals found - request may be fully approved or not require approval');
      return NextResponse.json(
        { message: 'No pending approvals found' },
        { status: 200 }
      );
    }
    
    console.log('🎯 Current approval level:', currentApproval.level);
    console.log('👤 Approver info:', {
      id: currentApproval.approverId,
      name: currentApproval.approverName,
      email: currentApproval.approverEmail
    });
    
    // Get approver email - prefer the stored email, fallback to user table
    let approverEmail = currentApproval.approverEmail;
    let approverName = currentApproval.approverName;
    
    console.log('🔍 Initial approver data:', {
      storedEmail: currentApproval.approverEmail,
      storedName: currentApproval.approverName,
      hasApproverRecord: !!currentApproval.approver
    });
    
    if ((!approverEmail || !approverName) && currentApproval.approver) {
      approverEmail = approverEmail || currentApproval.approver.emp_email;
      approverName = approverName || `${currentApproval.approver.emp_fname} ${currentApproval.approver.emp_lname}`.trim();
      console.log('🔄 Fallback to user record:', {
        email: approverEmail,
        name: approverName
      });
    }
    
    // Additional fallback: if name is still empty, try to get it from the user record
    if (!approverName && currentApproval.approverId) {
      console.log('🔍 Approver name still empty, fetching from user table...');
      const approverUser = await prisma.users.findUnique({
        where: { id: currentApproval.approverId },
        select: {
          emp_fname: true,
          emp_lname: true,
          emp_email: true
        }
      });
      
      if (approverUser) {
        approverName = `${approverUser.emp_fname} ${approverUser.emp_lname}`.trim();
        approverEmail = approverEmail || approverUser.emp_email;
        console.log('✅ Got approver details from user table:', {
          name: approverName,
          email: approverEmail
        });
      }
    }
    
    console.log('🎯 Final approver details:', {
      email: approverEmail,
      name: approverName
    });
    
    if (!approverEmail) {
      console.log('❌ No email found for current approver');
      return NextResponse.json(
        { error: 'No email found for current approver' },
        { status: 400 }
      );
    }
    
    console.log('📧 Sending approval request to:', approverEmail);
    console.log('👤 Approver name:', approverName);
    
    // Get template data if available
    const templateData = await prisma.template.findUnique({
      where: { id: parseInt(requestData.templateId) }
    });
    
    // Prepare email variables
    const requesterName = `${requestData.user.emp_fname} ${requestData.user.emp_lname}`.trim();
    const requestSubject = templateData?.name || 'IT Helpdesk Request';
    const formData = requestData.formData as any;
    const rawRequestDescription = formData?.['9'] || 'No description provided';
    
    // Process images in the description for email compatibility
    const { processedHtml: requestDescription } = await processImagesForEmailAuto(rawRequestDescription, parseInt(requestId));

    const emailVariables = {
      Request_ID: requestId.toString(),
      Request_Status: requestData.status || 'for_approval',
      Request_Subject: requestSubject,
      Request_Description: requestDescription,
      Requester_Name: requesterName,
      Requester_Email: requestData.user.emp_email || '',
      Request_Title: requestSubject,
      Approver_Name: approverName || 'Approver',
      Approver_Email: approverEmail,
      Approval_Link: `http://192.168.1.85:3000/requests/approvals`,
      Current_Approval_Level: currentApproval.level.toString(),
      Approval_Stage_Name: currentApproval.name
    };
    
    console.log('✅ Email variables prepared for approver notification');
    
    // Use APPROVAL_REQUIRED template for approver notifications
    const templateId = getTemplateIdByType('APPROVAL_REQUIRED'); // Template ID 12 - notify-approver-approval
    
    if (!templateId) {
      console.log('❌ Approver email template not found');
      return NextResponse.json(
        { error: 'Approver email template not found' },
        { status: 404 }
      );
    }

    console.log('📤 Sending email to approver...');
    const emailContent = await sendEmailWithTemplateId(templateId, emailVariables);
    
    if (emailContent) {
      console.log('✅ Email content prepared successfully');
      console.log('📋 Using template subject:', emailContent.subject);
      
      const sendResult = await sendEmail({
        to: [approverEmail],
        subject: emailContent.subject, // ✅ Use template subject instead of hardcoded
        htmlMessage: emailContent.htmlContent,
        variables: {}
      });
      
      console.log('📬 SendEmail result:', sendResult);
      console.log(`✅ Approval notification sent to: ${approverEmail}`);
      
      return NextResponse.json({
        message: 'Approver notification sent successfully',
        requestId,
        templateKey,
        approverEmail,
        approverName,
        approvalLevel: currentApproval.level,
        sendResult
      });
    } else {
      throw new Error('Failed to prepare email content from template');
    }

  } catch (error) {
    console.error('Error sending approver notification:', error);
    return NextResponse.json(
      { error: 'Failed to send approver notification', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
