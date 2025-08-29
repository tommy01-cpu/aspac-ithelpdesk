import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addHistory } from '@/lib/history';

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
      };

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
                      name: approverName,
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

      // History for type change
      if (oldType !== newType) {
        await addHistory(tx, {
          requestId: requestId,
          action: 'Updated',
          details: `Type Change from ${oldType} to ${newType}`,
          actorName: technicianName,
          actorType: 'technician'
        });
      }

      // History for status change
      if (oldStatus !== newStatus) {
        const statusDisplayMap: { [key: string]: string } = {
          'open': 'Open',
          'for_approval': 'For Approval',
          'in_progress': 'In Progress',
          'resolved': 'Resolved',
          'closed': 'Closed',
          'on_hold': 'On Hold'
        };

        await addHistory(tx, {
          requestId: requestId,
          action: 'Updated',
          details: `Status Change from ${statusDisplayMap[oldStatus] || oldStatus} to ${statusDisplayMap[newStatus] || newStatus}`,
          actorName: technicianName,
          actorType: 'technician'
        });
      }

      // History for approvals initiated
      if (hasApprovals) {
        await addHistory(tx, {
          requestId: requestId,
          action: 'Updated',
          details: 'Approvals Initiated',
          actorName: technicianName,
          actorType: 'technician'
        });
      }

      // History for template change
      await addHistory(tx, {
        requestId: requestId,
        action: 'Updated',
        details: `Template changed from "${currentTemplate?.name || 'Unknown'}" to "${newTemplate.name}"`,
        actorName: technicianName,
        actorType: 'technician'
      });
    });

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
