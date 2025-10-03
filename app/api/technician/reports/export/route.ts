import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';

// Helper functions to match main reports formatting exactly
const capitalizeWords = (str: string) => {
  if (!str) return str;
  return str.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.toLowerCase().slice(1)
  ).join(' ');
};

const formatStatusText = (text: string) => {
  if (!text) return text;
  return capitalizeWords(text.replace(/_/g, ' '));
};

const preserveDescriptionFormatting = (description: string) => {
  if (!description) return 'N/A';
  
  // Convert HTML to text while preserving structure and formatting
  let formatted = description
    // Convert HTML breaks to newlines
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/div>/gi, '\n')
    .replace(/<div[^>]*>/gi, '')
    
    // Convert HTML lists to text bullets
    .replace(/<ul[^>]*>/gi, '')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    
    // Remove remaining HTML tags but preserve the content
    .replace(/<[^>]*>/g, '')
    
    // Convert common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    
    // Clean up excessive whitespace while preserving intentional formatting
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/^[\s\n]+|[\s\n]+$/g, '')
    .trim();
    
  return formatted || 'N/A';
};

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
    const exportFormat = searchParams.get('export') || 'excel';
    
    // Support main reports API compatible parameters
    const fields = searchParams.get('fields')?.split(',') || [];
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
    const searchRequestId = searchParams.get('searchRequestId');
    const searchSubject = searchParams.get('searchSubject');

    if (!['csv', 'json', 'excel'].includes(exportFormat)) {
      return NextResponse.json({ error: "Invalid format. Must be 'csv', 'json', or 'excel'" }, { status: 400 });
    }

    // Default fields if none specified (matching main reports structure)
    const defaultFields = fields.length === 0 ? [
      'requestId', 'requestSubject', 'requestDescription', 'requestType', 'requestStatus', 
      'approvalStatus', 'mode', 'requester', 'department', 'priority', 'technician', 
      'serviceCategory', 'requestTemplate', 'createdTime', 'dueByTime', 'resolvedTime'
    ] : fields;

    // Build where clause (matching main reports API)
    const whereClause: any = {};

    // Handle date filters
    if (createdTimeFrom || createdTimeTo) {
      whereClause.createdAt = {};
      if (createdTimeFrom) {
        whereClause.createdAt.gte = new Date(createdTimeFrom);
      }
      if (createdTimeTo) {
        whereClause.createdAt.lte = new Date(createdTimeTo + 'T23:59:59.999Z');
      }
    }

    // Handle status filters
    if (requestStatus) {
      whereClause.status = requestStatus;
    }

    // Handle template filter
    if (templateId) {
      whereClause.templateId = templateId;
    }

    // Handle requester filter
    if (requesterId) {
      whereClause.userId = parseInt(requesterId);
    }

    // Handle search filters
    if (searchRequestId) {
      whereClause.id = parseInt(searchRequestId);
    }

    if (searchSubject) {
      whereClause.OR = [
        {
          user: {
            emp_fname: {
              contains: searchSubject,
              mode: 'insensitive'
            }
          }
        },
        {
          user: {
            emp_lname: {
              contains: searchSubject,
              mode: 'insensitive'
            }
          }
        }
      ];
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

    // Field labels (matching main reports)
    const fieldLabels: { [key: string]: string } = {
      requestId: 'Request ID',
      requestSubject: 'Subject',
      requestDescription: 'Description',
      requestType: 'Request Type',
      requestStatus: 'Request Status',
      approvalStatus: 'Approval Status',
      mode: 'Mode',
      requester: 'Requester',
      department: 'Department',
      priority: 'Priority',
      technician: 'Technician',
      serviceCategory: 'Service Category',
      requestTemplate: 'Template',
      createdTime: 'Created At',
      dueByTime: 'Due By',
      resolvedTime: 'Resolved Time'
    };

    // Format the data (simplified version for technician reports)
    const formattedData = requests.map(request => {
      const record: any = {};
      const template = templateMap.get(request.templateId);

      defaultFields.forEach(field => {
        const label = fieldLabels[field] || field;
        
        switch (field) {
          case 'requestId':
            record[label] = request.id.toString();
            break;
          case 'requestSubject':
            try {
              const formData = typeof request.formData === 'string' ? JSON.parse(request.formData) : request.formData;
              record[label] = (formData as any)?.['8'] || (formData as any)?.subject || template?.name || `Request #${request.id}`;
            } catch {
              record[label] = template?.name || `Request #${request.id}`;
            }
            break;
          case 'requestDescription':
            try {
              const formData = typeof request.formData === 'string' ? JSON.parse(request.formData) : request.formData;
              const desc = (formData as any)?.['9'] || (formData as any)?.description || '';
              record[label] = preserveDescriptionFormatting(desc);
            } catch {
              record[label] = '';
            }
            break;
          case 'requestType':
            record[label] = template?.type || 'Service';
            break;
          case 'requestStatus':
            record[label] = formatStatusText(request.status || '');
            break;
          case 'approvalStatus':
            const latestApproval = request.approvals[0];
            record[label] = formatStatusText(latestApproval?.status || 'N/A');
            break;
          case 'mode':
            try {
              const formData = typeof request.formData === 'string' ? JSON.parse(request.formData) : request.formData;
              record[label] = capitalizeWords((formData as any)?.mode || 'Online');
            } catch {
              record[label] = 'Online';
            }
            break;
          case 'requester':
            const fullName = [
              request.user.emp_fname,
              request.user.emp_mid,
              request.user.emp_lname
            ].filter(Boolean).join(' ');
            record[label] = fullName || '-';
            break;
          case 'department':
            record[label] = capitalizeWords(request.user.department || '-');
            break;
          case 'priority':
            try {
              const formData = typeof request.formData === 'string' ? JSON.parse(request.formData) : request.formData;
              record[label] = capitalizeWords((formData as any)?.['2'] || (formData as any)?.priority || 'Medium');
            } catch {
              record[label] = 'Medium';
            }
            break;
          case 'technician':
            try {
              const formData = typeof request.formData === 'string' ? JSON.parse(request.formData) : request.formData;
              const technicianName = (formData as any)?.assignedTechnician || 'Unassigned';
              record[label] = capitalizeWords(technicianName);
            } catch {
              record[label] = 'Unassigned';
            }
            break;
          case 'serviceCategory':
            record[label] = capitalizeWords(template?.category?.name || '');
            break;
          case 'requestTemplate':
            record[label] = template?.name || '';
            break;
          case 'createdTime':
            record[label] = request.createdAt ? format(new Date(request.createdAt), 'MMMM dd, yyyy') : '';
            break;
          case 'dueByTime':
            try {
              const formData = typeof request.formData === 'string' ? JSON.parse(request.formData) : request.formData;
              const dueDate = (formData as any)?.due_date;
              record[label] = dueDate ? format(new Date(dueDate), 'MMMM dd, yyyy') : '';
            } catch {
              record[label] = '';
            }
            break;
          case 'resolvedTime':
            const resolvedDate = request.history[0]?.timestamp;
            record[label] = resolvedDate ? format(new Date(resolvedDate), 'MMMM dd, yyyy') : '';
            break;
          default:
            record[label] = '-';
        }
      });

      return record;
    });

    if (exportFormat === 'excel') {
      // Create Excel workbook with main reports formatting
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('ASPAC IT Helpdesk Report');

      // Set up worksheet properties (matching main reports)
      worksheet.properties.defaultRowHeight = 20;
      worksheet.views = [{ showGridLines: false }];
      
      // Set standard column width
      worksheet.getColumn(1).width = 30;

      // Row 1: IT HELPDESK SYSTEM (matching main reports exactly)
      const systemRow = worksheet.addRow(['IT HELPDESK SYSTEM']);
      systemRow.getCell(1).font = { size: 12, bold: true, color: { argb: '000000' }, name: 'Arial' };
      systemRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      systemRow.height = 25;

      // Row 2: IT Helpdesk Export Report
      const titleRow = worksheet.addRow(['IT Helpdesk Export Report']);
      titleRow.getCell(1).font = { size: 11, bold: false, color: { argb: '555555' }, name: 'Arial' };
      titleRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      titleRow.height = 22;

      // Row 3: Generated info
      const currentDate = new Date();
      const userName = session?.user?.name || 'System Administrator';
      
      const infoRow1 = worksheet.addRow([`Generated: ${currentDate.toLocaleDateString()} at ${currentDate.toLocaleTimeString()}`]);
      infoRow1.getCell(1).font = { size: 10, color: { argb: '6B7280' }, name: 'Arial' };
      infoRow1.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      infoRow1.height = 20;
      
      // Row 4: Exported by info  
      const infoRow2 = worksheet.addRow([`Exported by: ${userName} | Total Records: ${formattedData.length}`]);
      infoRow2.getCell(1).font = { size: 10, color: { argb: '6B7280' }, name: 'Arial' };
      infoRow2.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      infoRow2.height = 20;

      // Row 5: Applied Filters (matching main reports format)
      const appliedFilters = [];
      
      if (requestType) appliedFilters.push(`Request Type: ${capitalizeWords(requestType)}`);
      if (requestStatus) appliedFilters.push(`Status: ${formatStatusText(requestStatus)}`);
      if (approvalStatus) appliedFilters.push(`Approval: ${formatStatusText(approvalStatus)}`);
      if (mode) appliedFilters.push(`Mode: ${capitalizeWords(mode)}`);
      if (priority) appliedFilters.push(`Priority: ${capitalizeWords(priority)}`);
      if (createdTimeFrom || createdTimeTo) {
        let dateRange = 'Created: ';
        if (createdTimeFrom && createdTimeTo) {
          dateRange += `${format(new Date(createdTimeFrom), 'MMMM dd, yyyy')} to ${format(new Date(createdTimeTo), 'MMMM dd, yyyy')}`;
        } else if (createdTimeFrom) {
          dateRange += `From ${format(new Date(createdTimeFrom), 'MMMM dd, yyyy')}`;
        } else if (createdTimeTo) {
          dateRange += `Until ${format(new Date(createdTimeTo), 'MMMM dd, yyyy')}`;
        }
        appliedFilters.push(dateRange);
      }
      if (searchRequestId) appliedFilters.push(`Request ID: "${searchRequestId}"`);
      if (searchSubject) appliedFilters.push(`Search: "${searchSubject}"`);
      
      // Add filters row
      let filtersRow;
      if (appliedFilters.length > 0) {
        const filterText = `Applied Filters: ${appliedFilters.join(' | ')}`;
        filtersRow = worksheet.addRow([filterText]);
        filtersRow.getCell(1).font = { size: 10, color: { argb: '059669' }, bold: true, name: 'Arial' };
        filtersRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
        filtersRow.height = 20;
      } else {
        filtersRow = worksheet.addRow(['Applied Filters: None (All records)']);
        filtersRow.getCell(1).font = { size: 10, color: { argb: '6B7280' }, name: 'Arial' };
        filtersRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
        filtersRow.height = 20;
      }

      // Headers
      const exportHeaders = defaultFields.map(field => fieldLabels[field] || field);
      
      // Add the data table header row (matching main reports)
      const headerRow = worksheet.addRow(exportHeaders);
      headerRow.height = 35;
      
      headerRow.eachCell((cell, colNumber) => {
        cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 12, name: 'Arial' };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '1F4E79' }
        };
        cell.border = {
          top: { style: 'medium', color: { argb: '1F4E79' } },
          left: { style: 'medium', color: { argb: '1F4E79' } },
          bottom: { style: 'medium', color: { argb: '1F4E79' } },
          right: { style: 'medium', color: { argb: '1F4E79' } }
        };
        cell.alignment = { 
          horizontal: 'center', 
          vertical: 'middle',
          wrapText: true
        };
      });

      // Add data rows (matching main reports formatting)
      formattedData.forEach((record, index) => {
        const values = exportHeaders.map(header => record[header] || '');
        const row = worksheet.addRow(values);

        // Calculate row height based on content
        const maxLines = Math.max(
          ...values.map(value => {
            const str = String(value || '');
            const lines = (str.match(/\n/g) || []).length + 1;
            const wrapLines = Math.ceil(str.length / 60);
            return Math.max(lines, wrapLines);
          }),
          1
        );
        
        row.height = Math.min(Math.max(25 + ((maxLines - 1) * 18), 30), 200);

        // Apply professional styling to each cell
        row.eachCell((cell, colNumber) => {
          cell.font = { size: 9, color: { argb: '000000' }, name: 'Arial' };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFF' }
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

          // Special formatting for specific field types
          const fieldName = defaultFields[colNumber - 1];
          const value = String(cell.value || '');
          
          if (fieldName === 'requestId') {
            cell.font = { size: 9, color: { argb: '2563EB' }, bold: true };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else if (fieldName === 'requestSubject') {
            cell.font = { size: 9, color: { argb: '2563EB' }, underline: true };
            cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
          } else if (fieldName === 'requestDescription') {
            cell.font = { size: 9, color: { argb: '374151' }, name: 'Arial' };
            cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true, indent: 1 };
          } else if (fieldName === 'priority') {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            const priority = value.toLowerCase();
            if (priority === 'high' || priority === 'critical') {
              cell.font = { size: 9, color: { argb: 'DC2626' }, bold: true };
            } else if (priority === 'medium') {
              cell.font = { size: 9, color: { argb: 'D97706' }, bold: true };
            } else if (priority === 'low') {
              cell.font = { size: 9, color: { argb: '059669' }, bold: true };
            }
          } else if (fieldName === 'requestStatus' || fieldName === 'approvalStatus') {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else if (fieldName.includes('Time') || fieldName.includes('At')) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          }
        });
      });

      // Auto-adjust column widths
      const columnSettings = exportHeaders.map((header, index) => {
        const fieldName = defaultFields[index];
        if (fieldName === 'requestId') return { min: 10, autoWidth: true };
        if (fieldName === 'requestSubject') return { min: 25, autoWidth: true };
        if (fieldName === 'requestDescription') return { min: 40, autoWidth: true };
        if (fieldName === 'requester') return { min: 20, autoWidth: true };
        if (fieldName === 'technician') return { min: 18, autoWidth: true };
        return { min: 15, autoWidth: true };
      });

      columnSettings.forEach((setting, index) => {
        const column = worksheet.getColumn(index + 1);
        let maxLength = setting.min;
        
        column.eachCell({ includeEmpty: false }, (cell) => {
          if (cell.value) {
            const cellValue = cell.value.toString();
            if (defaultFields[index] === 'requestDescription') {
              const lines = cellValue.split('\n');
              const longestLine = Math.max(...lines.map(line => line.length));
              maxLength = Math.max(maxLength, Math.min(longestLine + 5, 80));
            } else {
              maxLength = Math.max(maxLength, cellValue.length + 3);
            }
          }
        });
        
        column.width = maxLength;
      });

      // Add AutoFilter for sorting capability
      const headerRowNumber = 6;
      const lastDataRow = headerRowNumber + formattedData.length;
      const lastColumn = exportHeaders.length;
      
      if (formattedData.length > 0) {
        worksheet.autoFilter = {
          from: { row: headerRowNumber, column: 1 },
          to: { row: lastDataRow, column: lastColumn }
        };
      }

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      return new NextResponse(buffer, {
        headers: {
          'Content-Disposition': `attachment; filename="ASPAC_IT_Helpdesk_Report_${new Date().toISOString().split('T')[0]}.xlsx"`,
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      });
    }

    return NextResponse.json({ error: "Format not implemented yet" }, { status: 400 });

  } catch (error) {
    console.error("Error exporting report:", error);
    return NextResponse.json(
      { error: "Failed to export report" },
      { status: 500 }
    );
  }
}