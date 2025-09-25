import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { Prisma } from '@prisma/client';

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
    const statusFilter = searchParams.get('status') || searchParams.get('filter');
    const assignedTechnicianId = searchParams.get('assignedTechnicianId');
    const assignedToCurrentUser = searchParams.get('assignedToCurrentUser');
    const departmentId = searchParams.get('departmentId');
    const departmentHead = searchParams.get('departmentHead');
    const approvalFilter = searchParams.get('approvals');
    const searchTerm = searchParams.get('search');

    console.log('🔍 DEBUG: Filtering parameters:', {
      statusFilter,
      assignedTechnicianId,
      assignedToCurrentUser,
      departmentId,
      departmentHead,
      approvalFilter,
      searchTerm
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

    // Build the where clause for filtering - use conditions array like dashboard
    const conditions: any[] = [];
    
    // Status filtering
    if (statusFilter) {
      if (statusFilter === 'overdue') {
        // Handle overdue requests - use exact same logic as dashboard
        conditions.push({
          status: {
            in: ['open', 'on_hold'] // Only consider active statuses as potentially overdue
          }
        });
        
        conditions.push({
          // Check for overdue based on SLA due date - same as dashboard
          formData: {
            path: ['slaDueDate'],
            lt: new Date().toISOString()
          }
        });
      } else if (statusFilter.includes(',')) {
        // Multiple statuses
        const statuses = statusFilter.split(',').map(s => s.trim()).filter(s => s !== 'overdue');
        if (statuses.length > 0) {
          conditions.push({ status: { in: statuses } });
        }
      } else {
        conditions.push({ status: statusFilter });
      }
    }
    
    // Technician assignment filtering - use same logic as dashboard
    if (assignedToCurrentUser === 'true') {
      // Filter by current user's ID
      conditions.push({
        OR: [
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
        ]
      });
    } else if (assignedTechnicianId && assignedTechnicianId !== 'unassigned') {
      // Filter by specific technician - use same logic as dashboard
      const techId = parseInt(assignedTechnicianId);
      
      // Get technician name for the OR condition
      const technician = await prisma.technician.findFirst({
        where: { userId: techId, isActive: true },
        include: { user: true }
      });
      
      const techName = technician ? 
        (technician.displayName || `${technician.user.emp_fname} ${technician.user.emp_lname}`.trim()) : 
        '';
      
      conditions.push({
        OR: [
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
          },
          ...(techName ? [{
            formData: {
              path: ['assignedTechnician'],
              equals: techName
            }
          }] : [])
        ]
      });
    } else if (assignedTechnicianId === 'unassigned') {
      // Filter for unassigned requests
      conditions.push({
        OR: [
          {
            formData: {
              path: ['assignedTechnicianId'],
              equals: null
            }
          },
          {
            formData: {
              path: ['assignedTechnician'],
              equals: null
            }
          },
          {
            NOT: {
              formData: {
                path: ['assignedTechnicianId'],
                not: Prisma.JsonNull
              }
            }
          }
        ]
      });
    }
    
    // Department filtering (for "All Requests" view)
    if (departmentId && departmentId !== 'all') {
      conditions.push({
        user: {
          department: departmentId
        }
      });
    } else if (departmentHead && departmentHead !== 'all') {
      // Get all departments managed by this department head
      const managedDepartments = await prisma.users.findUnique({
        where: { id: parseInt(departmentHead) },
        select: {
          departmentsManaged: {
            select: { id: true }
          }
        }
      });
      
      if (managedDepartments?.departmentsManaged?.length) {
        const deptIds = managedDepartments.departmentsManaged.map(d => d.id);
        conditions.push({
          user: {
            department: { in: deptIds }
          }
        });
      }
    }
    
    // Combine all conditions using AND
    let whereClause: any = {};
    if (conditions.length > 0) {
      whereClause.AND = conditions;
    }

    console.log('🔍 DEBUG: Final whereClause:', JSON.stringify(whereClause, null, 2));
    console.log('🔍 DEBUG: Conditions array:', JSON.stringify(conditions, null, 2));

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

    console.log('🔍 DEBUG: About to execute query...');

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

    console.log('🔍 DEBUG: Raw requests found:', requests.length);
    console.log('🔍 DEBUG: First request (if any):', requests[0] ? {
      id: requests[0].id,
      status: requests[0].status,
      assignedTechId: (requests[0].formData as any)?.assignedTechnicianId,
      slaDueDate: (requests[0].formData as any)?.slaDueDate
    } : 'No requests');

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
