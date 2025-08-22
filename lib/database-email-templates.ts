import { prisma } from '@/lib/prisma';

// Database email template mapping - maps function names to template ID values
const TEMPLATE_ID_MAPPING = {
  // Request creation templates
  'REQUEST_CREATED_REQUESTER': 10, // acknowledge-new-request
  'REQUEST_CREATED_CC': 11, // acknowledge-cc-new-request
  
  // Approval templates
  'APPROVAL_REQUIRED': 12, // notify-approver-approval
  'APPROVAL_REMINDER': 13, // approval-reminder
  'REQUEST_APPROVED_REJECTED': 14, // notify-approval-status
  
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
  templateKey: string;
  title: string;
  subject: string;
  headerHtml: string;
  contentHtml: string;
  footerHtml: string;
  toField: string;
  ccField?: string;
  isActive: boolean;
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
    
    const template = await prisma.emailTemplates.findUnique({
      where: { 
        id: templateId
      },
      select: {
        id: true,
        templateKey: true,
        title: true,
        subject: true,
        headerHtml: true,
        contentHtml: true,
        footerHtml: true,
        toField: true,
        ccField: true,
        isActive: true
      }
    });

    if (template && template.isActive) {
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

    // Extract content from contentHtml (remove the wrapper div)
    let content = dbTemplate.contentHtml;
    
    // Server-safe content extraction using regex
    const contentMatch = content.match(/<div[^>]*style="[^"]*padding:\s*32px[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    if (contentMatch) {
      content = contentMatch[1];
    } else {
      // Try alternative pattern for wrapper extraction
      const altMatch = content.match(/<div[^>]*class="[^"]*"[^>]*style="[^"]*padding[^"]*"[^>]*>([\s\S]*?)<\/div>/);
      if (altMatch) {
        content = altMatch[1];
      }
    }

    // Replace variables in content
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      content = content.replace(regex, value || '');
    });
    
    console.log('Content after variable replacement (first 200 chars):', content.substring(0, 200));

    // Construct full HTML email
    let htmlContent = '';
    
    // Add header if exists
    if (dbTemplate.headerHtml) {
      let header = dbTemplate.headerHtml;
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
        header = header.replace(regex, value || '');
      });
      htmlContent += header;
    }
    
    // Add content
    htmlContent += content;
    
    // Add footer if exists
    if (dbTemplate.footerHtml) {
      let footer = dbTemplate.footerHtml;
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
        footer = footer.replace(regex, value || '');
      });
      htmlContent += footer;
    }

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
    let content = dbTemplate.contentHtml;
    
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
    let toField = template.toField;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      toField = toField.replace(regex, value || '');
    });
    
    const recipient = recipientOverride || toField;
    
    // Handle CC field if present
    let ccField = '';
    if (template.ccField) {
      ccField = template.ccField;
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
