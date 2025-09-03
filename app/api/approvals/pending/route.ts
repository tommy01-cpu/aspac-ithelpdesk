import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Define the approval status constants
const APPROVAL_STATUS = {
  PENDING_APPROVAL: 'pending_approval',
  FOR_CLARIFICATION: 'for_clarification', 
  REJECTED: 'rejected',
  APPROVED: 'approved',
  ACKNOWLEDGED: 'acknowledged'
} as const;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user from the database  
    const user = await prisma.users.findFirst({
      where: { emp_email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has any approval assignments (instead of checking isServiceApprover flag)
    const potentialApprovals = await prisma.requestApproval.findMany({
      where: {
        approverId: user.id,
        status: {
          in: [APPROVAL_STATUS.PENDING_APPROVAL, APPROVAL_STATUS.FOR_CLARIFICATION]
        }
      },
      include: {
        request: {
          include: {
            user: {
              select: {
                emp_fname: true,
                emp_lname: true,
                emp_email: true,
                department: true
              }
            }
          }
        },
        approver: {
          select: {
            emp_fname: true,
            emp_lname: true,
            emp_email: true
          }
        }
      },
      orderBy: {
        request: {
          id: 'desc' // Sort by request ID in descending order (newest requests first)
        }
      }
    });

    // Filter approvals to ensure sequential workflow - only show approvals where all previous levels are approved
    const validApprovals = [];
    
    for (const approval of potentialApprovals) {
      // Check if all previous levels are approved
      const previousLevelApprovals = await prisma.requestApproval.findMany({
        where: {
          requestId: approval.requestId,
          level: { lt: approval.level } // levels less than current level
        }
      });

      // If there are no previous levels, or all previous levels are approved, include this approval
      const allPreviousApproved = previousLevelApprovals.length === 0 || 
        previousLevelApprovals.every((prevApproval: any) => prevApproval.status === APPROVAL_STATUS.APPROVED);

      if (allPreviousApproved) {
        validApprovals.push(approval);
      }
    }

    // If user has no valid approval assignments, return empty array
    if (validApprovals.length === 0) {
      return NextResponse.json({ approvals: [] });
    }

    // Format the approvals for the frontend
    const formattedApprovals = await Promise.all(validApprovals.map(async approval => {
      const formData = approval.request.formData as any || {};
      // Extract priority from formData (field '2' or direct priority field)
      const priority = formData['2'] || formData.priority || 'Medium';
      
      // Check if any approval for this request has been rejected
      const allApprovalsForRequest = await prisma.requestApproval.findMany({
        where: { requestId: approval.requestId }
      });
      
      const hasRejectedApproval = allApprovalsForRequest.some((app: any) => app.status === APPROVAL_STATUS.REJECTED);
      
      // Determine the actual approval status to show
      let displayStatus: string = approval.status;
      if (hasRejectedApproval) {
        displayStatus = APPROVAL_STATUS.REJECTED;
      }
      
      // Determine request type - check template to see if it's Service or Incident
      let requestType = 'Service'; // Default to Service
      try {
        if (approval.request.templateId) {
          const template = await prisma.template.findUnique({
            where: { id: parseInt(approval.request.templateId) },
            select: { category: true, name: true }
          });
          
          if (template) {
            // Check if template category or name contains "incident"
            const templateInfo = `${template.category || ''} ${template.name || ''}`.toLowerCase();
            if (templateInfo.includes('incident')) {
              requestType = 'Incident';
            }
          }
        }
      } catch (error) {
        console.log('Could not determine template type, defaulting to Service');
      }
      
      return {
        id: approval.id,
        requestId: approval.request.id,
        requestTitle: formData?.['8'] || `Request #${approval.request.id}`,
        requestType: requestType,
        requesterName: `${approval.request.user.emp_fname} ${approval.request.user.emp_lname}`,
        requesterEmail: approval.request.user.emp_email,
        department: approval.request.user.department || 'Unknown',
        createdDate: approval.request.createdAt,
        dueDate: null,
        priority: priority,
        status: displayStatus, // This now shows 'rejected' if any approver rejected
        originalStatus: approval.status, // Keep original status for reference
        requestStatus: approval.request.status, // Include the request status from request table
        level: approval.level,
        levelName: `Level ${approval.level}`, // Use level number instead of name field to avoid confusion
        description: formData?.description || formData?.['9'] || '',
        hasRejectedApproval: hasRejectedApproval
      };
    }));

    // Group by requestId to avoid duplicate requests and take the first approval per request
    const uniqueApprovals = [];
    const seenRequestIds = new Set();
    
    for (const approval of formattedApprovals) {
      if (!seenRequestIds.has(approval.requestId)) {
        seenRequestIds.add(approval.requestId);
        uniqueApprovals.push(approval);
      }
    }

    return NextResponse.json({ approvals: uniqueApprovals });
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending approvals' },
      { status: 500 }
    );
  }
}
