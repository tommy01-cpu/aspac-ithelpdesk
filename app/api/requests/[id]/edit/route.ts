import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { priority, status, type, emailNotify, technician, templateId, categoryId } = body;
    const requestId = parseInt(params.id);

    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
    }

    // Get current request data
    const currentRequest = await prisma.request.findUnique({
      where: { id: requestId },
      select: {
        formData: true,
        templateId: true,
        status: true
      }
    });

    if (!currentRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const currentFormData = (currentRequest.formData as any) || {};
    const philippineTime = new Date(); // Server time is already Philippine time

    // Track changes for history
    const changes: string[] = [];
    const oldValues: any = {};
    const newValues: any = {};

    // Check what changed
    const oldPriority = currentFormData['2'] || currentFormData.priority || 'Medium';
    const oldStatus = currentRequest.status;
    const oldType = currentFormData['4'] || currentFormData.type || 'service';
    const oldTemplateId = currentRequest.templateId;
    const oldTechnician = currentFormData.assignedTechnician || '';
    const oldEmailNotify = currentFormData.emailNotify || '';
    const oldCategoryId = currentFormData.categoryId;

    if (oldPriority !== priority) {
      changes.push(`Priority changed from ${oldPriority} to ${priority}`);
      oldValues.priority = oldPriority;
      newValues.priority = priority;
    }
    
    if (oldStatus !== status) {
      changes.push(`Status changed from ${oldStatus} to ${status}`);
      oldValues.status = oldStatus;
      newValues.status = status;
    }
    
    if (oldType !== type) {
      changes.push(`Request type changed from ${oldType} to ${type}`);
      oldValues.type = oldType;
      newValues.type = type;
    }
    
    if (oldTemplateId !== templateId) {
      changes.push(`Template changed (ID: ${oldTemplateId} → ${templateId})`);
      oldValues.templateId = oldTemplateId;
      newValues.templateId = templateId;
    }
    
    if (oldTechnician !== technician) {
      changes.push(`Technician changed from "${oldTechnician}" to "${technician}"`);
      oldValues.technician = oldTechnician;
      newValues.technician = technician;
    }
    
    if (oldEmailNotify !== emailNotify) {
      changes.push(`Email notifications changed`);
      oldValues.emailNotify = oldEmailNotify;
      newValues.emailNotify = emailNotify;
    }

    if (oldCategoryId !== categoryId) {
      changes.push(`Category changed (ID: ${oldCategoryId} → ${categoryId})`);
      oldValues.categoryId = oldCategoryId;
      newValues.categoryId = categoryId;
    }

    if (changes.length === 0) {
      return NextResponse.json({ message: 'No changes detected' });
    }

    // Template/Type change requires approval reset and SLA recalculation
    const needsApprovalReset = oldType !== type || oldTemplateId !== templateId;
    
    // Get new template data if template changed
    let newTemplate = null;
    let newSLAService = null;
    if (templateId) {
      newTemplate = await prisma.template.findUnique({
        where: { id: templateId },
        include: {
          slaService: true
        }
      });
      newSLAService = newTemplate?.slaService;
    }

    // For incidents, get SLA from priority mapping if no template
    let slaData = null;
    if (type === 'incident' || !newSLAService) {
      const prioritySLA = await prisma.prioritySLA.findUnique({
        where: { priority: priority } // Use priority as-is (capitalized)
      });
      if (prioritySLA) {
        slaData = {
          name: `${priority} Priority SLA`,
          responseTime: prioritySLA.responseTime,
          resolutionTime: prioritySLA.resolutionTime,
          escalationTime: prioritySLA.escalationTime,
          operationalHours: prioritySLA.operationalHours,
          slaHours: prioritySLA.resolutionTime // Add slaHours field
        };
      }
    } else if (newSLAService) {
      slaData = {
        name: newSLAService.name,
        responseTime: newSLAService.responseTime,
        resolutionTime: newSLAService.resolutionTime,
        escalationTime: newSLAService.escalationTime,
        operationalHours: newSLAService.operationalHours,
        slaHours: newSLAService.resolutionTime
      };
    }

    // Calculate new SLA due date if SLA data available and request is approved
    let newSLADueDate = null;
    if (slaData && (status === 'open' || currentRequest.status === 'open')) {
      // Import the SLA calculation function
      const { calculateSLADueDate } = await import('@/lib/sla-calculator');
      
      // Use current time as SLA start if request is already open
      const slaStartTime = currentFormData.slaStartAt ? new Date(currentFormData.slaStartAt) : philippineTime;
      
      newSLADueDate = await calculateSLADueDate(
        slaStartTime,
        slaData.resolutionTime,
        {
          useOperationalHours: slaData.operationalHours,
          includeHolidays: false
        }
      );
    }

    // Update form data with new values
    const updatedFormData = {
      ...currentFormData,
      '2': priority, // Priority field
      '4': type, // Type field
      priority: priority,
      type: type,
      assignedTechnician: technician,
      emailNotify: emailNotify,
      ...(categoryId && { categoryId: categoryId }),
      ...(slaData && {
        slaName: slaData.name,
        slaHours: slaData.slaHours,
        ...(newSLADueDate && {
          slaDueDate: newSLADueDate.toISOString()
        })
      })
    };

    await prisma.$transaction(async (tx) => {
      // Update the request
      await tx.request.update({
        where: { id: requestId },
        data: {
          status: status,
          formData: updatedFormData,
          ...(templateId && { templateId: templateId }),
          updatedAt: philippineTime
        }
      });

      // Remove approvals if template or type changed
      if (needsApprovalReset) {
        await tx.requestApproval.deleteMany({
          where: { requestId: requestId }
        });
        changes.push('All approvals cleared due to template/type change');
      }

      // Add history entry
      await tx.requestHistory.create({
        data: {
          requestId: requestId,
          action: 'request_edited',
          details: `Request properties updated: ${changes.join(', ')}`,
          timestamp: philippineTime,
          actorId: parseInt(session.user.id),
          metadata: {
            changes: changes,
            oldValues: oldValues,
            newValues: newValues,
            editedBy: {
              id: session.user.id,
              name: session.user.name,
              email: session.user.email
            }
          }
        }
      });
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Request updated successfully',
      changes: changes,
      needsApprovalReset: needsApprovalReset
    });

  } catch (error) {
    console.error('Error updating request:', error);
    return NextResponse.json(
      { error: 'Failed to update request' },
      { status: 500 }
    );
  }
}
