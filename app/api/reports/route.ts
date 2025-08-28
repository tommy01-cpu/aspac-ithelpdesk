import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Debug: Log received filters
    console.log('Reports API - Received filters:', {
      requestType: searchParams.get('requestType'),
      requestStatus: searchParams.get('requestStatus'),
      approvalStatus: searchParams.get('approvalStatus'),
      mode: searchParams.get('mode'),
      requesterId: searchParams.get('requesterId'),
      departmentId: searchParams.get('departmentId'),
      priority: searchParams.get('priority'),
      serviceCategoryId: searchParams.get('serviceCategoryId'),
      templateId: searchParams.get('templateId'),
      searchRequestId: searchParams.get('searchRequestId'),
      searchSubject: searchParams.get('searchSubject')
    });
    
    // Get filters from search params
    const requestType = searchParams.get('requestType');
    const requestStatus = searchParams.get('requestStatus');
    const approvalStatus = searchParams.get('approvalStatus');
    const mode = searchParams.get('mode');
    const requesterId = searchParams.get('requesterId');
    const departmentId = searchParams.get('departmentId');
    const createdTimeFrom = searchParams.get('createdTimeFrom');
    const createdTimeTo = searchParams.get('createdTimeTo');
    const dueByTimeFrom = searchParams.get('dueByTimeFrom');
    const dueByTimeTo = searchParams.get('dueByTimeTo');
    const resolvedTimeFrom = searchParams.get('resolvedTimeFrom');
    const resolvedTimeTo = searchParams.get('resolvedTimeTo');
    const priority = searchParams.get('priority');
    const technicianId = searchParams.get('technicianId');
    const serviceCategoryId = searchParams.get('serviceCategoryId');
    const templateId = searchParams.get('templateId');
    
    // Basic search parameters
    const searchRequestId = searchParams.get('searchRequestId');
    const searchSubject = searchParams.get('searchSubject');
    const searchRequester = searchParams.get('searchRequester');
    const searchDepartment = searchParams.get('searchDepartment');
    const searchTemplate = searchParams.get('searchTemplate');
    const searchDescription = searchParams.get('searchDescription');
    const searchComments = searchParams.get('searchComments');
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Apply filters
    if (requestStatus) {
      where.status = requestStatus;
    }

    if (requesterId) {
      where.userId = parseInt(requesterId);
    }

    if (templateId) {
      where.templateId = templateId;
    }

    // Basic search filters - Comprehensive search across all fields
    if (searchRequestId || searchSubject || searchRequester || searchDepartment || searchTemplate || searchDescription || searchComments) {
      const searchConditions = [];
      
      if (searchRequestId) {
        // Search by request ID (exact match or contains)
        if (!isNaN(parseInt(searchRequestId))) {
          searchConditions.push({ id: parseInt(searchRequestId) });
        }
        // Also search for ID as string in formData
        searchConditions.push({
          formData: {
            path: ['requestId'],
            string_contains: searchRequestId
          }
        });
      }

      if (searchSubject) {
        // Search in formData JSON field using field numbers
        searchConditions.push(
          {
            formData: {
              path: ['8'],
              string_contains: searchSubject
            }
          },
          {
            formData: {
              path: ['9'],
              string_contains: searchSubject
            }
          },
          {
            formData: {
              path: ['subject'],
              string_contains: searchSubject
            }
          },
          {
            formData: {
              path: ['title'],
              string_contains: searchSubject
            }
          },
          {
            formData: {
              path: ['requestSubject'],
              string_contains: searchSubject
            }
          },
          {
            formData: {
              path: ['description'],
              string_contains: searchSubject
            }
          },
          {
            formData: {
              path: ['details'],
              string_contains: searchSubject
            }
          }
        );
      }

      // Search in requester fields
      if (searchRequester) {
        searchConditions.push({
          user: {
            OR: [
              {
                emp_fname: {
                  contains: searchRequester,
                  mode: 'insensitive'
                }
              },
              {
                emp_lname: {
                  contains: searchRequester,
                  mode: 'insensitive'
                }
              },
              {
                emp_code: {
                  contains: searchRequester,
                  mode: 'insensitive'
                }
              },
              {
                emp_email: {
                  contains: searchRequester,
                  mode: 'insensitive'
                }
              }
            ]
          }
        });
      }

      // Search in department
      if (searchDepartment) {
        searchConditions.push({
          user: {
            userDepartment: {
              name: {
                contains: searchDepartment,
                mode: 'insensitive'
              }
            }
          }
        });
      }

      // Search in formData for additional fields
      if (searchDescription) {
        searchConditions.push(
          {
            formData: {
              path: ['description'],
              string_contains: searchDescription
            }
          },
          {
            formData: {
              path: ['details'],
              string_contains: searchDescription
            }
          },
          {
            formData: {
              path: ['requestDescription'],
              string_contains: searchDescription
            }
          },
          {
            formData: {
              path: ['notes'],
              string_contains: searchDescription
            }
          }
        );
      }

      // Search in comments and additional fields
      if (searchComments) {
        searchConditions.push(
          {
            formData: {
              path: ['comments'],
              string_contains: searchComments
            }
          },
          {
            formData: {
              path: ['additionalInfo'],
              string_contains: searchComments
            }
          },
          {
            formData: {
              path: ['remarks'],
              string_contains: searchComments
            }
          }
        );
      }

      // Note: Template search will be handled in post-processing since template data 
      // needs to be fetched separately for each request

      if (searchConditions.length > 0) {
        where.OR = searchConditions;
      }
    }

    // Department filter
    if (departmentId) {
      // We need to filter by department through the user relationship
      where.user = {
        departmentId: parseInt(departmentId)
      };
    }

    // Add missing filter implementations
    if (requestType) {
      // We'll need to filter by template type since requestType comes from template
      // This will be handled in the post-processing since it's derived from template data
    }

    if (priority) {
      // Priority is stored in formData JSON, we'll handle this in post-processing
    }

    if (mode) {
      // Mode is stored in formData JSON, we'll handle this in post-processing  
    }

    if (approvalStatus) {
      // Approval status is derived from approvals, we'll handle this in post-processing
    }

    if (technicianId) {
      // Technician assignment is typically stored in history, we'll handle this in post-processing
    }

    if (serviceCategoryId) {
      // Service category comes from template, we'll handle this in post-processing
    }

    if (createdTimeFrom || createdTimeTo) {
      where.createdAt = {};
      if (createdTimeFrom) {
        where.createdAt.gte = new Date(createdTimeFrom);
      }
      if (createdTimeTo) {
        where.createdAt.lte = new Date(createdTimeTo);
      }
    }

    // Additional filters for the new system
    if (departmentId) {
      where.user = {
        ...where.user,
        departmentId: parseInt(departmentId)
      };
    }

    // Check user permissions
    const userId = parseInt(session.user.id);
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        technician: true,
        userDepartment: true
      }
    });

    // If user is not technician/admin, apply restrictions
    if (!user?.isTechnician && !(user?.technician?.isAdmin)) {
      // Check if user is department head of any departments
      const headOfDepartments = await prisma.department.findMany({
        where: { 
          departmentHeadId: userId,
          isActive: true 
        },
        select: { id: true }
      });

      if (headOfDepartments.length > 0) {
        // Department head - show requests from departments they manage
        const departmentIds = headOfDepartments.map(d => d.id);
        
        // If department filter is applied, check if user has permission to see that department
        if (departmentId) {
          const requestedDeptId = parseInt(departmentId);
          if (departmentIds.includes(requestedDeptId)) {
            where.user = {
              departmentId: requestedDeptId
            };
          } else {
            // User doesn't have permission to see this department, return empty results
            where.id = -999; // Non-existent ID to ensure no results
          }
        } else {
          // No specific department filter, show all departments they manage
          where.user = {
            departmentId: {
              in: departmentIds
            }
          };
        }
      } else {
        // Regular user - only their own requests
        where.userId = userId;
      }
    } else if (departmentId) {
      // Technician/admin with department filter
      where.user = {
        departmentId: parseInt(departmentId)
      };
    }

    // Get requests with all related data
    const requests = await prisma.request.findMany({
      where,
      include: {
        user: {
          include: {
            userDepartment: true
          }
        },
        approvals: {
          include: {
            approver: true
          },
          orderBy: {
            level: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limit
    });

    // Get total count for pagination
    const totalCount = await prisma.request.count({ where });

    // Get templates for lookup
    const templates = await prisma.template.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Create template lookup map
    const templateMap = new Map(templates.map(t => [t.id.toString(), t]));

    // Process requests to extract data from formData JSON - Updated logic based on technician API
    const processedRequests = await Promise.all(requests.map(async (request: any) => {
      let formData: any = {};
      try {
        formData = typeof request.formData === 'string' 
          ? JSON.parse(request.formData) 
          : request.formData || {};
      } catch (error) {
        console.error('Error parsing formData for request', request.id, error);
      }

      // Debug: Log technician-related fields in formData
      const technicianKeys = Object.keys(formData).filter(key => 
        key.toLowerCase().includes('tech') || 
        key.toLowerCase().includes('assign') ||
        key.toLowerCase().includes('responsible')
      );
      if (technicianKeys.length > 0) {
        console.log(`Request ${request.id} technician fields:`, technicianKeys.map(key => `${key}: ${formData[key]}`));
      }

      // Get template information like technician API does
      let template = null;
      try {
        template = await prisma.template.findFirst({
          where: { 
            OR: [
              { id: parseInt(request.templateId) || 0 },
              { name: { contains: request.templateId } }
            ]
          },
          select: {
            name: true,
            description: true, // Get template description as subject
            type: true,
            category: {
              select: {
                name: true
              }
            }
          }
        });
      } catch (templateError) {
        console.warn('Error fetching template for request', request.id, ':', templateError);
      }
      
      // Extract subject from formData field 8, fallback to template description or name
      const subject = formData?.['8'] || formData?.subject || template?.description || template?.name || `Request #${request.id}`;
      
      // Extract type from template
      const requestType = template?.type || 'Unknown';
      
      // Status is the request_status
      const status = request.status;
      
      // Calculate approval status based on all approvals
      let approvalStatus = 'not_required';
      if (request.approvals && request.approvals.length > 0) {
        const hasRejected = request.approvals.some((a: any) => a.status === 'rejected');
        const hasForClarification = request.approvals.some((a: any) => a.status === 'for_clarification');
        const allApproved = request.approvals.every((a: any) => a.status === 'approved');
        
        if (hasRejected) {
          approvalStatus = 'rejected';
        } else if (hasForClarification) {
          approvalStatus = 'for_clarification';
        } else if (allApproved) {
          approvalStatus = 'approved';
        } else {
          approvalStatus = 'pending_approval';
        }
      }
      
      // Extract priority from formData
      const priority = formData.priority || 'Medium';
      
      // Requester information
      const requester = {
        id: request.user?.id || 0,
        name: request.user ? `${request.user.emp_fname || ''} ${request.user.emp_lname || ''}`.trim() : 'Unknown User',
        email: request.user?.emp_email || 'N/A',
        employeeId: request.user?.emp_code || 'N/A'
      };
      
      // Department
      const department = request.user?.userDepartment?.name || 'Unknown Department';
      
      // Template name
      const templateName = template?.name || 'Unknown Template';

      return {
        id: request.id,
        subject,
        requestType,
        status,
        approvalStatus,
        priority,
        requester,
        department,
        createdAt: request.createdAt,
        template: templateName,
        serviceCategory: template?.category?.name || 'Unknown',
        // Additional fields for compatibility
        mode: formData.mode || requestType?.toLowerCase() || 'service',
        dueByTime: formData.dueBy || formData.slaDueDate || null,
        resolvedTime: null, // TODO: Get from history if needed
        technician: (() => {
          const technicianName = request.assignedTechnician || 
                                formData.assignedTechnician ||  // From actual formData structure
                                formData.assignedTechnicianName || 
                                formData['assigned technician'] ||  // Key with space
                                formData.assigned_technician || 
                                formData.assignedTo ||
                                formData.technician ||
                                null;
          
          // Return "Unassigned" if no technician or if value is empty/whitespace
          return technicianName && technicianName.toString().trim() !== '' 
            ? technicianName.toString().trim() 
            : 'Unassigned';
        })()
      };
    }));

    // Apply post-processing filters for fields that can't be filtered at database level
    let filteredRequests = processedRequests;

    if (requestType) {
      filteredRequests = filteredRequests.filter(req => req.requestType === requestType);
    }

    if (priority) {
      filteredRequests = filteredRequests.filter(req => req.priority === priority);
    }

    if (mode) {
      filteredRequests = filteredRequests.filter(req => req.mode === mode);
    }

    if (approvalStatus) {
      filteredRequests = filteredRequests.filter(req => req.approvalStatus === approvalStatus);
    }

    if (serviceCategoryId) {
      filteredRequests = filteredRequests.filter(req => {
        // Find the request in the original requests array to get the templateId
        const originalRequest = requests.find(r => r.id === req.id);
        if (originalRequest?.templateId) {
          const template = templateMap.get(originalRequest.templateId);
          return template?.category?.id === parseInt(serviceCategoryId);
        }
        return false;
      });
    }

    // Apply template search filter if provided
    if (searchTemplate) {
      filteredRequests = filteredRequests.filter(req => {
        return req.template?.toLowerCase().includes(searchTemplate.toLowerCase()) ||
               req.requestType?.toLowerCase().includes(searchTemplate.toLowerCase()) ||
               req.serviceCategory?.toLowerCase().includes(searchTemplate.toLowerCase());
      });
    }

    // Update total count based on filtered results
    const finalTotalCount = filteredRequests.length;

    return NextResponse.json({
      requests: filteredRequests,
      pagination: {
        page,
        limit,
        totalCount: finalTotalCount,
        totalPages: Math.ceil(finalTotalCount / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}
