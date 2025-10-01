import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addHistory } from '@/lib/history';
import { calculateSLADueDate, getOperationalHours, formatDateForPhilippineStorage } from '@/lib/sla-calculator';
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
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        templateId: true,
        formData: true,
        attachments: true,
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
      let slaSource: 'service' | 'incident-priority' | 'fallback' = 'fallback';
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

          // Debug logging for template and SLA service details
          console.log('🔍 Template Debug Info:', {
            templateId: tplId,
            templateType: template?.type,
            hasSlaService: !!template?.slaService,
            slaServiceId: template?.slaService?.id,
            slaServiceName: template?.slaService?.name
          });

          if (template?.type === 'service' && template?.slaService) {
            // Service template: use attached SLA service with breakdown fields
            const slaService = template.slaService;
            
            // Use the breakdown fields
            const days = slaService.resolutionDays ?? 0;
            const hours = slaService.resolutionHours ?? 0; 
            const minutes = slaService.resolutionMinutes ?? 0;
            
            console.log('🔍 SLA Service Breakdown:', {
              id: slaService.id,
              name: slaService.name,
              resolutionDays: days,
              resolutionHours: hours,
              resolutionMinutes: minutes,
              hasValidTime: days > 0 || hours > 0 || minutes > 0
            });
            
            if (days > 0 || hours > 0 || minutes > 0) {
              // Always use operational hours for service SLA calculation
              const oh = await getOperationalHours();
              if (oh && oh.workingTimeType !== 'round-clock') {
                slaHours = componentsToWorkingHours(days, hours, minutes, oh);
                useOperationalHours = true;
              } else {
                // No operational hours config or round-clock, use calendar time
                slaHours = (days * 24) + hours + (minutes / 60);
                useOperationalHours = false;
              }
              
              slaSource = 'service'; // Changed from 'template' to 'service' to match expectations
              slaId = slaService.id;
              console.log(`✅ Using service SLA breakdown: ${days}d ${hours}h ${minutes}m -> ${slaHours}h (ID: ${slaService.id}, operational: ${useOperationalHours})`);
            } else {
              console.log('⚠️ Service SLA has zero resolution time, falling back to priority-based calculation');
            }
          } else {
            console.log('⚠️ Template conditions not met for service SLA:', {
              isServiceType: template?.type === 'service',
              hasSlaService: !!template?.slaService,
              templateType: template?.type,
              willUseFallback: true
            });
          }
          
          if (template?.type === 'incident') {
            // Incident template: look up priority-based incident SLA
            const formData = requestDetails.formData as any;
            const priorityKey = (formData?.priority || formData?.['2'] || '').toString().trim().toLowerCase();
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
                
                // Always use operational hours for SLA calculation
                const oh = await getOperationalHours();
                if (oh && oh.workingTimeType !== 'round-clock') {
                  totalHours = componentsToWorkingHours(rDays, rHours, rMinutes, oh);
                  useOperationalHours = true;
                } else {
                  // No operational-hours config found; fallback to 24h days
                  totalHours = (rDays * 24) + rHours + (rMinutes / 60);
                  useOperationalHours = false;
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
        // No SLA configuration found - do not apply SLA
        console.log('✅ No SLA configuration found for this request - skipping SLA assignment');
        results.sla.success = false;
        results.sla.error = 'No SLA configured for this request type/template';
        
        // Still add history to document that no SLA was applied
        await addHistory(prisma, {
          requestId: requestId,
          action: 'SLA Evaluation',
          actorName: 'System',
          actorType: 'system',
          details: 'No SLA configuration found - SLA not applied'
        });
      } else {
        // Validate slaHours
        if (!slaHours || slaHours <= 0 || isNaN(slaHours)) {
          console.warn('⚠️ Invalid slaHours, using default 48 hours');
          slaHours = 48;
        }

      // For service requests, SLA should start when approvals are completed (which is now)
      // For incidents, SLA starts when they become "open" (which is now)
      let slaStartAt: Date;
      
      if ((requestDetails.formData as any)?.type === 'service') {
        // Service requests: Use the updatedAt time from when status was changed to "open" by approval action
        // CRITICAL FIX: Ensure we always work in Philippine time regardless of server timezone
        const updatedAtUTC = new Date(requestDetails.updatedAt);
        
        // Convert to Philippine time: Create a new Date that represents the same moment in Philippine time
        // This ensures SLA calculation always starts from the correct Philippine time
        slaStartAt = new Date(updatedAtUTC.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
        console.log('📅 Service request - Original updatedAt (UTC):', updatedAtUTC.toISOString());
        console.log('📅 Service request - SLA starts from (PH time):', slaStartAt.toISOString());
        console.log('📅 Service request - SLA starts from (PH local):', slaStartAt.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }));
      } else {
        // Incident requests: SLA starts now (when becoming "open")
        // CRITICAL FIX: Ensure we always use Philippine time regardless of server timezone
        const nowUTC = new Date();
        
        // Convert to Philippine time: Create a new Date that represents current Philippine time
        slaStartAt = new Date(nowUTC.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
        console.log('📅 Incident request - Server time (UTC):', nowUTC.toISOString());
        console.log('📅 Incident request - SLA starts now (PH time):', slaStartAt.toISOString());
        console.log('📅 Incident request - SLA starts now (PH local):', slaStartAt.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }));
      }
      
      // CRITICAL FIX: Ensure calculation time is also in Philippine time for consistency
      const calculationTimeUTC = new Date();
      const slaCalculationTime = new Date(calculationTimeUTC.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
      console.log('🕐 SLA calculation time (PH):', slaCalculationTime.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }));
      
      console.log('⏰ SLA Hours:', slaHours);
      console.log('🔧 Use Operational Hours:', useOperationalHours);
      
      // DEBUG: Check operational hours configuration
      const opHours = await getOperationalHours();
      if (opHours) {
        console.log('🏢 Operational Hours Config:');
        console.log('  - Working Time Type:', opHours.workingTimeType);
        console.log('  - Standard Start:', opHours.standardStartTime);
        console.log('  - Standard End:', opHours.standardEndTime);
        console.log('  - Working Days Count:', opHours.workingDays?.length);
      } else {
        console.log('⚠️ No operational hours configuration found!');
      }
      
      // Calculate due date using SLA calculator with proper operational hours setting
      console.log('🚀 TIMEZONE FIX: Calling calculateSLADueDate with Philippine time');
      console.log('🚀 Input slaStartAt (PH):', slaStartAt.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }));
      console.log('🚀 Input slaHours:', slaHours);
      
      const dueDate = await calculateSLADueDate(slaStartAt, slaHours, { 
        useOperationalHours: useOperationalHours ?? true // Use operational hours by default
      });
      
      // Validate dueDate
      if (!dueDate || isNaN(dueDate.getTime())) {
        throw new Error('calculateSLADueDate returned invalid date');
      }
      
      console.log('✅ Due Date calculated:', dueDate.toISOString());
      console.log('✅ Due Date (Manila time):', dueDate.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }));
      
      // CRITICAL VERIFICATION: Check if due date is within working hours
      const dueDatePHTime = dueDate.toTimeString().slice(0, 5);
      console.log('🔍 VERIFICATION: Due date time (24h):', dueDatePHTime);
      console.log('🔍 VERIFICATION: Working hours 08:00-18:00, due time should be within this range');
      console.log('🔍 VERIFICATION: Is due time valid?', dueDatePHTime >= '08:00' && dueDatePHTime <= '18:00');
      
      // Convert all dates to Philippine time format WITHOUT Z suffix for formData storage
      // Use the exact same timestamp for both slaStartAt display and database updatedAt
      const slaStartAtPH = new Date(slaStartAt).toLocaleString('en-PH', { 
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/, '$3-$1-$2 $4:$5:$6');

      console.log('🕐 SLA Start Time (ISO):', slaStartAt.toISOString());
      console.log('🕐 SLA Start Time (PH String):', slaStartAtPH);

      // Use the new utility function for consistent due date formatting
      const slaDueDatePH = formatDateForPhilippineStorage(dueDate);

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

      // Also format assignedDate if it exists to ensure consistency
      const assignedDatePH = slaStartAt.toLocaleString('en-PH', { 
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
        assignedDate: assignedDatePH,
        slaSource,
        slaId
      });

      // Update request with due date
      console.log('💾 Updating database with SLA data...');
      console.log('🕐 SLA Start Time (PH):', slaStartAt.toISOString());
      console.log('🕐 FormData slaStartAt (PH String - no Z):', slaStartAtPH);
      console.log('🕐 FormData assignedDate (PH String - no Z):', assignedDatePH);
      
      // CRITICAL FIX: Since slaStartAt is now guaranteed to be in Philippine time,
      // we can use it directly for the database updatedAt field
      const slaStartAtForDB = slaStartAt;
      console.log('🕐 Database updatedAt (PH):', slaStartAtForDB.toISOString());
      
      // 🔍 DETAILED DEBUG: Values to be saved to database
      const formDataToSave = {
        ...(requestDetails.formData as any || {}),
        slaHours: slaHours.toString(),
        slaDueDate: slaDueDatePH,
        slaCalculatedAt: slaCalculatedAtPH,
        slaStartAt: slaStartAtPH,
        assignedDate: assignedDatePH, // Ensure this is also in PH format
        slaSource,
        ...(slaId ? { slaId: slaId.toString() } : {}),
        // Initialize SLA timer management fields
        slaStoppedAt: null,
        slaResumedAt: null,
        remainingSla: null,
        slaStop: false,
        slaStopReason: null,
      };
      
      console.log('🔍 ===== CRITICAL DEBUG: EXACT VALUES BEING SAVED =====');
      console.log('🔍 Request ID:', requestId);
      console.log('🔍 Current formData before merge:', JSON.stringify(requestDetails.formData, null, 2));
      console.log('🔍 New SLA values to merge:');
      console.log('🔍   - slaHours:', slaHours.toString());
      console.log('🔍   - slaDueDate:', slaDueDatePH);
      console.log('🔍   - slaCalculatedAt:', slaCalculatedAtPH);
      console.log('🔍   - slaStartAt:', slaStartAtPH);
      console.log('🔍   - assignedDate:', assignedDatePH);
      console.log('🔍   - slaSource:', slaSource);
      console.log('🔍   - slaId:', slaId?.toString());
      console.log('🔍 Final merged formData to save:', JSON.stringify(formDataToSave, null, 2));
      console.log('🔍 ===== END CRITICAL DEBUG =====');
      
      // Update updatedAt to Philippine time to match the formData slaStartAt time
      const updateResult = await prisma.request.update({
        where: { id: requestId },
        data: {
          updatedAt: slaStartAtForDB, // Use Philippine time (UTC + 8) to match formData
          formData: {
            ...(requestDetails.formData as any || {}),
            slaHours: slaHours.toString(),
            slaDueDate: slaDueDatePH,
            slaCalculatedAt: slaCalculatedAtPH,
            slaStartAt: slaStartAtPH,
            assignedDate: assignedDatePH, // Ensure this is also in PH format
            slaSource,
            ...(slaId ? { slaId: slaId.toString() } : {}),
            // Initialize SLA timer management fields
            slaStoppedAt: null,
            slaResumedAt: null,
            remainingSla: null,
            slaStop: false,
            slaStopReason: null,
          }
        }
      });
      
      console.log('✅ Database update successful:', updateResult?.id);
      console.log('📋 Updated formData keys:', Object.keys(updateResult?.formData as any || {}));
      console.log('🕐 Final updatedAt in database:', updateResult?.updatedAt.toISOString());
      console.log('🕐 Expected updatedAt (PH):', slaStartAtForDB.toISOString());
      
      // Verify the update by reading the record back
      const verifyRecord = await prisma.request.findUnique({
        where: { id: requestId },
        select: { updatedAt: true, formData: true }
      });
      console.log('🔍 Verification - Database updatedAt:', verifyRecord?.updatedAt.toISOString());
      console.log('🔍 Verification - FormData slaStartAt:', (verifyRecord?.formData as any)?.slaStartAt);
      
      // 🔍 CRITICAL VERIFICATION: Check exactly what was saved
      const savedFormData = verifyRecord?.formData as any;
      console.log('🔍 ===== CRITICAL VERIFICATION: WHAT WAS ACTUALLY SAVED =====');
      console.log('🔍 Request ID:', requestId);
      console.log('🔍 Saved SLA values:');
      console.log('🔍   - slaHours:', savedFormData?.slaHours);
      console.log('🔍   - slaDueDate:', savedFormData?.slaDueDate);
      console.log('🔍   - slaCalculatedAt:', savedFormData?.slaCalculatedAt);
      console.log('🔍   - slaStartAt:', savedFormData?.slaStartAt);
      console.log('🔍   - assignedDate:', savedFormData?.assignedDate);
      console.log('🔍   - slaSource:', savedFormData?.slaSource);
      console.log('🔍   - slaId:', savedFormData?.slaId);
      console.log('🔍 Comparison:');
      console.log('🔍   - Expected slaDueDate:', slaDueDatePH);
      console.log('🔍   - Actual slaDueDate:', savedFormData?.slaDueDate);
      console.log('🔍   - Match:', slaDueDatePH === savedFormData?.slaDueDate);
      console.log('🔍   - Time discrepancy:', slaDueDatePH !== savedFormData?.slaDueDate ? 
        `Expected: ${slaDueDatePH.split(' ')[1]} vs Actual: ${savedFormData?.slaDueDate?.split(' ')[1]}` : 'None');
      console.log('🔍 ===== END CRITICAL VERIFICATION =====');

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
    } // End of else block for slaHours != null

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
        
        console.log('🔍 After auto-assignment - checking updatedAt...');
        const postAssignmentRecord = await prisma.request.findUnique({
          where: { id: requestId },
          select: { updatedAt: true }
        });
        console.log('🕐 Post-assignment updatedAt:', postAssignmentRecord?.updatedAt.toISOString());
        
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
                // Don't update updatedAt here - keep the SLA synchronization time
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
