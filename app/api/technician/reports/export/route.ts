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
    const format = searchParams.get('format'); // 'pdf' or 'excel'
    const fields = searchParams.get('fields')?.split(',') || [];
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status')?.split(',');
    const approvalStatus = searchParams.get('approvalStatus')?.split(',');
    const searchTerm = searchParams.get('search');

    if (!format || !['csv', 'json'].includes(format)) {
      return NextResponse.json({ error: "Invalid format. Must be 'csv' or 'json'" }, { status: 400 });
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "No fields selected" }, { status: 400 });
    }

    // Build the where clause (same logic as the main report API)
    const whereClause: any = {};

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }

    if (status && status.length > 0) {
      whereClause.status = {
        in: status
      };
    }

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

    if (approvalStatus && approvalStatus.length > 0) {
      whereClause.approvals = {
        some: {
          status: {
            in: approvalStatus
          }
        }
      };
    }

    // Fetch the data
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

    // Get templates
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

    // Define field labels
    const fieldLabels: { [key: string]: string } = {
      requestId: 'Request ID',
      templateName: 'Template/Service',
      requesterName: 'Requester Name',
      requesterDepartment: 'Requester Department',
      assignedTechnician: 'Assigned Technician',
      supportGroup: 'Support Group',
      priority: 'Priority',
      status: 'Status',
      createdAt: 'Created Date',
      updatedAt: 'Last Updated',
      closedAt: 'Closed Date',
      slaBreached: 'SLA Breached',
      resolutionTime: 'Resolution Time',
      approvalStatus: 'Approval Status',
      approvedBy: 'Approved By',
      description: 'Description',
      category: 'Category'
    };

    // Format the data
    const formattedData = requests.map(request => {
      const record: any = {};
      const template = templateMap.get(request.templateId);

      fields.forEach(field => {
        const label = fieldLabels[field] || field;
        
        switch (field) {
          case 'requestId':
            record[label] = request.id.toString();
            break;
          case 'templateName':
            record[label] = template?.name || '-';
            break;
          case 'requesterName':
            const fullName = [
              request.user.emp_fname,
              request.user.emp_mid,
              request.user.emp_lname
            ].filter(Boolean).join(' ');
            record[label] = fullName || '-';
            break;
          case 'requesterDepartment':
            record[label] = request.user.department || '-';
            break;
          case 'assignedTechnician':
            record[label] = 'N/A';
            break;
          case 'supportGroup':
            record[label] = '-';
            break;
          case 'priority':
            try {
              const formData = typeof request.formData === 'string' ? JSON.parse(request.formData) : request.formData;
              record[label] = (formData as any)?.priority || '-';
            } catch {
              record[label] = '-';
            }
            break;
          case 'status':
            record[label] = request.status?.replace('_', ' ').toUpperCase() || '-';
            break;
          case 'createdAt':
            record[label] = request.createdAt.toLocaleDateString();
            break;
          case 'updatedAt':
            record[label] = request.updatedAt.toLocaleDateString();
            break;
          case 'closedAt':
            record[label] = request.history[0]?.timestamp?.toLocaleDateString() || '-';
            break;
          case 'slaBreached':
            record[label] = 'No';
            break;
          case 'resolutionTime':
            if (request.history[0]?.timestamp && request.createdAt) {
              const resolutionTimeMs = request.history[0].timestamp.getTime() - request.createdAt.getTime();
              const hours = Math.floor(resolutionTimeMs / (1000 * 60 * 60));
              const minutes = Math.floor((resolutionTimeMs % (1000 * 60 * 60)) / (1000 * 60));
              record[label] = `${hours}h ${minutes}m`;
            } else {
              record[label] = '-';
            }
            break;
          case 'approvalStatus':
            const latestApproval = request.approvals[0];
            record[label] = latestApproval?.status?.replace('_', ' ').toUpperCase() || 'N/A';
            break;
          case 'approvedBy':
            const approver = request.approvals.find((a: any) => a.status === 'approved')?.approver;
            const approverName = approver ? `${approver.emp_fname} ${approver.emp_lname}` : '-';
            record[label] = approverName;
            break;
          case 'description':
            try {
              const formData = typeof request.formData === 'string' ? JSON.parse(request.formData) : request.formData;
              const desc = (formData as any)?.description || (formData as any)?.summary || (formData as any)?.issue || '-';
              record[label] = desc.length > 100 ? desc.substring(0, 100) + '...' : desc;
            } catch {
              record[label] = '-';
            }
            break;
          case 'category':
            record[label] = template?.category?.name || '-';
            break;
          default:
            record[label] = '-';
        }
      });

      return record;
    });

    if (format === 'csv') {
      // Create CSV content
      const headers = fields.map(field => fieldLabels[field] || field);
      const csvRows = [headers.join(',')];
      
      formattedData.forEach(row => {
        const values = headers.map(header => {
          const value = row[header] || '';
          // Escape commas and quotes in CSV
          return `"${value.toString().replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
      });
      
      const csvContent = csvRows.join('\n');
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="technician-report-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    } else if (format === 'json') {
      // Return JSON format
      const jsonContent = {
        metadata: {
          generatedAt: new Date().toISOString(),
          totalRecords: formattedData.length,
          fields: fields,
          filters: {
            startDate,
            endDate,
            status,
            approvalStatus,
            searchTerm
          }
        },
        data: formattedData
      };
      
      return new NextResponse(JSON.stringify(jsonContent, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="technician-report-${new Date().toISOString().split('T')[0]}.json"`
        }
      });
    }

    return NextResponse.json({ error: "Invalid format" }, { status: 400 });

  } catch (error) {
    console.error("Error exporting report:", error);
    return NextResponse.json(
      { error: "Failed to export report" },
      { status: 500 }
    );
  }
}
