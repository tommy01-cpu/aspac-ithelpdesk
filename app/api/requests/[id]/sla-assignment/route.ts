import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addHistory } from '@/lib/history';
import { calculateSLADueDate, getOperationalHours, componentsToWorkingHours, getDailyWorkingMinutes } from '@/lib/sla-calculator';
import { autoAssignTechnician } from '@/lib/load-balancer';

// API route to handle SLA calculation and technician assignment when request becomes "open"
export async function POST(request: NextRequest) {
  try {
  const { requestId, templateId } = await request.json();

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    console.log(`Processing SLA and assignment for request ${requestId}, template ${templateId}`);

    // Get the request details
    const requestDetails = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        user: {
          select: {
            emp_fname: true,
            emp_lname: true,
            emp_email: true,
            department: true
          }
        }
      }
    });

    if (!requestDetails) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const results = {
      sla: { success: false, dueDate: null as string | null, error: null as string | null },
      assignment: { success: false, technician: null as any, error: null as string | null }
    };

  // 1. Calculate and set SLA due date
    try {
      console.log('Calculating SLA due date...');
      
      // Determine SLA hours
      // Branch: service templates use Template.slaService; incident templates use priority mapping (PrioritySLA -> SLAIncident)
      let slaHours: number | null = null;
      let useOperationalHours: boolean | undefined = undefined;
      let slaSource: 'template' | 'incident-priority' | 'fallback' = 'fallback';
      let slaName: string | undefined = undefined;

      // Resolve template ID from param or request record
      const tplId = templateId ?? (requestDetails as any).templateId ?? null;
      if (tplId) {
        try {
          const template = await prisma.template.findUnique({
            where: { id: Number(tplId) },
            include: {
              slaService: {
                select: {
                  id: true,
                  name: true,
                  resolutionTime: true,
                  operationalHours: true,
                },
              },
            },
          });

          if (template?.type === 'service' && template?.slaService?.resolutionTime && template.slaService.resolutionTime > 0) {
            // Service template: use attached SLA service
            slaHours = Number(template.slaService.resolutionTime);
            useOperationalHours = !!template.slaService.operationalHours;
            slaSource = 'template';
            slaName = template.slaService.name;
            console.log(`Using template SLA service hours: ${slaHours}h (${template.slaService.name})`);
          } else if (template?.type === 'incident') {
            // Incident template: look up priority-based incident SLA
            const priorityKey = (requestDetails.priority || '').toString().trim().toLowerCase();
            const capPriority = priorityKey
              ? priorityKey.charAt(0).toUpperCase() + priorityKey.slice(1)
              : 'Medium';
            try {
              const prio = await prisma.prioritySLA.findUnique({
                where: { priority: capPriority },
                include: {
                  slaIncident: true,
                },
              });
              const inc = prio?.slaIncident as any;
              if (inc) {
                const rDays = parseInt(String(inc.resolutionDays || '0')) || 0;
                const rHours = parseInt(String(inc.resolutionHours || '0')) || 0;
                const rMinutes = parseInt(String(inc.resolutionMinutes || '0')) || 0;
                let totalHours: number;
                if (inc.operationalHoursEnabled) {
                  const oh = await getOperationalHours();
                  if (oh) {
                    totalHours = componentsToWorkingHours(rDays, rHours, rMinutes, oh);
                    useOperationalHours = true;
                  } else {
                    // No operational-hours config found; fallback to 24h days
                    totalHours = (rDays * 24) + rHours + (rMinutes / 60);
                    useOperationalHours = undefined; // let calculator fallback
                  }
                } else {
                  totalHours = (rDays * 24) + rHours + (rMinutes / 60);
                }
                if (totalHours > 0) {
                  slaHours = totalHours;
                  slaSource = 'incident-priority';
                  slaName = `${inc.name || 'Incident SLA'} (${capPriority})`;
                  console.log(`Using incident priority SLA: ${slaHours}h (${slaName}), operationalHours=${useOperationalHours}`);
                }
              }
            } catch (e) {
              console.warn('Priority SLA lookup failed; will fallback.', e);
            }
          }
        } catch (e) {
          console.warn('Failed to load template for SLA evaluation; will fallback.', e);
        }
      }

      if (slaHours == null) {
        // Fallback mapping by priority (hours)
        switch (requestDetails.priority?.toLowerCase()) {
          case 'high':
            slaHours = 8; // 8 hours for high priority
            break;
          case 'top':
            slaHours = 4; // 4 hours for top priority
            break;
          case 'medium':
            slaHours = 16; // 16 hours for medium priority
            break;
          case 'low':
          default:
            // Default to 4 working days if unclear (user expectation)
            try {
              const oh = await getOperationalHours();
              if (oh && oh.workingTimeType !== 'round-clock') {
                slaHours = componentsToWorkingHours(4, 0, 0, oh);
                useOperationalHours = true;
              } else {
                slaHours = 4 * 24; // 24h days if round-clock or no config
              }
            } catch (e) {
              slaHours = 4 * 24;
            }
            break;
        }
        slaSource = 'fallback';
      }

      // SLA should start at approval time (when request became 'open'), not at createdAt.
      // Anchor to the most recent approval actedOn timestamp for this request.
      let slaStartAt: Date = new Date();
      try {
        const lastApproval = await prisma.requestApproval.findFirst({
          where: { requestId: requestDetails.id, status: 'approved' as any },
          orderBy: { actedOn: 'desc' },
          select: { actedOn: true },
        });
        if (lastApproval?.actedOn) {
          slaStartAt = new Date(lastApproval.actedOn);
        }
      } catch (tsErr) {
        console.warn('Unable to resolve last approval actedOn; using current time for SLA start.', tsErr);
      }
      // Calculate due date using SLA calculator
  const dueDate = await calculateSLADueDate(slaStartAt, slaHours, { useOperationalHours });
      
      // Update request with due date
      await prisma.request.update({
        where: { id: requestId },
        data: {
          formData: {
            ...(requestDetails.formData as any || {}),
            slaHours: slaHours.toString(),
            slaDueDate: dueDate.toISOString(),
            slaCalculatedAt: new Date().toISOString(),
            slaStartAt: slaStartAt.toISOString(),
            slaSource,
            ...(slaName ? { slaName } : {}),
          }
        }
      });

      // Add SLA history entry (PH-local timestamp)
      await addHistory(prisma as any, {
        requestId,
        action: 'Start Timer',
        actorName: 'System',
        actorType: 'system',
        details: 'Timer started by System and status set to Open',
      });

      results.sla = {
        success: true,
        dueDate: dueDate.toISOString(),
        error: null
      };

  console.log(`✅ SLA calculated: ${slaHours} hours, start: ${slaStartAt.toISOString()}, due date: ${dueDate.toISOString()}`);

    } catch (slaError) {
      console.error('Error calculating SLA:', slaError);
      results.sla = {
        success: false,
        dueDate: null,
        error: slaError instanceof Error ? slaError.message : 'Unknown SLA error'
      };
    }

    // 2. Auto-assign technician if not already assigned
    try {
      console.log('Checking for technician assignment...');
      
      const currentFormData = requestDetails.formData as any || {};
      const currentlyAssigned = currentFormData.assignedTechnician || currentFormData.assignedTechnicianId;

      if (!currentlyAssigned) {
        console.log('No technician currently assigned, attempting auto-assignment...');
        
  const assignmentResult = await autoAssignTechnician(requestId, templateId, { writeHistory: false });
        
        if (assignmentResult.success) {
          results.assignment = {
            success: true,
            technician: {
              id: assignmentResult.technicianId,
              name: assignmentResult.technicianName,
              email: assignmentResult.technicianEmail,
              supportGroup: assignmentResult.supportGroupName,
              loadBalanceType: assignmentResult.loadBalanceType
            },
            error: null
          };

          console.log(`✅ Technician assigned: ${assignmentResult.technicianName} from ${assignmentResult.supportGroupName}`);

        } else {
          results.assignment = {
            success: false,
            technician: null,
            error: assignmentResult.error || 'Assignment failed'
          };

          console.log(`❌ Auto-assignment failed: ${assignmentResult.error}`);
        }
      } else {
        // If a technician was preselected in the form, finalize the assignment metadata
        const techName: string = currentFormData.assignedTechnician || 'Already Assigned';
        const techId: string | undefined = currentFormData.assignedTechnicianId;
        const techEmail: string | undefined = currentFormData.assignedTechnicianEmail;

        // Ensure assignedDate exists
        if (!currentFormData.assignedDate) {
          try {
            await prisma.request.update({
              where: { id: requestId },
              data: {
                formData: {
                  ...currentFormData,
                  assignedDate: new Date().toISOString(),
                }
              }
            });
          } catch (e) {
            console.warn('Failed to set assignedDate for preselected technician:', e);
          }
        }

        // Write an assignment history entry for visibility (PH-local timestamp via addHistory)
        try {
          await addHistory(prisma as any, {
            requestId,
            action: 'Assigned',
            actorName: 'System',
            actorType: 'system',
            details: `Request assigned to ${techName} (preselected)`,
          });
        } catch (e) {
          console.warn('Failed to write assignment history for preselected technician:', e);
        }

        results.assignment = {
          success: true,
          technician: { 
            id: techId,
            name: techName,
            email: techEmail,
            alreadyAssigned: true 
          },
          error: null
        };

        console.log(`ℹ️ Technician already assigned: ${techName}`);
      }

    } catch (assignmentError) {
      console.error('Error in technician assignment:', assignmentError);
      results.assignment = {
        success: false,
        technician: null,
        error: assignmentError instanceof Error ? assignmentError.message : 'Unknown assignment error'
      };
    }

    return NextResponse.json({
      success: true,
      message: 'SLA and assignment processing completed',
      results
    });

  } catch (error) {
    console.error('Error in SLA and assignment processing:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process SLA and assignment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
