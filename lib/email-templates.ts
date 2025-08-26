import { prisma } from './prisma';
import { formatStatusForDisplay } from './status-colors';

interface EmailVariables {
  [key: string]: string;
}

interface SendEmailOptions {
  templateKey: string;
  variables: EmailVariables;
  to?: string; // Override template default
  cc?: string; // Override template default
}

export class EmailTemplateService {
  /**
   * Replace variables in template content
   */
  private static replaceVariables(content: string, variables: EmailVariables): string {
    let processedContent = content;
    
    // Replace ${VariableName} patterns
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      processedContent = processedContent.replace(regex, value || '');
    });
    
    return processedContent;
  }

  /**
   * Get email template from database and process variables
   */
  static async getProcessedTemplate(templateKey: string, variables: EmailVariables) {
    try {
      // Get template from database
      // @ts-ignore - email_templates model exists but TypeScript cache issue
      const template = await prisma.email_templates.findUnique({
        where: { 
          template_key: templateKey,
          is_active: true 
        }
      });

      if (!template) {
        throw new Error(`Email template '${templateKey}' not found`);
      }

      // Process variables in all template parts
      const processedTemplate = {
        id: template.id,
        title: template.title,
        subject: this.replaceVariables(template.subject, variables),
        to: this.replaceVariables(template.to_field || '', variables),
        cc: this.replaceVariables(template.cc_field || '', variables),
        headerHtml: this.replaceVariables(template.header_html || '', variables),
        contentHtml: this.replaceVariables(template.content_html || '', variables),
        footerHtml: this.replaceVariables(template.footer_html || '', variables),
        // Combine all HTML parts into complete email
        fullHtml: `
          ${this.replaceVariables(template.header_html || '', variables)}
          ${this.replaceVariables(template.content_html || '', variables)}
          ${this.replaceVariables(template.footer_html || '', variables)}
        `.trim()
      };

      return processedTemplate;

    } catch (error) {
      console.error('Error processing email template:', error);
      throw error;
    }
  }

  /**
   * Send email using template (integrate with your email service)
   */
  static async sendTemplatedEmail(options: SendEmailOptions) {
    try {
      const template = await this.getProcessedTemplate(options.templateKey, options.variables);
      
      // Use override recipients if provided
      const to = options.to || template.to;
      const cc = options.cc || template.cc;

      // Here you would integrate with your actual email service
      // For example: SendGrid, NodeMailer, SES, etc.
      const emailData = {
        to: to.split(',').map(email => email.trim()).filter(Boolean),
        cc: cc.split(',').map(email => email.trim()).filter(Boolean),
        subject: template.subject,
        html: template.fullHtml,
        from: process.env.EMAIL_FROM || 'noreply@ithelpdesk.com'
      };

      console.log('📧 Sending email:', {
        template: options.templateKey,
        to: emailData.to,
        cc: emailData.cc,
        subject: emailData.subject
      });

      // TODO: Replace with actual email service call
      // await sendEmail(emailData);
      
      return {
        success: true,
        template,
        emailData
      };

    } catch (error) {
      console.error('Error sending templated email:', error);
      throw error;
    }
  }
}

// Example usage functions for common notifications:

export async function sendSelfServiceLoginEmail(requesterEmail: string, requesterName: string, loginName: string, serverUrl: string) {
  return EmailTemplateService.sendTemplatedEmail({
    templateKey: 'send-self-service-login',
    variables: {
      RequesterName: requesterName,
      RequesterEmail: requesterEmail,
      LoginName: loginName,
      ServerAliasURL: serverUrl,
      PasswordResetLink: 'Please check with IT for initial password'
    },
    to: requesterEmail
  });
}

export async function sendNewRequestAcknowledgment(
  requestId: string, 
  requesterEmail: string, 
  requesterName: string,
  requestSubject: string,
  requestDescription: string,
  requestStatus: string
) {
  return EmailTemplateService.sendTemplatedEmail({
    templateKey: 'acknowledge-new-request',
    variables: {
      Request_ID: requestId,
      Requester_Name: requesterName,
      Requester_Email: requesterEmail,
      Request_Subject: requestSubject,
      Request_Description: requestDescription,
      Request_Status: formatStatusForDisplay(requestStatus)
    }
  });
}

export async function sendApprovalRequest(
  requestId: string,
  approverEmail: string,
  requesterName: string,
  requestSubject: string,
  requestDescription: string
) {
  return EmailTemplateService.sendTemplatedEmail({
    templateKey: 'notify-approver-approval',
    variables: {
      Request_ID: requestId,
      Approver_Email: approverEmail,
      Requester_Name: requesterName,
      Request_Subject: requestSubject,
      Request_Description: requestDescription
    }
  });
}
