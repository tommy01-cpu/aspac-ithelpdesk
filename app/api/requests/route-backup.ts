import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { getDatabaseTimestamp } from '@/lib/server-time-utils';
import { addHistory } from '@/lib/history';

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
async function findAvailableTechnician(templateId: string) {
  try {
    console.log('🔍 Finding available technician for templateId:', templateId);
    
    // Try to find technicians from template support groups first
    let availableTechnicians = await prisma.technician.findMany({
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

    // Filter technicians who support this template
    const templateSupportTechnicians = availableTechnicians;

    console.log(`📋 Found ${templateSupportTechnicians.length} technicians supporting template ${templateId}`);    // If we found template-specific technicians, use them
    if (templateSupportTechnicians.length > 0) {
      // Simple round-robin: get the technician with the least assigned open incidents/requests
      let bestTechnician = null;
      let minActiveRequests = Infinity;

      for (const tech of templateSupportTechnicians) {
        // Count active requests assigned to this technician
        const activeRequestsCount = await prisma.request.count({
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

    // Fallback: find any available technician with lowest workload
    console.log('🔄 No template-specific technicians found, using general pool');
    
    const allTechnicians = await prisma.technician.findMany({
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
      const activeRequestsCount = await prisma.request.count({
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

    // Incident-specific logic: Set status to open, auto-approve, and apply SLA
    let requestStatus;
    let requestPriority;
    let slaData = null;
    
    if (type === 'incident') {
      console.log('🚨 Processing incident request with special logic');
      
      // For incidents, set status to 'open' immediately
      requestStatus = REQUEST_STATUS.OPEN;
      requestPriority = formData.priority || 'medium';
      
      console.log('🔥 Incident request - Status: open, Priority:', requestPriority);
      
      // Fetch SLA based on priority for incidents
      try {
        const slaResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/sla-incident/by-priority?priority=${encodeURIComponent(requestPriority)}`);
        if (slaResponse.ok) {
          const slaResult = await slaResponse.json();
          if (slaResult.success && slaResult.data) {
            slaData = slaResult.data;
            console.log('📋 Applied SLA for incident:', slaData.name);
          }
        }
      } catch (slaError) {
        console.error('Error fetching incident SLA:', slaError);
      }
    } else {
      // For service requests, use normal workflow
      requestStatus = formData.status || REQUEST_STATUS.FOR_APPROVAL;
      requestPriority = formData.priority || 'low';
      console.log('📋 Service request - Status:', requestStatus, 'Priority:', requestPriority);
    }

    // Fetch template to get approval workflow configuration
    const template = await prisma.template.findUnique({
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

    // Fetch user details for automatic approver assignment
    const requestUser = await prisma.users.findUnique({
      where: { id: actualUserId }, // Use the determined user ID
      select: {
        id: true,
        emp_fname: true,
        emp_lname: true,
        emp_email: true,
        department: true,
        departmentId: true,
        reportingToId: true,
        departmentHeadId: true,
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
        },
        departmentHead: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_email: true,
          }
        }
      }
    });

    console.log('👤 Request User Details:', {
      id: requestUser?.id,
      name: requestUser ? `${requestUser.emp_fname} ${requestUser.emp_lname}` : 'N/A',
      department: requestUser?.department,
      reportingToId: requestUser?.reportingToId,
      departmentHeadId: requestUser?.departmentHeadId,
      hasReportingTo: !!requestUser?.reportingTo,
      hasDepartmentHead: !!requestUser?.departmentHead,
      reportingToName: requestUser?.reportingTo ? `${requestUser.reportingTo.emp_fname} ${requestUser.reportingTo.emp_lname}` : 'N/A',
      departmentHeadName: requestUser?.departmentHead ? `${requestUser.departmentHead.emp_fname} ${requestUser.departmentHead.emp_lname}` : 'N/A'
    });

    // Create the request in the database
    // Create Philippine time by manually adjusting UTC
    const now = new Date();
    const philippineTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    
    // Calculate SLA due dates if incident
    let slaDueDate = null;
    let responseTime = null;
    if (type === 'incident' && slaData) {
      const resolutionMinutes = (slaData.resolutionDays || 0) * 24 * 60 + 
                               (slaData.resolutionHours || 0) * 60 + 
                               (slaData.resolutionMinutes || 0);
      slaDueDate = new Date(philippineTime.getTime() + resolutionMinutes * 60 * 1000);
      
      responseTime = (slaData.responseHours || 0) * 60 + (slaData.responseMinutes || 0);
      console.log('⏰ SLA Due Date calculated:', slaDueDate, 'Response time:', responseTime, 'minutes');
    }
    
    const newRequest = await prisma.request.create({
      data: {
        templateId: String(templateId),
        status: requestStatus,
        userId: actualUserId, // Use the determined user ID
        formData: {
          ...formData,
          ...(slaData && {
            slaId: slaData.id,
            slaName: slaData.name,
            slaDueDate: slaDueDate?.toISOString(),
            responseTime: responseTime
          })
        },
        attachments: attachments || [],
        createdAt: philippineTime,
        updatedAt: philippineTime,
      },
    });

    console.log('Request created with ID:', newRequest.id);

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
      
      await addHistory(prisma as any, {
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
        await addHistory(prisma as any, {
          requestId: newRequest.id,
          action: "SLA Applied",
          actorName: "System",
          actorType: "system",
          details: `SLA "${slaData.name}" applied based on ${requestPriority} priority. Due: ${slaDueDate?.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}`,
        });
        console.log('✅ Created history entry: SLA Applied');
      }

      // Add history entry for incident opened
      await addHistory(prisma as any, {
        requestId: newRequest.id,
        action: "Opened",
        actorName: "System",
        actorType: "system",
        details: `Incident automatically opened with ${requestPriority} priority`,
      });
      console.log('✅ Created history entry: Incident Opened');

      // Auto-assign technician if none assigned
      const assignedTechnicianId = formData.assignedTechnicianId;
      if (!assignedTechnicianId || assignedTechnicianId === '') {
        console.log('🔧 No technician assigned, attempting auto-assignment');
        
        // Find available technician based on template support groups or global load balancing
        const availableTechnician = await findAvailableTechnician(templateId);
        
        if (availableTechnician) {
          // Update the request with assigned technician
          await prisma.request.update({
            where: { id: newRequest.id },
            data: {
              formData: {
                ...formData,
                assignedTechnicianId: availableTechnician.userId,
                ...(slaData && {
                  slaId: slaData.id,
                  slaName: slaData.name,
                  slaDueDate: slaDueDate?.toISOString(),
                  responseTime: responseTime
                })
              },
              updatedAt: philippineTime
            }
          });

          // Add history entry for auto-assignment
          await addHistory(prisma as any, {
            requestId: newRequest.id,
            action: "Auto-Assigned",
            actorName: "System",
            actorType: "system",
            details: `Automatically assigned to ${availableTechnician.displayName} (${availableTechnician.user.emp_fname} ${availableTechnician.user.emp_lname})`,
          });
          console.log('✅ Created history entry: Auto-Assigned to', availableTechnician.displayName);
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
                  const templateApprover = await prisma.users.findUnique({
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
                
                // Create auto-approved record
                if (actualApproverId) {
                  await prisma.requestApproval.create({
                    data: {
                      requestId: newRequest.id,
                      level: levelNumber,
                      name: level.displayName || `Level ${levelNumber}`,
                      approverId: actualApproverId,
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
          await addHistory(prisma as any, {
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
          
          // Create approval records for each template level
          for (let i = 0; i < templateLevels.length; i++) {
            const level = templateLevels[i];
            const levelNumber = i + 1;
            
            // Collect approver names for Level 1 history entry
            let level1ApproverNames = [];
            
            // For Level 1, include both template approvers and additional approvers from form
            if (levelNumber === 1) {
              // First, create records for template approvers
              if (level.approvers && level.approvers.length > 0) {
                for (const approver of level.approvers) {
                  console.log('Processing template approver:', approver);
                  
                  let actualApproverId = null;
                  let approverName = '';
                  
                  // Check if this is a special approver type (reporting to, department head)
                  // Handle exact string values like "reporting_to" and "department_head" from template
                  // Also handle numeric codes like -1 (reporting_to) and -2 (department_head)
                  const approverValue = String(approver.id || approver.name || approver).toLowerCase();
                  const approverNumericId = parseInt(approver.id || approver.name || approver);
                  console.log(`Checking approver value: "${approverValue}" (original:`, approver, ') | Numeric ID:', approverNumericId);
                  
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
                  } else if (approverValue === 'department_head' || 
                            approverValue.includes('department') || 
                            approverValue.includes('head') ||
                            approverValue.includes('chief') ||
                            approver.type === 'department_head' ||
                            approverNumericId === -2) {  // -2 typically represents department head
                    // Get department head through userDepartment relationship
                    if (requestUser && requestUser.userDepartment?.departmentHead) {
                      const departmentHead = requestUser.userDepartment.departmentHead;
                      actualApproverId = departmentHead.id;
                      approverName = `${departmentHead.emp_fname} ${departmentHead.emp_lname}`;
                      console.log(`✅ Using department head (code: ${approverNumericId}): ${approverName} (ID: ${actualApproverId})`);
                    } else if (requestUser && requestUser.userDepartment) {
                      console.warn(`⚠️ Department "${requestUser.userDepartment.name}" has no department head configured`);
                      continue;
                    } else {
                      console.warn('⚠️ Requester has no department configured');
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
                    const templateApprover = await prisma.users.findUnique({
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
                  
                  // Create the approval record if we have a valid approver ID
                  if (actualApproverId) {
                    // Create Philippine time by manually adjusting UTC
                    const now = new Date();
                    const philippineTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
                    
                    const createdApprover = await prisma.requestApproval.create({
                      data: {
                        requestId: newRequest.id,
                        level: levelNumber,
                        name: level.displayName || `Level ${levelNumber}`,
                        approverId: actualApproverId,
                        status: APPROVAL_STATUS.PENDING_APPROVAL,
                        createdAt: philippineTime,
                        updatedAt: philippineTime,
                      }
                    });
                    level1ApproverNames.push(approverName);
                    console.log(`Created template approver for level ${levelNumber}: ${approverName}`);
                  }
                }
              }
              
              // Then, create records for additional approvers from form
              if (Array.isArray(additionalApprovers) && additionalApprovers.length > 0) {
                for (const approverId of additionalApprovers) {
                  // Convert to number if needed
                  const numericApproverId = typeof approverId === 'string' ? parseInt(approverId) : approverId;
                  console.log(`Processing additional approver ID: ${approverId} (${typeof approverId}) -> ${numericApproverId}`);
                  
                  // Skip if the ID is invalid
                  if (isNaN(numericApproverId) || numericApproverId <= 0) {
                    console.warn(`Invalid approver ID: ${approverId}`);
                    continue;
                  }
                  
                  // Fetch user details for the additional approver
                  const additionalApprover = await prisma.users.findUnique({
                    where: { id: numericApproverId },
                    select: {
                      id: true,
                      emp_fname: true,
                      emp_lname: true,
                      emp_email: true,
                    }
                  });
                  
                  if (additionalApprover) {
                    // Create Philippine time by manually adjusting UTC
                    const now = new Date();
                    const philippineTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
                    
                    const createdAdditional = await prisma.requestApproval.create({
                      data: {
                        requestId: newRequest.id,
                        level: levelNumber,
                        name: level.displayName || `Level ${levelNumber}`,
                        approverId: additionalApprover.id,
                        status: APPROVAL_STATUS.PENDING_APPROVAL,
                        createdAt: philippineTime,
                        updatedAt: philippineTime,
                      }
                    });
                    level1ApproverNames.push(`${additionalApprover.emp_fname} ${additionalApprover.emp_lname}`);
                    console.log(`Created additional approver for level ${levelNumber}: ${additionalApprover.emp_fname} ${additionalApprover.emp_lname}`);
                  } else {
                    console.warn(`Additional approver with ID ${numericApproverId} not found in database`);
                  }
                }
              }
              
              // 📧 STANDARD HISTORY ENTRY 2: Approvals Initiated - Level 1 (Priority 2)
              if (level1ApproverNames.length > 0) {
                await addHistory(prisma as any, {
                  requestId: newRequest.id,
                  action: "Approvals Initiated",
                  actorName: "System",
                  actorType: "system",
                  details: `Approver(s) : ${level1ApproverNames.join(', ')}\nLevel : ${level.displayName || `Level ${levelNumber}`}`,
                });
                console.log('✅ Created history entry: Approvals Initiated - Level 1');
              }
            } else {
              // For other levels, only use template approvers
              if (level.approvers && level.approvers.length > 0) {
                for (const approver of level.approvers) {
                  console.log(`Processing template approver for level ${levelNumber}:`, approver);
                  
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
                            approverValue.includes('department') || 
                            approverValue.includes('head') ||
                            approverValue.includes('chief') ||
                            approver.type === 'department_head' ||
                            approverNumericId === -2) {  // -2 typically represents department head
                    // Get department head through userDepartment relationship
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
                    const templateApprover = await prisma.users.findUnique({
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
                  if (actualApproverId) {
                    // Create Philippine time by manually adjusting UTC
                    const now = new Date();
                    const philippineTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
                    
                    const createdOther = await prisma.requestApproval.create({
                      data: {
                        requestId: newRequest.id,
                        level: levelNumber,
                        name: level.displayName || `Level ${levelNumber}`,
                        approverId: actualApproverId,
                        status: APPROVAL_STATUS.PENDING_APPROVAL,
                        createdAt: philippineTime,
                        updatedAt: philippineTime,
                      }
                    });
                    console.log(`Created template approver for level ${levelNumber}: ${approverName}`);
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

    return NextResponse.json({ success: true, request: newRequest });
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

    console.log('GET /api/requests - userId:', userId, 'status:', status, 'type:', type);

    // Build where clause for filtering
    let whereClause: any = {};

    // If userId is provided and user is technician, filter by that user
    // Otherwise, filter by the logged-in user's requests
    if (userId && session.user.isTechnician) {
      whereClause.userId = parseInt(userId);
    } else if (!session.user.isTechnician) {
      whereClause.userId = parseInt(session.user.id);
    }
    // If no userId and user is technician, show all requests (no userId filter)

    if (status) {
      whereClause.status = status;
    }

    if (type) {
      whereClause.type = type;
    }

    console.log('WHERE clause:', JSON.stringify(whereClause, null, 2));

    const requests = await prisma.request.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_email: true,
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
        createdAt: 'desc'
      }
    });

    console.log(`Found ${requests.length} requests`);

    return NextResponse.json({ success: true, requests });
  } catch (error) {
    console.error('Error fetching requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch requests', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
