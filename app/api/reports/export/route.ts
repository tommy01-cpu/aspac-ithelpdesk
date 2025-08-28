import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper function to capitalize each word
const capitalizeWords = (str: string): string => {
  if (!str) return str;
  return str.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const exportType = searchParams.get('export');
    const searchRequestId = searchParams.get('searchRequestId');
    const searchSubject = searchParams.get('searchSubject');
    const statusFilter = searchParams.get('statusFilter');
    const priorityFilter = searchParams.get('priorityFilter');
    const typeFilter = searchParams.get('typeFilter');
    const approvalStatusFilter = searchParams.get('approvalStatusFilter');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!exportType || !['excel', 'pdf'].includes(exportType)) {
      return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
    }

    // Build the same query as the main API
    const where: any = {};
    
    if (searchRequestId && searchRequestId.trim() !== '') {
      const requestId = parseInt(searchRequestId.trim());
      if (!isNaN(requestId)) {
        where.id = requestId;
      }
    }

    if (searchSubject && searchSubject.trim() !== '') {
      const searchTerm = searchSubject.trim();
      where.OR = [
        // Search in formData JSON fields using field numbers
        {
          formData: {
            path: ['8'],
            string_contains: searchTerm
          }
        },
        {
          formData: {
            path: ['9'],
            string_contains: searchTerm
          }
        },
        // Search in user information
        {
          user: {
            OR: [
              {
                emp_fname: {
                  contains: searchTerm,
                  mode: 'insensitive'
                }
              },
              {
                emp_lname: {
                  contains: searchTerm,
                  mode: 'insensitive'
                }
              },
              {
                emp_code: {
                  contains: searchTerm,
                  mode: 'insensitive'
                }
              }
            ]
          }
        }
      ];
    }

    if (statusFilter && statusFilter !== 'ALL') {
      where.status = statusFilter;
    }

    if (priorityFilter && priorityFilter !== 'ALL') {
      where.priority = priorityFilter;
    }

    if (typeFilter && typeFilter !== 'ALL') {
      where.requestType = typeFilter;
    }

    if (approvalStatusFilter && approvalStatusFilter !== 'ALL') {
      where.approvalStatus = approvalStatusFilter;
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

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
      orderBy: { createdAt: 'desc' }
    });

    // Get templates for lookup
    const templates = await prisma.template.findMany({
      select: {
        id: true,
        name: true,
        type: true
      }
    });

    if (exportType === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('IT Helpdesk Reports');

      // Add header section
      worksheet.mergeCells('A1:K1');
      worksheet.getCell('A1').value = 'IT Helpdesk System - Reports Export';
      worksheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FF2563EB' } };
      worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

      // Add generation date
      worksheet.mergeCells('A2:K2');
      worksheet.getCell('A2').value = `Generated on: ${new Date().toLocaleString()}`;
      worksheet.getCell('A2').font = { size: 11, italic: true };
      worksheet.getCell('A2').alignment = { horizontal: 'center' };

      // Add filter information if any filters are applied
      let filterInfo = '';
      const appliedFilters = [];
      if (searchRequestId) appliedFilters.push(`Request ID: ${searchRequestId}`);
      if (searchSubject) appliedFilters.push(`Search: "${searchSubject}"`);
      if (statusFilter && statusFilter !== 'ALL') appliedFilters.push(`Status: ${statusFilter}`);
      if (priorityFilter && priorityFilter !== 'ALL') appliedFilters.push(`Priority: ${priorityFilter}`);
      if (typeFilter && typeFilter !== 'ALL') appliedFilters.push(`Type: ${typeFilter}`);
      if (approvalStatusFilter && approvalStatusFilter !== 'ALL') appliedFilters.push(`Approval: ${approvalStatusFilter}`);
      if (startDate && endDate) appliedFilters.push(`Date Range: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`);

      if (appliedFilters.length > 0) {
        worksheet.mergeCells('A3:K3');
        worksheet.getCell('A3').value = `Filters Applied: ${appliedFilters.join(', ')}`;
        worksheet.getCell('A3').font = { size: 10, color: { argb: 'FF6B7280' } };
        worksheet.getCell('A3').alignment = { horizontal: 'center' };
      }

      // Add summary information
      const summaryRow = appliedFilters.length > 0 ? 4 : 3;
      worksheet.mergeCells(`A${summaryRow}:K${summaryRow}`);
      worksheet.getCell(`A${summaryRow}`).value = `Total Records: ${requests.length}`;
      worksheet.getCell(`A${summaryRow}`).font = { size: 11, bold: true };
      worksheet.getCell(`A${summaryRow}`).alignment = { horizontal: 'center' };

      // Add empty row for spacing
      const headerRow = summaryRow + 2;

      // Set up columns starting from the header row
      const columns = [
        { header: 'Request ID', key: 'id', width: 12 },
        { header: 'Subject', key: 'subject', width: 30 },
        { header: 'Type', key: 'requestType', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Approval Status', key: 'approvalStatus', width: 18 },
        { header: 'Priority', key: 'priority', width: 12 },
        { header: 'Requester', key: 'requesterName', width: 20 },
        { header: 'Employee ID', key: 'employeeId', width: 15 },
        { header: 'Department', key: 'department', width: 20 },
        { header: 'Created At', key: 'createdAt', width: 20 },
        { header: 'Template', key: 'requestTemplate', width: 25 }
      ];

      // Set column headers manually
      columns.forEach((col, index) => {
        const cell = worksheet.getCell(headerRow, index + 1);
        cell.value = col.header;
        worksheet.getColumn(index + 1).width = col.width;
      });

      // Style the data header row
      worksheet.getRow(headerRow).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(headerRow).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F2937' }
      };
      worksheet.getRow(headerRow).alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(headerRow).border = {
        top: { style: 'thick' },
        left: { style: 'thick' },
        bottom: { style: 'thick' },
        right: { style: 'thick' }
      };

      // Add data starting from the row after headers
      let currentRow = headerRow + 1;
      requests.forEach((request, index) => {
        const template = templates.find(t => t.id.toString() === request.templateId);
        const formData = request.formData as any;
        const subject = formData?.['8'] || formData?.['9'] || 'No Subject';
        const status = request.status;
        const approvalStatus = request.approvals?.length > 0 
          ? request.approvals[request.approvals.length - 1]?.status || 'PENDING'
          : 'NOT_REQUIRED';

        const rowData = [
          request.id,
          capitalizeWords(subject),
          capitalizeWords(template?.type || 'Unknown'),
          capitalizeWords(status.replace('_', ' ')),
          capitalizeWords(approvalStatus.replace('_', ' ')),
          'Medium', // Default priority since it's not in template
          capitalizeWords(`${request.user.emp_fname || ''} ${request.user.emp_lname || ''}`.trim()),
          request.user.emp_code,
          capitalizeWords(request.user.userDepartment?.name || 'Unknown'),
          new Date(request.createdAt).toLocaleString(),
          capitalizeWords(template?.name || 'Unknown Template')
        ];

        // Add data to row
        rowData.forEach((value, colIndex) => {
          worksheet.getCell(currentRow, colIndex + 1).value = value;
        });

        // Alternate row colors for better readability
        if (index % 2 === 0) {
          worksheet.getRow(currentRow).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF9FAFB' }
          };
        }

        // Add borders to data rows
        worksheet.getRow(currentRow).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };

        currentRow++;
      });

      // Generate Excel file
      const buffer = await workbook.xlsx.writeBuffer();

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="it-helpdesk-reports-${new Date().toISOString().split('T')[0]}.xlsx"`
        }
      });

    } else if (exportType === 'pdf') {
      const pdf = new jsPDF();
      
      // Add title
      pdf.setFontSize(16);
      pdf.text('IT Helpdesk Reports', 14, 22);
      
      // Add generation date
      pdf.setFontSize(10);
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, 14, 32);

      // Prepare data for table
      const tableData = requests.map(request => {
        const template = templates.find(t => t.id.toString() === request.templateId);
        const formData = request.formData as any;
        const subject = formData?.['8'] || formData?.['9'] || 'No Subject';
        const status = request.status;
        const approvalStatus = request.approvals?.length > 0 
          ? request.approvals[request.approvals.length - 1]?.status || 'PENDING'
          : 'NOT_REQUIRED';
        const requesterName = `${request.user.emp_fname || ''} ${request.user.emp_lname || ''}`.trim();
        const department = request.user.userDepartment?.name || 'Unknown';
        const templateName = template?.name || 'Unknown Template';

        return [
          request.id.toString(),
          capitalizeWords(subject.substring(0, 20) + (subject.length > 20 ? '...' : '')),
          capitalizeWords(template?.type || 'Unknown'),
          capitalizeWords(status.replace('_', ' ')),
          capitalizeWords(approvalStatus.replace('_', ' ')),
          'Medium', // Default priority
          capitalizeWords(requesterName.substring(0, 15) + (requesterName.length > 15 ? '...' : '')),
          request.user.emp_code,
          capitalizeWords(department.substring(0, 15) + (department.length > 15 ? '...' : '')),
          new Date(request.createdAt).toLocaleDateString(),
          capitalizeWords(templateName.substring(0, 15) + (templateName.length > 15 ? '...' : ''))
        ];
      });

      // Add table
      autoTable(pdf, {
        head: [['ID', 'Subject', 'Type', 'Status', 'Approval', 'Priority', 'Requester', 'Emp ID', 'Department', 'Created', 'Template']],
        body: tableData,
        startY: 40,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [224, 224, 224] },
        margin: { top: 40 }
      });

      const pdfBuffer = pdf.output('arraybuffer');

      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="it-helpdesk-reports-${new Date().toISOString().split('T')[0]}.pdf"`
        }
      });
    }

    return NextResponse.json({ error: 'Export type not implemented' }, { status: 501 });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
