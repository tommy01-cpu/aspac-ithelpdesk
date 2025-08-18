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
        templateName: true
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

    console.log('Fetching requests assigned to technician ID:', session.user.id);
    console.log('Fetching requests assigned to technician Email:', session.user.email);

    // For now, let's just return ALL requests to test the UI
    const requests = await prisma.request.findMany({
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
      take: limit,
      skip,
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

    // Get total count for pagination
    const totalCount = await prisma.request.count({
      where: {
        OR: [
          {
            formData: {
              path: ['assignedTechnicianId'],
              equals: session.user.id.toString()
            }
          },
          {
            formData: {
              path: ['assignedTechnicianId'],
              equals: session.user.id
            }
          },
          ...(session.user.email ? [{
            formData: {
              path: ['assignedTechnicianEmail'],
              equals: session.user.email
            }
          }] : []),
          // Also check if the technician name matches
          ...(session.user.name ? [{
            formData: {
              path: ['assignedTechnician'],
              string_contains: session.user.name
            }
          }] : [])
        ]
      }
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
