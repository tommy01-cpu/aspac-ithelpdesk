import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';
import { getEmailConfigForService } from './email-config';
import { processImagesForEmailAuto } from './email-image-processor-enhanced';

// Database email template mapping - maps function names to template ID values
const TEMPLATE_ID_MAPPING = {
  // Request creation templates
  'REQUEST_CREATED_REQUESTER': 10, // acknowledge-new-request
  'REQUEST_CREATED_CC': 11, // acknowledge-cc-new-request
  
  // Approval templates
  'APPROVAL_REQUIRED': 12, // notify-approver-approval
  'APPROVAL_REMINDER': 13, // approval-reminder
  'REQUEST_APPROVED_REJECTED': 14, // notify-approval-status
  'APPROVER_ADDED': 12, // notify-approver-added (Changed from 30 to 12)
  
  // Clarification templates
  'CLARIFICATION_REQUIRED': 15, // notify-clarification
  'CLARIFICATION_REMINDER': 16, // clarification-reminder
  
  // Assignment templates
  'REQUEST_ASSIGNED_REQUESTER': 17, // notify-technician-assigned
  'REQUEST_ASSIGNED_TECHNICIAN': 18, // alert-technician-assigned
  
  // Resolution templates
  'REQUEST_RESOLVED_REQUESTER': 20, // email-user-resolved
  'REQUEST_RESOLVED_CC': 21, // acknowledge-cc-resolved
  'REQUEST_CLOSED_CC': 22, // acknowledge-cc-closed
  
  // SLA escalation template
  'SLA_ESCALATION': 19, // notify-sla-escalation
} as const;

export type TemplateType = keyof typeof TEMPLATE_ID_MAPPING;

interface DatabaseEmailTemplate {
  id: number;
  template_key: string;
  title: string;
  subject: string;
  header_html: string | null;
  content_html: string;
  footer_html: string | null;
  to_field: string | null;
  cc_field?: string | null;
  is_active: boolean | null;
}

// Cache for email templates to avoid database calls on every email send
const templateCache = new Map<number, DatabaseEmailTemplate>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let lastCacheUpdate = 0;

// Fetch email template from database by ID
export const getEmailTemplateFromDatabase = async (templateType: TemplateType): Promise<DatabaseEmailTemplate | null> => {
  try {
    const templateId = TEMPLATE_ID_MAPPING[templateType];
    if (!templateId) {
      console.warn(`No template ID mapping found for type: ${templateType}`);
      return null;
    }

    return await getEmailTemplateById(templateId);
  } catch (error) {
    console.error(`Error fetching email template for ${templateType}:`, error);
    return null;
  }
};

// Direct fetch by template ID
export const getEmailTemplateById = async (templateId: number): Promise<DatabaseEmailTemplate | null> => {
  try {
    // Check cache first
    const now = Date.now();
    
    if (templateCache.has(templateId) && (now - lastCacheUpdate) < CACHE_DURATION) {
      console.log(`Using cached template for ID: ${templateId}`);
      return templateCache.get(templateId) || null;
    }

    // Fetch from database
    console.log(`Fetching email template from database with ID: ${templateId}`);
    
    // Debug: Check if prisma is available
    if (!prisma) {
      console.error('❌ Prisma client is not available');
      return null;
    }
    
    console.log('✅ Prisma client is available');
    
    // @ts-ignore - email_templates model exists but TypeScript cache issue
    const template = await prisma.email_templates.findUnique({
      where: { 
        id: templateId
      },
      select: {
        id: true,
        template_key: true,
        title: true,
        subject: true,
        header_html: true,
        content_html: true,
        footer_html: true,
        to_field: true,
        cc_field: true,
        is_active: true
      }
    });

    if (template && template.is_active) {
      console.log(`Found database template: ${template.title}`);
      templateCache.set(templateId, template);
      if (templateCache.size === 1) {
        lastCacheUpdate = now; // Update cache timestamp when first template is added
      }
      return template;
    } else {
      console.warn(`No active email template found for ID: ${templateId}`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching email template with ID ${templateId}:`, error);
    return null;
  }
};

// Convert database template to email format
export const convertDatabaseTemplateToEmail = (dbTemplate: DatabaseEmailTemplate, variables: Record<string, string> = {}): { subject: string; htmlContent: string; textContent: string } => {
  try {
    console.log('=== TEMPLATE CONVERSION DEBUG ===');
    console.log('Template subject:', dbTemplate.subject);
    console.log('Variables passed:', variables);
    
    // Replace variables in subject
    let subject = dbTemplate.subject;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      subject = subject.replace(regex, value || '');
    });
    
    console.log('Subject after variable replacement:', subject);

    // Extract content from content_html (remove wrapper if present)
    let content = dbTemplate.content_html || '';
    
    // Server-safe content extraction using regex - try multiple patterns
    // Pattern 1: div with padding style
    const contentMatch = content.match(/<div[^>]*style="[^"]*padding:\s*32px[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    if (contentMatch) {
      content = contentMatch[1];
      console.log('Used div wrapper extraction pattern 1');
    } else {
      // Pattern 2: div with class and padding
      const altMatch = content.match(/<div[^>]*class="[^"]*"[^>]*style="[^"]*padding[^"]*"[^>]*>([\s\S]*?)<\/div>/);
      if (altMatch) {
        content = altMatch[1];
        console.log('Used div wrapper extraction pattern 2');
      } else {
        // Pattern 3: Check if content starts with table (like CC template)
        if (content.trim().startsWith('<table')) {
          // For table-based templates, use the content as-is
          console.log('Template is table-based, using content as-is');
          // content remains unchanged
        } else {
          console.log('No wrapper pattern matched, using content as-is');
          // content remains unchanged for other templates
        }
      }
    }

    // Replace variables in content
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      content = content.replace(regex, value || '');
    });
    
    console.log('Content after variable replacement (first 200 chars):', content.substring(0, 200));

    // Use only the content (no header or footer)
    let htmlContent = content;

    // Convert HTML to plain text (simple conversion)
    const textContent = htmlContent
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive line breaks
      .trim();

    return {
      subject,
      htmlContent,
      textContent
    };
  } catch (error) {
    console.error('Error converting database template to email:', error);
    console.log('Falling back to basic conversion');
    
    // Fallback to basic conversion
    let subject = dbTemplate.subject;
    let content = dbTemplate.content_html || '';
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      subject = subject.replace(regex, value || '');
      content = content.replace(regex, value || '');
    });

    return {
      subject,
      htmlContent: content,
      textContent: content.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ')
    };
  }
};

// Clear template cache (useful for admin updates)
export const clearEmailTemplateCache = () => {
  templateCache.clear();
  lastCacheUpdate = 0;
  console.log('Email template cache cleared');
};

// Get all template IDs for reference
export const getAllTemplateIds = () => {
  return Object.values(TEMPLATE_ID_MAPPING);
};

// Get template ID by type
export const getTemplateIdByType = (templateType: TemplateType): number | null => {
  return TEMPLATE_ID_MAPPING[templateType] || null;
};

// Get base URL from environment
const getBaseUrl = () => {
  return process.env.NEXTAUTH_URL || 'http://192.168.1.85:3000';
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

// Send email using database template by ID
export const sendEmailWithTemplateId = async (
  templateId: number, 
  variables: Record<string, string> = {},
  recipientOverride?: string
): Promise<{subject: string; htmlContent: string; textContent: string; to: string; cc?: string} | null> => {
  try {
    const template = await getEmailTemplateById(templateId);
    if (!template) {
      console.error(`Template with ID ${templateId} not found or inactive`);
      return null;
    }

    const emailContent = convertDatabaseTemplateToEmail(template, variables);
    
    // Determine recipient
    let toField = template.to_field || '';
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      toField = toField.replace(regex, value || '');
    });
    
    const recipient = recipientOverride || toField;
    
    // Handle CC field if present
    let ccField = '';
    if (template.cc_field) {
      ccField = template.cc_field;
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
        ccField = ccField.replace(regex, value || '');
      });
    }

    console.log(`Prepared email using template ID ${templateId} (${template.title})`, {
      to: recipient,
      cc: ccField || undefined,
      subject: emailContent.subject
    });

    return {
      ...emailContent,
      to: recipient,
      cc: ccField || undefined
    };
  } catch (error) {
    console.error(`Error sending email with template ID ${templateId}:`, error);
    return null;
  }
};

// Specific email functions using database templates

// Request assigned to requester email (Template ID 17 - notify-technician-assigned)
export const sendRequestAssignedRequesterEmail = async (
  requesterEmail: string, 
  variables: Record<string, string>
): Promise<boolean> => {
  try {
    console.log('📧 Sending request assigned requester email using database template...');
    
    const emailContent = await sendEmailWithTemplateId(17, variables, requesterEmail);
    if (!emailContent) {
      throw new Error('Failed to prepare email content from database template 17');
    }
    
    const result = await sendEmail({
      to: requesterEmail,
      subject: emailContent.subject,
      message: emailContent.textContent,
      htmlMessage: emailContent.htmlContent, // ✅ Include HTML content
    });
    
    console.log('✅ Request assigned requester email sent successfully');
    return true;
  } catch (error) {
    console.error('❌ Error sending request assigned requester email:', error);
    return false;
  }
};

// Request assigned to technician email (Template ID 18 - alert-technician-assigned)
export const sendRequestAssignedTechnicianEmail = async (
  technicianEmail: string, 
  variables: Record<string, string>
): Promise<boolean> => {
  try {
    console.log('📧 Sending request assigned technician email using database template...');
    
    const emailContent = await sendEmailWithTemplateId(18, variables, technicianEmail);
    if (!emailContent) {
      throw new Error('Failed to prepare email content from database template 18');
    }
    
    const result = await sendEmail({
      to: technicianEmail,
      subject: emailContent.subject,
      message: emailContent.textContent,
      htmlMessage: emailContent.htmlContent, // ✅ Include HTML content
    });
    
    console.log('✅ Request assigned technician email sent successfully');
    return true;
  } catch (error) {
    console.error('❌ Error sending request assigned technician email:', error);
    return false;
  }
};

// Request created email (Template ID 10 - acknowledge-new-request)
export const sendRequestCreatedEmail = async (
  requesterEmail: string, 
  variables: Record<string, string>
): Promise<boolean> => {
  try {
    console.log('📧 Sending request created email using database template...');
    
    const emailContent = await sendEmailWithTemplateId(10, variables, requesterEmail);
    if (!emailContent) {
      throw new Error('Failed to prepare email content from database template 10');
    }
    
    const result = await sendEmail({
      to: requesterEmail,
      subject: emailContent.subject,
      message: emailContent.textContent,
      htmlMessage: emailContent.htmlContent,
    });
    
    console.log('✅ Request created email sent successfully');
    return true;
  } catch (error) {
    console.error('❌ Error sending request created email:', error);
    return false;
  }
};

// Request created CC email (Template ID 11 - acknowledge-cc-new-request)
export const sendRequestCreatedCCEmail = async (
  ccEmails: string[], 
  variables: Record<string, string>
): Promise<boolean> => {
  try {
    console.log('📧 Sending request created CC email using database template...');
    
    const emailContent = await sendEmailWithTemplateId(11, variables);
    if (!emailContent) {
      throw new Error('Failed to prepare email content from database template 11');
    }
    
    const result = await sendEmail({
      to: ccEmails,
      subject: emailContent.subject,
      message: emailContent.textContent,
      htmlMessage: emailContent.htmlContent,
    });
    
    console.log('✅ Request created CC email sent successfully');
    return true;
  } catch (error) {
    console.error('❌ Error sending request created CC email:', error);
    return false;
  }
};

// Approval required email (Template ID 12 - notify-approver-approval)
export const sendApprovalRequiredEmail = async (
  approverEmail: string, 
  variables: Record<string, string>
): Promise<boolean> => {
  try {
    console.log('📧 Sending approval required email using database template...');
    
    const emailContent = await sendEmailWithTemplateId(12, variables, approverEmail);
    if (!emailContent) {
      throw new Error('Failed to prepare email content from database template 12');
    }
    
    const result = await sendEmail({
      to: approverEmail,
      subject: emailContent.subject,
      message: emailContent.textContent,
      htmlMessage: emailContent.htmlContent,
    });
    
    console.log('✅ Approval required email sent successfully');
    return true;
  } catch (error) {
    console.error('❌ Error sending approval required email:', error);
    return false;
  }
};

// Approver added email (Template ID 12 - notify-approver-added)
export const sendApproverAddedEmail = async (
  approverEmail: string, 
  variables: Record<string, string>
): Promise<boolean> => {
  try {
    console.log('📧 Sending approver added email using database template...');
    
    const emailContent = await sendEmailWithTemplateId(12, variables, approverEmail);
    if (!emailContent) {
      throw new Error('Failed to prepare email content from database template 12');
    }
    
    const result = await sendEmail({
      to: approverEmail,
      subject: emailContent.subject,
      message: emailContent.textContent,
      htmlMessage: emailContent.htmlContent,
    });
    
    console.log('✅ Approver added email sent successfully');
    return true;
  } catch (error) {
    console.error('❌ Error sending approver added email:', error);
    return false;
  }
};

// Request approved/rejected email (Template ID 14 - notify-approval-status)
export const sendRequestApprovedRejectedEmail = async (
  requesterEmail: string, 
  variables: Record<string, string>
): Promise<boolean> => {
  try {
    console.log('📧 Sending request approved/rejected email using database template...');
    
    const emailContent = await sendEmailWithTemplateId(14, variables, requesterEmail);
    if (!emailContent) {
      throw new Error('Failed to prepare email content from database template 14');
    }
    
    const result = await sendEmail({
      to: requesterEmail,
      subject: emailContent.subject,
      message: emailContent.textContent,
      htmlMessage: emailContent.htmlContent,
    });
    
    console.log('✅ Request approved/rejected email sent successfully');
    return true;
  } catch (error) {
    console.error('❌ Error sending request approved/rejected email:', error);
    return false;
  }
};

// Clarification required email (Template ID 15 - notify-clarification)
export const sendClarificationRequiredEmail = async (
  requesterEmail: string, 
  variables: Record<string, string>
): Promise<boolean> => {
  try {
    console.log('📧 Sending clarification required email using database template...');
    
    const emailContent = await sendEmailWithTemplateId(15, variables, requesterEmail);
    if (!emailContent) {
      throw new Error('Failed to prepare email content from database template 15');
    }
    
    const result = await sendEmail({
      to: requesterEmail,
      subject: emailContent.subject,
      message: emailContent.textContent,
      htmlMessage: emailContent.htmlContent,
    });
    
    console.log('✅ Clarification required email sent successfully');
    return true;
  } catch (error) {
    console.error('❌ Error sending clarification required email:', error);
    return false;
  }
};

// Request resolved email (Template ID 20 - email-user-resolved)
export const sendRequestResolvedEmail = async (
  requesterEmail: string, 
  variables: Record<string, string>
): Promise<boolean> => {
  try {
    console.log('📧 Sending request resolved email using database template...');
    
    const emailContent = await sendEmailWithTemplateId(20, variables, requesterEmail);
    if (!emailContent) {
      throw new Error('Failed to prepare email content from database template 20');
    }
    
    const result = await sendEmail({
      to: requesterEmail,
      subject: emailContent.subject,
      message: emailContent.textContent,
      htmlMessage: emailContent.htmlContent,
    });
    
    console.log('✅ Request resolved email sent successfully');
    return true;
  } catch (error) {
    console.error('❌ Error sending request resolved email:', error);
    return false;
  }
};

// SLA escalation email (Template ID 19 - notify-sla-escalation)
export const sendSLAEscalationEmail = async (
  technicianEmail: string, 
  variables: Record<string, string>
): Promise<boolean> => {
  try {
    console.log('📧 Sending SLA escalation email using database template...');
    
    const emailContent = await sendEmailWithTemplateId(19, variables, technicianEmail);
    if (!emailContent) {
      throw new Error('Failed to prepare email content from database template 19');
    }
    
    const result = await sendEmail({
      to: technicianEmail,
      subject: emailContent.subject,
      message: emailContent.textContent,
      htmlMessage: emailContent.htmlContent,
    });
    
    console.log('✅ SLA escalation email sent successfully');
    return true;
  } catch (error) {
    console.error('❌ Error sending SLA escalation email:', error);
    return false;
  }
};

// Request resolved CC email (Template ID 21 - acknowledge-cc-resolved)
export const sendRequestResolvedCCEmail = async (
  ccEmails: string[], 
  variables: Record<string, string>
): Promise<boolean> => {
  try {
    console.log('📧 Sending request resolved CC email using database template...');
    
    const emailContent = await sendEmailWithTemplateId(21, variables);
    if (!emailContent) {
      throw new Error('Failed to prepare email content from database template 21');
    }
    
    const result = await sendEmail({
      to: ccEmails,
      subject: emailContent.subject,
      message: emailContent.textContent,
      htmlMessage: emailContent.htmlContent,
    });
    
    console.log('✅ Request resolved CC email sent successfully');
    return true;
  } catch (error) {
    console.error('❌ Error sending request resolved CC email:', error);
    return false;
  }
};

// Request closed CC email (Template ID 22 - acknowledge-cc-closed)
export const sendRequestClosedCCEmail = async (
  ccEmails: string[], 
  variables: Record<string, string>
): Promise<boolean> => {
  try {
    console.log('📧 Sending request closed CC email using database template...');
    
    const emailContent = await sendEmailWithTemplateId(22, variables);
    if (!emailContent) {
      throw new Error('Failed to prepare email content from database template 22');
    }
    
    const result = await sendEmail({
      to: ccEmails,
      subject: emailContent.subject,
      message: emailContent.textContent,
      htmlMessage: emailContent.htmlContent,
    });
    
    console.log('✅ Request closed CC email sent successfully');
    return true;
  } catch (error) {
    console.error('❌ Error sending request closed CC email:', error);
    return false;
  }
};

// Request cancelled email (Template ID 32 - cancellation notification)
export const sendRequestCancelledEmail = async (
  emails: string[], 
  variables: Record<string, string>
): Promise<boolean> => {
  try {
    console.log('📧 Sending request cancelled email using database template 32...');
    
    const emailContent = await sendEmailWithTemplateId(32, variables);
    if (!emailContent) {
      throw new Error('Failed to prepare email content from database template 32');
    }
    
    const result = await sendEmail({
      to: emails,
      subject: emailContent.subject,
      message: emailContent.textContent,
      htmlMessage: emailContent.htmlContent,
    });
    
    console.log('✅ Request cancelled email sent successfully');
    return true;
  } catch (error) {
    console.error('❌ Error sending request cancelled email:', error);
    return false;
  }
};

// Request cancelled CC email (Template ID 29 - cancellation CC notification)
export const sendRequestCancelledCCEmail = async (
  ccEmails: string[], 
  variables: Record<string, string>
): Promise<boolean> => {
  try {
    console.log('📧 Sending request cancelled CC email using database template 29...');
    
    const emailContent = await sendEmailWithTemplateId(29, variables);
    if (!emailContent) {
      throw new Error('Failed to prepare email content from database template 29');
    }
    
    const result = await sendEmail({
      to: ccEmails,
      subject: emailContent.subject,
      message: emailContent.textContent,
      htmlMessage: emailContent.htmlContent,
    });
    
    console.log('✅ Request cancelled CC email sent successfully');
    return true;
  } catch (error) {
    console.error('❌ Error sending request cancelled CC email:', error);
    return false;
  }
};

// Approval reminder email (Template ID 13 - approval-reminder)
export const sendApprovalReminderEmail = async (
  approverEmail: string, 
  variables: Record<string, string> = {}
): Promise<boolean> => {
  try {
    console.log('📧 Sending approval reminder email using database template...');
    
    const emailContent = await sendEmailWithTemplateId(13, variables, approverEmail);
    if (!emailContent) {
      throw new Error('Failed to prepare email content from database template 13');
    }
    
    const result = await sendEmail({
      to: approverEmail,
      subject: emailContent.subject,
      message: emailContent.textContent,
      htmlMessage: emailContent.htmlContent,
    });
    
    console.log('✅ Approval reminder email sent successfully');
    return true;
  } catch (error) {
    console.error('❌ Error sending approval reminder email:', error);
    return false;
  }
};

// Clarification reminder email (Template ID 16 - clarification-reminder)
export const sendClarificationReminderEmail = async (
  requesterEmail: string, 
  variables: Record<string, string> = {}
): Promise<boolean> => {
  try {
    console.log('📧 Sending clarification reminder email using database template...');
    
    const emailContent = await sendEmailWithTemplateId(16, variables, requesterEmail);
    if (!emailContent) {
      throw new Error('Failed to prepare email content from database template 16');
    }
    
    const result = await sendEmail({
      to: requesterEmail,
      subject: emailContent.subject,
      message: emailContent.textContent,
      htmlMessage: emailContent.htmlContent,
    });
    
    console.log('✅ Clarification reminder email sent successfully');
    return true;
  } catch (error) {
    console.error('❌ Error sending clarification reminder email:', error);
    return false;
  }
};