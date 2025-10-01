import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { getAssignedTechnicianName } from '@/lib/technician-lookup';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import fs from 'fs';
import path from 'path';

// Helper functions to match frontend formatting exactly
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

const getTechnicianName = (technicianData: any) => {
  if (!technicianData) return 'Unassigned';
  
  // If it's already a name (string), return it capitalized
  if (typeof technicianData === 'string') {
    // Don't capitalize if it's already a proper name or "Unassigned"
    if (technicianData === 'Unassigned' || technicianData === 'null' || technicianData === '') {
      return 'Unassigned';
    }
    // If it looks like a position/title, return as-is with proper capitalization
    return capitalizeWords(technicianData);
  }
  
  return 'Unassigned';
};

// Function to preserve description formatting including indentation and bullets
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
    
    // Convert ordered lists to numbered bullets  
    .replace(/<ol[^>]*>/gi, '')
    .replace(/<\/ol>/gi, '\n')
    
    // Preserve headings with formatting (remove bold markers since we're not rendering markdown)
    .replace(/<h[1-6][^>]*>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, ':\n')
    
    // Remove strong/bold formatting markers (don't add ** since we're not rendering markdown)
    .replace(/<strong[^>]*>/gi, '')
    .replace(/<\/strong>/gi, '')
    .replace(/<b[^>]*>/gi, '')
    .replace(/<\/b>/gi, '')
    
    // Remove emphasis/italic formatting markers
    .replace(/<em[^>]*>/gi, '')
    .replace(/<\/em>/gi, '')
    .replace(/<i[^>]*>/gi, '')
    .replace(/<\/i>/gi, '')
    
    // Convert indentation (HTML spaces and tabs) - Enhanced for better structure
    .replace(/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/gi, '        ') // 8 spaces
    .replace(/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/gi, '      ') // 6 spaces  
    .replace(/&nbsp;&nbsp;&nbsp;&nbsp;/gi, '    ') // 4 spaces for tab-like indentation
    .replace(/&nbsp;&nbsp;/gi, '  ') // 2 spaces for smaller indentation
    .replace(/&nbsp;/gi, ' ')
    
    // Convert common HTML entities - Enhanced
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&rarr;/gi, '→') // Right arrow
    .replace(/&larr;/gi, '←') // Left arrow
    .replace(/&uarr;/gi, '↑') // Up arrow
    .replace(/&darr;/gi, '↓') // Down arrow
    
    // Remove remaining HTML tags but preserve the content
    .replace(/<[^>]*>/g, '')
    
    // Clean up excessive whitespace while preserving intentional formatting
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Convert multiple newlines to double newlines
    .replace(/^[\s\n]+|[\s\n]+$/g, '') // Trim leading/trailing whitespace
    .replace(/[ \t]+$/gm, '') // Remove trailing spaces from each line
    .replace(/^[ \t]+/gm, (match) => match) // Preserve leading spaces (indentation)
    
    // Ensure bullets are properly spaced and formatted - Enhanced
    .replace(/\n•/g, '\n• ')
    .replace(/• {2,}/g, '• ')
    // Handle different bullet types
    .replace(/\n\*\s/g, '\n• ')
    .replace(/\n-\s/g, '\n• ')
    .replace(/\n\+\s/g, '\n• ')
    // Handle numbered lists
    .replace(/\n(\d+)\.\s/g, '\n$1. ')
    
    // Handle long lines that will wrap in Excel (approximately 50 characters per line)
    .split('\n')
    .map(line => {
      if (line.length > 50) {
        // For long lines, add additional newlines for wrapping calculation
        const wrappedLines = Math.ceil(line.length / 50);
        return line + '\n'.repeat(wrappedLines - 1);
      }
      return line;
    })
    .join('\n');
  
  return formatted || 'N/A';
};

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
          // Fallback to stored names (legacy data) - assignedTechnician removed
          const technicianName = formData.assignedTechnicianName || 
                                formData['assigned technician'] ||
                                formData.assigned_technician || 
                                formData.assignedTo ||
                                formData.technician ||
                                null;
          
          return technicianName && technicianName.toString().trim() !== '' 
            ? technicianName.toString().trim() 
            : (formData.assignedTechnicianId ? `Assigned (ID: ${formData.assignedTechnicianId})` : 'Unassigned');
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

    // Apply date filters for Due By Time - exclude N/A values when filtering is active
    if (dueByTimeFrom || dueByTimeTo) {
      filteredRequests = filteredRequests.filter(req => {
        const dueByTime = req.dueByTime;
        
        // If there's no due by time (N/A), exclude it when date filter is active
        if (!dueByTime || dueByTime === null) {
          return false;
        }
        
        const dueDate = new Date(dueByTime);
        
        // Check if the date is valid
        if (isNaN(dueDate.getTime())) {
          return false;
        }
        
        // Apply from date filter
        if (dueByTimeFrom) {
          const fromDate = new Date(dueByTimeFrom);
          if (dueDate < fromDate) {
            return false;
          }
        }
        
        // Apply to date filter
        if (dueByTimeTo) {
          const toDate = new Date(dueByTimeTo + 'T23:59:59.999Z'); // End of day
          if (dueDate > toDate) {
            return false;
          }
        }
        
        return true;
      });
    }

    // Apply date filters for Resolved Time - exclude N/A values when filtering is active
    if (resolvedTimeFrom || resolvedTimeTo) {
      filteredRequests = filteredRequests.filter(req => {
        const resolvedTime = req.resolvedTime;
        
        // If there's no resolved time (N/A), exclude it when date filter is active
        if (!resolvedTime || resolvedTime === null) {
          return false;
        }
        
        const resolvedDate = new Date(resolvedTime);
        
        // Check if the date is valid
        if (isNaN(resolvedDate.getTime())) {
          return false;
        }
        
        // Apply from date filter
        if (resolvedTimeFrom) {
          const fromDate = new Date(resolvedTimeFrom);
          if (resolvedDate < fromDate) {
            return false;
          }
        }
        
        // Apply to date filter
        if (resolvedTimeTo) {
          const toDate = new Date(resolvedTimeTo + 'T23:59:59.999Z'); // End of day
          if (resolvedDate > toDate) {
            return false;
          }
        }
        
        return true;
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

    // Set up headers for export - EXACTLY matching frontend table order
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
      // Set standard column width
      worksheet.getColumn(1).width = 30;

      // Row 1: IT HELPDESK SYSTEM left-aligned with improved styling
      const systemRow = worksheet.addRow(['IT HELPDESK SYSTEM']);
      systemRow.getCell(1).font = { size: 12, bold: true, color: { argb: '000000' }, name: 'Arial' }; // Increased font size
      systemRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      systemRow.height = 25; // Set explicit height

      // Row 2: IT Helpdesk Export Report with improved styling  
      const titleRow = worksheet.addRow(['IT Helpdesk Export Report']);
      titleRow.getCell(1).font = { size: 11, bold: false, color: { argb: '555555' }, name: 'Arial' }; // Slightly darker gray
      titleRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      titleRow.height = 22; // Set explicit height

      // Row 3: Generated and exported by info
      const currentDate = new Date();
      const userName = user ? `${user.emp_fname} ${user.emp_lname}`.trim() : 'System Administrator';
      
      const infoRow1 = worksheet.addRow([`Generated: ${currentDate.toLocaleDateString()} at ${currentDate.toLocaleTimeString()}`]);
      infoRow1.getCell(1).font = { size: 10, color: { argb: '6B7280' }, name: 'Arial' };
      infoRow1.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      infoRow1.height = 20; // Set explicit height
      
      // Row 4: Exported by info  
      const infoRow2 = worksheet.addRow([`Exported by: ${userName} | Total Records: ${filteredRequests.length}`]);
      infoRow2.getCell(1).font = { size: 10, color: { argb: '6B7280' }, name: 'Arial' };
      infoRow2.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      infoRow2.height = 20; // Set explicit height

      // Row 5: Applied Filters - Only show if filters are applied
      const appliedFilters = [];
      
      // Build filter description
      if (requestType) appliedFilters.push(`Request Type: ${capitalizeWords(requestType)}`);
      if (requestStatus) appliedFilters.push(`Status: ${formatStatusText(requestStatus)}`);
      if (approvalStatus) appliedFilters.push(`Approval: ${formatStatusText(approvalStatus)}`);
      if (mode) appliedFilters.push(`Mode: ${capitalizeWords(mode)}`);
      if (priority) appliedFilters.push(`Priority: ${capitalizeWords(priority)}`);
      if (departmentId) {
        // Try to get department name from processed requests
        const deptName = filteredRequests.length > 0 ? filteredRequests[0].department : 'Selected Department';
        appliedFilters.push(`Department: ${deptName}`);
      }
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
      if (dueByTimeFrom || dueByTimeTo) {
        let dateRange = 'Due By: ';
        if (dueByTimeFrom && dueByTimeTo) {
          dateRange += `${format(new Date(dueByTimeFrom), 'MMMM dd, yyyy')} to ${format(new Date(dueByTimeTo), 'MMMM dd, yyyy')}`;
        } else if (dueByTimeFrom) {
          dateRange += `From ${format(new Date(dueByTimeFrom), 'MMMM dd, yyyy')}`;
        } else if (dueByTimeTo) {
          dateRange += `Until ${format(new Date(dueByTimeTo), 'MMMM dd, yyyy')}`;
        }
        appliedFilters.push(dateRange);
      }
      if (resolvedTimeFrom || resolvedTimeTo) {
        let dateRange = 'Resolved: ';
        if (resolvedTimeFrom && resolvedTimeTo) {
          dateRange += `${format(new Date(resolvedTimeFrom), 'MMMM dd, yyyy')} to ${format(new Date(resolvedTimeTo), 'MMMM dd, yyyy')}`;
        } else if (resolvedTimeFrom) {
          dateRange += `From ${format(new Date(resolvedTimeFrom), 'MMMM dd, yyyy')}`;
        } else if (resolvedTimeTo) {
          dateRange += `Until ${format(new Date(resolvedTimeTo), 'MMMM dd, yyyy')}`;
        }
        appliedFilters.push(dateRange);
      }
      if (searchRequestId) appliedFilters.push(`Request ID: "${searchRequestId}"`);
      if (searchSubject) appliedFilters.push(`Search: "${searchSubject}"`);
      
      // Add filters row if any filters are applied
      let filtersRow;
      if (appliedFilters.length > 0) {
        const filterText = `Applied Filters: ${appliedFilters.join(' | ')}`;
        filtersRow = worksheet.addRow([filterText]);
        filtersRow.getCell(1).font = { size: 10, color: { argb: '059669' }, bold: true, name: 'Arial' }; // Green text for filters
        filtersRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
        filtersRow.height = 20;
      } else {
        filtersRow = worksheet.addRow(['Applied Filters: None (All records)']);
        filtersRow.getCell(1).font = { size: 10, color: { argb: '6B7280' }, name: 'Arial' }; // Gray text
        filtersRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
        filtersRow.height = 20;
      }

      // Now add the data table header row with professional styling optimized for sorting
      const headerRow = worksheet.addRow(exportHeaders);
      headerRow.height = 35; // Increased height for better presentation with sort arrows
      
      headerRow.eachCell((cell, colNumber) => {
        cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 12, name: 'Arial' }; // Increased font size
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '1F4E79' } // Dark blue color
        };
        cell.border = {
          top: { style: 'medium', color: { argb: '1F4E79' } }, // Thicker borders
          left: { style: 'medium', color: { argb: '1F4E79' } },
          bottom: { style: 'medium', color: { argb: '1F4E79' } },
          right: { style: 'medium', color: { argb: '1F4E79' } }
        };
        
        // Apply center alignment to ALL headers, especially Description (column 3)
        cell.alignment = { 
          horizontal: 'center', 
          vertical: 'middle',
          wrapText: true
        };
      });

      // Add data rows with alternating colors and professional formatting - EXACTLY matching frontend
      filteredRequests.forEach((request, index) => {
        const row = worksheet.addRow([
          request.id,
          request.subject || 'N/A',
          preserveDescriptionFormatting(request.description), // Preserve formatting including indents and bullets
          capitalizeWords(request.requestType || ''),
          formatStatusText(request.status || 'Unknown'),
          formatStatusText(request.approvalStatus || ''),
          capitalizeWords(request.mode || 'Standard'),
          `${request.requester.name}\n${request.requester.employeeId || ''}`, // Multi-line as shown in frontend
          capitalizeWords(request.department || ''),
          request.createdAt ? format(new Date(request.createdAt), 'MMMM dd, yyyy') : 'N/A',
          request.dueByTime ? format(new Date(request.dueByTime), 'MMMM dd, yyyy') : 'N/A',
          request.resolvedTime ? format(new Date(request.resolvedTime), 'MMMM dd, yyyy') : 'N/A',
          capitalizeWords(request.priority || ''),
          getTechnicianName(request.technician),
          request.serviceCategory || 'N/A',
          request.template || 'N/A'
        ]);

        // Auto-adjust row height based on content including preserved description formatting
        const formattedDescription = preserveDescriptionFormatting(request.description);
        const descriptionLines = (formattedDescription.match(/\n/g) || []).length + 1;
        
        // Calculate lines for other potentially long columns
        const subjectLines = Math.ceil((request.subject?.length || 0) / 30); // Characters per line in subject
        const requesterLines = 2; // Always 2 lines for name + employee ID
        
        // For description, also consider line length (if lines are very long, they'll wrap)
        const descriptionLongestLine = Math.max(...formattedDescription.split('\n').map(line => line.length));
        const descriptionWrapLines = Math.ceil(descriptionLongestLine / 60); // Approx 60 chars per line at current width
        const effectiveDescriptionLines = Math.max(descriptionLines, descriptionWrapLines);
        
        // Calculate the maximum lines needed across all columns
        const maxLines = Math.max(
          effectiveDescriptionLines, // Description with word wrap consideration
          subjectLines,              // Subject might wrap
          requesterLines,            // Requester info (name + employee ID)
          1                          // Minimum 1 line
        );
        
        // Set row height based on content - generous height for readability
        // Base height of 25 + (18 pixels per additional line) for better spacing
        const calculatedHeight = 25 + ((maxLines - 1) * 18);
        row.height = Math.min(Math.max(calculatedHeight, 30), 200); // Min 30, Max 200 pixels

        // Force all data rows to white background to eliminate blue highlighting issue
        const fillColor = 'FFFFFF'; // Force all rows to white

        // Apply styling to each cell individually
        row.eachCell((cell, colNumber) => {
          // Apply fresh styling with Arial font
          cell.font = { size: 9, color: { argb: '000000' }, name: 'Arial' };
          
          // Explicitly force the background color to override any Excel defaults
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
            cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
          } else if (colNumber === 3) { // Description - preserve formatting with special alignment
            cell.font = { 
              size: 9, 
              color: { argb: '374151' }, 
              name: 'Arial' // Arial font for better readability
            }; 
            cell.alignment = { 
              horizontal: 'left', 
              vertical: 'top', 
              wrapText: true,
              indent: 1 // Add slight indent for better readability
            };
          } else if (colNumber === 5 || colNumber === 6) { // Status columns
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else if (colNumber === 8) { // Requester column (multi-line)
            cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
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

      // Auto-adjust column widths with minimum widths but no maximum limits
      const columnSettings = [
        { min: 10, autoWidth: true },   // Request ID
        { min: 25, autoWidth: true },   // Subject
        { min: 40, autoWidth: true },   // Description - minimum 40, auto-expand as needed
        { min: 18, autoWidth: true },   // Request Type - increased from 15 to 18
        { min: 15, autoWidth: true },   // Request Status
        { min: 15, autoWidth: true },   // Approval Status
        { min: 12, autoWidth: true },   // Mode
        { min: 20, autoWidth: true },   // Requester
        { min: 18, autoWidth: true },   // Department
        { min: 15, autoWidth: true },   // Created At
        { min: 12, autoWidth: true },   // Due By
        { min: 18, autoWidth: true },   // Resolved Time - increased from 15 to 18
        { min: 12, autoWidth: true },   // Priority
        { min: 18, autoWidth: true },   // Technician
        { min: 18, autoWidth: true },   // Service Category
        { min: 25, autoWidth: true }    // Template
      ];

      // Add AutoFilter to enable sorting and filtering
      const headerRowNumber = 6; // Header row (Row 6: after filters row)  
      const firstDataRow = headerRowNumber + 1; // First data row (Row 7)
      const lastDataRow = headerRowNumber + filteredRequests.length; // Last data row
      const lastColumn = exportHeaders.length; // Number of columns (A to P = 16 columns)
      
      // Set autoFilter if there are data rows to enable sorting
      if (filteredRequests.length > 0) {
        worksheet.autoFilter = {
          from: { row: headerRowNumber, column: 1 }, // Start from header row, column A
          to: { row: lastDataRow, column: lastColumn } // End at last data row, last column
        };
      }

      // Auto-adjust columns based on actual content with intelligent width calculation
      columnSettings.forEach((setting, index) => {
        const column = worksheet.getColumn(index + 1);
        
        // Calculate optimal width based on content with special handling for description
        let maxLength = setting.min;
        column.eachCell({ includeEmpty: false }, (cell) => {
          if (cell.value) {
            const cellValue = cell.value.toString();
            if (index === 2) { // Description column (index 2) - special handling
              // For description, calculate based on longest line rather than total length
              const lines = cellValue.split('\n');
              const longestLine = Math.max(...lines.map(line => line.length));
              maxLength = Math.max(maxLength, Math.min(longestLine + 5, 80)); // Cap at 80 for readability
            } else {
              // For other columns, use actual content length
              maxLength = Math.max(maxLength, cellValue.length + 3);
            }
          }
        });
        
        // Set the calculated width
        column.width = maxLength;
        
        // Set column alignment - ensure ALL headers are centered, especially Description
        if (index === 2) { // Description column
          // Data cells in description column should be left-aligned
          column.alignment = { 
            horizontal: 'left', 
            vertical: 'top',
            wrapText: true
          };
        } else {
          // All other columns center-aligned
          column.alignment = { 
            horizontal: 'center', 
            vertical: 'middle',
            wrapText: true
          };
        }
      });

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
        if (rowNumber > 8 && row.height < 25) { // Data rows only (was 7, now 8)
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

      // FINAL FIX: Explicitly set Description header alignment after all other processing
      // This ensures it won't be overridden by column or row settings
      const finalDescriptionHeaderCell = worksheet.getCell('C8'); // Column C, Row 8 = Description header (was 7, now 8)
      finalDescriptionHeaderCell.alignment = { 
        horizontal: 'center', 
        vertical: 'middle',
        wrapText: true
      };
      
      // Also ensure all header cells in row 6 are properly centered as final step
      const headerRowCells = worksheet.getRow(6);
      headerRowCells.eachCell((cell) => {
        // Force center alignment for ALL header cells
        cell.alignment = { 
          horizontal: 'center', 
          vertical: 'middle',
          wrapText: true
        };
        
        // Ensure header styling is preserved
        cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 12, name: 'Arial' };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '1F4E79' }
        };
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
      const pdfUserName = user ? `${user.emp_fname} ${user.emp_lname}`.trim() : 'System Administrator';
      doc.text(`Exported by: ${pdfUserName}`, 200, 58);
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
