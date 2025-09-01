import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`🔍 API: Fetching request ID ${params.id}`);
    
    // Define timestamp formatting function at the top
    const formatStoredPhilippineTime = (date: Date | null) => {
      if (!date) return null;
      // Since we store Philippine time directly in the database,
      // format it manually without timezone conversion
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      const hours = String(date.getUTCHours()).padStart(2, '0');
      const minutes = String(date.getUTCMinutes()).padStart(2, '0');
      const seconds = String(date.getUTCSeconds()).padStart(2, '0');
      const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');
      
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
    };
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.log('❌ API: No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log(`✅ API: Session found for user ${session.user.id}`);
    
    const requestId = parseInt(params.id);
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
    }

    // Check if user can access this request (either as owner, approver, admin, technician, or department head)
    const userId = parseInt(session.user.id);
    const userRoles = session.user.roles || [];
    
    // Check if user is admin or technician
    const isAdmin = userRoles.includes('admin') || session.user.isAdmin;
    const isTechnician = session.user.isTechnician || false;
    
    // Check if user is a department head
    const departmentHeadCheck = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        departmentsManaged: {
          select: { id: true }
        }
      }
    });
    const isDepartmentHead = departmentHeadCheck?.departmentsManaged && departmentHeadCheck.departmentsManaged.length > 0;
    const managedDepartmentIds = departmentHeadCheck?.departmentsManaged?.map((d: any) => d.id) || [];
    
    console.log('🔍 API: User access check:', {
      userId,
      userRoles,
      isAdmin,
      isTechnician,
      isDepartmentHead,
      managedDepartmentIds,
      sessionIsTechnician: session.user.isTechnician,
      sessionIsAdmin: session.user.isAdmin
    });
    
    // First check if user is an approver for this request
    const approverCheck = await prisma.requestApproval.findFirst({
      where: {
        requestId: requestId,
        approverId: userId
      }
    });

    // Build access control for the request query
    let requestWhereClause: any = {
      id: requestId
    };

    // If user is not admin or technician, restrict access to own requests, approval requests, or department requests
    if (!isAdmin && !isTechnician) {
      console.log('📋 API: Restricting access - user is not admin or technician');
      const accessConditions: any[] = [
        { userId: userId }, // User's own request
        { 
          approvals: { 
            some: { approverId: userId } // User is an approver
          }
        }
      ];
      
      // Add department head access - can view requests from users in their managed departments
      if (isDepartmentHead && managedDepartmentIds.length > 0) {
        console.log('✅ API: Adding department head access for departments:', managedDepartmentIds);
        accessConditions.push({
          user: {
            userDepartment: {
              id: {
                in: managedDepartmentIds
              }
            }
          }
        });
      }
      
      requestWhereClause.OR = accessConditions;
    } else {
      console.log('✅ API: Full access granted - user is admin or technician');
    }
    // If user is admin or technician, they can view any request (no additional restrictions)

    // Fetch the request with comprehensive details
    const requestData = await prisma.request.findFirst({
      where: requestWhereClause,
      include: {
        user: {
          select: {
            id: true,
            emp_email: true,
            emp_fname: true,
            emp_lname: true,
            emp_mid: true,
            emp_suffix: true,
            emp_code: true,
            post_des: true,
            emp_cell: true,
            landline_no: true,
            local_no: true,
            department: true,
            emp_status: true,
            profile_image: true,
            reportingToId: true,
            departmentHeadId: true,
            isServiceApprover: true,
            isTechnician: true,
            reportingTo: {
              select: {
                id: true,
                emp_fname: true,
                emp_lname: true,
                emp_email: true,
                post_des: true,
              }
            },
            departmentHead: {
              select: {
                id: true,
                emp_fname: true,
                emp_lname: true,
                emp_email: true,
                post_des: true,
              }
            }
          }
        }
      }
    });

    console.log('🔍 API: Request query clause:', JSON.stringify(requestWhereClause, null, 2));

    if (!requestData) {
      console.log('❌ API: Request not found with access restrictions');
      console.log('🔍 API: Checking if request exists at all...');
      
      // Check if request exists at all (without access restrictions)
      const requestExists = await prisma.request.findFirst({
        where: { id: requestId },
        select: { id: true, userId: true }
      });
      
      if (requestExists) {
        console.log(`📋 API: Request ${requestId} exists but user ${userId} doesn't have access`);
        console.log(`👤 API: Request owner: ${requestExists.userId}, Current user: ${userId}`);
        return NextResponse.json({ error: 'Access denied to this request' }, { status: 403 });
      } else {
        console.log(`📋 API: Request ${requestId} does not exist`);
        return NextResponse.json({ error: 'Request not found' }, { status: 404 });
      }
    }

    console.log('🕒 Request timestamps:', {
      createdAt: requestData.createdAt,
      updatedAt: requestData.updatedAt,
      createdAtType: typeof requestData.createdAt,
      updatedAtType: typeof requestData.updatedAt
    });

    // Fetch template details if available
    let templateDetails = null;
    try {
      if (requestData.templateId) {
        templateDetails = await prisma.template.findFirst({
          where: {
            id: parseInt(requestData.templateId)
          },
          include: {
            category: {
              select: {
                id: true,
                name: true,
                description: true,
                icon: true,
              }
            },
            slaService: {
              select: {
                id: true,
                name: true,
                priority: true,
                responseTime: true,
                resolutionDays: true,
                resolutionHours: true,
                resolutionMinutes: true,
                escalationTime: true,
                operationalHours: true,
                autoEscalate: true,
              }
            },
            supportGroups: {
              include: {
                supportGroup: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                  }
                }
              }
            }
          }
        });
      }
    } catch (error) {
      console.error('Error fetching template details:', error);
      // Don't fail the request if template details can't be fetched
    }

    // Fetch attachments from the attachments database
    let attachments: Array<{
      id: string;
      fileName: string;
      originalName: string;
      mimeType: string;
      size: number;
      uploadedAt: Date;
    }> = [];
    try {
      // Import prismaAttachments only when needed to avoid unnecessary client instantiation
      const { prismaAttachments } = require('@/lib/prisma-attachments');
      attachments = await prismaAttachments.attachment.findMany({
        where: {
          requestId: String(requestId), // Convert to string
          type: 'request', // Only fetch request attachments for Details tab
        },
        select: {
          id: true,
          fileName: true,
          originalName: true,
          mimeType: true,
          size: true,
          uploadedAt: true,
        }
      });
    } catch (error) {
      console.error('Error fetching attachments:', error);
      // Don't fail the request if attachments can't be fetched
    }

    // Fetch request approvals from database
    const approvals = await prisma.requestApproval.findMany({
      where: {
        requestId: requestId,
      },
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
      orderBy: {
        level: 'asc'
      }
    });

    // Fetch request history from database
    const history = await prisma.requestHistory.findMany({
      where: {
        requestId: requestId,
      },
      include: {
        actor: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_email: true,
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    console.log(`📊 API: Found ${approvals.length} approvals and ${history.length} history entries for request ${requestId}`);
    
    // Format approvals for frontend (include approverId for client-side filtering)
    const formattedApprovals = approvals.map((approval: any) => ({
      id: approval.id.toString(),
      level: approval.level,
      name: approval.name,
      status: approval.status,
      approverId: approval.approverId, // <- important for filtering existing approvers in UI
      approver: approval.approverName || (approval.approver ? 
        `${approval.approver.emp_fname} ${approval.approver.emp_lname}` : 'Unknown'),
      approverEmail: approval.approverEmail || approval.approver?.emp_email,
      sentOn: approval.sentOn ? formatStoredPhilippineTime(approval.sentOn) : null,
      actedOn: approval.actedOn ? formatStoredPhilippineTime(approval.actedOn) : null,
      comments: approval.comments,
    }));

    // Format history for frontend with current user info lookup
    const formattedHistory = await Promise.all(history.map(async (entry: any) => {
      let currentActorName = entry.actorName || 'System';
      
      // If entry has actorId and is not a system action, get current user info
      if (entry.actorId && entry.actorType !== 'system') {
        try {
          const currentUser = await prisma.users.findUnique({
            where: { id: entry.actorId },
            select: { 
              emp_fname: true, 
              emp_lname: true,
              emp_email: true 
            }
          });
          
          if (currentUser) {
            currentActorName = `${currentUser.emp_fname} ${currentUser.emp_lname}`;
          }
        } catch (error) {
          console.error('Error fetching current user info for history:', error);
          // Fallback to stored actorName
        }
      }
      
      return {
        id: entry.id.toString(),
        action: entry.action,
        details: entry.details || '',
        timestamp: formatStoredPhilippineTime(entry.timestamp),
        actor: currentActorName,
        actorName: currentActorName, // For consistency
        actorType: entry.actorType,
        actorId: entry.actorId,
      };
    }));

    // Extract conversations from formData
    const formData = requestData.formData as any;
    const conversations = formData?.conversations || [];

    const formattedRequestData = {
      ...requestData,
      createdAt: formatStoredPhilippineTime(requestData.createdAt),
      updatedAt: formatStoredPhilippineTime(requestData.updatedAt),
    };

    console.log('🎯 Formatted timestamps:', {
      originalCreatedAt: requestData.createdAt,
      originalUpdatedAt: requestData.updatedAt,
      formattedCreatedAt: formattedRequestData.createdAt,
      formattedUpdatedAt: formattedRequestData.updatedAt
    });

    return NextResponse.json({
      success: true,
      request: formattedRequestData,
      attachments: attachments,
      template: templateDetails,
      conversations: conversations,
      approvals: formattedApprovals,
      history: formattedHistory,
    });

  } catch (error) {
    console.error('Error fetching request:', error);
    return NextResponse.json({ error: 'Failed to fetch request' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestId = parseInt(params.id);
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
    }

    const body = await request.json();
    const { status, formData } = body;

    // Check if user owns the request
    const existingRequest = await prisma.request.findFirst({
      where: {
        id: requestId,
        userId: parseInt(session.user.id),
      }
    });

    if (!existingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Update the request
    // Create Philippine time by manually adjusting UTC
    const now = new Date();
    const philippineTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    
    const updatedRequest = await prisma.request.update({
      where: { id: requestId },
      data: {
        ...(status && { status }),
        ...(formData && { formData }),
        updatedAt: philippineTime,
      },
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

    return NextResponse.json({
      success: true,
      request: updatedRequest,
    });

  } catch (error) {
    console.error('Error updating request:', error);
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}
