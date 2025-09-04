import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const exportFormat = searchParams.get('export'); // 'excel' or 'pdf'
    
    // Get the same filter parameters as the main reports API
    const requestType = searchParams.get('requestType');
    const requestStatus = searchParams.get('requestStatus') || searchParams.get('statusFilter');
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

    // Build where clause (same logic as main reports API)
    const where: any = {};

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
        if (!isNaN(parseInt(searchRequestId))) {
          searchConditions.push({ id: parseInt(searchRequestId) });
        }
        searchConditions.push({
          formData: {
            path: ['requestId'],
            string_contains: searchRequestId
          }
        });
      }

      if (searchSubject) {
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

      if (searchConditions.length > 0) {
        where.OR = searchConditions;
      }
    }

    if (departmentId) {
      where.user = {
        departmentId: parseInt(departmentId)
      };
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

    // Check user permissions (same as main API)
    const userId = parseInt(session.user.id);
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        technician: true,
        userDepartment: true
      }
    });

    if (!user?.technician && !(user?.technician?.isAdmin)) {
      const headOfDepartments = await prisma.department.findMany({
        where: { 
          departmentHeadId: userId,
          isActive: true 
        },
        select: { id: true }
      });

      if (headOfDepartments.length > 0) {
        const departmentIds = headOfDepartments.map(d => d.id);
        
        if (departmentId) {
          const requestedDeptId = parseInt(departmentId);
          if (departmentIds.includes(requestedDeptId)) {
            where.user = {
              departmentId: requestedDeptId
            };
          } else {
            where.id = -999;
          }
        } else {
          where.user = {
            departmentId: {
              in: departmentIds
            }
          };
        }
      } else {
        where.userId = userId;
      }
    } else if (departmentId) {
      where.user = {
        departmentId: parseInt(departmentId)
      };
    }

    // Get all requests without pagination for export
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
      }
    });

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

    const templateMap = new Map(templates.map(t => [t.id.toString(), t]));

    // Process requests (same logic as main API)
    const processedRequests = await Promise.all(requests.map(async (request: any) => {
      let formData: any = {};
      try {
        formData = typeof request.formData === 'string' 
          ? JSON.parse(request.formData) 
          : request.formData || {};
      } catch (error) {
        console.error('Error parsing formData for request', request.id, error);
      }

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
            description: true,
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
      
      const subject = formData?.['8'] || formData?.subject || template?.description || template?.name || `Request #${request.id}`;
      const description = formData?.['9'] || formData?.description || formData?.details || formData?.issueDescription || '';
      const requestType = template?.type || 'Unknown';
      const status = request.status;
      
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
      
      let priority = 'Medium';
      if (formData['2']) {
        priority = formData['2'];
      } else if (formData.priority) {
        priority = formData.priority;
      } else {
        const priorityFields = Object.keys(formData).filter(key => 
          key.toLowerCase().includes('priority') ||
          String(formData[key]).toLowerCase().match(/^(low|medium|high|critical)$/i)
        );
        if (priorityFields.length > 0) {
          priority = formData[priorityFields[0]];
        }
      }
      
      const requester = {
        id: request.user?.id || 0,
        name: request.user ? `${request.user.emp_fname || ''} ${request.user.emp_lname || ''}`.trim() : 'Unknown User',
        email: request.user?.emp_email || 'N/A',
        employeeId: request.user?.emp_code || 'N/A'
      };
      
      const department = request.user?.userDepartment?.name || 'Unknown Department';
      const templateName = template?.name || 'Unknown Template';

      return {
        id: request.id,
        subject,
        description,
        requestType,
        status,
        approvalStatus,
        priority,
        requester,
        department,
        createdAt: request.createdAt,
        template: templateName,
        serviceCategory: template?.category?.name || 'Unknown',
        mode: formData.mode || requestType?.toLowerCase() || 'service',
        dueByTime: formData.dueBy || formData.slaDueDate || null,
        resolvedTime: null,
        technician: (() => {
          const technicianName = request.assignedTechnician || 
                                formData.assignedTechnician ||
                                formData.assignedTechnicianName || 
                                formData['assigned technician'] ||
                                formData.assigned_technician || 
                                formData.assignedTo ||
                                formData.technician ||
                                null;
          
          return technicianName && technicianName.toString().trim() !== '' 
            ? technicianName.toString().trim() 
            : 'Unassigned';
        })()
      };
    }));

    // Apply post-processing filters
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
        const originalRequest = requests.find(r => r.id === req.id);
        if (originalRequest?.templateId) {
          const template = templateMap.get(originalRequest.templateId);
          return template?.category?.id === parseInt(serviceCategoryId);
        }
        return false;
      });
    }

    if (searchTemplate) {
      filteredRequests = filteredRequests.filter(req => {
        return req.template?.toLowerCase().includes(searchTemplate.toLowerCase()) ||
               req.requestType?.toLowerCase().includes(searchTemplate.toLowerCase()) ||
               req.serviceCategory?.toLowerCase().includes(searchTemplate.toLowerCase());
      });
    }

    // Helper function to format status text
    const formatStatusText = (text: string) => {
      if (!text) return text;
      return text.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.toLowerCase().slice(1)
      ).join(' ').replace(/_/g, ' ');
    };

    // Helper function to format date
    const formatDate = (date: any) => {
      if (!date) return '';
      try {
        return new Date(date).toLocaleString();
      } catch {
        return '';
      }
    };

    // Set up headers for export
    const exportHeaders = [
      'Request ID',
      'Subject',
      'Description',
      'Request Type',
      'Request Status',
      'Approval Status',
      'Mode',
      'Requester',
      'Department',
      'Created At',
      'Due By',
      'Resolved Time',
      'Priority',
      'Technician',
      'Service Category',
      'Template'
    ];

    if (exportFormat === 'excel') {
      // Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('ASPAC IT Helpdesk Report');

      // Set up worksheet properties
      worksheet.properties.defaultRowHeight = 20;
      worksheet.views = [{ showGridLines: false }];

      // Add professional header section
      // Row 1: Logo placeholder and Company Header
      const logoRow = worksheet.addRow(['[ASPAC LOGO]', '', '', '', '', '', '', '', '', '', '', '', '', '', 'ASPAC IT HELPDESK SYSTEM']);
      logoRow.getCell(1).font = { size: 10, bold: true, color: { argb: '1F4E79' } };
      logoRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      logoRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'E5F3FF' } // Light blue background for logo placeholder
      };
      logoRow.getCell(1).border = {
        top: { style: 'thin', color: { argb: '1F4E79' } },
        left: { style: 'thin', color: { argb: '1F4E79' } },
        bottom: { style: 'thin', color: { argb: '1F4E79' } },
        right: { style: 'thin', color: { argb: '1F4E79' } }
      };
      
      // Company name styling
      logoRow.getCell(15).font = { size: 24, bold: true, color: { argb: '1F4E79' } };
      logoRow.getCell(15).alignment = { horizontal: 'right', vertical: 'middle' };
      logoRow.height = 40;
      worksheet.mergeCells('O1:P1'); // Merge cells for company name

      // Row 2: Report Title
      const titleRow = worksheet.addRow(['IT Helpdesk Export Report']);
      titleRow.getCell(1).font = { size: 18, bold: true, color: { argb: '2D3748' } };
      titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      titleRow.height = 30;
      worksheet.mergeCells('A2:P2');

      // Row 3: Generation Info and Record Count
      const infoRow = worksheet.addRow([`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`]);
      infoRow.getCell(1).font = { size: 11, color: { argb: '6B7280' } };
      infoRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      infoRow.getCell(13).value = `Total Records: ${filteredRequests.length}`;
      infoRow.getCell(13).font = { size: 11, color: { argb: '6B7280' } };
      infoRow.getCell(13).alignment = { horizontal: 'right', vertical: 'middle' };
      worksheet.mergeCells('A3:L3');
      worksheet.mergeCells('M3:P3');

      // Row 4: Department/User Info (if available from session)
      const userInfoRow = worksheet.addRow(['Exported by: System Administrator']);
      userInfoRow.getCell(1).font = { size: 10, color: { argb: '9CA3AF' } };
      userInfoRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      userInfoRow.getCell(13).value = `Page 1 of 1`;
      userInfoRow.getCell(13).font = { size: 10, color: { argb: '9CA3AF' } };
      userInfoRow.getCell(13).alignment = { horizontal: 'right', vertical: 'middle' };
      worksheet.mergeCells('A4:L4');
      worksheet.mergeCells('M4:P4');

      // Add decorative border under header
      const borderRow = worksheet.addRow([]);
      borderRow.height = 3;
      const borderRange = worksheet.getCell('A5:P5');
      worksheet.getRow(5).eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '1F4E79' }
        };
      });

      // Add some spacing
      worksheet.addRow([]);

      // 📊 EXECUTIVE DASHBOARD SECTION 📊
      // Add Dashboard Title
      const dashboardTitleRow = worksheet.addRow(['📊 EXECUTIVE DASHBOARD & ANALYTICS']);
      dashboardTitleRow.height = 35;
      worksheet.mergeCells('A8:P8');
      const dashboardTitleCell = worksheet.getCell('A8');
      dashboardTitleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFF' } };
      dashboardTitleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '2E8B57' } // Sea green
      };
      dashboardTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Add spacing
      worksheet.addRow([]);

      // Calculate statistics for dashboard
      const stats = {
        total: filteredRequests.length,
        byStatus: {} as Record<string, number>,
        byPriority: {} as Record<string, number>,
        byApprovalStatus: {} as Record<string, number>,
        byDepartment: {} as Record<string, number>,
        resolved: 0,
        pending: 0,
        overdue: 0
      };

      // Calculate statistics
      filteredRequests.forEach(request => {
        // Status breakdown
        const status = request.status || 'Unknown';
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

        // Priority breakdown
        const priority = request.priority || 'Unknown';
        stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;

        // Approval status breakdown
        const approvalStatus = request.approvalStatus || 'Not Required';
        stats.byApprovalStatus[approvalStatus] = (stats.byApprovalStatus[approvalStatus] || 0) + 1;

        // Department breakdown
        const department = request.department || 'Unknown';
        stats.byDepartment[department] = (stats.byDepartment[department] || 0) + 1;

        // Status categorization
        if (request.status === 'Closed' || request.status === 'Resolved') {
          stats.resolved++;
        } else {
          stats.pending++;
        }

        // Check if overdue (simple check)
        if (request.dueByTime && new Date(request.dueByTime) < new Date() && request.status !== 'Closed') {
          stats.overdue++;
        }
      });

      // 1. STATUS DISTRIBUTION CHART (Visual representation using colored cells)
      const statusChartRow = worksheet.addRow(['📈 STATUS DISTRIBUTION CHART']);
      statusChartRow.height = 25;
      worksheet.mergeCells('A10:H10');
      const statusChartCell = worksheet.getCell('A10');
      statusChartCell.font = { bold: true, size: 12, color: { argb: '1F4E79' } };
      statusChartCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E6F3FF' } };
      statusChartCell.alignment = { horizontal: 'left', vertical: 'middle' };

      // Status chart headers
      const statusHeaderRow = worksheet.addRow(['Status', 'Count', 'Percentage', 'Visual Chart (Progress Bar)']);
      statusHeaderRow.height = 20;
      statusHeaderRow.eachCell((cell, colNumber) => {
        if (colNumber <= 4) {
          cell.font = { bold: true, size: 10 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9E2F3' } };
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
          };
        }
      });

      // Add status data with visual progress bars
      Object.entries(stats.byStatus).forEach(([status, count], index) => {
        const countValue = count as number;
        const percentage = ((countValue / stats.total) * 100).toFixed(1);
        const progressBarLength = Math.round((countValue / stats.total) * 20); // 20 cells for progress bar
        
        const statusRow = worksheet.addRow([
          formatStatusText(status),
          countValue,
          `${percentage}%`,
          '■'.repeat(progressBarLength) + '□'.repeat(20 - progressBarLength)
        ]);
        
        statusRow.height = 18;
        
        // Color coding for different statuses
        let statusColor = '90EE90'; // Light green default
        if (status.toLowerCase().includes('pending')) statusColor = 'FFE4B5'; // Moccasin
        if (status.toLowerCase().includes('open')) statusColor = 'FFB6C1'; // Light pink
        if (status.toLowerCase().includes('closed')) statusColor = '90EE90'; // Light green
        if (status.toLowerCase().includes('cancelled')) statusColor = 'FFB6C1'; // Light pink
        
        statusRow.eachCell((cell, colNumber) => {
          if (colNumber <= 4) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusColor } };
            cell.border = {
              top: { style: 'thin' }, left: { style: 'thin' },
              bottom: { style: 'thin' }, right: { style: 'thin' }
            };
            if (colNumber === 4) { // Progress bar column
              cell.font = { name: 'Courier New', size: 8, color: { argb: '1F4E79' } };
            }
          }
        });
      });

      // Add spacing
      worksheet.addRow([]);

      // 2. PRIORITY BREAKDOWN (Color-coded statistics)
      const priorityChartRow = worksheet.addRow(['⚡ PRIORITY BREAKDOWN']);
      priorityChartRow.height = 25;
      worksheet.mergeCells(`A${13 + Object.keys(stats.byStatus).length}:H${13 + Object.keys(stats.byStatus).length}`);
      const priorityChartCell = worksheet.getCell(`A${13 + Object.keys(stats.byStatus).length}`);
      priorityChartCell.font = { bold: true, size: 12, color: { argb: '1F4E79' } };
      priorityChartCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6' } };
      priorityChartCell.alignment = { horizontal: 'left', vertical: 'middle' };

      // Priority headers
      const priorityHeaderRow = worksheet.addRow(['Priority', 'Count', 'Percentage', 'Visual Indicator']);
      priorityHeaderRow.height = 20;
      priorityHeaderRow.eachCell((cell, colNumber) => {
        if (colNumber <= 4) {
          cell.font = { bold: true, size: 10 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F2F2' } };
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
          };
        }
      });

      // Add priority data with color coding
      Object.entries(stats.byPriority).forEach(([priority, count]) => {
        const countValue = count as number;
        const percentage = ((countValue / stats.total) * 100).toFixed(1);
        const priorityRow = worksheet.addRow([
          priority,
          countValue,
          `${percentage}%`,
          `${'🔴'.repeat(Math.ceil(countValue / stats.total * 10))} ${percentage}%`
        ]);
        
        priorityRow.height = 18;
        
        // Color coding for priorities
        let priorityColor = '90EE90'; // Default green
        if (priority.toLowerCase() === 'high') priorityColor = 'FFB6C1'; // Light pink
        if (priority.toLowerCase() === 'critical') priorityColor = 'FF6B6B'; // Red
        if (priority.toLowerCase() === 'medium') priorityColor = 'FFE4B5'; // Moccasin
        if (priority.toLowerCase() === 'low') priorityColor = '90EE90'; // Light green
        
        priorityRow.eachCell((cell, colNumber) => {
          if (colNumber <= 4) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: priorityColor } };
            cell.border = {
              top: { style: 'thin' }, left: { style: 'thin' },
              bottom: { style: 'thin' }, right: { style: 'thin' }
            };
          }
        });
      });

      // Add spacing
      worksheet.addRow([]);

      // 3. APPROVAL STATUS OVERVIEW
      const currentRow = 15 + Object.keys(stats.byStatus).length + Object.keys(stats.byPriority).length;
      const approvalChartRow = worksheet.addRow(['✅ APPROVAL STATUS OVERVIEW']);
      approvalChartRow.height = 25;
      worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
      const approvalChartCell = worksheet.getCell(`A${currentRow}`);
      approvalChartCell.font = { bold: true, size: 12, color: { argb: '1F4E79' } };
      approvalChartCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E6FFE6' } };
      approvalChartCell.alignment = { horizontal: 'left', vertical: 'middle' };

      // Approval headers
      const approvalHeaderRow = worksheet.addRow(['Approval Status', 'Count', 'Percentage', 'Progress Bar']);
      approvalHeaderRow.height = 20;
      approvalHeaderRow.eachCell((cell, colNumber) => {
        if (colNumber <= 4) {
          cell.font = { bold: true, size: 10 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D4EDDA' } };
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
          };
        }
      });

      // Add approval status data
      Object.entries(stats.byApprovalStatus).forEach(([approvalStatus, count]) => {
        const countValue = count as number;
        const percentage = ((countValue / stats.total) * 100).toFixed(1);
        const progressBarLength = Math.round((countValue / stats.total) * 15);
        
        const approvalRow = worksheet.addRow([
          formatStatusText(approvalStatus),
          countValue,
          `${percentage}%`,
          '▓'.repeat(progressBarLength) + '░'.repeat(15 - progressBarLength)
        ]);
        
        approvalRow.height = 18;
        
        // Color coding for approval status
        let approvalColor = 'E6FFE6'; // Default light green
        if (approvalStatus.toLowerCase().includes('pending')) approvalColor = 'FFF3CD'; // Light yellow
        if (approvalStatus.toLowerCase().includes('approved')) approvalColor = 'D4EDDA'; // Light green
        if (approvalStatus.toLowerCase().includes('rejected')) approvalColor = 'F8D7DA'; // Light red
        
        approvalRow.eachCell((cell, colNumber) => {
          if (colNumber <= 4) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: approvalColor } };
            cell.border = {
              top: { style: 'thin' }, left: { style: 'thin' },
              bottom: { style: 'thin' }, right: { style: 'thin' }
            };
            if (colNumber === 4) { // Progress bar column
              cell.font = { name: 'Courier New', size: 10, color: { argb: '1F4E79' } };
            }
          }
        });
      });

      // Add spacing
      worksheet.addRow([]);

      // 4. KEY PERFORMANCE INDICATORS (KPIs)
      const kpiRow = worksheet.addRow(['📊 KEY PERFORMANCE INDICATORS']);
      kpiRow.height = 25;
      const kpiRowNum = currentRow + 3 + Object.keys(stats.byApprovalStatus).length;
      worksheet.mergeCells(`A${kpiRowNum}:P${kpiRowNum}`);
      const kpiCell = worksheet.getCell(`A${kpiRowNum}`);
      kpiCell.font = { bold: true, size: 12, color: { argb: 'FFFFFF' } };
      kpiCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
      kpiCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // KPI metrics in a grid
      const kpiDataRow1 = worksheet.addRow([
        'Total Requests', stats.total,
        'Resolved', stats.resolved,
        'Pending', stats.pending,
        'Overdue', stats.overdue
      ]);
      kpiDataRow1.height = 25;

      // Style KPI row
      kpiDataRow1.eachCell((cell, colNumber) => {
        if (colNumber <= 8) {
          if (colNumber % 2 === 1) { // Label columns
            cell.font = { bold: true, size: 10, color: { argb: '1F4E79' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0F8FF' } };
          } else { // Value columns
            cell.font = { bold: true, size: 12, color: { argb: '000000' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E6F3FF' } };
          }
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
          };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });

      // Add percentages row
      const kpiDataRow2 = worksheet.addRow([
        'Resolution Rate', `${((stats.resolved / stats.total) * 100).toFixed(1)}%`,
        'Pending Rate', `${((stats.pending / stats.total) * 100).toFixed(1)}%`,
        'Overdue Rate', `${((stats.overdue / stats.total) * 100).toFixed(1)}%`,
        'On-Time Rate', `${(((stats.total - stats.overdue) / stats.total) * 100).toFixed(1)}%`
      ]);
      kpiDataRow2.height = 25;

      // Style KPI percentage row
      kpiDataRow2.eachCell((cell, colNumber) => {
        if (colNumber <= 8) {
          if (colNumber % 2 === 1) { // Label columns
            cell.font = { bold: true, size: 10, color: { argb: '1F4E79' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0F8FF' } };
          } else { // Value columns
            cell.font = { bold: true, size: 11, color: { argb: '000000' } };
            // Color code percentages
            const cellValue = cell.value;
            if (cellValue && typeof cellValue === 'string') {
              const value = parseFloat(cellValue.toString().replace('%', ''));
              let bgColor = 'E6F3FF'; // Default blue
              if (value >= 80) bgColor = '90EE90'; // Green for high values
              if (value >= 60 && value < 80) bgColor = 'FFE4B5'; // Yellow for medium
              if (value < 60) bgColor = 'FFB6C1'; // Pink for low values
              
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
            } else {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E6F3FF' } };
            }
          }
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
          };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });

      // Add final spacing before data table
      worksheet.addRow([]);
      worksheet.addRow([]);

      // Add separator for data section
      const dataSeparatorRow = worksheet.addRow(['📋 DETAILED REQUEST DATA']);
      dataSeparatorRow.height = 30;
      const dataSeparatorRowNum = kpiRowNum + 4;
      worksheet.mergeCells(`A${dataSeparatorRowNum}:P${dataSeparatorRowNum}`);
      const dataSeparatorCell = worksheet.getCell(`A${dataSeparatorRowNum}`);
      dataSeparatorCell.font = { bold: true, size: 14, color: { argb: 'FFFFFF' } };
      dataSeparatorCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4E79' } };
      dataSeparatorCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Add spacing
      worksheet.addRow([]);

      // Now add the data table header row with professional styling
      const headerRow = worksheet.addRow(exportHeaders);
      headerRow.height = 30;
      
      headerRow.eachCell((cell, colNumber) => {
        cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '1F4E79' } // Dark blue color
        };
        cell.border = {
          top: { style: 'thin', color: { argb: '1F4E79' } },
          left: { style: 'thin', color: { argb: '1F4E79' } },
          bottom: { style: 'thin', color: { argb: '1F4E79' } },
          right: { style: 'thin', color: { argb: '1F4E79' } }
        };
        cell.alignment = { 
          horizontal: 'center', 
          vertical: 'middle',
          wrapText: true
        };
      });

      // Add data rows with alternating colors and professional formatting
      filteredRequests.forEach((request, index) => {
        const row = worksheet.addRow([
          request.id,
          request.subject,
          request.description ? request.description.replace(/<[^>]*>/g, '').substring(0, 100) + (request.description.length > 100 ? '...' : '') : '',
          request.requestType,
          formatStatusText(request.status),
          formatStatusText(request.approvalStatus),
          formatStatusText(request.mode),
          `${request.requester.name}\n${request.requester.employeeId}`, // Multi-line requester info
          request.department,
          formatDate(request.createdAt),
          formatDate(request.dueByTime),
          formatDate(request.resolvedTime),
          request.priority,
          request.technician,
          request.serviceCategory,
          request.template
        ]);

        // Auto-adjust row height based on content (minimum 25, maximum 60)
        const maxLines = Math.max(
          1,
          Math.ceil((request.subject?.length || 0) / 30),
          Math.ceil(((request.description?.replace(/<[^>]*>/g, '') || '').length) / 40),
          2 // Minimum for multi-line requester info
        );
        row.height = Math.min(Math.max(25, maxLines * 15), 60);

        // Apply alternating row colors
        const isEvenRow = index % 2 === 0;
        const fillColor = isEvenRow ? 'FFFFFF' : 'F8F9FA'; // White and light gray

        row.eachCell((cell, colNumber) => {
          // Apply consistent styling
          cell.font = { size: 9, color: { argb: '000000' } };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: fillColor }
          };
          cell.border = {
            top: { style: 'thin', color: { argb: 'D1D5DB' } },
            left: { style: 'thin', color: { argb: 'D1D5DB' } },
            bottom: { style: 'thin', color: { argb: 'D1D5DB' } },
            right: { style: 'thin', color: { argb: 'D1D5DB' } }
          };
          cell.alignment = { 
            horizontal: 'center', 
            vertical: 'middle',
            wrapText: true
          };

          // Special formatting for specific columns
          if (colNumber === 1) { // Request ID - blue and bold
            cell.font = { size: 9, color: { argb: '2563EB' }, bold: true };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else if (colNumber === 2) { // Subject - blue and underlined
            cell.font = { size: 9, color: { argb: '2563EB' }, underline: true };
          } else if (colNumber === 5 || colNumber === 6) { // Status columns
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else if (colNumber === 10 || colNumber === 11 || colNumber === 12) { // Date columns
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else if (colNumber === 13) { // Priority
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            // Color coding for priority
            const priority = request.priority?.toLowerCase();
            if (priority === 'high' || priority === 'critical') {
              cell.font = { size: 9, color: { argb: 'DC2626' }, bold: true };
            } else if (priority === 'medium') {
              cell.font = { size: 9, color: { argb: 'D97706' }, bold: true };
            } else if (priority === 'low') {
              cell.font = { size: 9, color: { argb: '059669' }, bold: true };
            }
          }
        });
      });

      // Auto-adjust column widths and set minimum/maximum widths
      const columnSettings = [
        { min: 8, max: 12 },   // Request ID
        { min: 20, max: 35 },  // Subject
        { min: 25, max: 40 },  // Description
        { min: 12, max: 18 },  // Request Type
        { min: 12, max: 18 },  // Request Status
        { min: 12, max: 18 },  // Approval Status
        { min: 10, max: 15 },  // Mode
        { min: 15, max: 25 },  // Requester
        { min: 15, max: 22 },  // Department
        { min: 12, max: 18 },  // Created At
        { min: 10, max: 15 },  // Due By
        { min: 12, max: 18 },  // Resolved Time
        { min: 10, max: 15 },  // Priority
        { min: 15, max: 22 },  // Technician
        { min: 15, max: 22 },  // Service Category
        { min: 20, max: 30 }   // Template
      ];

      // Auto-adjust columns based on content
      columnSettings.forEach((setting, index) => {
        const column = worksheet.getColumn(index + 1);
        
        // Calculate optimal width based on content
        let maxLength = 0;
        column.eachCell({ includeEmpty: false }, (cell) => {
          const cellValue = cell.value ? cell.value.toString() : '';
          maxLength = Math.max(maxLength, cellValue.length);
        });
        
        // Set width with min/max constraints
        const optimalWidth = Math.min(Math.max(maxLength + 2, setting.min), setting.max);
        column.width = optimalWidth;
        
        // Center align all cells in the column
        column.alignment = { 
          horizontal: 'center', 
          vertical: 'middle',
          wrapText: true
        };
      });

      // Freeze the header row
      worksheet.views = [
        {
          state: 'frozen',
          xSplit: 0,
          ySplit: 7, // Freeze at row 7 (after company header, title, info, and table headers)
          showGridLines: false
        }
      ];

      // Final formatting adjustments
      worksheet.eachRow((row, rowNumber) => {
        // Ensure all cells have proper alignment
        row.eachCell((cell) => {
          if (!cell.alignment) {
            cell.alignment = { 
              horizontal: 'center', 
              vertical: 'middle',
              wrapText: true
            };
          }
        });
        
        // Set minimum row height for better readability
        if (rowNumber > 7 && row.height < 25) { // Data rows only
          row.height = 25;
        }
      });

      // Auto-fit all columns one final time
      worksheet.columns.forEach((column) => {
        if (column && column.eachCell) {
          let maxLength = 0;
          column.eachCell({ includeEmpty: false }, (cell) => {
            const cellValue = cell.value ? cell.value.toString() : '';
            maxLength = Math.max(maxLength, cellValue.length);
          });
          
          // Ensure minimum and maximum width constraints
          const currentWidth = column.width || 10;
          const newWidth = Math.min(Math.max(maxLength + 2, 8), 45);
          if (newWidth > currentWidth * 0.8) { // Only adjust if significantly different
            column.width = newWidth;
          }
        }
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      return new Response(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="ASPAC_IT_Helpdesk_Report_${new Date().toISOString().split('T')[0]}.xlsx"`
        }
      });

    } else if (exportFormat === 'pdf') {
      // Create PDF with basic jsPDF functionality
      const doc = new jsPDF('l', 'mm', 'a4'); // landscape orientation
      const pageWidth = 297; // A4 landscape width in mm
      const pageHeight = 210; // A4 landscape height in mm

      // Add professional header
      // Logo placeholder box
      doc.setFillColor(229, 243, 255); // Light blue background
      doc.rect(20, 8, 40, 25, 'F'); // Logo placeholder rectangle
      doc.setDrawColor(31, 78, 121);
      doc.setLineWidth(0.5);
      doc.rect(20, 8, 40, 25, 'S'); // Border for logo area
      
      // Logo placeholder text
      doc.setFontSize(8);
      doc.setTextColor(31, 78, 121);
      doc.setFont('helvetica', 'bold');
      doc.text('ASPAC LOGO', 40, 23, { align: 'center' });
      
      // Company name header (positioned to the right)
      doc.setFontSize(26);
      doc.setTextColor(31, 78, 121); // Dark blue color #1F4E79
      doc.setFont('helvetica', 'bold');
      doc.text('ASPAC IT HELPDESK SYSTEM', 200, 20, { align: 'left' });
      
      // Report title
      doc.setFontSize(18);
      doc.setTextColor(45, 55, 72); // Darker gray
      doc.setFont('helvetica', 'bold');
      doc.text('IT Helpdesk Export Report', 148, 42, { align: 'center' });
      
      // Add a decorative line under the header
      doc.setLineWidth(1);
      doc.setDrawColor(31, 78, 121);
      doc.line(20, 48, 277, 48); // Horizontal line across the page
      
      // Generation info and metadata
      doc.setFontSize(11);
      doc.setTextColor(107, 114, 128); // Gray color
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 20, 58);
      doc.text(`Total Records: ${filteredRequests.length}`, 20, 64);
      
      // User and page info on the right
      doc.text('Exported by: System Administrator', 200, 58);
      doc.text('Page 1 of 1', 200, 64);

      // Create a simple table manually using basic PDF functions
      let currentY = 75;
      const rowHeight = 8;
      const colWidths = [15, 40, 35, 25, 25, 25, 20, 30, 25, 25, 20, 25, 15, 25, 25, 30];
      let colX = 20;

      // Table header
      doc.setFillColor(31, 78, 121); // Dark blue
      doc.setTextColor(255, 255, 255); // White text
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');

      // Draw header background
      doc.rect(20, currentY, pageWidth - 40, rowHeight, 'F');
      
      // Add header text
      colX = 20;
      exportHeaders.forEach((header, index) => {
        doc.text(header, colX + 2, currentY + 5);
        colX += colWidths[index];
      });

      currentY += rowHeight;
      
      // Table data
      doc.setTextColor(0, 0, 0); // Black text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);

      filteredRequests.slice(0, 15).forEach((request, rowIndex) => { // Limit to first 15 records for PDF
        // Alternate row colors
        if (rowIndex % 2 === 0) {
          doc.setFillColor(248, 249, 250); // Light gray
          doc.rect(20, currentY, pageWidth - 40, rowHeight, 'F');
        }

        colX = 20;
        const rowData = [
          request.id.toString(),
          request.subject.length > 20 ? request.subject.substring(0, 17) + '...' : request.subject,
          request.description ? (request.description.replace(/<[^>]*>/g, '').length > 25 ? request.description.replace(/<[^>]*>/g, '').substring(0, 22) + '...' : request.description.replace(/<[^>]*>/g, '')) : '',
          request.requestType,
          formatStatusText(request.status),
          formatStatusText(request.approvalStatus),
          formatStatusText(request.mode),
          request.requester.name.length > 15 ? request.requester.name.substring(0, 12) + '...' : request.requester.name,
          request.department.length > 15 ? request.department.substring(0, 12) + '...' : request.department,
          formatDate(request.createdAt).substring(0, 16),
          formatDate(request.dueByTime)?.substring(0, 16) || 'N/A',
          formatDate(request.resolvedTime)?.substring(0, 16) || 'N/A',
          request.priority,
          request.technician.length > 15 ? request.technician.substring(0, 12) + '...' : request.technician,
          request.serviceCategory.length > 15 ? request.serviceCategory.substring(0, 12) + '...' : request.serviceCategory,
          request.template.length > 20 ? request.template.substring(0, 17) + '...' : request.template
        ];

        rowData.forEach((cellData, colIndex) => {
          // Special formatting for Request ID (blue text)
          if (colIndex === 0) {
            doc.setTextColor(37, 99, 235); // Blue
            doc.setFont('helvetica', 'bold');
          }
          // Special formatting for Subject (blue text)
          else if (colIndex === 1) {
            doc.setTextColor(37, 99, 235); // Blue
            doc.setFont('helvetica', 'normal');
          }
          // Priority color coding
          else if (colIndex === 12) {
            const priority = request.priority?.toLowerCase();
            if (priority === 'high' || priority === 'critical') {
              doc.setTextColor(220, 38, 38); // Red
              doc.setFont('helvetica', 'bold');
            } else if (priority === 'medium') {
              doc.setTextColor(217, 119, 6); // Orange
              doc.setFont('helvetica', 'bold');
            } else if (priority === 'low') {
              doc.setTextColor(5, 150, 105); // Green
              doc.setFont('helvetica', 'bold');
            } else {
              doc.setTextColor(0, 0, 0); // Black
              doc.setFont('helvetica', 'normal');
            }
          } else {
            doc.setTextColor(0, 0, 0); // Black
            doc.setFont('helvetica', 'normal');
          }
          
          doc.text(cellData, colX + 2, currentY + 5);
          colX += colWidths[colIndex];
        });

        currentY += rowHeight;
        
        // Check if we need a new page
        if (currentY > pageHeight - 30) {
          doc.addPage();
          currentY = 20;
        }
      });

      // Add note if there are more records
      if (filteredRequests.length > 15) {
        currentY += 10;
        doc.setTextColor(107, 114, 128);
        doc.setFontSize(10);
        doc.text(`Note: Showing first 15 records out of ${filteredRequests.length} total records. Use Excel export for complete data.`, 20, currentY);
      }

      const pdfBuffer = doc.output('arraybuffer');

      return new Response(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="ASPAC_IT_Helpdesk_Report_${new Date().toISOString().split('T')[0]}.pdf"`
        }
      });
    }

    return NextResponse.json({ error: 'Invalid export format' }, { status: 400 });

  } catch (error) {
    console.error('Error exporting reports:', error);
    return NextResponse.json(
      { error: 'Failed to export reports' },
      { status: 500 }
    );
  }
}
