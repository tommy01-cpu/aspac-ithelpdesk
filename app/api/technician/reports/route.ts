import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.isTechnician) {
      return NextResponse.json({ error: "Access denied. Technician access required." }, { status: 403 });
    }

    const userId = parseInt(session.user.id.toString());

    const { searchParams } = new URL(request.url);
    const fields = searchParams.get('fields')?.split(',') || [];
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status')?.split(',');
    const approvalStatus = searchParams.get('approvalStatus')?.split(',');
    const searchTerm = searchParams.get('search');

    if (fields.length === 0) {
      return NextResponse.json({ error: "No fields selected" }, { status: 400 });
    }

    // Build the where clause
    const whereClause: any = {};

    // Date range filter
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }

    // Status filter
    if (status && status.length > 0) {
      whereClause.status = {
        in: status
      };
    }

    // Search term filter
    if (searchTerm) {
      whereClause.OR = [
        {
          user: {
            emp_fname: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          }
        },
        {
          user: {
            emp_lname: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          }
        }
      ];
    }

    // Approval status filter
    if (approvalStatus && approvalStatus.length > 0) {
      whereClause.approvals = {
        some: {
          status: {
            in: approvalStatus
          }
        }
      };
    }

    // Fetch requests with necessary relations
    const requests = await prisma.request.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_mid: true,
            department: true,
            emp_email: true
          }
        },
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                emp_fname: true,
                emp_lname: true,
                emp_email: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        history: {
          where: {
            action: 'resolved'
          },
          orderBy: {
            timestamp: 'desc'
          },
          take: 1
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get templates separately
    const templateIds = Array.from(new Set(requests.map(r => r.templateId)));
    const templates = await prisma.template.findMany({
      where: {
        id: {
          in: templateIds.map(id => parseInt(id))
        }
      },
      include: {
        category: {
          select: {
            name: true
          }
        }
      }
    });

    const templateMap = new Map(templates.map(t => [t.id.toString(), t]));

    // Format the data based on selected fields
    const formattedData = requests.map(request => {
      const record: any = {};
      const template = templateMap.get(request.templateId);

      fields.forEach(field => {
        switch (field) {
          case 'requestId':
            record.requestId = request.id.toString();
            break;
          case 'requestSubject':
            try {
              const formData = typeof request.formData === 'string' ? JSON.parse(request.formData) : request.formData;
              record.requestSubject = (formData as any)?.subject || (formData as any)?.title || '-';
            } catch {
              record.requestSubject = '-';
            }
            break;
          case 'requestDescription':
            try {
              const formData = typeof request.formData === 'string' ? JSON.parse(request.formData) : request.formData;
              record.requestDescription = (formData as any)?.description || (formData as any)?.summary || (formData as any)?.issue || '-';
            } catch {
              record.requestDescription = '-';
            }
            break;
          case 'requestType':
            record.requestType = template?.type || 'Service';
            break;
          case 'requestStatus':
            record.requestStatus = request.status || '-';
            break;
          case 'approvalStatus':
            const latestApproval = request.approvals[0];
            record.approvalStatus = latestApproval?.status || 'N/A';
            break;
          case 'mode':
            try {
              const formData = typeof request.formData === 'string' ? JSON.parse(request.formData) : request.formData;
              record.mode = (formData as any)?.mode || 'Online';
            } catch {
              record.mode = 'Online';
            }
            break;
          case 'requester':
            const fullName = [
              request.user.emp_fname,
              request.user.emp_mid,
              request.user.emp_lname
            ].filter(Boolean).join(' ');
            record.requester = fullName || '-';
            break;
          case 'department':
            record.department = request.user.department || '-';
            break;
          case 'createdTime':
            record.createdTime = request.createdAt;
            break;
          case 'dueByTime':
            // Calculate due time based on SLA if available
            try {
              const formData = typeof request.formData === 'string' ? JSON.parse(request.formData) : request.formData;
              record.dueByTime = (formData as any)?.due_date || null;
            } catch {
              record.dueByTime = null;
            }
            break;
          case 'resolvedTime':
            record.resolvedTime = request.history[0]?.timestamp || null;
            break;
          case 'priority':
            try {
              const formData = typeof request.formData === 'string' ? JSON.parse(request.formData) : request.formData;
              record.priority = (formData as any)?.priority || 'Medium';
            } catch {
              record.priority = 'Medium';
            }
            break;
          case 'technician':
            try {
              const formData = typeof request.formData === 'string' ? JSON.parse(request.formData) : request.formData;
              record.technician = (formData as any)?.assigned_technician || 'Unassigned';
            } catch {
              record.technician = 'Unassigned';
            }
            break;
          case 'serviceCategory':
            try {
              const formData = typeof request.formData === 'string' ? JSON.parse(request.formData) : request.formData;
              record.serviceCategory = (formData as any)?.category || template?.category?.name || '-';
            } catch {
              record.serviceCategory = template?.category?.name || '-';
            }
            break;
          case 'requestTemplate':
            record.requestTemplate = template?.name || '-';
            break;
          case 'sla':
            // Get SLA information from template
            record.sla = template?.slaServiceId ? `SLA ${template.slaServiceId}` : 'Standard SLA';
            break;
          default:
            record[field] = '-';
        }
      });

      return record;
    });

    return NextResponse.json({
      records: formattedData,
      total: formattedData.length
    });

  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
