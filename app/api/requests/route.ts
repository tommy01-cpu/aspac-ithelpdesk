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
  APPROVED: 'approved'
} as const;

export async function GET(request: Request) {
  try {
    console.log('GET /api/requests called');
    
    const session = await getServerSession(authOptions);
    console.log('Session:', session ? 'exists' : 'null');
    
    if (!session?.user) {
      console.log('No session or user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Session user:', session.user);

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit')) || 10;
    const page = Number(searchParams.get('page')) || 1;
    const skip = (page - 1) * limit;

    console.log('Fetching requests for user ID:', session.user.id);

    // Check if user exists in database
    try {
      const userExists = await prisma.users.findUnique({
        where: { id: parseInt(session.user.id) }
      });
      console.log('User exists in database:', userExists ? 'yes' : 'no');
    } catch (userError) {
      console.error('Error checking user:', userError);
    }

    const requests = await prisma.request.findMany({
      where: {
        userId: parseInt(session.user.id),
      },
      include: {
        approvals: {
          orderBy: {
            level: 'asc'
          },
          select: {
            id: true,
            level: true,
            name: true,
            status: true,
            approverId: true,
            approverName: true,
            approverEmail: true,
            sentOn: true,
            actedOn: true,
            comments: true,
            isAutoApproval: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip,
    });

    // Enhance requests with template information and resolve technician/requester details
    const enhancedRequestsWithTemplates = await Promise.all(
      requests.map(async (request) => {
        let templateDetails = null;
        let assignedTechnician = null;
        let requesterDetails = null;
        
        try {
          // Fetch template details for tooltip
          const template = await prisma.template.findUnique({
            where: { id: parseInt(request.templateId) },
            select: {
              id: true,
              name: true,
              description: true,
              fields: true
            }
          });
          
          if (template) {
            templateDetails = template;
          }
          
          const formData = request.formData as any;
          
          // Resolve assigned technician from assignedTechnicianId only (ignore field 7 as it's requester ID)
          let technicianUserId = null;
          if (formData?.assignedTechnicianId) {
            technicianUserId = parseInt(formData.assignedTechnicianId);
          }
          // Note: We don't use field 7 as it contains the requester ID, not technician ID
          
          if (technicianUserId && !isNaN(technicianUserId)) {
            const technician = await prisma.technician.findFirst({
              where: { userId: technicianUserId },
              include: {
                user: {
                  select: {
                    id: true,
                    emp_fname: true,
                    emp_lname: true,
                    emp_email: true,
                    department: true
                  }
                }
              }
            });
            
            if (technician) {
              assignedTechnician = {
                id: technician.id,
                userId: technician.userId,
                displayName: technician.displayName,
                fullName: `${technician.user.emp_fname} ${technician.user.emp_lname}`,
                email: technician.user.emp_email,
                department: technician.user.department
              };
            }
          }
          
          // Get requester details from the user who created the request
          const requesterUser = await prisma.users.findUnique({
            where: { id: request.userId },
            select: {
              id: true,
              emp_fname: true,
              emp_lname: true,
              emp_email: true,
              department: true,
              emp_code: true
            }
          });
          
          if (requesterUser) {
            requesterDetails = {
              id: requesterUser.id,
              fullName: `${requesterUser.emp_fname} ${requesterUser.emp_lname}`,
              email: requesterUser.emp_email,
              department: requesterUser.department,
              employeeCode: requesterUser.emp_code
            };
          }
          
        } catch (error) {
          console.error('Error fetching details for request', request.id, error);
        }
        
        return {
          ...request,
          template: templateDetails,
          assignedTechnician,
          requesterDetails
        };
      })
    );

    // Enhance requests with service/template status information
    const enhancedRequests = await Promise.all(
      enhancedRequestsWithTemplates.map(async (request) => {
        let serviceStatus = 'active';
        let templateExists = false;
        
        try {
          // Check if template still exists
          const template = await prisma.template.findUnique({
            where: { id: parseInt(request.templateId) },
            include: {
              serviceCatalogItems: true,
              incidentCatalogItems: true
            }
          });
          
          templateExists = !!template;
          
          // If template exists, check if associated service catalog item is still active
          if (template && template.serviceCatalogItems.length > 0) {
            const serviceCatalogItem = template.serviceCatalogItems[0];
            serviceStatus = serviceCatalogItem.isActive ? 'active' : 'inactive';
          } else if (template && template.incidentCatalogItems.length > 0) {
            const incidentCatalogItem = template.incidentCatalogItems[0];
            serviceStatus = incidentCatalogItem.isActive ? 'active' : 'inactive';
          } else if (!template) {
            serviceStatus = 'deleted';
          }
        } catch (error) {
          console.error('Error checking template status for request', request.id, error);
          serviceStatus = 'unknown';
        }
        
        return {
          ...request,
          serviceStatus,
          templateExists
        };
      })
    );

    const total = await prisma.request.count({
      where: {
        userId: parseInt(session.user.id),
      },
    });

    console.log('Found requests:', requests.length);

    return NextResponse.json({
      requests: enhancedRequests,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        current: page,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/requests:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : 'No stack trace';
    console.error('Error details:', errorMessage);
    console.error('Error stack:', errorStack);
    return NextResponse.json({ 
      error: 'Failed to fetch requests',
      details: errorMessage 
    }, { status: 500 });
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

    // Get the proper status and priority from formData, with proper defaults
    // Priority should default to 'low' (not 'medium') and status should default to 'for_approval' (not 'open')
    const requestStatus = formData.status || REQUEST_STATUS.FOR_APPROVAL;
    const requestPriority = formData.priority || 'low';
    
    console.log('Using status:', requestStatus, 'and priority:', requestPriority);

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
    
    const newRequest = await prisma.request.create({
      data: {
        templateId: String(templateId),
        templateName,
        type,
        status: requestStatus,
        priority: requestPriority,
        userId: actualUserId, // Use the determined user ID
        formData: formData,
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

    // Create approval workflow based on template configuration
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
