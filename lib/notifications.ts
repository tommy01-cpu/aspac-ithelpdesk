import { prisma } from '@/lib/prisma';
import { 
  sendRequestCreatedEmail, 
  sendRequestCreatedCCEmail, 
  sendApprovalRequiredEmail,
  sendRequestApprovedRejectedEmail,
  sendRequestAssignedRequesterEmail,
  sendRequestAssignedTechnicianEmail,
  sendRequestResolvedEmail,
  sendSLAEscalationEmail 
} from '@/lib/email';

export type NotificationType = 
  | 'REQUEST_CREATED'
  | 'REQUEST_APPROVED'
  | 'REQUEST_REJECTED'
  | 'REQUEST_ASSIGNED'
  | 'REQUEST_RESOLVED'
  | 'REQUEST_CLOSED'
  | 'APPROVAL_REQUIRED'
  | 'CLARIFICATION_REQUIRED'
  | 'SLA_WARNING'
  | 'SLA_ESCALATION';

export interface NotificationData {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
}

export interface RequestEmailVariables {
  Request_ID: string;
  Request_Status: string;
  Request_Subject: string;
  Request_Description: string;
  Requester_Name: string;
  Requester_Email: string;
  Request_Title?: string;
  Request_Approval_Status?: string;
  Request_Approval_Comment?: string;
  Technician_Name?: string;
  Technician_Email?: string;
  Due_By_Date?: string;
  Resolution_Description?: string;
  Request_Resolution?: string;
  Close_Request_Link?: string;
  Clarification?: string;
  Emails_To_Notify?: string[];
}

// Create in-app notification
export const createNotification = async (notificationData: NotificationData): Promise<boolean> => {
  try {
    await prisma.notification.create({
      data: {
        userId: notificationData.userId,
        type: notificationData.type,
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
    const requestSubject = templateData?.name || 'IT Helpdesk Request';
    const requestDescription = requestData.formData?.['9'] || 'No description provided';
    const emailsToNotify = requestData.formData?.emailNotify ? 
      requestData.formData.emailNotify.split(',').map((email: string) => email.trim()).filter((email: string) => email) : [];

    // Email variables
    const emailVariables: RequestEmailVariables = {
      Request_ID: requestId.toString(),
      Request_Status: requestData.status || 'for_approval',
      Request_Subject: requestSubject,
      Request_Description: requestDescription,
      Requester_Name: requesterName,
      Requester_Email: requesterEmail,
      Request_Title: requestSubject,
    };

    // Send email to requester (4.1.1)
    if (requesterEmail) {
      await sendRequestCreatedEmail(requesterEmail, emailVariables);
    }

    // Send email to CC users (4.1.2)
    if (emailsToNotify.length > 0) {
      await sendRequestCreatedCCEmail(emailsToNotify, {
        ...emailVariables,
        Emails_To_Notify: emailsToNotify,
      });
    }

    // Create in-app notification for requester
    await createNotification({
      userId: requestData.userId,
      type: 'REQUEST_CREATED',
      title: `Request Created: #${requestId}`,
      message: `Your request "${requestSubject}" has been submitted and is pending approval.`,
      data: { requestId, status: requestData.status },
    });

    // Create notifications for CC users
    for (const email of emailsToNotify) {
      try {
        const user = await prisma.users.findFirst({ where: { emp_email: email } });
        if (user) {
          await createNotification({
            userId: user.id,
            type: 'REQUEST_CREATED',
            title: `New Request: #${requestId} from ${requesterName}`,
            message: `${requesterName} created a new request: "${requestSubject}"`,
            data: { requestId, requesterId: requestData.userId, status: requestData.status },
          });
        }
      } catch (error) {
        console.error(`Error creating notification for CC user ${email}:`, error);
      }
    }

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
    const requestSubject = templateData?.name || 'IT Helpdesk Request';
    const requestDescription = requestData.formData?.['9'] || 'No description provided';
    const approverEmail = approverData.emp_email;

    // Email variables
    const emailVariables: RequestEmailVariables = {
      Request_ID: requestId.toString(),
      Request_Status: requestData.status || 'for_approval',
      Request_Subject: requestSubject,
      Request_Description: requestDescription,
      Requester_Name: requesterName,
      Requester_Email: requestData.user.emp_email,
    };

    // Send email to approver
    if (approverEmail) {
      await sendApprovalRequiredEmail(approverEmail, emailVariables);
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
    const requestSubject = templateData?.name || 'IT Helpdesk Request';
    const requestDescription = requestData.formData?.['9'] || 'No description provided';

    // Email variables
    const emailVariables: RequestEmailVariables = {
      Request_ID: requestId.toString(),
      Request_Status: requestData.status,
      Request_Subject: requestSubject,
      Request_Description: requestDescription,
      Request_Title: requestSubject,
      Requester_Name: requesterName,
      Requester_Email: requesterEmail,
      Request_Approval_Status: approvalStatus.toUpperCase(),
      Request_Approval_Comment: approvalComment,
    };

    // Send email to requester
    if (requesterEmail) {
      await sendRequestApprovedRejectedEmail(requesterEmail, emailVariables);
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
    const requestSubject = templateData?.name || 'IT Helpdesk Request';
    const requestDescription = requestData.formData?.['9'] || 'No description provided';
    const technicianName = `${technicianData.emp_fname} ${technicianData.emp_lname}`.trim();
    const technicianEmail = technicianData.emp_email;
    const dueDate = requestData.formData?.slaDueDate || 'Not specified';

    // Email variables for requester
    const requesterEmailVariables: RequestEmailVariables = {
      Request_ID: requestId.toString(),
      Request_Status: requestData.status,
      Request_Subject: requestSubject,
      Request_Description: requestDescription,
      Request_Title: requestSubject,
      Requester_Name: requesterName,
      Requester_Email: requesterEmail,
      Technician_Name: technicianName,
    };

    // Email variables for technician
    const technicianEmailVariables: RequestEmailVariables = {
      Request_ID: requestId.toString(),
      Request_Status: requestData.status,
      Request_Subject: requestSubject,
      Request_Description: requestDescription,
      Request_Title: requestSubject,
      Requester_Name: requesterName,
      Requester_Email: requesterEmail,
      Technician_Name: technicianName,
      Due_By_Date: dueDate,
    };

    // Send email to requester (4.1.8)
    if (requesterEmail) {
      await sendRequestAssignedRequesterEmail(requesterEmail, requesterEmailVariables);
    }

    // Send email to technician (4.1.9)
    if (technicianEmail) {
      await sendRequestAssignedTechnicianEmail(technicianEmail, technicianEmailVariables);
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
    const requestSubject = templateData?.name || 'IT Helpdesk Request';
    const requestDescription = requestData.formData?.['9'] || 'No description provided';
    const emailsToNotify = requestData.formData?.emailNotify ? 
      requestData.formData.emailNotify.split(',').map((email: string) => email.trim()).filter((email: string) => email) : [];
    const closeRequestLink = `http://192.168.1.85:3000/requests/view/${requestId}`;

    // Email variables
    const emailVariables: RequestEmailVariables = {
      Request_ID: requestId.toString(),
      Request_Status: requestData.status,
      Request_Subject: requestSubject,
      Request_Description: requestDescription,
      Requester_Name: requesterName,
      Requester_Email: requesterEmail,
      Resolution_Description: resolutionDescription,
      Request_Resolution: resolutionDescription,
      Close_Request_Link: closeRequestLink,
    };

    // Send email to requester (4.1.11)
    if (requesterEmail) {
      await sendRequestResolvedEmail(requesterEmail, emailVariables);
    }

    // Send email to CC users (4.1.12)
    if (emailsToNotify.length > 0) {
      // Use REQUEST_RESOLVED_CC template for CC users
      const { sendEmail, EMAIL_TEMPLATES } = await import('@/lib/email');
      const template = EMAIL_TEMPLATES.REQUEST_RESOLVED_CC;
      
      await sendEmail({
        to: emailsToNotify,
        subject: template.subject,
        message: template.template,
        variables: emailVariables
      });
    }

    // Create in-app notification for requester
    await createNotification({
      userId: requestData.userId,
      type: 'REQUEST_RESOLVED',
      title: `Request Resolved: #${requestId}`,
      message: `Your request "${requestSubject}" has been resolved. ${resolutionDescription ? 'Resolution: ' + resolutionDescription : ''}`,
      data: { requestId, status: requestData.status, resolution: resolutionDescription },
    });

    // Create notifications for CC users
    for (const email of emailsToNotify) {
      try {
        const user = await prisma.users.findFirst({ where: { emp_email: email } });
        if (user) {
          await createNotification({
            userId: user.id,
            type: 'REQUEST_RESOLVED',
            title: `Request Resolved: #${requestId} from ${requesterName}`,
            message: `Request "${requestSubject}" from ${requesterName} has been resolved.`,
            data: { requestId, requesterId: requestData.userId, status: requestData.status, resolution: resolutionDescription },
          });
        }
      } catch (error) {
        console.error(`Error creating resolved notification for CC user ${email}:`, error);
      }
    }

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
    const requestSubject = templateData?.name || 'IT Helpdesk Request';
    const requestDescription = requestData.formData?.['9'] || 'No description provided';
    const technicianName = `${technicianData.emp_fname} ${technicianData.emp_lname}`.trim();
    const technicianEmail = technicianData.emp_email;
    const dueDate = requestData.formData?.slaDueDate || 'Not specified';

    // Email variables
    const emailVariables: RequestEmailVariables = {
      Request_ID: requestId.toString(),
      Request_Status: requestData.status,
      Request_Subject: requestSubject,
      Request_Description: requestDescription,
      Request_Title: requestSubject,
      Requester_Name: requesterName,
      Requester_Email: requestData.user.emp_email,
      Technician_Name: technicianName,
      Due_By_Date: dueDate,
    };

    // Send email to technician
    if (technicianEmail) {
      await sendSLAEscalationEmail(technicianEmail, emailVariables);
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
