import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { getDatabaseTimestamp } from '@/lib/server-time-utils';
import { addHistory } from '@/lib/history';
import { calculateSLADueDate } from '@/lib/sla-calculator';
import { notifyRequestCreated, notifyApprovalRequired, notifyRequestAssigned } from '@/lib/notifications';

// Helper function to format timestamp for history display
function formatTimestampForHistory(timestamp: Date | string): string {
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

// Define the status enums as constants to match the database enums
const REQUEST_STATUS = {
  FOR_APPROVAL: 'for_approval',
  CANCELLED: 'cancelled',
  OPEN: 'open',
  ON_HOLD: 'on_hold',
  RESOLVED: 'resolved',
  CLOSED: 'closed'
} as const;

const APPROVAL_STATUS = {
  PENDING_APPROVAL: 'pending_approval',
  FOR_CLARIFICATION: 'for_clarification', 
  REJECTED: 'rejected',
  APPROVED: 'approved',
} as const;

// Helper function to find an available technician for auto-assignment
async function findAvailableTechnician(templateId: string, tx: any) {
  try {
    console.log('🔍 Finding available technician for templateId:', templateId);
    
    // First, try to find support groups that support this template (using transaction)
    const templateSupportGroups = await tx.templateSupportGroup.findMany({
      where: {
        templateId: parseInt(templateId),
        isActive: true
      },
      select: {
        supportGroupId: true
      }
    });

    const supportGroupIds = templateSupportGroups.map((tsg: { supportGroupId: number }) => tsg.supportGroupId);
    console.log('📋 Template support groups:', supportGroupIds);

    let templateTechnicians: any[] = [];

    if (supportGroupIds.length > 0) {
      // Find technicians in these support groups (using transaction)
      const technicianMemberships = await tx.technicianSupportGroup.findMany({
        where: {
          supportGroupId: {
            in: supportGroupIds
          }
        },
        include: {
          technician: {
            include: {
              user: {
                select: {
                  id: true,
                  emp_fname: true,
                  emp_lname: true,
                  emp_email: true,
                }
              }
            }
          }
        }
      });

      templateTechnicians = technicianMemberships
        .map((membership: any) => membership.technician)
        .filter((tech: any) => tech && tech.isActive);
    }

    console.log(`📋 Found ${templateTechnicians.length} technicians supporting template ${templateId}`);

    // If we found template-specific technicians, use them
    if (templateTechnicians.length > 0) {
      // Simple round-robin: get the technician with the least assigned open incidents/requests
      let bestTechnician = null;
      let minActiveRequests = Infinity;

      for (const tech of templateTechnicians) {
        // Count active requests assigned to this technician (using transaction)
        const activeRequestsCount = await tx.request.count({
          where: {
            formData: {
              path: ['assignedTechnicianId'],
              equals: tech.userId
            },
            status: {
              in: [REQUEST_STATUS.OPEN, REQUEST_STATUS.FOR_APPROVAL]
            }
          }
        });

        console.log(`👤 Technician ${tech.displayName}: ${activeRequestsCount} active requests`);

        if (activeRequestsCount < minActiveRequests) {
          minActiveRequests = activeRequestsCount;
          bestTechnician = tech;
        }
      }

      if (bestTechnician) {
        console.log(`✅ Selected template technician: ${bestTechnician.displayName} with ${minActiveRequests} active requests`);
        return bestTechnician;
      }
    }

    // Fallback: find any available technician with lowest workload (using transaction)
    console.log('🔄 No template-specific technicians found, using general pool');
    
    const allTechnicians = await tx.technician.findMany({
      where: {
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_email: true,
          }
        }
      }
    });

    if (allTechnicians.length === 0) {
      console.log('⚠️ No active technicians found');
      return null;
    }

    let bestGeneralTechnician = null;
    let minGeneralRequests = Infinity;

    for (const tech of allTechnicians) {
      const activeRequestsCount = await tx.request.count({
        where: {
          formData: {
            path: ['assignedTechnicianId'],
            equals: tech.userId
          },
          status: {
            in: [REQUEST_STATUS.OPEN, REQUEST_STATUS.FOR_APPROVAL]
          }
        }
      });

      console.log(`👤 General technician ${tech.displayName}: ${activeRequestsCount} active requests`);

      if (activeRequestsCount < minGeneralRequests) {
        minGeneralRequests = activeRequestsCount;
        bestGeneralTechnician = tech;
      }
    }

    if (bestGeneralTechnician) {
      console.log(`✅ Selected general technician: ${bestGeneralTechnician.displayName} with ${minGeneralRequests} active requests`);
      return bestGeneralTechnician;
    }

    console.log('⚠️ No suitable technician found');
    return null;

  } catch (error) {
    console.error('Error finding available technician:', error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    console.log('POST /api/requests called');
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { templateId, templateName, type, formData, attachments, selectedUserId } = data;

    // 🔒 SOLUTION: Wrap everything in a database transaction to prevent orphaned requests
    const result = await prisma.$transaction(async (tx) => {

    console.log('Creating request with data:', { templateId, templateName, type, formData, selectedUserId });

    // Determine the actual user ID for the request
    // If a technician has selected a specific user, use that; otherwise use the logged-in user
    let actualUserId = parseInt(session.user.id);
    
    if (selectedUserId && session.user.isTechnician) {
      actualUserId = parseInt(selectedUserId);
      console.log('Technician creating request for user ID:', actualUserId);
    } else {
      console.log('Creating request for logged-in user ID:', actualUserId);
    }

    // Fetch template to get field information for priority mapping (using transaction)
    const templateForFields = await tx.template.findUnique({
      where: { id: parseInt(templateId) },
      select: {
        id: true,
        fields: true,
      }
    });

    // Find priority field ID from template fields
    let priorityFieldId = null;
    if (templateForFields?.fields) {
      try {
        const fields = Array.isArray(templateForFields.fields) ? templateForFields.fields : JSON.parse(templateForFields.fields as string);
        const priorityField = fields.find((field: any) => field.type === 'priority');
        priorityFieldId = priorityField?.id;
        console.log('🔍 Found priority field:', priorityField, 'ID:', priorityFieldId);
      } catch (error) {
        console.error('❌ Error parsing template fields:', error);
        console.log('Template fields raw:', templateForFields.fields);
      }
    }

    // Incident-specific logic: Set status to open, auto-approve, and apply SLA
    let requestStatus;
    let requestPriority;
    let slaData = null;
    
    if (type === 'incident') {
      console.log('🚨 Processing incident request with special logic');
      
      // For incidents, set status to 'open' immediately
      requestStatus = REQUEST_STATUS.OPEN;
      // Extract priority from formData using the field ID
      requestPriority = priorityFieldId ? formData[priorityFieldId] : formData.priority || 'medium';
      console.log('🔍 Priority field ID:', priorityFieldId, 'Priority value:', requestPriority);
      
      console.log('🔥 Incident request - Status: open, Priority:', requestPriority);
      
      // Fetch SLA based on priority for incidents (direct database query to avoid SSL issues)
      try {
        // Priority mapping to enum values (same as API route)
        const PRIORITY_MAPPING: Record<string, string> = {
          'low': 'Low',
          'medium': 'Medium', 
          'high': 'High',
          'top': 'Top'
        };

        // Map the priority value
        const mappedPriority = PRIORITY_MAPPING[requestPriority.toLowerCase()] || requestPriority;
        
        slaData = await tx.sLAIncident.findFirst({
          where: {
            priority: mappedPriority as any,
            status: 'active'
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
        
        if (slaData) {
          console.log('📋 Applied SLA for incident:', slaData.name);
        } else {
          console.log('⚠️ No active SLA found for priority:', requestPriority, '(mapped to:', mappedPriority, ')');
          // You could implement default SLA logic here if needed
        }
      } catch (slaError) {
        console.error('Error fetching incident SLA:', slaError);
      }
    } else {
      // For service requests, use normal workflow
      requestStatus = formData.status || REQUEST_STATUS.FOR_APPROVAL;
      // Extract priority from formData using the field ID
      requestPriority = priorityFieldId ? formData[priorityFieldId] : formData.priority || 'low';
      console.log('📋 Service request - Status:', requestStatus, 'Priority (field ID', priorityFieldId + '):', requestPriority);
    }

    // Fetch template to get approval workflow configuration (using transaction)
    const template = await tx.template.findUnique({
      where: { id: parseInt(templateId) },
      select: {
        id: true,
        name: true,
        approvalWorkflow: true,
      }
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    console.log('Template approval workflow:', template.approvalWorkflow);

    // Fetch user details for automatic approver assignment (using transaction)
    const requestUser = await tx.users.findUnique({
      where: { id: actualUserId }, // Use the determined user ID
      select: {
        id: true,
        emp_fname: true,
        emp_lname: true,
        emp_email: true,
        department: true,
        departmentId: true,
        reportingToId: true,
        reportingTo: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_email: true,
          }
        },
        userDepartment: {
          select: {
            id: true,
            name: true,
            departmentHead: {
              select: {
                id: true,
                emp_fname: true,
                emp_lname: true,
                emp_email: true,
              }
            }
          }
        }
      }
    });

    console.log('👤 Request User Details:', {
      id: requestUser?.id,
      name: requestUser ? `${requestUser.emp_fname} ${requestUser.emp_lname}` : 'N/A',
      department: requestUser?.department,
      departmentId: requestUser?.departmentId,
      reportingToId: requestUser?.reportingToId,
      hasReportingTo: !!requestUser?.reportingTo,
      hasDepartmentHead: !!requestUser?.userDepartment?.departmentHead,
      reportingToName: requestUser?.reportingTo ? `${requestUser.reportingTo.emp_fname} ${requestUser.reportingTo.emp_lname}` : 'N/A',
      departmentHeadName: requestUser?.userDepartment?.departmentHead ? `${requestUser.userDepartment.departmentHead.emp_fname} ${requestUser.userDepartment.departmentHead.emp_lname}` : 'N/A',
      departmentName: requestUser?.userDepartment?.name || 'N/A'
    });

    // Create the request in the database (using transaction)
    // Create Philippine time that will be stored correctly in UTC database
    const now = new Date();
    const philippineTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); 
    const philippineTimeLocal = new Date(now.getTime() ); // Add 8 hours to store as Philippine time in UTC
    console.log('🕐 Current Philippine time:', philippineTime.toString());
    console.log('🕐 UTC equivalent (will be stored):', philippineTime.toISOString());
    
    // Create consistent timestamp string for SLA display (same format as SLA assignment route)
    const philippineTimeString = philippineTimeLocal.toLocaleString('en-PH', { 
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/, '$3-$1-$2 $4:$5:$6');
    
    console.log('🕐 Philippine time string (for SLA):', philippineTimeString);
    
    // Calculate SLA due dates if incident
    let slaDueDate = null;
    let slaHours = null;
    if (type === 'incident' && slaData) {
      const resolutionDays = slaData.resolutionDays || 0;
      const resolutionHours = slaData.resolutionHours || 0;
      const resolutionMinutes = slaData.resolutionMinutes || 0;
      
      // Calculate total hours for display
      const totalMinutes = resolutionDays * 24 * 60 + resolutionHours * 60 + resolutionMinutes;
      slaHours = Math.round(totalMinutes / 60 * 100) / 100; // Round to 2 decimal places
      
      // 🔍 DEBUG: SLA calculation parameters
      console.log('🔍 ===== SLA CALCULATION DEBUG =====');
      console.log('🔍 Philippine Time (input):', philippineTime.toISOString());
      console.log('🔍 Philippine Time (local):', philippineTime.toLocaleString());
      console.log('🔍 SLA Hours:', slaHours);
      console.log('🔍 Resolution breakdown:', { resolutionDays, resolutionHours, resolutionMinutes });
      console.log('🔍 Total minutes calculated:', totalMinutes);
      console.log('🔍 ===== CALLING calculateSLADueDate =====');
      
      // 🔧 FIX: Use the Philippine time values directly without timezone conversion
      // Extract the time components and create a new Date that represents Philippine time
      const philippineTimeString = philippineTime.toISOString().replace('T', ' ').replace('Z', '');
      console.log('🔧 Philippine Time String (no TZ):', philippineTimeString);
      
      // Create a Date using the Philippine time values as if they were local
      const philippineTimeForSLA = new Date(philippineTimeString);
      console.log('🔧 Philippine Time for SLA:', philippineTimeForSLA.toISOString());
      console.log('🔧 Philippine Time for SLA (local display):', philippineTimeForSLA.toLocaleString());
      
      // Use proper SLA calculator with operational hours
      slaDueDate = await calculateSLADueDate(philippineTimeForSLA, slaHours, { 
        useOperationalHours: true 
      });
      
      console.log('⏰ SLA Due Date calculated with operational hours:', slaDueDate, 'SLA Hours:', slaHours);
      console.log('🔍 SLA Due Date (local):', slaDueDate.toLocaleString());
      console.log('🔍 ===== END SLA CALCULATION DEBUG =====');
    }
    
    const newRequest = await tx.request.create({
      data: {
        templateId: String(templateId),
        status: requestStatus,
        userId: actualUserId, // Use the determined user ID
        formData: {
          ...formData,
          // Normalize email notification field for consistent access
          // REMOVED: emailNotify normalization to prevent duplicate emails
          // Use field '10' directly in notifications instead
          ...(slaData && {
            slaId: slaData.id,
            slaName: slaData.name,
            slaHours: slaHours?.toString(),
            slaSource: 'incident',
            slaDueDate: slaDueDate ? new Date(slaDueDate).toLocaleString('en-PH', { 
              year: 'numeric', month: '2-digit', day: '2-digit',
              hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
            }).replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/, '$3-$1-$2 $4:$5:$6') : null,
            slaStartAt: philippineTimeString,
            assignedDate: philippineTimeString,
            slaCalculatedAt: philippineTimeString,
            // Additional SLA timer fields
            remainingSla: slaHours, // Initialize with full SLA hours
            slaStop: false, // Timer is running by default
            slaStoppedAt: null, // No stop time initially
            slaResumedAt: null, // No resume time initially
            slaStopReason: null // No stop reason initially
          })
        },
        attachments: attachments || [],
        createdAt: philippineTime,
        updatedAt: philippineTime, // Same time as slaStartAt for perfect sync
      },
    });

    console.log('Request created with ID:', newRequest.id);
    console.log('🔄 Timestamp synchronization:');
    console.log('  - Database updatedAt (Date):', philippineTime.toString());
    console.log('  - SLA slaStartAt (String):', philippineTimeString);
    console.log('  - Both represent the same moment in time');

    // 📧 Flag to prevent duplicate notifications
    let notificationsSent = false;

    // 📧 PRIORITY: Send request creation notifications FIRST (for non-incident requests)
    // Note: Incident requests have their own specific notification flow below
    console.log('🔍 Request type check - type:', type, 'isIncident:', type === 'incident');
    if (type !== 'incident') {
      try {
        const requestWithUser = await tx.request.findUnique({
          where: { id: newRequest.id },
          include: {
            user: {
              select: {
                id: true,
                emp_fname: true,
                emp_lname: true,
                emp_email: true,
                department: true,
              }
            }
          }
        });

        if (requestWithUser && template) {
          console.log('📧 PRIORITY: Sending NON-INCIDENT request creation notifications first...');
          await notifyRequestCreated(requestWithUser, template);
          console.log('✅ PRIORITY: NON-INCIDENT request creation notifications sent successfully');
          notificationsSent = true;
        }
      } catch (notificationError) {
        console.error('Error sending non-incident request creation notifications:', notificationError);
        // Don't fail the request creation if notifications fail
      }
    }

    // 📝 STANDARD HISTORY ENTRY 1: Request Created (Priority 1)
    if (requestUser) {
      let actorName = `${requestUser.emp_fname} ${requestUser.emp_lname}`;
      let details = `${requestUser.emp_fname} ${requestUser.emp_lname}`;
      
      // If technician created on behalf of someone else, update the details
      if (selectedUserId && session.user.isTechnician && actualUserId !== parseInt(session.user.id)) {
        const technicianName = session.user.name || 'Technician';
        details = `${technicianName} created request on behalf of ${requestUser.emp_fname} ${requestUser.emp_lname}`;
        console.log('Technician submission: Request created by', technicianName, 'for', actorName);
      }
      
      await addHistory(tx as any, {
        requestId: newRequest.id,
        action: "Created",
        actorName: actorName,
        actorType: "user",
        details: details,
        actorId: requestUser.id,
      });
      console.log('✅ Created history entry: Request Created');
    }

    // Special handling for incident requests
    if (type === 'incident') {
      console.log('🚨 Processing incident-specific logic');
      
      // Add history entry for SLA assignment if available
      if (slaData) {
        await addHistory(tx as any, {
          requestId: newRequest.id,
          action: "SLA Applied",
          actorName: "System",
          actorType: "system",
          details: `SLA "${slaData.name}" applied based on ${requestPriority} priority.\nDue: ${formatTimestampForHistory(slaDueDate!)}`,
        });
        console.log('✅ Created history entry: SLA Applied');
      }

      // Add history entry for incident opened
      await addHistory(tx as any, {
        requestId: newRequest.id,
        action: "Opened",
        actorName: "System",
        actorType: "system",
        details: `Incident automatically opened with ${requestPriority} priority`,
      });
      console.log('✅ Created history entry: Incident Opened');

      // 📧 Send request creation notifications FIRST (before technician assignment)
      console.log('🔍 INCIDENT notification check - type:', type, 'isIncident:', type === 'incident', 'notificationsSent:', notificationsSent);
      if (!notificationsSent) {
        try {
          const requestWithUser = await tx.request.findUnique({
            where: { id: newRequest.id },
            include: {
              user: {
                select: {
                  id: true,
                  emp_fname: true,
                  emp_lname: true,
                  emp_email: true,
                  department: true,
                }
              }
            }
          });

          if (requestWithUser && template) {
            console.log('📧 Sending INCIDENT request creation notifications...');
            await notifyRequestCreated(requestWithUser, template);
            console.log('✅ INCIDENT request creation notifications sent successfully');
            notificationsSent = true;
          }
        } catch (notificationError) {
          console.error('Error sending incident request creation notifications:', notificationError);
          // Don't fail the request creation if notifications fail
        }
      } else {
        console.log('⚠️ Skipping incident notifications - already sent for this request');
      }

      // Auto-assign technician if none assigned
      const assignedTechnicianId = formData.assignedTechnicianId;
      if (!assignedTechnicianId || assignedTechnicianId === '') {
        console.log('🔧 No technician assigned, attempting auto-assignment');
        
        // Find available technician based on template support groups or global load balancing
        const availableTechnician = await findAvailableTechnician(templateId, tx);
        
        if (availableTechnician) {
          // Update the request with assigned technician (using transaction)
          await tx.request.update({
            where: { id: newRequest.id },
            data: {
              formData: {
                ...formData,
                assignedTechnicianId: availableTechnician.userId,
                assignedTechnician: availableTechnician.displayName,
                assignedTechnicianEmail: availableTechnician.user?.emp_email,
                ...(slaData && {
                  slaId: slaData.id,
                  slaName: slaData.name,
                  slaHours: slaHours?.toString(),
                  slaSource: 'incident',
                  slaDueDate: slaDueDate ? new Date(slaDueDate).toLocaleString('en-PH', { 
                    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
                  }).replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/, '$3-$1-$2 $4:$5:$6') : null,
                  slaStartAt: philippineTimeString,
                  assignedDate: philippineTimeString,
                  slaCalculatedAt: philippineTimeString,
                  // Additional SLA timer fields
                  remainingSla: slaHours, // Initialize with full SLA hours
                  slaStop: false, // Timer is running by default
                  slaStoppedAt: null, // No stop time initially
                  slaResumedAt: null, // No resume time initially
                  slaStopReason: null // No stop reason initially
                })
              },
              updatedAt: philippineTime
            }
          });

          // Add history entry for auto-assignment
          await addHistory(tx as any, {
            requestId: newRequest.id,
            action: "Auto-Assigned",
            actorName: "System",
            actorType: "system",
            details: `Automatically assigned to ${availableTechnician.displayName}`,
          });
          console.log('✅ Created history entry: Auto-Assigned to', availableTechnician.displayName);

          // 📧 For incidents: Send technician assignment notifications immediately
          try {
            const requestWithUser = await tx.request.findUnique({
              where: { id: newRequest.id },
              include: {
                user: {
                  select: {
                    id: true,
                    emp_fname: true,
                    emp_lname: true,
                    emp_email: true,
                  }
                }
              }
            });

            if (requestWithUser && availableTechnician.user) {
              console.log('📧 Sending incident technician assignment notifications...');
              await notifyRequestAssigned(requestWithUser, template, availableTechnician.user);
              console.log('✅ Incident technician assignment notifications sent successfully');
            }
          } catch (notificationError) {
            console.error('Error sending incident technician assignment notifications:', notificationError);
            // Don't fail the request creation if notifications fail
          }
        } else {
          console.log('⚠️ No available technician found for auto-assignment');
        }
      }

      // For incidents, automatically approve all approval workflows
      if (template.approvalWorkflow && requestUser) {
        console.log('🔄 Auto-approving incident workflow');
        
        const approvalConfig = template.approvalWorkflow as any;
        if (approvalConfig.levels && Array.isArray(approvalConfig.levels)) {
          const templateLevels = approvalConfig.levels;
          
          // Create auto-approved records for all levels
          for (let i = 0; i < templateLevels.length; i++) {
            const level = templateLevels[i];
            const levelNumber = i + 1;
            
            if (level.approvers && level.approvers.length > 0) {
              for (const approver of level.approvers) {
                let actualApproverId = null;
                let approverName = '';
                
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
                  } else {
                    continue;
                  }
                } else {
                  let userIdToCheck = approver.id;
                  if (typeof userIdToCheck === 'string' && !isNaN(parseInt(userIdToCheck))) {
                    userIdToCheck = parseInt(userIdToCheck);
                  }
                  
                  if (userIdToCheck < 0 && userIdToCheck !== -1 && userIdToCheck !== -2) {
                    continue;
                  }
                  
                  actualApproverId = userIdToCheck;
                  const templateApprover = await tx.users.findUnique({
                    where: { id: actualApproverId },
                    select: {
                      id: true,
                      emp_fname: true,
                      emp_lname: true,
                      emp_email: true,
                    }
                  });
                  
                  if (templateApprover) {
                    approverName = `${templateApprover.emp_fname} ${templateApprover.emp_lname}`;
                  } else {
                    continue;
                  }
                }
                
                // Create auto-approved record (using transaction)
                if (actualApproverId) {
                  await tx.requestApproval.create({
                    data: {
                      requestId: newRequest.id,
                      level: levelNumber,
                      name: level.displayName || `Level ${levelNumber}`,
                      approverId: actualApproverId,
                      approverName: approverName, // ✅ Add approver name 
                      approverEmail: level.approver?.emp_email, // ✅ Add approver email
                      status: APPROVAL_STATUS.APPROVED,
                      isAutoApproval: true,
                      comments: 'Automatically approved for incident request',
                      sentOn: philippineTime,
                      actedOn: philippineTime,
                      createdAt: philippineTime,
                      updatedAt: philippineTime,
                    }
                  });
                  console.log(`Auto-approved level ${levelNumber} for: ${approverName}`);
                }
              }
            }
          }

          // Add history entry for auto-approvals
          await addHistory(tx as any, {
            requestId: newRequest.id,
            action: "Auto-Approved",
            actorName: "System",
            actorType: "system",
            details: "All approval levels automatically approved for incident request",
          });
          console.log('✅ Created history entry: Auto-Approved');
        }
      }
    } else {
      // Original service request approval workflow logic
      if (template.approvalWorkflow && requestUser) {
        const approvalConfig = template.approvalWorkflow as any;
        console.log('🔄 Creating approval workflow for request:', newRequest.id);
        console.log('📋 Full approval config:', JSON.stringify(approvalConfig, null, 2));
        
        // Check if template has approval levels configured
        if (approvalConfig.levels && Array.isArray(approvalConfig.levels)) {
          const templateLevels = approvalConfig.levels;
          console.log('📊 Template levels found:', templateLevels.length);
          
          templateLevels.forEach((level: any, index: number) => {
            console.log(`📌 Level ${index + 1} (${level.displayName || 'Unnamed'}):`, {
              approvers: level.approvers?.length || 0,
              approverDetails: level.approvers
            });
          });
          
          // Get additional approvers from the form data (from "Select Approvers" field)
          const additionalApprovers = formData['12'] || []; // Field ID 12 is "Select Approvers"
          console.log('Additional approvers from form:', additionalApprovers);
          console.log('Additional approvers type:', typeof additionalApprovers, Array.isArray(additionalApprovers));
          console.log('Individual approver types:', additionalApprovers.map((a: any) => ({ value: a, type: typeof a })));
          
          console.log('📋 Template analysis:', {
            templateLevels: templateLevels.length,
            additionalApprovers: additionalApprovers.length
          });
          
          // Create approval records for each template level
          for (let i = 0; i < templateLevels.length; i++) {
            const level = templateLevels[i];
            const levelNumber = i + 1;
            
            // Collect approver names for each level's history entry
            let levelApproverNames = [];
            
            // For Level 1, prioritize selected approvers over template approvers
            if (levelNumber === 1) {
              // Track approver IDs to avoid duplicates
              const processedApproverIds = new Set<number>();
              
              // Check if we have selected approvers from form
              const hasSelectedApprovers = Array.isArray(additionalApprovers) && additionalApprovers.length > 0;
              
              if (hasSelectedApprovers) {
                console.log('✅ Using selected approvers for Level 1 (completely overriding template approvers)');
                
                // Use ONLY selected approvers for Level 1 - completely skip template approvers
                for (const approverId of additionalApprovers) {
                  // Convert to number if needed
                  const numericApproverId = typeof approverId === 'string' ? parseInt(approverId) : approverId;
                  console.log(`Processing selected approver ID: ${approverId} (${typeof approverId}) -> ${numericApproverId}`);
                  
                  // Skip if the ID is invalid
                  if (isNaN(numericApproverId) || numericApproverId <= 0) {
                    console.warn(`Invalid approver ID: ${approverId}`);
                    continue;
                  }
                  
                  // Check for duplicates - skip if already processed
                  if (processedApproverIds.has(numericApproverId)) {
                    console.log(`⚠️ Skipping duplicate selected approver ID: ${numericApproverId}`);
                    continue;
                  }
                  
                  // Mark as processed to avoid future duplicates
                  processedApproverIds.add(numericApproverId);
                  
                  // Fetch user details for the selected approver (using transaction)
                  const selectedApprover = await tx.users.findUnique({
                    where: { id: numericApproverId },
                    select: {
                      id: true,
                      emp_fname: true,
                      emp_lname: true,
                      emp_email: true,
                    }
                  });
                  
                  if (selectedApprover) {
                    const createdSelected = await tx.requestApproval.create({
                      data: {
                        requestId: newRequest.id,
                        level: levelNumber,
                        name: level.displayName || `Level ${levelNumber}`,
                        approverId: selectedApprover.id,
                        approverName: `${selectedApprover.emp_fname} ${selectedApprover.emp_lname}`,
                        approverEmail: selectedApprover.emp_email,
                        status: APPROVAL_STATUS.PENDING_APPROVAL,
                        sentOn: philippineTime, // ✅ Set sentOn since email is sent immediately for Level 1
                        createdAt: philippineTime,
                        updatedAt: philippineTime,
                      }
                    });
                    levelApproverNames.push(`${selectedApprover.emp_fname} ${selectedApprover.emp_lname}`);
                    console.log(`Created selected approver for level ${levelNumber}: ${selectedApprover.emp_fname} ${selectedApprover.emp_lname}`);
                    
                    // 📧 Send approval required notification
                    try {
                      if (requestUser) {
                        const requestWithUser = {
                          id: newRequest.id,
                          status: newRequest.status,
                          formData: newRequest.formData,
                          user: requestUser
                        };
                        
                        await notifyApprovalRequired(requestWithUser, template, selectedApprover, createdSelected.id);
                        console.log(`✅ Approval notification sent to ${selectedApprover.emp_fname} ${selectedApprover.emp_lname}`);
                      }
                    } catch (notificationError) {
                      console.error(`Error sending approval notification to ${selectedApprover.emp_fname} ${selectedApprover.emp_lname}:`, notificationError);
                      // Don't fail the request creation if notification fails
                    }
                  } else {
                    console.warn(`Selected approver with ID ${numericApproverId} not found in database`);
                  }
                }
                
                // ✅ IMPORTANT: When selected approvers exist, completely skip template approvers
                console.log('🚫 Skipping all template approvers for Level 1 because selected approvers were provided');
              } else {
                console.log('📋 No selected approvers found, using template Level 1 approvers (excluding department_head)');
                
                // Use template approvers for Level 1 if no selected approvers, but skip department_head
                if (level.approvers && level.approvers.length > 0) {
                  for (const approver of level.approvers) {
                    console.log('Processing template approver:', approver);
                  
                    let actualApproverId = null;
                    let approverName = '';
                    
                    // Check if this is a special approver type (reporting to, department head)
                    const approverValue = String(approver.id || approver.name || approver).toLowerCase();
                    const approverNumericId = parseInt(approver.id || approver.name || approver);
                    console.log(`Checking approver value: "${approverValue}" (original:`, approver, ') | Numeric ID:', approverNumericId);
                    
                    // ✅ SKIP department_head for Level 1
                    if (approverValue === 'department_head' || 
                        approverValue.includes('department') && approverValue.includes('head') ||
                        approverValue.includes('chief') ||
                        approver.type === 'department_head' ||
                        approverNumericId === -2) {
                      console.log(`🚫 Skipping department_head for Level 1: ${JSON.stringify(approver)}`);
                      continue;
                    }
                    
                    if (approverValue === 'reporting_to' || 
                        approverValue.includes('reporting') || 
                        approverValue.includes('immediate supervisor') ||
                        approverValue.includes('manager') ||
                        approver.type === 'reporting_to' ||
                        approverNumericId === -1) {  // -1 typically represents reporting manager
                      // Use the requester's reporting manager
                      if (requestUser && requestUser.reportingToId) {
                        actualApproverId = requestUser.reportingToId;
                        if (requestUser.reportingTo) {
                          approverName = `${requestUser.reportingTo.emp_fname} ${requestUser.reportingTo.emp_lname}`;
                        }
                        console.log(`✅ Using reporting manager (code: ${approverNumericId}): ${approverName} (ID: ${actualApproverId})`);
                      } else {
                        console.warn('⚠️ Requester has no reporting manager configured');
                        continue;
                      }
                    } else {
                      // Regular user approver - validate that the user exists
                      // Try to parse as number if it's a string ID
                      let userIdToCheck = approver.id;
                      if (typeof userIdToCheck === 'string' && !isNaN(parseInt(userIdToCheck))) {
                        userIdToCheck = parseInt(userIdToCheck);
                      }
                      
                      // Skip negative IDs that aren't our special codes
                      if (userIdToCheck < 0 && userIdToCheck !== -1 && userIdToCheck !== -2) {
                        console.warn(`⚠️ Skipping unknown negative approver ID: ${userIdToCheck}`);
                        continue;
                      }
                      
                      actualApproverId = userIdToCheck;
                      const templateApprover = await tx.users.findUnique({
                        where: { id: actualApproverId },
                        select: {
                          id: true,
                          emp_fname: true,
                          emp_lname: true,
                          emp_email: true,
                        }
                      });
                      
                      if (templateApprover) {
                        approverName = `${templateApprover.emp_fname} ${templateApprover.emp_lname}`;
                        console.log(`✅ Using template approver: ${approverName} (ID: ${actualApproverId})`);
                      } else {
                        console.warn(`⚠️ Template approver with ID ${actualApproverId} not found in database`);
                        continue;
                      }
                    }
                  
                  // Check for duplicates before creating
                  if (actualApproverId && !processedApproverIds.has(actualApproverId)) {
                    processedApproverIds.add(actualApproverId);
                    
                    // Create Philippine time (server is already in Philippine timezone)
                    const now = new Date();
                    const philippineTime = now; // No conversion needed - server is already GMT+8
                    
                    // Get approver email for the database record (using transaction)
                    const approverUser = await tx.users.findUnique({
                      where: { id: actualApproverId },
                      select: {
                        emp_email: true,
                        emp_fname: true,
                        emp_lname: true,
                      }
                    });
                    
                    const createdApprover = await tx.requestApproval.create({
                      data: {
                        requestId: newRequest.id,
                        level: levelNumber,
                        name: level.displayName || `Level ${levelNumber}`,
                        approverId: actualApproverId,
                        approverName: approverName, // ✅ Add approver name to database
                        approverEmail: approverUser?.emp_email, // ✅ Add approver email to database
                        status: APPROVAL_STATUS.PENDING_APPROVAL,
                        sentOn: philippineTime, // ✅ Set sentOn since email is sent immediately for Level 1
                        createdAt: philippineTime,
                        updatedAt: philippineTime,
                      }
                    });
                    levelApproverNames.push(approverName);
                    console.log(`Created template approver for level ${levelNumber}: ${approverName}`);
                    
                    // 📧 Send approval required notification
                    try {
                      if (approverUser && requestUser) {
                        const requestWithUser = {
                          id: newRequest.id,
                          status: newRequest.status,
                          formData: newRequest.formData,
                          user: requestUser
                        };
                        
                        // Use the approverUser we already fetched above
                        const fullApproverUser = {
                          id: actualApproverId,
                          emp_fname: approverUser.emp_fname,
                          emp_lname: approverUser.emp_lname,
                          emp_email: approverUser.emp_email,
                        };
                        
                        await notifyApprovalRequired(requestWithUser, template, fullApproverUser, createdApprover.id);
                        console.log(`✅ Approval notification sent to ${approverName}`);
                      }
                    } catch (notificationError) {
                      console.error(`Error sending approval notification to ${approverName}:`, notificationError);
                      // Don't fail the request creation if notification fails
                    }
                  } else {
                    console.log(`⚠️ Skipping duplicate template approver ID: ${actualApproverId}`);
                  }
                }
              }
            }
              
              // 📧 STANDARD HISTORY ENTRY 2: Approvals Initiated - Level 1 (Priority 2)
              if (levelApproverNames.length > 0) {
                await addHistory(tx as any, {
                  requestId: newRequest.id,
                  action: "Approvals Initiated",
                  actorName: "System",
                  actorType: "system",
                  details: `Approver(s) : ${levelApproverNames.join(', ')}\nLevel : ${level.displayName || `Level ${levelNumber}`}`,
                });
                console.log(`✅ Created history entry: Approvals Initiated - Level ${levelNumber}`);
              }
            } else if (levelNumber > 1) {
              // ⚠️ IMPORTANT: For levels > 1, create approval records in "dormant" state
              // These levels should NOT receive email notifications during request creation
              // They will be activated (and emails sent) when previous level completes
              console.log(`🔄 Processing Level ${levelNumber} approvers (dormant state - no immediate emails)`);
              
              // For other levels, only use template approvers
              if (level.approvers && level.approvers.length > 0) {
                for (const approver of level.approvers) {
                  console.log(`Processing template approver for level ${levelNumber} (dormant):`, approver);
                  
                  let actualApproverId = null;
                  let approverName = '';
                  
                  // Check if this is a special approver type (reporting to, department head)
                  // Handle exact string values like "reporting_to" and "department_head" from template
                  // Also handle numeric codes like -1 (reporting_to) and -2 (department_head)
                  const approverValue = String(approver.id || approver.name || approver).toLowerCase();
                  const approverNumericId = parseInt(approver.id || approver.name || approver);
                  console.log(`Checking approver value for level ${levelNumber}: "${approverValue}" (original:`, approver, ') | Numeric ID:', approverNumericId);
                  
                  if (approverValue === 'reporting_to' || 
                      approverValue.includes('reporting') || 
                      approverValue.includes('immediate supervisor') ||
                      approverValue.includes('manager') ||
                      approver.type === 'reporting_to' ||
                      approverNumericId === -1) {  // -1 typically represents reporting manager
                    // Use the requester's reporting manager
                    if (requestUser && requestUser.reportingToId) {
                      actualApproverId = requestUser.reportingToId;
                      if (requestUser.reportingTo) {
                        approverName = `${requestUser.reportingTo.emp_fname} ${requestUser.reportingTo.emp_lname}`;
                      }
                      console.log(`✅ Using reporting manager for level ${levelNumber} (code: ${approverNumericId}): ${approverName} (ID: ${actualApproverId})`);
                    } else {
                      console.warn(`⚠️ Requester has no reporting manager configured for level ${levelNumber}`);
                      continue;
                    }
                  } else if (approverValue === 'department_head' || 
                            approverValue.includes('department') && approverValue.includes('head') ||
                            approverValue.includes('chief') ||
                            approver.type === 'department_head' ||
                            approverNumericId === -2) {  // -2 typically represents department head
                    // Get department head through userDepartment relationship
                    console.log('🔍 Department debug for level', levelNumber, ':', {
                      hasUserDepartment: !!requestUser?.userDepartment,
                      departmentData: requestUser?.userDepartment,
                      hasDepartmentHead: !!requestUser?.userDepartment?.departmentHead,
                      departmentHeadData: requestUser?.userDepartment?.departmentHead
                    });
                    if (requestUser && requestUser.userDepartment?.departmentHead) {
                      const departmentHead = requestUser.userDepartment.departmentHead;
                      actualApproverId = departmentHead.id;
                      approverName = `${departmentHead.emp_fname} ${departmentHead.emp_lname}`;
                      console.log(`✅ Using department head for level ${levelNumber} (code: ${approverNumericId}): ${approverName} (ID: ${actualApproverId})`);
                    } else if (requestUser && requestUser.userDepartment) {
                      console.warn(`⚠️ Department "${requestUser.userDepartment.name}" has no department head configured for level ${levelNumber}`);
                      continue;
                    } else {
                      console.warn(`⚠️ Requester has no department configured for level ${levelNumber}`);
                      continue;
                    }
                  } else {
                    // Regular user approver - validate that the user exists
                    // Try to parse as number if it's a string ID
                    let userIdToCheck = approver.id;
                    if (typeof userIdToCheck === 'string' && !isNaN(parseInt(userIdToCheck))) {
                      userIdToCheck = parseInt(userIdToCheck);
                    }
                    
                    // Skip negative IDs that aren't our special codes
                    if (userIdToCheck < 0 && userIdToCheck !== -1 && userIdToCheck !== -2) {
                      console.warn(`⚠️ Skipping unknown negative approver ID for level ${levelNumber}: ${userIdToCheck}`);
                      continue;
                    }
                    
                    actualApproverId = userIdToCheck;
                    const templateApprover = await tx.users.findUnique({
                      where: { id: actualApproverId },
                      select: {
                        id: true,
                        emp_fname: true,
                        emp_lname: true,
                        emp_email: true,
                      }
                    });
                    
                    if (templateApprover) {
                      approverName = `${templateApprover.emp_fname} ${templateApprover.emp_lname}`;
                      console.log(`✅ Using template approver for level ${levelNumber}: ${approverName} (ID: ${actualApproverId})`);
                    } else {
                      console.warn(`⚠️ Template approver with ID ${actualApproverId} not found in database for level ${levelNumber}`);
                      continue;
                    }
                  }
                  
                  // Create the approval record if we have a valid approver ID
                  // ⚠️ For levels > 1: Create in dormant state (pending_approval but no email notification)
                  // These will be activated and emails sent when previous level completes
                  if (actualApproverId) {
                    // Get approver email and ensure we have the correct name (using transaction)
                    const approverUser = await tx.users.findUnique({
                      where: { id: actualApproverId },
                      select: {
                        emp_fname: true,
                        emp_lname: true,
                        emp_email: true,
                      }
                    });
                    
                    // Use database name if approverName is empty or fallback
                    if (!approverName && approverUser) {
                      approverName = `${approverUser.emp_fname} ${approverUser.emp_lname}`;
                    }
                    
                    const createdOther = await tx.requestApproval.create({
                      data: {
                        requestId: newRequest.id,
                        level: levelNumber,
                        name: level.displayName || `Level ${levelNumber}`,
                        approverId: actualApproverId,
                        approverName: approverName, // ✅ Add approver name to database
                        approverEmail: approverUser?.emp_email, // ✅ Add approver email to database
                        status: APPROVAL_STATUS.PENDING_APPROVAL,
                        createdAt: philippineTime, // ✅ Use the same philippineTime as request creation
                        updatedAt: philippineTime, // ✅ Use the same philippineTime as request creation
                        // 🔑 Key: Do NOT set sentOn field for dormant levels
                        // sentOn will be set when the level is activated by approval action
                      }
                    });
                    console.log(`Created template approver for level ${levelNumber}: ${approverName}`);
                    
                    // � DO NOT send email notifications for levels > 1 during request creation
                    // These levels are created in "dormant" state and will be activated 
                    // (with email notifications) when previous level completes
                    console.log(`✅ Created dormant approval for level ${levelNumber}: ${approverName} (will be activated when Level ${levelNumber - 1} completes)`);
                    
                    // The approval action route will handle:
                    // 1. Activating this level when previous level is approved
                    // 2. Setting the sentOn timestamp
                    // 3. Sending email notifications at that time
                  }
                }
              }
            }
          }
          
          // Do not create automatic history entries - only user actions should be logged
        }
      }
    }

    // If there are attachments, try to link them to the request
    if (attachments && attachments.length > 0) {
      try {
        // Import prismaAttachments only when needed to avoid startup issues
        const { prismaAttachments } = require('@/lib/prisma-attachments');
        
        await prismaAttachments.attachment.updateMany({
          where: {
            originalName: {
              in: attachments
            },
            userId: String(session.user.id),
            requestId: null // Only update unlinked attachments
          },
          data: {
            requestId: String(newRequest.id) // Convert to string
          }
        });
        
        console.log('Attachments linked to request:', newRequest.id);
      } catch (attachmentError) {
        console.error('Error linking attachments:', attachmentError);
        // Don't fail the request creation if attachment linking fails
      }
    }

    // Return the created request
    return { success: true, request: newRequest };

    }, {
      maxWait: 10000, // 10 seconds max wait
      timeout: 30000, // 30 seconds timeout
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating request:', error);
    
    // Provide more specific error messages based on the error type
    let errorMessage = 'Failed to create request';
    
    if (error instanceof Error) {
      if (error.message.includes('P2003')) {
        errorMessage = 'Invalid approver selected. Please check your approver selections and try again.';
      } else if (error.message.includes('P2002')) {
        errorMessage = 'A request with these details already exists.';
      } else if (error.message.includes('validation')) {
        errorMessage = 'Please check all required fields and try again.';
      }
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const myRequests = searchParams.get('myRequests');
    const departmentId = searchParams.get('departmentId');
    const departmentHead = searchParams.get('departmentHead');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    console.log('GET /api/requests - userId:', userId, 'status:', status, 'type:', type, 'myRequests:', myRequests, 'departmentId:', departmentId, 'departmentHead:', departmentHead);

    // Build where clause for filtering
    let whereClause: any = {};

    // Department filtering logic
    if (departmentHead && !myRequests) {
      // Department head viewing department requests
      const currentUser = await prisma.users.findUnique({
        where: { id: parseInt(departmentHead) },
        include: {
          departmentsManaged: {
            select: { id: true }
          }
        }
      });

      if (currentUser?.departmentsManaged && currentUser.departmentsManaged.length > 0) {
        const managedDepartmentIds = currentUser.departmentsManaged.map(d => d.id);
        
        if (departmentId && departmentId !== 'all') {
          // Filter by specific department
          whereClause.user = {
            userDepartment: {
              id: parseInt(departmentId)
            }
          };
        } else {
          // Filter by all managed departments
          whereClause.user = {
            userDepartment: {
              id: {
                in: managedDepartmentIds
              }
            }
          };
        }
      }
    } else if (departmentId && departmentId !== 'all' && !myRequests) {
      // General department filtering (for any user who wants to filter by department)
      whereClause.user = {
        userDepartment: {
          id: parseInt(departmentId)
        }
      };
      console.log('Filtering by department ID:', departmentId);
    } else if (myRequests === 'true') {
      // Always filter by current user only (regardless of technician status)
      whereClause.userId = parseInt(session.user.id);
      console.log('Filtering by current user only (myRequests=true):', session.user.id);
    } else if (userId && session.user.isTechnician) {
      // If userId is provided and user is technician, filter by that user
      whereClause.userId = parseInt(userId);
    } else if (!session.user.isTechnician) {
      // Non-technicians can only see their own requests
      whereClause.userId = parseInt(session.user.id);
    }
    // If no userId and user is technician and myRequests is not true, show all requests (no userId filter)

    if (status) {
      if (status === 'overdue') {
        // Handle overdue filtering - open requests that have passed their due date
        const now = new Date();
        
        whereClause.AND = [
          {
            // Only open requests
            status: REQUEST_STATUS.OPEN
          },
          {
            // Must have an SLA due date
            formData: {
              path: ['slaDueDate'],
              not: Prisma.AnyNull
            }
          },
          {
            // Due date must be in the past
            formData: {
              path: ['slaDueDate'],
              lt: now.toISOString()
            }
          }
        ];
        console.log('Filtering overdue requests (open status only) with due date before:', now.toISOString());
      } else {
        whereClause.status = status;
      }
    }

    if (type) {
      whereClause.type = type;
    }

    console.log('WHERE clause:', JSON.stringify(whereClause, null, 2));

    // Calculate pagination
    const offset = (page - 1) * limit;

    // Get total count for pagination
    const total = await prisma.request.count({
      where: whereClause,
    });

    const requests = await prisma.request.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_email: true,
            department: true,
            userDepartment: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        },
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                emp_fname: true,
                emp_lname: true,
                emp_email: true,
              }
            }
          },
          orderBy: [
            { level: 'asc' },
            { createdAt: 'asc' }
          ]
        }
      },
      orderBy: {
        id: 'desc'
      },
      take: limit,
      skip: offset,
    });

    console.log(`Found ${requests.length} requests (page ${page}, total: ${total})`);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({ 
      success: true, 
      requests,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages,
        current: page
      }
    });
  } catch (error) {
    console.error('Error fetching requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch requests', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
