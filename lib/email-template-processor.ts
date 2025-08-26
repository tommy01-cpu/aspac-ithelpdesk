import { PrismaClient } from '@prisma/client';
import { formatStatusForDisplay } from './status-colors';

const prisma = new PrismaClient();

interface EmailVariableData {
  Request_ID?: string;
  Request_Approval_Status?: string;
  Request_Status?: string;
  Request_Approval_Comment?: string;
  Request_Title?: string;
  Request_Description?: string;
  Requester_Email?: string;
  Technician_Name?: string;
  Due_By_Date?: string;
  Emails_To_Notify?: string;
  Request_Resolution?: string;
  Request_Subject?: string;
}

export async function getRequestVariableData(requestId: number): Promise<EmailVariableData> {
  try {
    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        user: true,
        approvals: {
          where: { status: 'rejected' },
          orderBy: { actedOn: 'desc' },
          take: 1
        }
      }
    });

    if (!request) {
      throw new Error(`Request with ID ${requestId} not found`);
    }

    // Extract form data
    const formData = request.formData as any;
    
    // Get rejection comment if any
    const rejectedApproval = request.approvals.find(a => a.status === 'rejected');

    const variableData: EmailVariableData = {
      Request_ID: request.id.toString(),
      Request_Status: formatStatusForDisplay(request.status),
      Request_Title: formData?.title || formData?.subject || 'No Title',
      Request_Description: formData?.description || formData?.details || 'No Description',
      Request_Subject: formData?.subject || formData?.title || 'No Subject',
      Requester_Email: request.user?.emp_email || 'No Email',
      Request_Approval_Status: rejectedApproval ? 'REJECTED' : 
        (request.status === 'resolved' || request.status === 'closed') ? 'APPROVED' : 
        request.status.toUpperCase(),
      Request_Approval_Comment: rejectedApproval?.comments || '',
      // These would need additional queries/logic based on your data structure
      Technician_Name: '', // Would need to get from assignments
      Due_By_Date: '', // Would need to calculate based on SLA
      Emails_To_Notify: '', // Would need to get from template/user settings
      Request_Resolution: '' // Would need to get from resolution data
    };

    return variableData;
  } catch (error) {
    console.error('Error fetching request variable data:', error);
    return {};
  }
}

export function replaceEmailVariables(template: string, variableData: EmailVariableData): string {
  let processedTemplate = template;

  // Replace each variable in the template
  Object.entries(variableData).forEach(([key, value]) => {
    if (value) {
      // Handle special case for Request_Approval_Comment - only show if rejected
      if (key === 'Request_Approval_Comment' && variableData.Request_Approval_Status !== 'REJECTED') {
        // Remove the comment variable and any surrounding text if not rejected
        processedTemplate = processedTemplate.replace(
          new RegExp(`\\$\\{${key}\\}`, 'g'),
          ''
        );
      } else {
        // Replace the variable with actual data
        processedTemplate = processedTemplate.replace(
          new RegExp(`\\$\\{${key}\\}`, 'g'),
          value
        );
      }
    }
  });

  return processedTemplate;
}

export async function processEmailTemplate(templateContent: string, requestId?: number): Promise<string> {
  if (!requestId) {
    // If no request ID provided, return template as-is (for preview purposes)
    return templateContent;
  }

  try {
    const variableData = await getRequestVariableData(requestId);
    return replaceEmailVariables(templateContent, variableData);
  } catch (error) {
    console.error('Error processing email template:', error);
    return templateContent;
  }
}
