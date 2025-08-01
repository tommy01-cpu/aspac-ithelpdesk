import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { getDatabaseTimestamp } from '@/lib/server-time-utils';

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
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip,
    });

    // Enhance requests with service/template status information
    const enhancedRequests = await Promise.all(
      requests.map(async (request) => {
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
    const { templateId, templateName, type, formData, attachments } = data;

    console.log('Creating request with data:', { templateId, templateName, type, formData });

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
      where: { id: parseInt(session.user.id) },
      select: {
        id: true,
        emp_fname: true,
        emp_lname: true,
        emp_email: true,
        department: true,
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

    // Create the request in the database
    const newRequest = await prisma.request.create({
      data: {
        templateId: String(templateId),
        templateName,
        type,
        status: requestStatus,
        priority: requestPriority,
        userId: parseInt(session.user.id),
        formData: formData,
        attachments: attachments || [],
      },
    });

    console.log('Request created with ID:', newRequest.id);

    // 📝 STANDARD HISTORY ENTRY 1: Request Created (Priority 1)
    if (requestUser) {
      await prisma.requestHistory.create({
        data: {
          requestId: newRequest.id,
          action: "Created",
          actorName: `${requestUser.emp_fname} ${requestUser.emp_lname}`,
          actorType: "user",
          details: `${requestUser.emp_fname} ${requestUser.emp_lname}`,
          actorId: requestUser.id,
          timestamp: new Date()
        }
      });
      console.log('✅ Created history entry: Request Created');
    }

    // Create approval workflow based on template configuration
    if (template.approvalWorkflow && requestUser) {
      const approvalConfig = template.approvalWorkflow as any;
      console.log('Creating approval workflow for request:', newRequest.id);
      
      // Check if template has approval levels configured
      if (approvalConfig.levels && Array.isArray(approvalConfig.levels)) {
        const templateLevels = approvalConfig.levels;
        
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
                await prisma.requestApproval.create({
                  data: {
                    requestId: newRequest.id,
                    level: levelNumber,
                    name: level.displayName || `Level ${levelNumber}`,
                    approverId: approver.id,
                    status: APPROVAL_STATUS.PENDING_APPROVAL,
                    createdAt: new Date(),
                  }
                });
                level1ApproverNames.push(approver.name);
                console.log(`Created template approver for level ${levelNumber}: ${approver.name}`);
              }
            }
            
            // Then, create records for additional approvers from form
            if (Array.isArray(additionalApprovers) && additionalApprovers.length > 0) {
              for (const approverId of additionalApprovers) {
                // Convert to number if needed
                const numericApproverId = typeof approverId === 'string' ? parseInt(approverId) : approverId;
                console.log(`Processing additional approver ID: ${approverId} (${typeof approverId}) -> ${numericApproverId}`);
                
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
                  await prisma.requestApproval.create({
                    data: {
                      requestId: newRequest.id,
                      level: levelNumber,
                      name: level.displayName || `Level ${levelNumber}`,
                      approverId: additionalApprover.id,
                      status: APPROVAL_STATUS.PENDING_APPROVAL,
                      createdAt: new Date(),
                    }
                  });
                  level1ApproverNames.push(`${additionalApprover.emp_fname} ${additionalApprover.emp_lname}`);
                  console.log(`Created additional approver for level ${levelNumber}: ${additionalApprover.emp_fname} ${additionalApprover.emp_lname}`);
                }
              }
            }
            
            // 📧 STANDARD HISTORY ENTRY 2: Approvals Initiated - Level 1 (Priority 2)
            if (level1ApproverNames.length > 0) {
              await prisma.requestHistory.create({
                data: {
                  requestId: newRequest.id,
                  action: "Approvals Initiated",
                  actorName: "System",
                  actorType: "system",
                  details: `Approver(s) : ${level1ApproverNames.join(', ')}\nLevel : ${level.displayName || `Level ${levelNumber}`}`,
                  timestamp: new Date()
                }
              });
              console.log('✅ Created history entry: Approvals Initiated - Level 1');
            }
          } else {
            // For other levels, only use template approvers
            if (level.approvers && level.approvers.length > 0) {
              for (const approver of level.approvers) {
                await prisma.requestApproval.create({
                  data: {
                    requestId: newRequest.id,
                    level: levelNumber,
                    name: level.displayName || `Level ${levelNumber}`,
                    approverId: approver.id,
                    status: APPROVAL_STATUS.PENDING_APPROVAL,
                    createdAt: new Date(),
                  }
                });
                console.log(`Created template approver for level ${levelNumber}: ${approver.name}`);
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
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
  }
}
