import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateSLADueDate } from '@/lib/sla-calculator';
import { autoAssignTechnician } from '@/lib/load-balancer';

// API route to handle SLA calculation and technician assignment when request becomes "open"
export async function POST(request: NextRequest) {
  try {
    const { requestId, templateId } = await request.json();

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    console.log(`Processing SLA and assignment for request ${requestId}, template ${templateId}`);

    // Get the request details
    const requestDetails = await prisma.request.findUnique({
      where: { id: requestId },
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
    });

    if (!requestDetails) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const results = {
      sla: { success: false, dueDate: null as string | null, error: null as string | null },
      assignment: { success: false, technician: null as any, error: null as string | null }
    };

    // 1. Calculate and set SLA due date
    try {
      console.log('Calculating SLA due date...');
      
      // Default SLA hours (can be customized based on priority or template)
      let slaHours = 24; // Default 24 hours
      
      // Adjust SLA based on priority
      switch (requestDetails.priority?.toLowerCase()) {
        case 'high':
          slaHours = 8; // 8 hours for high priority
          break;
        case 'top':
          slaHours = 4; // 4 hours for top priority
          break;
        case 'medium':
          slaHours = 16; // 16 hours for medium priority
          break;
        case 'low':
        default:
          slaHours = 48; // 48 hours for low priority
          break;
      }

      // Calculate due date using SLA calculator
      const dueDate = await calculateSLADueDate(requestDetails.createdAt, slaHours);
      
      // Update request with due date
      await prisma.request.update({
        where: { id: requestId },
        data: {
          formData: {
            ...(requestDetails.formData as any || {}),
            slaHours: slaHours.toString(),
            slaDueDate: dueDate.toISOString(),
            slaCalculatedAt: new Date().toISOString()
          }
        }
      });

      // Add SLA history entry
      await prisma.requestHistory.create({
        data: {
          requestId: requestId,
          action: 'Start Timer',
          actorName: 'System',
          actorType: 'system',
          details: `SLA timer started. Due date: ${dueDate.toLocaleString()} (${slaHours} hours from creation)`,
          timestamp: new Date()
        }
      });

      results.sla = {
        success: true,
        dueDate: dueDate.toISOString(),
        error: null
      };

      console.log(`✅ SLA calculated: ${slaHours} hours, due date: ${dueDate.toLocaleString()}`);

    } catch (slaError) {
      console.error('Error calculating SLA:', slaError);
      results.sla = {
        success: false,
        dueDate: null,
        error: slaError instanceof Error ? slaError.message : 'Unknown SLA error'
      };
    }

    // 2. Auto-assign technician if not already assigned
    try {
      console.log('Checking for technician assignment...');
      
      const currentFormData = requestDetails.formData as any || {};
      const currentlyAssigned = currentFormData.assignedTechnician || currentFormData.assignedTechnicianId;

      if (!currentlyAssigned) {
        console.log('No technician currently assigned, attempting auto-assignment...');
        
        const assignmentResult = await autoAssignTechnician(requestId, templateId);
        
        if (assignmentResult.success) {
          results.assignment = {
            success: true,
            technician: {
              id: assignmentResult.technicianId,
              name: assignmentResult.technicianName,
              email: assignmentResult.technicianEmail,
              supportGroup: assignmentResult.supportGroupName,
              loadBalanceType: assignmentResult.loadBalanceType
            },
            error: null
          };

          console.log(`✅ Technician assigned: ${assignmentResult.technicianName} from ${assignmentResult.supportGroupName}`);

        } else {
          results.assignment = {
            success: false,
            technician: null,
            error: assignmentResult.error || 'Assignment failed'
          };

          console.log(`❌ Auto-assignment failed: ${assignmentResult.error}`);
        }
      } else {
        results.assignment = {
          success: true,
          technician: { 
            name: currentFormData.assignedTechnician || 'Already Assigned',
            alreadyAssigned: true 
          },
          error: null
        };

        console.log(`ℹ️ Technician already assigned: ${currentFormData.assignedTechnician}`);
      }

    } catch (assignmentError) {
      console.error('Error in technician assignment:', assignmentError);
      results.assignment = {
        success: false,
        technician: null,
        error: assignmentError instanceof Error ? assignmentError.message : 'Unknown assignment error'
      };
    }

    return NextResponse.json({
      success: true,
      message: 'SLA and assignment processing completed',
      results
    });

  } catch (error) {
    console.error('Error in SLA and assignment processing:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process SLA and assignment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
