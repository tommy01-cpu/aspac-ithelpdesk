import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    console.log('GET /api/technician/requests called');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      console.log('No session or user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Session user:', JSON.stringify(session.user, null, 2));

    // For testing, let's first get ALL requests to see what's in the database
    const allRequests = await prisma.request.findMany({
      take: 10,
      select: {
        id: true,
        formData: true,
        status: true,
        templateId: true
      }
    });

    console.log('All requests in DB:', JSON.stringify(allRequests, null, 2));

    // Check if user is a technician
    if (!session.user.isTechnician) {
      return NextResponse.json({ error: 'Access denied - technician role required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit')) || 25;
    const page = Number(searchParams.get('page')) || 1;
    const skip = (page - 1) * limit;
    
    // Get filtering parameters
    const statusFilter = searchParams.get('status');
    const assignedTechnicianId = searchParams.get('assignedTechnicianId');
    const assignedToCurrentUser = searchParams.get('assignedToCurrentUser');
    const departmentId = searchParams.get('departmentId');
    const departmentHead = searchParams.get('departmentHead');
    const approvalFilter = searchParams.get('approvals');
    const searchTerm = searchParams.get('search');

    console.log('Filtering parameters:', {
      statusFilter,
      assignedTechnicianId,
      assignedToCurrentUser,
      departmentId,
      departmentHead,
      approvalFilter
    });

    // Get current user's technician record
    const currentTechnician = await prisma.technician.findFirst({
      where: {
        user: {
          emp_email: session.user.email
        },
        isActive: true
      },
      include: {
        user: true  // Include user data to get the user ID
      }
    });

    console.log('Current technician:', currentTechnician);

    // Get the current user ID (this is what's stored in assignedTechnicianId)
    const currentUserId = parseInt(session.user.id);

    // Build the where clause for filtering
    let whereClause: any = {};
    
    // Status filtering
    if (statusFilter) {
      if (statusFilter.includes(',')) {
        // Multiple statuses
        const statuses = statusFilter.split(',').map(s => s.trim());
        whereClause.status = { in: statuses };
      } else {
        whereClause.status = statusFilter;
      }
    }
    
    // Department filtering (for "All Requests" view)
    if (departmentId && departmentId !== 'all') {
      whereClause.user = {
        department: departmentId
      };
    } else if (departmentHead && departmentHead !== 'all') {
      // Get all departments managed by this department head
      const managedDepartments = await prisma.user.findUnique({
        where: { id: parseInt(departmentHead) },
        select: {
          departmentsManaged: {
            select: { id: true }
          }
        }
      });
      
      if (managedDepartments?.departmentsManaged?.length) {
        const deptIds = managedDepartments.departmentsManaged.map(d => d.id);
        whereClause.user = {
          department: { in: deptIds }
        };
      }
    }
    
    // Technician assignment filtering (for "Technician Assigned" view)
    else if (assignedToCurrentUser === 'true') {
      // Filter by current user's ID (not technician record ID)
      whereClause.OR = [
        {
          formData: {
            path: ['assignedTechnicianId'],
            equals: currentUserId
          }
        },
        {
          formData: {
            path: ['assignedTechnicianId'],
            equals: currentUserId.toString()
          }
        }
      ];
    } else if (assignedTechnicianId && assignedTechnicianId !== 'unassigned') {
      // Filter by specific technician ID
      const techId = parseInt(assignedTechnicianId);
      whereClause.OR = [
        {
          formData: {
            path: ['assignedTechnicianId'],
            equals: techId
          }
        },
        {
          formData: {
            path: ['assignedTechnicianId'],
            equals: techId.toString()
          }
        }
      ];
    } else if (assignedTechnicianId === 'unassigned') {
      // Filter for unassigned requests
      whereClause.OR = [
        {
          formData: {
            path: ['assignedTechnicianId'],
            equals: null
          }
        },
        {
          NOT: {
            formData: {
              path: ['assignedTechnicianId'],
              not: null
            }
          }
        }
      ];
    }

    // Add search functionality
    if (searchTerm) {
      const searchConditions = [
        {
          formData: {
            path: ['8'], // Subject field
            string_contains: searchTerm,
            mode: 'insensitive'
          }
        },
        {
          formData: {
            path: ['1'], // Requester name field
            string_contains: searchTerm,
            mode: 'insensitive'
          }
        },
        {
          id: isNaN(parseInt(searchTerm)) ? -1 : parseInt(searchTerm) // Search by ID if numeric
        }
      ];

      // Combine existing where clause with search conditions
      if (Object.keys(whereClause).length > 0) {
        whereClause = {
          AND: [
            whereClause,
            {
              OR: searchConditions
            }
          ]
        };
      } else {
        whereClause = {
          OR: searchConditions
        };
      }
    }

    console.log('Where clause:', JSON.stringify(whereClause, null, 2));

    // Get requests with all data for front-end filtering
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
            emp_code: true,
            post_des: true
          }
        },
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
      take: 100, // Get more records for front-end filtering
    });

    // Enhance requests with template information
    const enhancedRequests = await Promise.all(
      requests.map(async (request) => {
        let templateName = 'Unknown Template';
        let templateType = 'SERVICE';
        
        try {
          // Get template information - templateId is string, need to convert or find by string
          const template = await prisma.template.findFirst({
            where: { 
              OR: [
                { id: parseInt(request.templateId) || 0 },
                { name: { contains: request.templateId } }
              ]
            },
            select: {
              name: true,
              type: true,
              category: {
                select: {
                  name: true
                }
              }
            }
          });
          
          if (template) {
            templateName = template.name;
            templateType = template.type;
          }
        } catch (templateError) {
          console.warn('Error fetching template for request', request.id, ':', templateError);
        }

        // Extract requester information
        const requestWithUser = request as typeof request & { 
          user?: { 
            emp_fname?: string; 
            emp_lname?: string; 
            emp_email?: string; 
          } 
        };
        
        const formDataObj = request.formData as Record<string, any> || {};
        
        const requesterName = requestWithUser.user ? 
          `${requestWithUser.user.emp_fname || ''} ${requestWithUser.user.emp_lname || ''}`.trim() : 
          (formDataObj.requesterName || 'Unknown');
        
        const requesterEmail = requestWithUser.user?.emp_email || formDataObj.requesterEmail || '';
        
        // Extract assigned technician information from formData
        const assignedTechnicianName = formDataObj.assignedTechnicianName || session.user.name || 'You';
        const assignedTechnicianEmail = formDataObj.assignedTechnicianEmail || session.user.email || '';

        // Calculate or extract due date
        const dueBy = formDataObj.dueBy || formDataObj.slaDueDate || null;

        return {
          ...request,
          templateName,
          templateType,
          type: templateType.toLowerCase(),
          categoryName: request.templateId ? 'Service Request' : 'Incident',
          formData: request.formData || {},
          requesterName,
          requesterEmail,
          assignedTechnicianName,
          assignedTechnicianEmail,
          dueBy
        };
      })
    );

    // Get total count for pagination based on the same where clause
    const totalCount = await prisma.request.count({
      where: whereClause
    });

    console.log(`Found ${enhancedRequests.length} requests assigned to technician`);

    return NextResponse.json({
      success: true,
      requests: enhancedRequests,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching technician requests:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch requests',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
