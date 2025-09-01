-- Add email template for "Add Approver" notification
-- This template is used when an approver is added to an existing request
-- PostgreSQL version

INSERT INTO email_templates (
    id,
    template_key,
    title,
    subject,
    header_html,
    content_html,
    footer_html,
    to_field,
    cc_field,
    is_active,
    created_at,
    updated_at
) VALUES (
    23,
    'notify-approver-added',
    'Notify Approver - Added to Request',
    'IT HELPDESK: You have been added as an approver - Request #${Request_ID}',
    NULL,
    '<div style="padding: 32px; background-color: #f8fafc; font-family: Arial, sans-serif; line-height: 1.6;">
        <div style="background-color: white; padding: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #1f2937; margin: 0; font-size: 24px;">IT Helpdesk</h1>
                <p style="color: #6b7280; margin: 8px 0 0 0; font-size: 14px;">Support Request System</p>
            </div>
            
            <div style="border-left: 4px solid #3b82f6; padding-left: 16px; margin-bottom: 24px;">
                <h2 style="color: #1f2937; margin: 0 0 8px 0; font-size: 18px;">You have been added as an approver</h2>
                <p style="color: #374151; margin: 0; font-size: 14px;">A new approval request requires your attention</p>
            </div>
            
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin-bottom: 24px;">
                <h3 style="color: #1f2937; margin: 0 0 16px 0; font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Request Details</h3>
                
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500; width: 30%;">Request ID:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">#${Request_ID}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Subject:</td>
                        <td style="padding: 8px 0; color: #1f2937;">${Request_Subject}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Requester:</td>
                        <td style="padding: 8px 0; color: #1f2937;">${Requester_Name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Service:</td>
                        <td style="padding: 8px 0; color: #1f2937;">${Service_Name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Category:</td>
                        <td style="padding: 8px 0; color: #1f2937;">${Category_Name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Priority:</td>
                        <td style="padding: 8px 0;">
                            <span style="background-color: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">${Priority}</span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Approval Level:</td>
                        <td style="padding: 8px 0; color: #1f2937;">Level ${approval_level}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Date Created:</td>
                        <td style="padding: 8px 0; color: #1f2937;">${Created_Date}</td>
                    </tr>
                </table>
            </div>
            
            <div style="margin-bottom: 24px;">
                <p style="color: #374151; margin: 0 0 16px 0;">Dear ${Approver_Name},</p>
                <p style="color: #374151; margin: 0 0 16px 0;">You have been added as an approver for the above IT Helpdesk request. Please review the request details and take appropriate action.</p>
                <p style="color: #374151; margin: 0;">To review and approve this request, please click the button below:</p>
            </div>
            
            <div style="text-align: center; margin-bottom: 24px;">
                <a href="${approval_link}" 
                   style="background-color: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; display: inline-block; font-weight: 500; font-size: 14px;">
                    Review Request & Take Action
                </a>
            </div>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; color: #6b7280; font-size: 12px;">
                <p style="margin: 0 0 8px 0;"><strong>Alternative Link:</strong> If the button doesn''t work, copy and paste this link into your browser:</p>
                <p style="margin: 0; word-break: break-all;">${approval_link}</p>
            </div>
            
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
                <p style="margin: 0;">This is an automated message from the IT Helpdesk System.</p>
                <p style="margin: 4px 0 0 0;">Please do not reply to this email.</p>
            </div>
        </div>
    </div>',
    NULL,
    '${Approver_Email}',
    NULL,
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
