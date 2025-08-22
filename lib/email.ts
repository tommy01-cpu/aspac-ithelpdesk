import nodemailer from 'nodemailer';
import { getEmailConfigForService } from './email-config';
import { getEmailTemplateById, convertDatabaseTemplateToEmail, getTemplateIdByType, TemplateType } from './database-email-templates';

// Get base URL from environment
const getBaseUrl = () => {
  return process.env.NEXTAUTH_URL || 'http://localhost:3000';
};

// Email templates based on the requirements document
export const EMAIL_TEMPLATES = {
  // 4.1.1 - Acknowledge requester when new request is received
  REQUEST_CREATED_REQUESTER: {
    subject: 'IT HELPDESK: Your New Request ID ${Request_ID}',
    template: `Dear \${Requester_Name},

Your IT Helpdesk request has been created with the following details:

Request ID: \${Request_ID}
Status: \${Request_Status}
Subject: \${Request_Subject}
Description:
\${Request_Description}

Login to your IT Helpdesk portal to view the details and progress of your request:
\${Base_URL}/login?callbackUrl=\${Encoded_Request_URL}

This mailbox is not monitored. Please do not reply to this message.
Keep Calm & Use the IT Help Desk!`
  },

  // 4.1.2 - Acknowledge CC users when new request is created
  REQUEST_CREATED_CC: {
    subject: 'IT HELPDESK: New Request ID ${Request_ID} from ${Requester_Name}',
    template: `You are receiving this message because the Requester wanted you to get notified about this request.

A new request was created with the following details:

Request ID: \${Request_ID}
Status: \${Request_Status}
Requester: \${Requester_Name}
Subject: \${Request_Subject}
Description:
\${Request_Description}

View this request in the IT Helpdesk portal:
\${Base_URL}/requests/view/\${Request_ID}

This mailbox is not monitored. Please do not reply to this message.
Keep Calm & Use the IT Help Desk!`
  },

  // 4.1.3 - Notify approver for approval action
  APPROVAL_REQUIRED: {
    subject: 'IT HELPDESK: Approval Required for Request ID ${Request_ID}',
    template: `Approval Required

Your approval for this IT Helpdesk request is required in order to proceed with its processing.

Request ID: \${Request_ID}
Requester: \${Requester_Name}
Subject: \${Request_Subject}
Description:
\${Request_Description}

Login to your IT Helpdesk portal to approve this request:
\${Base_URL}/login?callbackUrl=\${Encoded_Approval_URL}

This mailbox is not monitored. Please do not reply to this message.
Keep Calm & Use the IT Help Desk!`
  },

  // 4.1.4 - Approval reminder
  APPROVAL_REMINDER: {
    subject: 'IT HELPDESK: Approval Reminder Notification',
    template: `Reminder: Approval Required

You have pending IT Helpdesk approvals which require immediate attention.

Login to your IT Helpdesk portal to view and approve the requests:
\${Base_URL}/login?callbackUrl=\${Encoded_Approvals_URL}

This mailbox is not monitored. Please do not reply to this message.
Keep Calm & Use the IT Help Desk!`
  },

  // 4.1.5 - Notify requester when request is approved/rejected
  REQUEST_APPROVED_REJECTED: {
    subject: 'IT HELPDESK: Request ID ${Request_ID} has been ${Request_Approval_Status}',
    template: `Dear \${Requester_Name},

Your request has been updated with the following details:

Request ID: \${Request_ID}
Approval: \${Request_Approval_Status}
Comment: \${Request_Approval_Comment}
Status: \${Request_Status}
Subject: \${Request_Title}
Description:
\${Request_Description}

Login to your IT Helpdesk portal to view the details of your request:
\${Base_URL}/login?callbackUrl=\${Encoded_Request_URL}

This mailbox is not monitored. Please do not reply to this message.
Keep Calm & Use the IT Help Desk!`
  },

  // 4.1.6 - Clarification required
  CLARIFICATION_REQUIRED: {
    subject: 'IT HELPDESK: Clarification Raised for Request ID ${Request_ID}',
    template: `Dear \${Requester_Name},

A clarification request was raised by an Approver as part of the approval process for your request. Your response is needed for the approval process to continue.

Clarification Comments:
\${Clarification}

Request ID: \${Request_ID}
Status: \${Request_Status}
Subject: \${Request_Title}
Description:
\${Request_Description}

Login to your IT Helpdesk portal to respond to the clarification request:
\${Base_URL}/login?callbackUrl=\${Encoded_Request_URL}

This mailbox is not monitored. Please do not reply to this message.
Keep Calm & Use the IT Help Desk!`
  },

  // 4.1.7 - Clarification reminder
  CLARIFICATION_REMINDER: {
    subject: 'IT Helpdesk: Reminder for Pending Clarifications',
    template: `Reminder: Pending Clarifications

You have pending clarifications regarding your IT Helpdesk requests which require immediate attention.

Login to your IT Helpdesk portal to respond to the clarification requests:
\${Base_URL}/login?callbackUrl=\${Encoded_Dashboard_URL}

This mailbox is not monitored. Please do not reply to this message.
Keep Calm & Use the IT Help Desk!`
  },

  // 4.1.8 - Notify requester when assigned to technician
  REQUEST_ASSIGNED_REQUESTER: {
    subject: 'IT HELPDESK: Request ID ${Request_ID} has been assigned to ${Technician_Name}',
    template: `Dear \${Requester_Name},

Your IT Help Desk Request ID \${Request_ID} has been assigned to \${Technician_Name}.

Request ID: \${Request_ID}
Status: \${Request_Status}
Subject: \${Request_Title}
Description:
\${Request_Description}

Login to your IT Helpdesk portal to view the progress of your request:
\${Base_URL}/login?callbackUrl=\${Encoded_Request_URL}

This mailbox is not monitored. Please do not reply to this message.
Keep Calm & Use the IT Help Desk!`
  },

  // 4.1.9 - Alert technician when request is assigned
  REQUEST_ASSIGNED_TECHNICIAN: {
    subject: 'IT HELPDESK: Request ID ${Request_ID} has been assigned to ${Technician_Name}',
    template: `Dear \${Technician_Name},

A request has been assigned to you!

Request ID: \${Request_ID}
Status: \${Request_Status}
Due By Date: \${Due_By_Date}
Subject: \${Request_Title}
Description:
\${Request_Description}

Remember to resolve this request within the prescribed SLA!

Login to your IT Helpdesk portal to view and update this request:
\${Base_URL}/login?callbackUrl=\${Encoded_Technician_URL}

This mailbox is not monitored. Please do not reply to this message.
Keep Calm & Use the IT Help Desk!`
  },

  // 4.1.10 - SLA escalation warning
  SLA_ESCALATION: {
    subject: 'IT HELPDESK: SLA Escalation Warning! Request ID ${Request_ID} is due on: ${Due_By_Date}',
    template: `*** SLA Escalation Warning! ***

This is a warning notification for an IT Helpdesk request that will soon be overdue.

Request ID: \${Request_ID}
Status: \${Request_Status}
Due By Date: \${Due_By_Date}
Technician: \${Technician_Name}
Subject: \${Request_Title}
Description:
\${Request_Description}

If you are not the assigned Technician, please remind him that this ticket will soon be overdue.

If the assigned Technician is not available, consider picking up this ticket if you are able to resolve it.

Login to your IT Helpdesk portal to view and update this request:
\${Base_URL}/technician/requests/\${Request_ID}

This mailbox is not monitored. Please do not reply to this message.
Keep Calm & Use the IT Help Desk!`
  },

  // 4.1.11 - Request resolved
  REQUEST_RESOLVED_REQUESTER: {
    subject: 'IT HELPDESK: Request ID ${Request_ID} has been Resolved',
    template: `Dear \${Requester_Name},

Your IT Helpdesk request has been resolved:

Request ID: \${Request_ID}
Status: \${Request_Status}
Subject: \${Request_Subject}
Description:
\${Request_Description}

Resolution:
\${Resolution_Description}

Login to your IT Helpdesk portal to close the request:
\${Base_URL}/requests/view/\${Request_ID}

Should you choose not to close this request within ten (10) days, you are waiving your right and are expressing your satisfaction to the resolution. Hence, your request will be automatically closed after ten (10) days.

This mailbox is not monitored. Please do not reply to this message.
Keep Calm & Use the IT Help Desk!`
  },

  // 4.1.12 - CC users when resolved
  REQUEST_RESOLVED_CC: {
    subject: 'IT HELPDESK: Request ID ${Request_ID} from ${Requester_Name} has been Resolved',
    template: `You are receiving this message because the Requester wanted you to get notified about this request.

The following request has been resolved:

Request ID: \${Request_ID}
Status: \${Request_Status}
Requester: \${Requester_Name}
Subject: \${Request_Subject}
Description:
\${Request_Description}

Resolution:
\${Request_Resolution}

View this request in the IT Helpdesk portal:
\${Base_URL}/requests/view/\${Request_ID}

This mailbox is not monitored. Please do not reply to this message.
Keep Calm & Use the IT Help Desk!`
  },

  // 4.1.13 - CC users when closed
  REQUEST_CLOSED_CC: {
    subject: 'IT HELPDESK: Request ID ${Request_ID} from ${Requester_Name} has been Closed',
    template: `You are receiving this message because the Requester wanted you to get notified about this request.

The following request has been closed:

Request ID: \${Request_ID}
Status: \${Request_Status}
Requester: \${Requester_Name}
Subject: \${Request_Subject}
Description:
\${Request_Description}

Resolution:
\${Request_Resolution}

View this request in the IT Helpdesk portal:
\${Base_URL}/requests/view/\${Request_ID}

This mailbox is not monitored. Please do not reply to this message.
Keep Calm & Use the IT Help Desk!`
  }
};

// Email configuration
const createTransporter = async () => {
  try {
    const config = await getEmailConfigForService();
    
    const transportConfig: any = {
      host: config.serverName,
      port: config.port,
      secure: config.protocol === 'SMTPS', // true for SMTPS, false for SMTP
      tls: {
        rejectUnauthorized: false // For development/testing
      }
    };

    // Only add auth if username and password are provided from config
    if (config.username && config.password) {
      transportConfig.auth = {
        user: config.username,
        pass: config.password,
      };
    } else if (process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
      // Fallback to environment variables
      transportConfig.auth = {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      };
    }

    return nodemailer.createTransport(transportConfig);
  } catch (error) {
    console.error('Error creating email transporter with config:', error);
    
    // Fallback to environment variables
    const config: any = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
      tls: {
        rejectUnauthorized: false // For development/testing
      }
    };

    if (process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
      config.auth = {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      };
    }

    return nodemailer.createTransport(config);
  }
};

// Template variable replacement
export const replaceTemplateVariables = (template: string, variables: Record<string, string>): string => {
  let result = template;
  
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
    result = result.replace(regex, value || '');
  });
  
  return result;
};

// Email sending interface
export interface EmailData {
  to: string | string[];
  cc?: string | string[];
  subject: string;
  message?: string; // Text message (optional)
  htmlMessage?: string; // HTML message (optional)
  variables?: Record<string, string>;
}

// Main email sending function
export const sendEmail = async (emailData: EmailData): Promise<boolean> => {
  try {
    const transporter = await createTransporter();
    
    // Replace template variables if provided
    let subject = emailData.subject;
    let message = emailData.message || '';
    let htmlMessage = emailData.htmlMessage || '';
    
    if (emailData.variables) {
      subject = replaceTemplateVariables(subject, emailData.variables);
      if (emailData.message) {
        message = replaceTemplateVariables(emailData.message, emailData.variables);
      }
      if (emailData.htmlMessage) {
        htmlMessage = replaceTemplateVariables(emailData.htmlMessage, emailData.variables);
      }
    }

    // Prepare mail options
    const mailOptions: any = {
      from: `"IT Helpdesk" <${process.env.SMTP_USER}>`,
      to: Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to,
      cc: emailData.cc ? (Array.isArray(emailData.cc) ? emailData.cc.join(', ') : emailData.cc) : undefined,
      subject,
    };

    // Set content - prioritize HTML if available, otherwise use text
    if (htmlMessage) {
      mailOptions.html = htmlMessage;
      // If we have HTML but no text, create a simple text version
      if (!message) {
        mailOptions.text = htmlMessage.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      } else {
        mailOptions.text = message;
      }
    } else if (message) {
      mailOptions.text = message;
      // Simple HTML conversion for plain text
      mailOptions.html = message.replace(/\n/g, '<br>');
    } else {
      throw new Error('No message content provided');
    }

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

// Pre-configured email functions for each notification type
export const sendRequestCreatedEmail = async (requesterEmail: string, variables: Record<string, string>) => {
  try {
    console.log('=== SENDING REQUEST CREATED EMAIL ===');
    console.log('Variables received:', variables);
    
    // Get the template ID for request created notification
    const templateId = await getTemplateIdByType('REQUEST_CREATED_REQUESTER' as TemplateType);
    if (!templateId) {
      throw new Error('Email template not found for REQUEST_CREATED_REQUESTER');
    }
    
    console.log('Using template ID:', templateId);
    
    // Get the template from database
    const dbTemplate = await getEmailTemplateById(templateId);
    if (!dbTemplate) {
      throw new Error('Database email template not found');
    }
    
    console.log('Found database template:', dbTemplate.subject);
    
    const baseUrl = getBaseUrl();
    const requestUrl = `${baseUrl}/requests/view/${variables.Request_ID}`;
    const encodedRequestUrl = encodeURIComponent(requestUrl);
    
    // Create login callback URL - redirects to request after login
    const loginCallbackUrl = `${baseUrl}/login?callbackUrl=${encodeURIComponent(`/requests/view/${variables.Request_ID}`)}`;
    
    const enhancedVariables = {
      ...variables,
      Base_URL: baseUrl,
      Encoded_Request_URL: encodedRequestUrl,
      Request_Link: loginCallbackUrl
    };
    
    console.log('Enhanced variables:', enhancedVariables);
    
    // Convert database template to email format WITH VARIABLES
    const template = convertDatabaseTemplateToEmail(dbTemplate, enhancedVariables);
    
    return sendEmail({
      to: requesterEmail,
      subject: template.subject,
      message: template.textContent,
      htmlMessage: template.htmlContent,
      variables: enhancedVariables
    });
  } catch (error) {
    console.error('Error sending request created email:', error);
    // Fallback to hardcoded template if database fails
    const template = EMAIL_TEMPLATES.REQUEST_CREATED_REQUESTER;
    const baseUrl = getBaseUrl();
    const requestUrl = `${baseUrl}/requests/view/${variables.Request_ID}`;
    const encodedRequestUrl = encodeURIComponent(requestUrl);
    
    // Create login callback URL - redirects to request after login
    const loginCallbackUrl = `${baseUrl}/login?callbackUrl=${encodeURIComponent(`/requests/view/${variables.Request_ID}`)}`;
    
    const enhancedVariables = {
      ...variables,
      Base_URL: baseUrl,
      Encoded_Request_URL: encodedRequestUrl,
      Request_Link: loginCallbackUrl
    };
    
    return sendEmail({
      to: requesterEmail,
      subject: template.subject,
      message: template.template,
      variables: enhancedVariables
    });
  }
};

export const sendRequestCreatedCCEmail = async (ccEmails: string[], variables: Record<string, string>) => {
  if (!ccEmails || ccEmails.length === 0) return true;
  
  try {
    // Get the template ID for request created CC notification
    const templateId = await getTemplateIdByType('REQUEST_CREATED_CC' as TemplateType);
    if (!templateId) {
      throw new Error('Email template not found for REQUEST_CREATED_CC');
    }
    
    // Get the template from database
    const dbTemplate = await getEmailTemplateById(templateId);
    if (!dbTemplate) {
      throw new Error('Database email template not found');
    }
    
    const baseUrl = getBaseUrl();
    
    // Create login callback URL - redirects to request after login
    const loginCallbackUrl = `${baseUrl}/login?callbackUrl=${encodeURIComponent(`/requests/view/${variables.Request_ID}`)}`;
    
    const enhancedVariables = {
      ...variables,
      Base_URL: baseUrl,
      Request_Link: loginCallbackUrl
    };
    
    // Convert database template to email format WITH VARIABLES
    const template = convertDatabaseTemplateToEmail(dbTemplate, enhancedVariables);
    
    return sendEmail({
      to: ccEmails,
      subject: template.subject,
      message: template.textContent,
      htmlMessage: template.htmlContent,
      variables: enhancedVariables
    });
  } catch (error) {
    console.error('Error sending request created CC email:', error);
    // Fallback to hardcoded template if database fails
    const template = EMAIL_TEMPLATES.REQUEST_CREATED_CC;
    return sendEmail({
      to: ccEmails,
      subject: template.subject,
      message: template.template,
      variables
    });
  }
};

export const sendApprovalRequiredEmail = async (approverEmail: string, variables: Record<string, string>) => {
  try {
    // Get the template ID for approval required notification
    const templateId = await getTemplateIdByType('APPROVAL_REQUIRED' as TemplateType);
    if (!templateId) {
      throw new Error('Email template not found for APPROVAL_REQUIRED');
    }
    
    // Get the template from database
    const dbTemplate = await getEmailTemplateById(templateId);
    if (!dbTemplate) {
      throw new Error('Database email template not found');
    }
    
    console.log('Found database template:', dbTemplate.subject);
    
    const baseUrl = getBaseUrl();
    const approvalUrl = `${baseUrl}/requests/approvals/${variables.Request_ID}`;
    const encodedApprovalUrl = encodeURIComponent(approvalUrl);
    
    // Create login callback URL for request viewing
    const loginCallbackUrl = `${baseUrl}/login?callbackUrl=${encodeURIComponent(`/requests/view/${variables.Request_ID}`)}`;
    
    const enhancedVariables = {
      ...variables,
      Base_URL: baseUrl,
      Encoded_Approval_URL: encodedApprovalUrl,
      Request_Link: loginCallbackUrl
    };
    
    console.log('Enhanced variables for approval:', enhancedVariables);
    
    // Convert database template to email format WITH VARIABLES
    const template = convertDatabaseTemplateToEmail(dbTemplate, enhancedVariables);
    
    return sendEmail({
      to: approverEmail,
      subject: template.subject,
      message: template.textContent,
      htmlMessage: template.htmlContent,
      variables: enhancedVariables
    });
  } catch (error) {
    console.error('Error sending approval required email:', error);
    // Fallback to hardcoded template if database fails
    const template = EMAIL_TEMPLATES.APPROVAL_REQUIRED;
    const baseUrl = getBaseUrl();
    const approvalUrl = `${baseUrl}/requests/approvals/${variables.Request_ID}`;
    const encodedApprovalUrl = encodeURIComponent(approvalUrl);
    
    const enhancedVariables = {
      ...variables,
      Base_URL: baseUrl,
      Encoded_Approval_URL: encodedApprovalUrl
    };
    
    return sendEmail({
      to: approverEmail,
      subject: template.subject,
      message: template.template,
      variables: enhancedVariables
    });
  }
};

export const sendRequestApprovedRejectedEmail = async (requesterEmail: string, variables: Record<string, string>) => {
  try {
    // Get the template ID for request approved/rejected notification
    const templateId = await getTemplateIdByType('REQUEST_APPROVED_REJECTED' as TemplateType);
    if (!templateId) {
      throw new Error('Email template not found for REQUEST_APPROVED_REJECTED');
    }
    
    // Get the template from database
    const dbTemplate = await getEmailTemplateById(templateId);
    if (!dbTemplate) {
      throw new Error('Database email template not found');
    }
    
    const baseUrl = getBaseUrl();
    const requestUrl = `${baseUrl}/requests/view/${variables.Request_ID}`;
    const encodedRequestUrl = encodeURIComponent(requestUrl);
    
    // Create login callback URL - redirects to request after login
    const loginCallbackUrl = `${baseUrl}/login?callbackUrl=${encodeURIComponent(`/requests/view/${variables.Request_ID}`)}`;
    
    const enhancedVariables = {
      ...variables,
      Base_URL: baseUrl,
      Encoded_Request_URL: encodedRequestUrl,
      Request_Link: loginCallbackUrl
    };
    
    // Convert database template to email format WITH VARIABLES
    const template = convertDatabaseTemplateToEmail(dbTemplate, enhancedVariables);
    
    return sendEmail({
      to: requesterEmail,
      subject: template.subject,
      message: template.textContent,
      htmlMessage: template.htmlContent,
      variables: enhancedVariables
    });
  } catch (error) {
    console.error('Error sending request approved/rejected email:', error);
    // Fallback to hardcoded template if database fails
    const template = EMAIL_TEMPLATES.REQUEST_APPROVED_REJECTED;
    const baseUrl = getBaseUrl();
    const requestUrl = `${baseUrl}/requests/view/${variables.Request_ID}`;
    const encodedRequestUrl = encodeURIComponent(requestUrl);
    
    const enhancedVariables = {
      ...variables,
      Base_URL: baseUrl,
      Encoded_Request_URL: encodedRequestUrl
    };
    
    return sendEmail({
      to: requesterEmail,
      subject: template.subject,
      message: template.template,
      variables: enhancedVariables
    });
  }
};

export const sendRequestAssignedRequesterEmail = async (requesterEmail: string, variables: Record<string, string>) => {
  try {
    // Get the template ID for request assigned to requester notification
    const templateId = await getTemplateIdByType('REQUEST_ASSIGNED_REQUESTER' as TemplateType);
    if (!templateId) {
      throw new Error('Email template not found for REQUEST_ASSIGNED_REQUESTER');
    }
    
    // Get the template from database
    const dbTemplate = await getEmailTemplateById(templateId);
    if (!dbTemplate) {
      throw new Error('Database email template not found');
    }
    
    const baseUrl = getBaseUrl();
    const requestUrl = `${baseUrl}/requests/view/${variables.Request_ID}`;
    const encodedRequestUrl = encodeURIComponent(requestUrl);
    
    const enhancedVariables = {
      ...variables,
      Base_URL: baseUrl,
      Encoded_Request_URL: encodedRequestUrl
    };
    
    // Convert database template to email format WITH VARIABLES
    const template = convertDatabaseTemplateToEmail(dbTemplate, enhancedVariables);
    
    return sendEmail({
      to: requesterEmail,
      subject: template.subject,
      message: template.textContent,
      variables: enhancedVariables
    });
  } catch (error) {
    console.error('Error sending request assigned requester email:', error);
    // Fallback to hardcoded template if database fails
    const template = EMAIL_TEMPLATES.REQUEST_ASSIGNED_REQUESTER;
    const baseUrl = getBaseUrl();
    const requestUrl = `${baseUrl}/requests/view/${variables.Request_ID}`;
    const encodedRequestUrl = encodeURIComponent(requestUrl);
    
    const enhancedVariables = {
      ...variables,
      Base_URL: baseUrl,
      Encoded_Request_URL: encodedRequestUrl
    };
    
    return sendEmail({
      to: requesterEmail,
      subject: template.subject,
      message: template.template,
      variables: enhancedVariables
    });
  }
};

export const sendRequestAssignedTechnicianEmail = async (technicianEmail: string, variables: Record<string, string>) => {
  try {
    // Get the template ID for request assigned to technician notification
    const templateId = await getTemplateIdByType('REQUEST_ASSIGNED_TECHNICIAN' as TemplateType);
    if (!templateId) {
      throw new Error('Email template not found for REQUEST_ASSIGNED_TECHNICIAN');
    }
    
    // Get the template from database
    const dbTemplate = await getEmailTemplateById(templateId);
    if (!dbTemplate) {
      throw new Error('Database email template not found');
    }
    
    const baseUrl = getBaseUrl();
    const technicianUrl = `${baseUrl}/technician/requests/${variables.Request_ID}`;
    const encodedTechnicianUrl = encodeURIComponent(technicianUrl);
    
    const enhancedVariables = {
      ...variables,
      Base_URL: baseUrl,
      Encoded_Technician_URL: encodedTechnicianUrl
    };
    
    // Convert database template to email format WITH VARIABLES
    const template = convertDatabaseTemplateToEmail(dbTemplate, enhancedVariables);
    
    return sendEmail({
      to: technicianEmail,
      subject: template.subject,
      message: template.textContent,
      variables: enhancedVariables
    });
  } catch (error) {
    console.error('Error sending request assigned technician email:', error);
    // Fallback to hardcoded template if database fails
    const template = EMAIL_TEMPLATES.REQUEST_ASSIGNED_TECHNICIAN;
    const baseUrl = getBaseUrl();
    const technicianUrl = `${baseUrl}/technician/requests/${variables.Request_ID}`;
    const encodedTechnicianUrl = encodeURIComponent(technicianUrl);
    
    const enhancedVariables = {
      ...variables,
      Base_URL: baseUrl,
      Encoded_Technician_URL: encodedTechnicianUrl
    };
    
    return sendEmail({
      to: technicianEmail,
      subject: template.subject,
      message: template.template,
      variables: enhancedVariables
    });
  }
};

export const sendRequestResolvedEmail = async (requesterEmail: string, variables: Record<string, string>) => {
  try {
    // Get the template ID for request resolved notification
    const templateId = await getTemplateIdByType('REQUEST_RESOLVED_REQUESTER' as TemplateType);
    if (!templateId) {
      throw new Error('Email template not found for REQUEST_RESOLVED_REQUESTER');
    }
    
    // Get the template from database
    const dbTemplate = await getEmailTemplateById(templateId);
    if (!dbTemplate) {
      throw new Error('Database email template not found');
    }
    
    // Convert database template to email format WITH VARIABLES
    const template = convertDatabaseTemplateToEmail(dbTemplate, variables);
    
    return sendEmail({
      to: requesterEmail,
      subject: template.subject,
      message: template.textContent,
      variables
    });
  } catch (error) {
    console.error('Error sending request resolved email:', error);
    // Fallback to hardcoded template if database fails
    const template = EMAIL_TEMPLATES.REQUEST_RESOLVED_REQUESTER;
    return sendEmail({
      to: requesterEmail,
      subject: template.subject,
      message: template.template,
      variables
    });
  }
};

export const sendSLAEscalationEmail = async (technicianEmail: string, variables: Record<string, string>) => {
  try {
    // Get the template ID for SLA escalation notification
    const templateId = await getTemplateIdByType('SLA_ESCALATION' as TemplateType);
    if (!templateId) {
      throw new Error('Email template not found for SLA_ESCALATION');
    }
    
    // Get the template from database
    const dbTemplate = await getEmailTemplateById(templateId);
    if (!dbTemplate) {
      throw new Error('Database email template not found');
    }
    
    const baseUrl = getBaseUrl();
    const technicianUrl = `${baseUrl}/technician/requests/${variables.Request_ID}`;
    const encodedTechnicianUrl = encodeURIComponent(technicianUrl);
    
    const enhancedVariables = {
      ...variables,
      Base_URL: baseUrl,
      Encoded_Technician_URL: encodedTechnicianUrl
    };
    
    // Convert database template to email format WITH VARIABLES
    const template = convertDatabaseTemplateToEmail(dbTemplate, enhancedVariables);
    
    return sendEmail({
      to: technicianEmail,
      subject: template.subject,
      message: template.textContent,
      variables: enhancedVariables
    });
  } catch (error) {
    console.error('Error sending SLA escalation email:', error);
    // Fallback to hardcoded template if database fails
    const template = EMAIL_TEMPLATES.SLA_ESCALATION;
    const baseUrl = getBaseUrl();
    const technicianUrl = `${baseUrl}/technician/requests/${variables.Request_ID}`;
    const encodedTechnicianUrl = encodeURIComponent(technicianUrl);
    
    const enhancedVariables = {
      ...variables,
      Base_URL: baseUrl,
      Encoded_Technician_URL: encodedTechnicianUrl
    };
    
    return sendEmail({
      to: technicianEmail,
      subject: template.subject,
      message: template.template,
      variables: enhancedVariables
    });
  }
};

// Additional helper functions for reminder emails
export const sendApprovalReminderEmail = async (approverEmail: string, variables: Record<string, string> = {}) => {
  try {
    // Get the template ID for approval reminder notification
    const templateId = await getTemplateIdByType('APPROVAL_REMINDER' as TemplateType);
    if (!templateId) {
      throw new Error('Email template not found for APPROVAL_REMINDER');
    }
    
    // Get the template from database
    const dbTemplate = await getEmailTemplateById(templateId);
    if (!dbTemplate) {
      throw new Error('Database email template not found');
    }
    
    const baseUrl = getBaseUrl();
    const approvalsUrl = `${baseUrl}/requests/approvals`;
    const encodedApprovalsUrl = encodeURIComponent(approvalsUrl);
    
    const enhancedVariables = {
      ...variables,
      Base_URL: baseUrl,
      Encoded_Approvals_URL: encodedApprovalsUrl
    };
    
    // Convert database template to email format WITH VARIABLES
    const template = convertDatabaseTemplateToEmail(dbTemplate, enhancedVariables);
    
    return sendEmail({
      to: approverEmail,
      subject: template.subject,
      message: template.textContent,
      variables: enhancedVariables
    });
  } catch (error) {
    console.error('Error sending approval reminder email:', error);
    // Fallback to hardcoded template if database fails
    const template = EMAIL_TEMPLATES.APPROVAL_REMINDER;
    const baseUrl = getBaseUrl();
    const approvalsUrl = `${baseUrl}/requests/approvals`;
    const encodedApprovalsUrl = encodeURIComponent(approvalsUrl);
    
    const enhancedVariables = {
      ...variables,
      Base_URL: baseUrl,
      Encoded_Approvals_URL: encodedApprovalsUrl
    };
    
    return sendEmail({
      to: approverEmail,
      subject: template.subject,
      message: template.template,
      variables: enhancedVariables
    });
  }
};

export const sendClarificationReminderEmail = async (requesterEmail: string, variables: Record<string, string> = {}) => {
  try {
    // Get the template ID for clarification reminder notification
    const templateId = await getTemplateIdByType('CLARIFICATION_REMINDER' as TemplateType);
    if (!templateId) {
      throw new Error('Email template not found for CLARIFICATION_REMINDER');
    }
    
    // Get the template from database
    const dbTemplate = await getEmailTemplateById(templateId);
    if (!dbTemplate) {
      throw new Error('Database email template not found');
    }
    
    const baseUrl = getBaseUrl();
    const dashboardUrl = `${baseUrl}/dashboard`;
    const encodedDashboardUrl = encodeURIComponent(dashboardUrl);
    
    const enhancedVariables = {
      ...variables,
      Base_URL: baseUrl,
      Encoded_Dashboard_URL: encodedDashboardUrl
    };
    
    // Convert database template to email format WITH VARIABLES
    const template = convertDatabaseTemplateToEmail(dbTemplate, enhancedVariables);
    
    return sendEmail({
      to: requesterEmail,
      subject: template.subject,
      message: template.textContent,
      variables: enhancedVariables
    });
  } catch (error) {
    console.error('Error sending clarification reminder email:', error);
    // Fallback to hardcoded template if database fails
    const template = EMAIL_TEMPLATES.CLARIFICATION_REMINDER;
    const baseUrl = getBaseUrl();
    const dashboardUrl = `${baseUrl}/dashboard`;
    const encodedDashboardUrl = encodeURIComponent(dashboardUrl);
    
    const enhancedVariables = {
      ...variables,
      Base_URL: baseUrl,
      Encoded_Dashboard_URL: encodedDashboardUrl
    };
    
    return sendEmail({
      to: requesterEmail,
      subject: template.subject,
      message: template.template,
      variables: enhancedVariables
    });
  }
};
