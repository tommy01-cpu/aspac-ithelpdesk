import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { prismaAttachments } from '@/lib/prisma-attachments';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`🔍 API: Fetching request ID ${params.id}`);
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

    // Check if user can access this request (either as owner or approver)
    const userId = parseInt(session.user.id);
    
    // First check if user is an approver for this request
    const approverCheck = await prisma.requestApproval.findFirst({
      where: {
        requestId: requestId,
        approverId: userId
      }
    });

    // Fetch the request with comprehensive details
    const requestData = await prisma.request.findFirst({
      where: {
        id: requestId,
        OR: [
          { userId: userId }, // User's own request
          { 
            approvals: { 
              some: { approverId: userId } // User is an approver
            } 
          }
        ]
      },
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

    if (!requestData) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

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
                resolutionTime: true,
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
      attachments = await prismaAttachments.attachment.findMany({
        where: {
          requestId: String(requestId), // Convert to string
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
    
    // Format approvals for frontend
    const formattedApprovals = approvals.map(approval => ({
      id: approval.id.toString(),
      level: approval.level,
      name: approval.name,
      status: approval.status,
      approver: approval.approverName || (approval.approver ? 
        `${approval.approver.emp_fname} ${approval.approver.emp_lname}` : 'Unknown'),
      approverEmail: approval.approverEmail || approval.approver?.emp_email,
      sentOn: approval.sentOn?.toISOString(),
      actedOn: approval.actedOn?.toISOString(),
      comments: approval.comments,
    }));

    // Format history for frontend with current user info lookup
    const formattedHistory = await Promise.all(history.map(async (entry) => {
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
        timestamp: entry.timestamp.toISOString(),
        actor: currentActorName,
        actorName: currentActorName, // For consistency
        actorType: entry.actorType,
        actorId: entry.actorId,
      };
    }));

    // Extract conversations from formData
    const formData = requestData.formData as any;
    const conversations = formData?.conversations || [];

    return NextResponse.json({
      success: true,
      request: requestData,
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
    const { status, priority, formData } = body;

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
    const updatedRequest = await prisma.request.update({
      where: { id: requestId },
      data: {
        ...(status && { status }),
        ...(priority && { priority }),
        ...(formData && { formData }),
        updatedAt: new Date(),
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
