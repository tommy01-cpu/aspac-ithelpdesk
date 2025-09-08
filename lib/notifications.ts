import { prisma } from '@/lib/prisma';
import { 
  sendRequestCreatedEmail, 
  sendRequestCreatedCCEmail, 
  sendApprovalRequiredEmail,
  sendApproverAddedEmail,
  sendRequestApprovedRejectedEmail,
  sendClarificationRequiredEmail,
  sendRequestAssignedRequesterEmail,
  sendRequestAssignedTechnicianEmail,
  sendRequestResolvedEmail,
  sendRequestResolvedCCEmail,
  sendSLAEscalationEmail,
  sendRequestClosedCCEmail
} from '@/lib/database-email-templates';
// import { processImagesForEmailAuto } from './email-image-processor-enhanced'; // DISABLED: Keep base64 images in emails
import { formatStatusForDisplay } from './status-colors';

// Helper function to format timestamp for notifications
function formatTimestampForNotification(timestamp: Date | string): string {
  const date = new Date(timestamp);
  
  // Format as "September 2, 2025 4:34 PM"
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila'
  });
}

// Helper function to get base URL
const getBaseUrl = () => {
  const baseUrl = process.env.API_BASE_URL || process.env.NEXTAUTH_URL;
  if (!baseUrl) {
    throw new Error('API_BASE_URL or NEXTAUTH_URL environment variable is required for notifications');
  }
  return baseUrl;
};

// Helper function to ensure all email variables have string values
const sanitizeEmailVariables = (variables: any): Record<string, string> => {
  const sanitized: Record<string, string> = {};
  Object.keys(variables).forEach(key => {
    sanitized[key] = variables[key]?.toString() || '';
  });
  return sanitized;
};

// Helper function to create default email variables with all required fields
const createDefaultEmailVariables = (overrides: Partial<RequestEmailVariables> = {}): RequestEmailVariables => {
  return {
    Request_ID: '',
    Request_Status: '',
    Request_Subject: '',
    Request_Description: '',
    Requester_Name: '',
    Requester_Email: '',
    Request_Title: '',
    Approver_Name: '',
    Approver_Email: '',
    Approval_Comments: '',
    Request_Approval_Status: '',
    Request_Approval_Comment: '',
    Clarification: '',
    Request_URL: '',
    Request_Link: '',
    Base_URL: '',
    Encoded_Request_URL: '',
    ...overrides
  };
};

export type NotificationType = 
  | 'REQUEST_CREATED'
  | 'REQUEST_APPROVED'
  | 'REQUEST_REJECTED'
  | 'REQUEST_ASSIGNED'
  | 'REQUEST_RESOLVED'
  | 'REQUEST_CLOSED'
  | 'APPROVAL_REQUIRED'
  | 'CLARIFICATION_REQUIRED'
  | 'CLARIFICATION_RESPONSE'
  | 'SLA_WARNING'
  | 'SLA_ESCALATION';

export interface NotificationData {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
}

export interface RequestEmailVariables extends Record<string, string> {
  Request_ID: string;
  Request_Status: string;
  Request_Subject: string;
  Request_Description: string;
  Requester_Name: string;
  Requester_Email: string;
  Request_Title: string;
  Approver_Name: string;
  Approver_Email: string;
  Approval_Comments: string;
  Request_Approval_Status: string; // Added for email template compatibility
  Request_Approval_Comment: string; // Added for email template compatibility
  Clarification: string;
  Request_URL: string;
  Request_Link: string;
  Base_URL: string;
  Encoded_Request_URL: string;
}

// Create in-app notification
export const createNotification = async (notificationData: NotificationData): Promise<boolean> => {
  try {
    await prisma.notification.create({
      data: {
        userId: notificationData.userId,
        type: notificationData.type as any,
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data || {},
      },
    });
    
    console.log(`Notification created for user ${notificationData.userId}: ${notificationData.title}`);
    return true;
  } catch (error) {
    console.error('Error creating notification:', error);
    return false;
  }
};

// Get user notifications
export const getUserNotifications = async (userId: number, limit: number = 50) => {
  try {
    return await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    return [];
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId: string, userId: number): Promise<boolean> => {
  try {
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId: userId, // Ensure user can only mark their own notifications
      },
      data: { isRead: true },
    });
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
};

// Mark all notifications as read for a user
export const markAllNotificationsAsRead = async (userId: number): Promise<boolean> => {
  try {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
};

// Get unread notification count
export const getUnreadNotificationCount = async (userId: number): Promise<number> => {
  try {
    return await prisma.notification.count({
      where: { userId, isRead: false },
    });
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    return 0;
  }
};

// Request creation notifications (4.1.1, 4.1.2)
export const notifyRequestCreated = async (requestData: any, templateData: any) => {
  try {
    const requestId = requestData.id;
    const requesterName = `${requestData.user.emp_fname} ${requestData.user.emp_lname}`.trim();
    const requesterEmail = requestData.user.emp_email;
    const requestSubject = (requestData.formData as any)?.['8'] || templateData?.name || 'IT Helpdesk Request';
    const rawRequestDescription = (requestData.formData as any)?.['9'] || 'No description provided';
    
    // Process images in the description for email compatibility
    const requestDescription = rawRequestDescription; // Keep base64 images in emails
    
    const emailsToNotify = (() => {
      // Use field ID '10' as the primary source for email notifications
      // This is the actual form field that stores emails to notify
      const emailField = (requestData.formData as any)?.['10'] || [];
      
      console.log('🔍 Email notify field check:', {
        field10: (requestData.formData as any)?.['10'],
        emailNotify: (requestData.formData as any)?.emailNotify,
        emailsToNotify: (requestData.formData as any)?.emailsToNotify,
        selectedField: emailField,
        note: 'Using field 10 as primary source'
      });
      
      if (Array.isArray(emailField)) {
        return emailField.filter((email: string) => email && email.trim());
      } else if (typeof emailField === 'string' && emailField.trim()) {
        return emailField.split(',').map((email: string) => email.trim()).filter((email: string) => email);
      }
      return [];
    })();

    // Generate base URL and request URLs
    const baseUrl = getBaseUrl();
    const requestUrl = `${baseUrl}/requests/view/${requestId}`;
    const encodedRequestUrl = encodeURIComponent(requestUrl);

    // Email variables
    const emailVariables: RequestEmailVariables = {
      Request_ID: requestId.toString(),
      Request_Status: formatStatusForDisplay(requestData.status || 'for_approval'),
      Request_Subject: requestSubject,
      Request_Description: requestDescription,
      Requester_Name: requesterName,
      Requester_Email: requesterEmail,
      Request_Title: requestSubject,
      Approver_Name: '', // Not applicable for request creation
      Approver_Email: '', // Not applicable for request creation
      Approval_Comments: '', // Not applicable for request creation
      Request_Approval_Status: '', // Not applicable for request creation
      Request_Approval_Comment: '', // Not applicable for request creation
      Clarification: '', // Not applicable for request creation
      Request_URL: requestUrl,
      Request_Link: requestUrl,
      Base_URL: baseUrl,
      Encoded_Request_URL: encodedRequestUrl,
    };

    // Send email to requester (4.1.1)
    if (requesterEmail) {
      await sendRequestCreatedEmail(requesterEmail, sanitizeEmailVariables(emailVariables));
    }

    // Send email to CC users (4.1.2) - but exclude the requester's email to avoid duplicates
    const ccEmailsToNotify = emailsToNotify.filter(email => 
      email.toLowerCase() !== requesterEmail.toLowerCase()
    );
    
    if (ccEmailsToNotify.length > 0) {
      await sendRequestCreatedCCEmail(ccEmailsToNotify, sanitizeEmailVariables({
        ...emailVariables,
        Emails_To_Notify: ccEmailsToNotify.join(', '),
      }));
    }

    // Create in-app notification for requester
    await createNotification({
      userId: requestData.userId,
      type: 'REQUEST_CREATED',
      title: `Request Created: #${requestId}`,
      message: `Your request "${requestSubject}" has been submitted.`,
      data: { requestId, status: requestData.status },
    });

    // ✅ REMOVED: CC app notifications since email notifications are already sent
    // CC users now receive only email notifications to avoid duplication
    console.log(`✅ Skipped creating ${emailsToNotify.length} CC app notifications since email notifications were sent to:`, ccEmailsToNotify.join(', '));

    return true;
  } catch (error) {
    console.error('Error sending request created notifications:', error);
    return false;
  }
};

// Approval required notifications (4.1.3)
export const notifyApprovalRequired = async (requestData: any, templateData: any, approverData: any, approvalId?: number) => {
  try {
    const requestId = requestData.id;
    const requesterName = `${requestData.user.emp_fname} ${requestData.user.emp_lname}`.trim();
    const requestSubject = (requestData.formData as any)?.['8'] || templateData?.name || 'IT Helpdesk Request';
    const rawRequestDescription = (requestData.formData as any)?.['9'] || 'No description provided';
    
    // Process images in the description for email compatibility
    const requestDescription = rawRequestDescription; // Keep base64 images in emails
    
    const approverEmail = approverData.emp_email;
    const approverName = `${approverData.emp_fname} ${approverData.emp_lname}`.trim();

    // Generate base URL and request URLs
    const baseUrl = getBaseUrl();
    const requestUrl = `${baseUrl}/requests/view/${requestId}`;
    const approvalUrl = `${baseUrl}/requests/approvals/${requestId}`;
    const encodedRequestUrl = encodeURIComponent(requestUrl);
    const encodedApprovalUrl = encodeURIComponent(approvalUrl);

    // Email variables
    const emailVariables: RequestEmailVariables = createDefaultEmailVariables({
      Request_ID: requestId.toString(),
      Request_Status: formatStatusForDisplay(requestData.status || 'for_approval'),
      Request_Subject: requestSubject,
      Request_Description: requestDescription,
      Requester_Name: requesterName,
      Requester_Email: requestData.user.emp_email,
      Request_Title: requestSubject,
      Approver_Name: approverName,
      Approver_Email: approverEmail,
      Request_URL: requestUrl,
      Request_Link: requestUrl,
      Base_URL: baseUrl,
      Encoded_Request_URL: encodedRequestUrl,
    });

    // Add extra properties for approval emails
    const extendedVariables = {
      ...emailVariables,
      Encoded_Approval_URL: encodedApprovalUrl,
      approval_link: approvalUrl,
    };

    // Send email to approver
    if (approverEmail) {
      await sendApprovalRequiredEmail(approverEmail, sanitizeEmailVariables(extendedVariables));
    }

    // Create in-app notification for approver
    await createNotification({
      userId: approverData.id,
      type: 'APPROVAL_REQUIRED',
      title: `Approval Required: #${requestId}`,
      message: `Request from ${requesterName} requires your approval: "${requestSubject}"`,
      data: { 
        requestId, 
        approvalId: approvalId,
        requesterId: requestData.userId, 
        status: requestData.status 
      },
    });

    return true;
  } catch (error) {
    console.error('Error sending approval required notifications:', error);
    return false;
  }
};

// Request approved/rejected notifications (4.1.5)
export const notifyRequestApprovedRejected = async (
  requestData: any, 
  templateData: any, 
  approvalStatus: 'approved' | 'rejected',
  approvalComment: string = ''
) => {
  try {
    const requestId = requestData.id;
    const requesterName = `${requestData.user.emp_fname} ${requestData.user.emp_lname}`.trim();
    const requesterEmail = requestData.user.emp_email;
    const requestSubject = (requestData.formData as any)?.['8'] || templateData?.name || 'IT Helpdesk Request';
    const rawRequestDescription = (requestData.formData as any)?.['9'] || 'No description provided';
    
    // Process images in the description for email compatibility
    const requestDescription = rawRequestDescription; // Keep base64 images in emails

    // Generate base URL and request URLs
    const baseUrl = getBaseUrl();
    const requestUrl = `${baseUrl}/requests/view/${requestId}`;
    const encodedRequestUrl = encodeURIComponent(requestUrl);

    // Email variables
    const emailVariables: RequestEmailVariables = {
      Request_ID: requestId.toString(),
      Request_Status: formatStatusForDisplay(requestData.status),
      Request_Subject: requestSubject,
      Request_Description: requestDescription,
      Request_Title: requestSubject,
      Requester_Name: requesterName,
      Requester_Email: requesterEmail,
      Approver_Name: '', // TODO: Add approver name if available
      Approver_Email: '', // TODO: Add approver email if available
      Approval_Comments: approvalComment,
      Clarification: '', // Not applicable for approval outcome
      Request_Approval_Status: approvalStatus.toUpperCase(),
      Request_Approval_Comment: approvalComment,
      Request_URL: requestUrl,
      Request_Link: requestUrl,
      Base_URL: baseUrl,
      Encoded_Request_URL: encodedRequestUrl,
    };

    // Send email to requester
    if (requesterEmail) {
      await sendRequestApprovedRejectedEmail(requesterEmail, sanitizeEmailVariables(emailVariables));
    }

    // Create in-app notification for requester
    const notificationType = approvalStatus === 'approved' ? 'REQUEST_APPROVED' : 'REQUEST_REJECTED';
    const titleStatus = approvalStatus === 'approved' ? 'Approved' : 'Rejected';
    
    await createNotification({
      userId: requestData.userId,
      type: notificationType,
      title: `Request ${titleStatus}: #${requestId}`,
      message: `Your request "${requestSubject}" has been ${approvalStatus}.${approvalComment ? ` Comment: ${approvalComment}` : ''}`,
      data: { requestId, status: requestData.status, approvalStatus, approvalComment },
    });

    return true;
  } catch (error) {
    console.error('Error sending request approved/rejected notifications:', error);
    return false;
  }
};

// Request assigned notifications (4.1.8, 4.1.9)
export const notifyRequestAssigned = async (requestData: any, templateData: any, technicianData: any) => {
  try {
    const requestId = requestData.id;
    const requesterName = `${requestData.user.emp_fname} ${requestData.user.emp_lname}`.trim();
    const requesterEmail = requestData.user.emp_email;
    const requestSubject = (requestData.formData as any)?.['8'] || templateData?.name || 'IT Helpdesk Request';
    const rawRequestDescription = (requestData.formData as any)?.['9'] || 'No description provided';
    
    // Process images in the description for email compatibility
    const requestDescription = rawRequestDescription; // Keep base64 images in emails
    
    const technicianName = `${technicianData.emp_fname} ${technicianData.emp_lname}`.trim();
    const technicianEmail = technicianData.emp_email;
    const dueDate = (requestData.formData as any)?.slaDueDate 
      ? formatTimestampForNotification((requestData.formData as any).slaDueDate)
      : 'Not specified';

    // Generate base URL and request URLs
    const baseUrl = getBaseUrl();
    const requestUrl = `${baseUrl}/requests/view/${requestId}`;
    // Use the same standard request URL for both requester and technician
    const encodedRequestUrl = encodeURIComponent(requestUrl);

    // Email variables for requester
    const requesterEmailVariables: RequestEmailVariables = createDefaultEmailVariables({
      Request_ID: requestId.toString(),
      Request_Status: formatStatusForDisplay(requestData.status),
      Request_Subject: requestSubject,
      Request_Description: requestDescription,
      Request_Title: requestSubject,
      Requester_Name: requesterName,
      Requester_Email: requesterEmail,
      Approver_Name: '', // Not applicable for assignment
      Approver_Email: '', // Not applicable for assignment
      Technician_Name: technicianName,
      Request_URL: requestUrl,
      Request_Link: requestUrl,
      Base_URL: baseUrl,
      Encoded_Request_URL: encodedRequestUrl,
    });

    // Email variables for technician
    const technicianEmailVariables: RequestEmailVariables = createDefaultEmailVariables({
      Request_ID: requestId.toString(),
      Request_Status: formatStatusForDisplay(requestData.status),
      Request_Subject: requestSubject,
      Request_Description: requestDescription,
      Request_Title: requestSubject,
      Requester_Name: requesterName,
      Requester_Email: requesterEmail,
      Approver_Name: '', // Not applicable for assignment
      Approver_Email: '', // Not applicable for assignment
      Technician_Name: technicianName,
      Due_By_Date: dueDate,
      Request_URL: requestUrl,
      Request_Link: requestUrl,
      Base_URL: baseUrl,
      Encoded_Request_URL: encodedRequestUrl,
    });

    // Send email to requester (4.1.8)
    if (requesterEmail) {
      await sendRequestAssignedRequesterEmail(requesterEmail, sanitizeEmailVariables(requesterEmailVariables));
    }

    // Send email to technician (4.1.9)
    if (technicianEmail) {
      await sendRequestAssignedTechnicianEmail(technicianEmail, sanitizeEmailVariables(technicianEmailVariables));
    }

    // Create in-app notification for requester
    await createNotification({
      userId: requestData.userId,
      type: 'REQUEST_ASSIGNED',
      title: `Request Assigned: #${requestId}`,
      message: `Your request "${requestSubject}" has been assigned to ${technicianName}.`,
      data: { requestId, technicianId: technicianData.id, technicianName, status: requestData.status },
    });

    // Create in-app notification for technician
    await createNotification({
      userId: technicianData.id,
      type: 'REQUEST_ASSIGNED',
      title: `New Assignment: #${requestId}`,
      message: `You have been assigned request "${requestSubject}" from ${requesterName}. Due: ${dueDate}`,
      data: { requestId, requesterId: requestData.userId, requesterName, status: requestData.status, dueDate },
    });

    return true;
  } catch (error) {
    console.error('Error sending request assigned notifications:', error);
    return false;
  }
};

// Request resolved notifications (4.1.11, 4.1.12)
export const notifyRequestResolved = async (
  requestData: any, 
  templateData: any, 
  resolutionDescription: string = ''
) => {
  try {
    const requestId = requestData.id;
    const requesterName = `${requestData.user.emp_fname} ${requestData.user.emp_lname}`.trim();
    const requesterEmail = requestData.user.emp_email;
    const requestSubject = (requestData.formData as any)?.['8'] || templateData?.name || 'IT Helpdesk Request';
    const rawRequestDescription = (requestData.formData as any)?.['9'] || 'No description provided';
    
    // Process images in the description for email compatibility
    const requestDescription = rawRequestDescription; // Keep base64 images in emails
    
    const emailsToNotify = (() => {
      // Check multiple possible field names for email notifications
      const emailField = (requestData.formData as any)?.emailNotify || 
                         (requestData.formData as any)?.emailsToNotify ||
                         (requestData.formData as any)?.['10'] ||
                         (requestData.formData as any)?.email_to_notify ||
                         [];
      
      console.log('🔍 Email notify field check (resolved):', {
        emailNotify: (requestData.formData as any)?.emailNotify,
        emailsToNotify: (requestData.formData as any)?.emailsToNotify,
        field10: (requestData.formData as any)?.['10'],
        email_to_notify: (requestData.formData as any)?.email_to_notify,
        selectedField: emailField
      });
      
      if (Array.isArray(emailField)) {
        return emailField.filter((email: string) => email && email.trim());
      } else if (typeof emailField === 'string' && emailField.trim()) {
        return emailField.split(',').map((email: string) => email.trim()).filter((email: string) => email);
      }
      return [];
    })();
    const closeRequestLink = `${process.env.API_BASE_URL || process.env.NEXTAUTH_URL}/requests/view/${requestId}`;

    // Generate base URL and request URLs
    const baseUrl = getBaseUrl();
    const requestUrl = `${baseUrl}/requests/view/${requestId}`;
    const encodedRequestUrl = encodeURIComponent(requestUrl);

    // Email variables
    const emailVariables: RequestEmailVariables = createDefaultEmailVariables({
      Request_ID: requestId.toString(),
      Request_Status: formatStatusForDisplay(requestData.status),
      Request_Subject: requestSubject,
      Request_Description: requestDescription,
      Requester_Name: requesterName,
      Requester_Email: requesterEmail,
      Request_Title: requestSubject,
      Approver_Name: '', // Not applicable for resolution
      Approver_Email: '', // Not applicable for resolution
      Resolution_Description: resolutionDescription,
      Request_Resolution: resolutionDescription,
      Close_Request_Link: closeRequestLink,
      Request_URL: requestUrl,
      Request_Link: requestUrl,
      Base_URL: baseUrl,
      Encoded_Request_URL: encodedRequestUrl,
    });

    // Send email to requester (4.1.11)
    if (requesterEmail) {
      await sendRequestResolvedEmail(requesterEmail, sanitizeEmailVariables(emailVariables));
    }

    // Send email to CC users (4.1.12)
    if (emailsToNotify.length > 0) {
      await sendRequestResolvedCCEmail(emailsToNotify, sanitizeEmailVariables(emailVariables));
    }

    // Create in-app notification for requester
    await createNotification({
      userId: requestData.userId,
      type: 'REQUEST_RESOLVED',
      title: `Request Resolved: #${requestId}`,
      message: `Your request "${requestSubject}" has been resolved. ${resolutionDescription ? 'Resolution: ' + resolutionDescription : ''}`,
      data: { requestId, status: requestData.status, resolution: resolutionDescription },
    });

    // ✅ REMOVED: CC app notifications since email notifications are already sent
    // CC users now receive only email notifications to avoid duplication
    console.log(`✅ Skipped creating ${emailsToNotify.length} CC app notifications since email notifications were sent to:`, emailsToNotify.join(', '));

    return true;
  } catch (error) {
    console.error('Error sending request resolved notifications:', error);
    return false;
  }
};

// SLA escalation notifications (4.1.10)
export const notifySLAEscalation = async (requestData: any, templateData: any, technicianData: any) => {
  try {
    const requestId = requestData.id;
    const requesterName = `${requestData.user.emp_fname} ${requestData.user.emp_lname}`.trim();
    const requestSubject = (requestData.formData as any)?.['8'] || templateData?.name || 'IT Helpdesk Request';
    const rawRequestDescription = (requestData.formData as any)?.['9'] || 'No description provided';
    
    // Process images in the description for email compatibility
    const requestDescription = rawRequestDescription; // Keep base64 images in emails
    
    const technicianName = `${technicianData.emp_fname} ${technicianData.emp_lname}`.trim();
    const technicianEmail = technicianData.emp_email;
    const dueDate = (requestData.formData as any)?.slaDueDate 
      ? formatTimestampForNotification((requestData.formData as any).slaDueDate)
      : 'Not specified';

    // Generate base URL and request URLs
    const baseUrl = getBaseUrl();
    const requestUrl = `${baseUrl}/requests/view/${requestId}`;
    const technicianUrl = `${baseUrl}/requests/view/${requestId}`; // Use same URL as requester
    const encodedRequestUrl = encodeURIComponent(requestUrl);
    const encodedTechnicianUrl = encodeURIComponent(technicianUrl);

    // Email variables
    const emailVariables: RequestEmailVariables = createDefaultEmailVariables({
      Request_ID: requestId.toString(),
      Request_Status: formatStatusForDisplay(requestData.status),
      Request_Subject: requestSubject,
      Request_Description: requestDescription,
      Request_Title: requestSubject,
      Requester_Name: requesterName,
      Requester_Email: requestData.user.emp_email,
      Approver_Name: '', // Not applicable for SLA escalation
      Approver_Email: '', // Not applicable for SLA escalation
      Technician_Name: technicianName,
      Due_By_Date: dueDate,
      Request_URL: technicianUrl,
      Request_Link: technicianUrl,
      Base_URL: baseUrl,
      Encoded_Request_URL: encodedRequestUrl,
      Encoded_Technician_URL: encodedTechnicianUrl,
    });

    // Send email to technician
    if (technicianEmail) {
      await sendSLAEscalationEmail(technicianEmail, sanitizeEmailVariables(emailVariables));
    }

    // Create in-app notification for technician
    await createNotification({
      userId: technicianData.id,
      type: 'SLA_ESCALATION',
      title: `⚠️ SLA Warning: #${requestId}`,
      message: `SLA escalation warning! Request "${requestSubject}" is due on ${dueDate}`,
      data: { requestId, status: requestData.status, dueDate, priority: 'high' },
    });

    return true;
  } catch (error) {
    console.error('Error sending SLA escalation notifications:', error);
    return false;
  }
};

// Function to send approval outcome notification to requester
export const sendApprovalOutcomeNotification = async (
  requestId: number, 
  action: 'approved' | 'rejected',
  comments?: string
): Promise<boolean> => {
  try {
    console.log(`=== SENDING APPROVAL OUTCOME NOTIFICATION ===`);
    console.log(`Request ID: ${requestId}, Action: ${action}`);

    // Get request data including user details
    const requestData = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        user: true,
        approvals: {
          include: {
            approver: true
          }
        }
      }
    });

    if (!requestData) {
      console.error(`Request ${requestId} not found`);
      return false;
    }

    const requesterEmail = requestData.user.emp_email;
    if (!requesterEmail) {
      console.error(`No email found for requester of request ${requestId}`);
      return false;
    }

    const requesterName = `${requestData.user.emp_fname} ${requestData.user.emp_lname}`.trim();
    
    // Debug: Log the formData structure
    console.log('🔍 DEBUG: Request formData structure:', JSON.stringify(requestData.formData, null, 2));
    console.log('🔍 DEBUG: formData keys:', Object.keys(requestData.formData || {}));
    console.log('🔍 DEBUG: formData[8]:', (requestData.formData as any)?.[8]);
    console.log('🔍 DEBUG: formData[9]:', (requestData.formData as any)?.[9]);
    console.log('🔍 DEBUG: formData["8"]:', (requestData.formData as any)?.['8']);
    console.log('🔍 DEBUG: formData["9"]:', (requestData.formData as any)?.['9']);
    
    const requestSubject = (requestData.formData as any)?.['8'] || `Request #${requestId}`;

    // Process request description
    const rawRequestDescription = (requestData.formData as any)?.['9'] || 'No description provided';
    const requestDescription = rawRequestDescription; // Keep base64 images in emails

    // Generate base URL and request URLs
    const baseUrl = getBaseUrl();
    const requestUrl = `${baseUrl}/requests/view/${requestId}`;
    const encodedRequestUrl = encodeURIComponent(requestUrl);

    // Email variables - Include comments for both approved and rejected requests
    const emailVariables: RequestEmailVariables = {
      Request_ID: requestId.toString(),
      Request_Status: formatStatusForDisplay(action === 'approved' ? 'approved' : 'rejected'),
      Request_Subject: requestSubject,
      Request_Description: requestDescription,
      Requester_Name: requesterName,
      Requester_Email: requesterEmail,
      Request_Title: requestSubject,
      Approver_Name: '', // TODO: Add approver name if available
      Approver_Email: '', // TODO: Add approver email if available
      Approval_Comments: comments || '',
      Request_Approval_Status: action === 'approved' ? 'Approved' : 'Rejected', // Added for template compatibility
      Request_Approval_Comment: comments || '', // Include comments for both approved and rejected requests
      Clarification: '', // Not applicable for approval outcome
      Request_URL: requestUrl,
      Request_Link: requestUrl,
      Base_URL: baseUrl,
      Encoded_Request_URL: encodedRequestUrl,
    };

    // Send email notification to requester
    await sendRequestApprovedRejectedEmail(requesterEmail, sanitizeEmailVariables(emailVariables));
    
    // Create in-app notification for approval outcome
    const notificationTitle = action === 'approved' ? 
      `Request #${requestId} Approved` : 
      `Request #${requestId} Rejected`;
    
    const notificationMessage = action === 'approved' ?
      `Your request "${requestSubject}" has been approved.` :
      `Your request "${requestSubject}" has been rejected.${comments ? ` Reason: ${comments}` : ''}`;
    
    // For rejected requests, redirect to approvals tab
    const redirectUrl = action === 'rejected' ? 
      `${baseUrl}/requests/view/${requestId}?tab=approvals` : 
      `${baseUrl}/requests/view/${requestId}`;
    
    await createNotification({
      userId: requestData.userId,
      type: action === 'approved' ? 'REQUEST_APPROVED' : 'REQUEST_REJECTED',
      title: notificationTitle,
      message: notificationMessage,
      data: {
        requestId: requestId.toString(),
        requestSubject,
        action,
        redirectUrl,
        ...(comments && action === 'rejected' ? { comments } : {})
      }
    });
    
    console.log(`✅ Approval outcome notification sent to ${requesterEmail}`);
    return true;

  } catch (error) {
    console.error('Error sending approval outcome notification:', error);
    return false;
  }
};

// Function to send clarification request notification to requester
export const sendClarificationRequestNotification = async (
  requestId: number, 
  comments?: string
): Promise<boolean> => {
  try {
    console.log(`=== SENDING CLARIFICATION REQUEST NOTIFICATION ===`);
    console.log(`Request ID: ${requestId}`);

    // Get request data including user details
    const requestData = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        user: true,
        approvals: {
          include: {
            approver: true
          }
        }
      }
    });

    if (!requestData) {
      console.error(`Request ${requestId} not found`);
      return false;
    }

    const requesterEmail = requestData.user.emp_email;
    if (!requesterEmail) {
      console.error(`No email found for requester of request ${requestId}`);
      return false;
    }

    const requesterName = `${requestData.user.emp_fname} ${requestData.user.emp_lname}`.trim();
    const requestSubject = (requestData.formData as any)?.subject || (requestData.formData as any)?.title || `Request #${requestId}`;
    
    // Process request description
    const rawRequestDescription = (requestData.formData as any)?.description || (requestData.formData as any)?.details || (requestData.formData as any)?.['9'] || 'No description provided';
    const requestDescription = rawRequestDescription; // Keep base64 images in emails

    // Generate base URL and request URLs
    const baseUrl = getBaseUrl();
    const requestUrl = `${baseUrl}/requests/view/${requestId}`;
    const encodedRequestUrl = encodeURIComponent(requestUrl);

    // Email variables
    const emailVariables: RequestEmailVariables = {
      Request_ID: requestId.toString(),
      Request_Status: formatStatusForDisplay('for_clarification'), // This will format to "For Clarification"
      Request_Subject: requestSubject,
      Request_Description: requestDescription,
      Requester_Name: requesterName,
      Requester_Email: requesterEmail,
      Request_Title: requestSubject,
      Approver_Name: '', // Not applicable for clarification request
      Approver_Email: '', // Not applicable for clarification request
      Approval_Comments: '', // Not applicable for clarification request
      Request_Approval_Status: '', // Not applicable for clarification request
      Request_Approval_Comment: '', // Not applicable for clarification request
      Clarification: comments || 'Clarification required for your request', // Use provided comment or default message
      Request_URL: requestUrl,
      Request_Link: requestUrl,
      Base_URL: baseUrl,
      Encoded_Request_URL: encodedRequestUrl,
    };

    // Send email notification to requester
    await sendClarificationRequiredEmail(requesterEmail, sanitizeEmailVariables(emailVariables));
    
    // Create in-app notification for clarification request
    const notificationTitle = `Clarification Required for Request #${requestId}`;
    const notificationMessage = `Clarification is required for your request "${requestSubject}".${comments ? ` Message: ${comments}` : ''}`;
    
    // Redirect to approvals tab for clarification
    const redirectUrl = `${baseUrl}/requests/view/${requestId}?tab=approvals`;
    
    await createNotification({
      userId: requestData.userId,
      type: 'CLARIFICATION_REQUIRED',
      title: notificationTitle,
      message: notificationMessage,
      data: {
        requestId: requestId.toString(),
        requestSubject,
        action: 'clarification',
        redirectUrl,
        ...(comments ? { clarificationMessage: comments } : {})
      }
    });
    
    console.log(`✅ Clarification request notification sent to ${requesterEmail}`);
    return true;

  } catch (error) {
    console.error('Error sending clarification request notification:', error);
    return false;
  }
};

// Function to notify when a new approver is added to a request
export const notifyNewApprover = async (
  requestId: number,
  approverData: {
    id: number;
    emp_email: string;
    emp_fname: string;
    emp_lname: string;
  },
  level: number
): Promise<boolean> => {
  try {
    console.log(`=== SENDING NEW APPROVER NOTIFICATION ===`);
    console.log(`Request ID: ${requestId}, Approver: ${approverData.emp_email}`);

    // Get request data including user details
    const requestData = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        user: true
      }
    });

    if (!requestData) {
      console.error(`Request ${requestId} not found`);
      return false;
    }

    const approverEmail = approverData.emp_email;
    const approverName = `${approverData.emp_fname} ${approverData.emp_lname}`.trim();
    const requesterName = `${requestData.user.emp_fname} ${requestData.user.emp_lname}`.trim();
    
    // Extract request details
    const requestSubject = (requestData.formData as any)?.['8'] || `Request #${requestId}`;
    const rawRequestDescription = (requestData.formData as any)?.['9'] || 'No description provided';
    const requestDescription = rawRequestDescription; // Keep base64 images in emails

    // Generate base URL and request URLs
    const baseUrl = getBaseUrl();
    const approvalUrl = `${baseUrl}/requests/approvals/${requestId}`;
    const encodedApprovalUrl = encodeURIComponent(approvalUrl);

    // Email variables
    const emailVariables: RequestEmailVariables = createDefaultEmailVariables({
      Request_ID: requestId.toString(),
      Request_Status: formatStatusForDisplay('for_approval'),
      Request_Subject: requestSubject,
      Request_Description: requestDescription,
      Requester_Name: requesterName,
      Requester_Email: requestData.user.emp_email || '',
      Request_Title: requestSubject,
      Approver_Name: approverName,
      Approver_Email: approverEmail,
      Request_URL: approvalUrl,
      Request_Link: approvalUrl,
      Base_URL: baseUrl,
      Encoded_Request_URL: encodedApprovalUrl,
    });

    // Add extra properties for approval emails
    const extendedVariables = {
      ...emailVariables,
      approval_link: approvalUrl,
    };

    // Send email notification using the APPROVER_ADDED template
    await sendApproverAddedEmail(approverEmail, sanitizeEmailVariables(extendedVariables));
    
    // Create in-app notification for the new approver
    const notificationTitle = `New Approval Assignment: Request #${requestId}`;
    const notificationMessage = `You have been assigned as an approver for "${requestSubject}" from ${requesterName}.`;
    
    await createNotification({
      userId: approverData.id,
      type: 'APPROVAL_REQUIRED',
      title: notificationTitle,
      message: notificationMessage,
      data: {
        requestId: requestId.toString(),
        requestSubject,
        requesterName,
        level,
        action: 'new_approver',
        redirectUrl: approvalUrl
      }
    });
    
    console.log(`✅ New approver notification sent to ${approverEmail} (email + in-app)`);
    return true;

  } catch (error) {
    console.error('Error sending new approver notification:', error);
    return false;
  }
};


