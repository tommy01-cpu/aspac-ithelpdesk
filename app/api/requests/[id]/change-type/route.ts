import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addHistory } from '@/lib/history';
import { notifyApprovalRequired } from '@/lib/notifications';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestId = parseInt(params.id);
    const body = await request.json();
    const { templateId, categoryId } = body;

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    // Get current request data
    const currentRequest = await prisma.request.findUnique({
      where: { id: requestId }
    });

    if (!currentRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Get current template info
    const currentTemplate = await prisma.template.findUnique({
      where: { id: parseInt(currentRequest.templateId) }
    });

    // Get new template data
    const newTemplate = await prisma.template.findUnique({
      where: { id: parseInt(templateId) },
      include: {
        category: true
      }
    });

    if (!newTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Get current technician info
    const technician = await prisma.users.findFirst({
      where: { emp_email: session.user.email }
    });

    if (!technician) {
      return NextResponse.json({ error: 'Technician not found' }, { status: 404 });
    }

    // Get request user for approval workflow
    const requestUser = await prisma.users.findUnique({
      where: { id: currentRequest.userId },
      include: {
        reportingTo: true,
        userDepartment: {
          include: {
            departmentHead: true
          }
        }
      }
    });

    const oldType = currentTemplate?.type || 'Unknown';
    const newType = newTemplate.type;
    const oldStatus = currentRequest.status;
    
    // Determine new status based on template approval workflow
    const hasApprovals = newTemplate.approvalWorkflow && 
      (newTemplate.approvalWorkflow as any)?.levels?.length > 0;
    const newStatus = hasApprovals ? 'for_approval' : 'open';

    // Start transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update requests table
      await tx.request.update({
        where: { id: requestId },
        data: {
          templateId: templateId.toString(),
          status: newStatus
        }
      });

      // 2. Update formData with new template structure
      const currentFormData = currentRequest.formData as any || {};
      const updatedFormData = {
        ...currentFormData,
        // Update core fields from template
        requestType: newTemplate.type,
        category: newTemplate.categoryId?.toString(),
        template: newTemplate.id.toString(),
        // Update field '4' which is used for displaying request type
        '4': newTemplate.type,
        // Clear assigned technician when changing type
        assignedTechnician: null,
        assignedTechnicianId: null,
        assignedTechnicianEmail: null,
      };

      // Remove SLA-related fields from formData as they will be recalculated
      delete updatedFormData.slaId;
      delete updatedFormData.slaName;
      delete updatedFormData.slaHours;
      delete updatedFormData.slaSource;
      delete updatedFormData.slaDueDate;
      delete updatedFormData.slaStartAt;
      delete updatedFormData.slaCalculatedAt;

      await tx.request.update({
        where: { id: requestId },
        data: {
          formData: updatedFormData
        }
      });

      // 3. Delete existing approvals (if any)
      await tx.requestApproval.deleteMany({
        where: { requestId: requestId }
      });

      // 4. Add new approvals based on template approval workflow
      if (hasApprovals && requestUser) {
        const approvalConfig = newTemplate.approvalWorkflow as any;
        if (approvalConfig.levels && Array.isArray(approvalConfig.levels)) {
          const templateLevels = approvalConfig.levels;
          
          for (let i = 0; i < templateLevels.length; i++) {
            const level = templateLevels[i];
            const levelNumber = i + 1;
            
            if (level.approvers && level.approvers.length > 0) {
              for (const approver of level.approvers) {
                let actualApproverId = null;
                let approverName = '';
                let approverEmail = '';
                
                // Handle special approver types
                const approverValue = String(approver.id || approver.name || approver).toLowerCase();
                const approverNumericId = parseInt(approver.id || approver.name || approver);
                
                if (approverValue === 'reporting_to' || 
                    approverValue.includes('reporting') || 
                    approverValue.includes('immediate supervisor') ||
                    approverValue.includes('manager') ||
                    approver.type === 'reporting_to' ||
                    approverNumericId === -1) {
                  if (requestUser && requestUser.reportingToId) {
                    actualApproverId = requestUser.reportingToId;
                    if (requestUser.reportingTo) {
                      approverName = `${requestUser.reportingTo.emp_fname} ${requestUser.reportingTo.emp_lname}`;
                      approverEmail = requestUser.reportingTo.emp_email || '';
                    }
                  } else {
                    continue;
                  }
                } else if (approverValue === 'department_head' || 
                          approverValue.includes('department') || 
                          approverValue.includes('head') ||
                          approverValue.includes('chief') ||
                          approver.type === 'department_head' ||
                          approverNumericId === -2) {
                  if (requestUser && requestUser.userDepartment?.departmentHead) {
                    const departmentHead = requestUser.userDepartment.departmentHead;
                    actualApproverId = departmentHead.id;
                    approverName = `${departmentHead.emp_fname} ${departmentHead.emp_lname}`;
                    approverEmail = departmentHead.emp_email || '';
                  } else {
                    continue;
                  }
                } else {
                  // Regular user ID
                  let userIdToCheck = approver.id;
                  if (typeof userIdToCheck === 'string' && !isNaN(parseInt(userIdToCheck))) {
                    userIdToCheck = parseInt(userIdToCheck);
                  }
                  
                  if (typeof userIdToCheck === 'number') {
                    const user = await tx.users.findUnique({
                      where: { id: userIdToCheck }
                    });
                    if (user) {
                      actualApproverId = user.id;
                      approverName = `${user.emp_fname} ${user.emp_lname}`;
                      approverEmail = user.emp_email || '';
                    }
                  }
                }
                
                if (actualApproverId) {
                  await tx.requestApproval.create({
                    data: {
                      requestId: requestId,
                      level: levelNumber,
                      name: level.displayName, // Use template displayName instead of approver name
                      approverId: actualApproverId,
                      approverName: approverName,
                      approverEmail: approverEmail,
                      status: 'pending_approval',
                      createdAt: new Date(),
                      updatedAt: new Date()
                    }
                  });
                }
              }
            }
          }
        }
      }

      // 5. Add history entries
      const technicianName = `${technician.emp_fname} ${technician.emp_lname}`;

      // Create one combined history entry for the entire change
      const changeDetails = [];
      
      // Helper function to capitalize type names
      const capitalizeType = (type: string) => {
        return type.charAt(0).toUpperCase() + type.slice(1);
      };
      
      if (oldType !== newType) {
        changeDetails.push(`Type Change from ${capitalizeType(oldType)} to ${capitalizeType(newType)}`);
      }
      
      if (oldStatus !== newStatus) {
        const statusDisplayMap: { [key: string]: string } = {
          'open': 'Open',
          'for_approval': 'For Approval',
          'in_progress': 'In Progress',
          'resolved': 'Resolved',
          'closed': 'Closed',
          'on_hold': 'On Hold'
        };
        changeDetails.push(`Status Change from ${statusDisplayMap[oldStatus] || oldStatus} to ${statusDisplayMap[newStatus] || newStatus}`);
      }
      
      changeDetails.push(`Template changed from "${currentTemplate?.name || 'Unknown'}" to "${newTemplate.name}"`);

      // Add single combined history entry
      await addHistory(tx, {
        requestId: requestId,
        action: 'Updated',
        details: changeDetails.join('\n'),
        actorName: technicianName,
        actorType: 'technician'
      });

      // Add "Approvals Initiated" history AFTER the main change (if approvals exist)
      if (hasApprovals) {
        // Get the approval workflow configuration to show displayName instead of approver names
        const approvalConfig = newTemplate.approvalWorkflow as any;
        let approvalDisplayNames: string[] = [];
        
        if (approvalConfig?.levels && Array.isArray(approvalConfig.levels) && approvalConfig.levels.length > 0) {
          const level1 = approvalConfig.levels[0];
          if (level1?.displayName) {
            // Use the displayName from the workflow level (e.g., "level 1", "level 2")
            // Capitalize it properly
            const displayName = level1.displayName;
            const capitalizedDisplayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
            approvalDisplayNames.push(capitalizedDisplayName);
          }
        }
        
        // Fallback to "Level 1" if no displayName is found
        if (approvalDisplayNames.length === 0) {
          approvalDisplayNames.push('Level 1');
        }
        
        // Show the displayName(s) for Level 1
        await addHistory(tx, {
          requestId: requestId,
          action: 'Approvals Initiated',
          details: `Approver(s) : ${approvalDisplayNames.join(', ')}\nLevel : ${approvalDisplayNames[0]}`,
          actorName: 'System',
          actorType: 'system'
        });
      }
    });

    // 6. Send approval notifications after transaction completes (if approvals exist)
    if (hasApprovals) {
      try {
        // Get the updated request with user data for notifications
        const requestWithUser = await prisma.request.findUnique({
          where: { id: requestId },
          include: {
            user: {
              select: {
                id: true,
                emp_email: true,
                emp_fname: true,
                emp_lname: true,
                department: true,
              }
            }
          }
        });

        // Get level 1 approvers to send notifications
        const levelOneApprovals = await prisma.requestApproval.findMany({
          where: { 
            requestId: requestId,
            level: 1
          },
          include: {
            approver: {
              select: {
                id: true,
                emp_email: true,
                emp_fname: true,
                emp_lname: true
              }
            }
          }
        });

        // Send email notifications to level 1 approvers
        for (const approval of levelOneApprovals) {
          if (approval.approver && approval.approver.emp_email && requestWithUser) {
            await notifyApprovalRequired(requestWithUser, newTemplate, approval.approver, approval.id);
          }
        }
      } catch (notificationError) {
        console.error('Error sending approval notifications after type change:', notificationError);
        // Don't fail the type change if notifications fail
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Request type changed successfully',
      newType,
      newStatus,
      approvalsAdded: hasApprovals ? 'Yes' : 'No'
    });

  } catch (error) {
    console.error('Error changing request type:', error);
    return NextResponse.json(
      { error: 'Failed to change request type' },
      { status: 500 }
    );
  }
}
