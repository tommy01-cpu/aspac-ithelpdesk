import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    console.log('GET /api/technician-requests called');
    console.log('Session:', session ? 'exists' : 'none');

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionUser = session.user as any;
    console.log('Session user:', sessionUser);

    // Check if user is a technician
    if (!sessionUser.isTechnician) {
      return NextResponse.json({ error: 'Access denied. Only technicians can view all requests.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    console.log(`Fetching all requests for technician - Page: ${page}, Limit: ${limit}`);

    // Get total count for pagination
    const totalRequests = await prisma.request.count();

    // Fetch all requests (no user filter for technicians)
    const requests = await prisma.request.findMany({
      include: {
        user: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_email: true,
            department: true,
          },
        },
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                emp_fname: true,
                emp_lname: true,
                emp_email: true,
              },
            },
          },
          orderBy: { level: 'asc' },
        },
        history: {
          include: {
            actor: {
              select: {
                id: true,
                emp_fname: true,
                emp_lname: true,
              },
            },
          },
          orderBy: { timestamp: 'desc' },
        },
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
          
          // Resolve assigned technician ONLY from assignedTechnicianId (ignore field 7 as it's the requester)
          let technicianUserId = null;
          if (formData?.assignedTechnicianId) {
            technicianUserId = parseInt(formData.assignedTechnicianId);
          }
          
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
          
          if (template) {
            templateExists = true;
            
            // Check if service catalog items are active
            const activeServiceItems = template.serviceCatalogItems?.filter(item => item.isActive);
            const activeIncidentItems = template.incidentCatalogItems?.filter(item => item.isActive);
            
            if (activeServiceItems?.length === 0 && activeIncidentItems?.length === 0) {
              serviceStatus = 'inactive';
            }
          } else {
            templateExists = false;
            serviceStatus = 'deleted';
          }
        } catch (error) {
          console.error(`Error checking template status for request ${request.id}:`, error);
          serviceStatus = 'unknown';
        }

        return {
          ...request,
          serviceStatus,
          templateExists
        };
      })
    );

    console.log('Found requests:', enhancedRequests.length);

    return NextResponse.json({
      requests: enhancedRequests,
      pagination: {
        total: totalRequests,
        pages: Math.ceil(totalRequests / limit),
        current: page,
      },
    });
  } catch (error) {
    console.error('Error fetching technician requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
