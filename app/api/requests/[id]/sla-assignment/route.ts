import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addHistory } from '@/lib/history';
import { calculateSLADueDate, getOperationalHours } from '@/lib/sla-calculator';
import { autoAssignTechnician } from '@/lib/load-balancer';

// Temporary inline function to avoid import issues
function componentsToWorkingHours(
  days: number,
  hours: number,
  minutes: number,
  operationalHours: any
): number {
  if (operationalHours.workingTimeType === 'round-clock') {
    const totalMinutes = Math.max(0, days) * 24 * 60 + Math.max(0, hours) * 60 + Math.max(0, minutes);
    return totalMinutes / 60;
  }

  // For working hours, calculate based on operational hours
  // Use standard 9-hour working day for SLA calculations
  const dailyHours = 9;
  const totalHours = Math.max(0, days) * dailyHours + Math.max(0, hours) + Math.max(0, minutes) / 60;
  return totalHours;
}

// API route to handle SLA calculation and technician assignment when request becomes "open"
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 SLA Assignment API called');
  const { requestId, templateId } = await request.json();
    console.log('📝 Request data:', { requestId, templateId });

    if (!requestId) {
      console.log('❌ Missing request ID');
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
      let slaId: number | undefined = undefined;

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
                  resolutionDays: true,
                  resolutionHours: true,
                  resolutionMinutes: true,
                  operationalHours: true,
                },
              },
            },
          });

          if (template?.type === 'service' && template?.slaService) {
            // Service template: use attached SLA service with breakdown fields
            const slaService = template.slaService;
            
            // Use the breakdown fields
            const days = slaService.resolutionDays ?? 0;
            const hours = slaService.resolutionHours ?? 0; 
            const minutes = slaService.resolutionMinutes ?? 0;
            
            if (days > 0 || hours > 0 || minutes > 0) {
              // Use operational hours if enabled for this SLA
              if (slaService.operationalHours) {
                const oh = await getOperationalHours();
                if (oh && oh.workingTimeType !== 'round-clock') {
                  slaHours = componentsToWorkingHours(days, hours, minutes, oh);
                  useOperationalHours = true;
                } else {
                  // No operational hours config or round-clock, use calendar time
                  slaHours = (days * 24) + hours + (minutes / 60);
                  useOperationalHours = false;
                }
              } else {
                // SLA configured for calendar time
                slaHours = (days * 24) + hours + (minutes / 60);
                useOperationalHours = false;
              }
              
              slaSource = 'template';
              slaId = slaService.id;
              console.log(`Using service SLA breakdown: ${days}d ${hours}h ${minutes}m -> ${slaHours}h (ID: ${slaService.id}, operational: ${useOperationalHours})`);
            }
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
                  slaId = inc.id;
                  console.log(`Using incident priority SLA: ${slaHours}h (ID: ${inc.id}), operationalHours=${useOperationalHours}`);
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

      // Validate slaHours
      if (!slaHours || slaHours <= 0 || isNaN(slaHours)) {
        console.warn('⚠️ Invalid slaHours, using default 48 hours');
        slaHours = 48;
      }

      // SLA should start at the time when SLA calculation happens (same as slaCalculatedAt)
      // This ensures both slaStartAt and slaCalculatedAt have the same timestamp
      const slaStartAt: Date = new Date();
      const slaCalculationTime = new Date(); // Same time for both fields
      
      console.log('📅 SLA Start Date:', slaStartAt.toISOString());
      console.log('⏰ SLA Hours:', slaHours);
      console.log('🔧 Use Operational Hours:', useOperationalHours);
      
      // Calculate due date using SLA calculator
  const dueDate = await calculateSLADueDate(slaStartAt, slaHours, { useOperationalHours });
      
      // Validate dueDate
      if (!dueDate || isNaN(dueDate.getTime())) {
        throw new Error('calculateSLADueDate returned invalid date');
      }
      
      console.log('✅ Due Date calculated:', dueDate.toISOString());
      
      // Convert all dates to Philippine time format without Z
      const slaStartAtPH = new Date(slaCalculationTime).toLocaleString('en-PH', { 
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/, '$3-$1-$2 $4:$5:$6');

      const slaDueDatePH = new Date(dueDate).toLocaleString('en-PH', { 
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/, '$3-$1-$2 $4:$5:$6');

      const slaCalculatedAtPH = new Date(slaCalculationTime).toLocaleString('en-PH', { 
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/, '$3-$1-$2 $4:$5:$6');

      console.log('💾 Saving SLA data:', {
        slaHours,
        slaDueDate: slaDueDatePH,
        slaCalculatedAt: slaCalculatedAtPH,
        slaStartAt: slaStartAtPH,
        slaSource,
        slaId
      });

      // Update request with due date
      console.log('💾 Updating database with SLA data...');
      
      // Create Philippine time by manually adjusting UTC (same as history.ts)
      const now = new Date();
      const currentTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
      
      const updateResult = await prisma.request.update({
        where: { id: requestId },
        data: {
          updatedAt: currentTime, // Use same Philippine time as history
          formData: {
            ...(requestDetails.formData as any || {}),
            slaHours: slaHours.toString(),
            slaDueDate: slaDueDatePH,
            slaCalculatedAt: slaCalculatedAtPH,
            slaStartAt: slaStartAtPH,
            slaSource,
            ...(slaId ? { slaId: slaId.toString() } : {}),
          }
        }
      });
      
      console.log('✅ Database update successful:', updateResult?.id);
      console.log('📋 Updated formData keys:', Object.keys(updateResult?.formData as any || {}));

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
        dueDate: slaDueDatePH,
        slaHours,
        slaSource,
        ...(slaId ? { slaId } : {}),
        error: null
      } as any;

  console.log(`✅ SLA calculated: ${slaHours} hours, start: ${slaStartAtPH}, due date: ${slaDueDatePH}`);

    } catch (slaError: any) {
      console.error('❌ Error calculating SLA:', slaError);
      console.error('❌ SLA Error stack:', slaError?.stack);
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
            // Convert assignedDate to Philippine time format without Z
            const assignedDatePH = new Date().toLocaleString('en-PH', { 
              timeZone: 'Asia/Manila',
              year: 'numeric',
              month: '2-digit', 
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            }).replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/, '$3-$1-$2 $4:$5:$6');
            
            // Create Philippine time by manually adjusting UTC (same as history.ts)
            const assignmentNow = new Date();
            const assignmentTime = new Date(assignmentNow.getTime() + (8 * 60 * 60 * 1000));
            
            await prisma.request.update({
              where: { id: requestId },
              data: {
                updatedAt: assignmentTime, // Use same Philippine time as history
                formData: {
                  ...currentFormData,
                  assignedDate: assignedDatePH,
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
