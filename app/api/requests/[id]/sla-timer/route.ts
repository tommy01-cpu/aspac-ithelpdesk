import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addHistory } from '@/lib/history';

// Helper function to get current timestamp in Philippine time (YYYY-MM-DD HH:MM:SS format)
function getPhilippineTimestamp(): string {
  const now = new Date();
  const philippineTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  
  const year = philippineTime.getUTCFullYear();
  const month = String(philippineTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(philippineTime.getUTCDate()).padStart(2, '0');
  const hours = String(philippineTime.getUTCHours()).padStart(2, '0');
  const minutes = String(philippineTime.getUTCMinutes()).padStart(2, '0');
  const seconds = String(philippineTime.getUTCSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
// Helper function to calculate remaining SLA time correctly
function calculateRemainingSlaHours(formData: any): number {
  // Get original SLA hours
  const originalSlaHours = parseFloat(formData.slaHours || '0');
  
  // Get SLA start time
  const slaStartAt = formData.slaStartAt;
  if (!slaStartAt) {
    return originalSlaHours; // If no start time, return full SLA
  }
  
  // Calculate elapsed time from start to now
  const now = new Date();
  const startDate = new Date(slaStartAt);
  const elapsedMs = now.getTime() - startDate.getTime();
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  
  // Remaining = Original SLA - Elapsed time
  const remainingHours = originalSlaHours - elapsedHours;
  
  // Don't return negative values
  return Math.max(0, remainingHours);
}

// Helper function to format time for history display
function formatTimeForHistory(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (wholeHours === 0) {
    return `${minutes} minutes`;
  } else if (minutes === 0) {
    return `${wholeHours} hour${wholeHours !== 1 ? 's' : ''}`;
  } else {
    return `${wholeHours} hour${wholeHours !== 1 ? 's' : ''} and ${minutes} minutes`;
  }
}

// Helper function to calculate new SLA due date based on remaining hours
function calculateNewSlaDueDate(remainingHours: number): string {
  const now = new Date();
  const newDueDate = new Date(now.getTime() + (remainingHours * 60 * 60 * 1000));
  
  // Format as MySQL datetime string (YYYY-MM-DD HH:MM:SS)
  const year = newDueDate.getFullYear();
  const month = String(newDueDate.getMonth() + 1).padStart(2, '0');
  const day = String(newDueDate.getDate()).padStart(2, '0');
  const hours = String(newDueDate.getHours()).padStart(2, '0');
  const minutes = String(newDueDate.getMinutes()).padStart(2, '0');
  const seconds = String(newDueDate.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestId = parseInt(params.id);
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
    }

    const { action } = await request.json();
    
    if (!action || !['start', 'stop'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be "start" or "stop"' }, { status: 400 });
    }

    // Get current user
    const actor = await prisma.users.findFirst({
      where: { emp_email: session.user.email }
    });

    if (!actor) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!actor.isTechnician) {
      return NextResponse.json({ error: 'Only technicians can manage SLA timers' }, { status: 403 });
    }

    // Get the current request
    const existingRequest = await prisma.request.findUnique({
      where: { id: requestId }
    });

    if (!existingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const formData = existingRequest.formData as any;
    const currentStatus = existingRequest.status;

    let newStatus;
    let updatedFormData = { ...formData };
    let historyDetails = '';

    if (action === 'stop') {
      // Validate: can only stop when status is 'open'
      if (currentStatus !== 'open') {
        return NextResponse.json({ 
          error: 'SLA timer can only be stopped when request status is "open"' 
        }, { status: 400 });
      }

      // Check if SLA data exists
      if (!formData.slaHours || !formData.slaStartAt) {
        return NextResponse.json({ 
          error: 'No SLA data found for this request' 
        }, { status: 400 });
      }

      // Calculate remaining SLA time correctly
      const remainingSlaHours = calculateRemainingSlaHours(formData);
      const stoppedAt = getPhilippineTimestamp();
      
      // Update formData
      updatedFormData.remainingSla = remainingSlaHours;
      updatedFormData.slaIsStop = true;
      updatedFormData.slaStoppedAt = stoppedAt;
      
      newStatus = 'on_hold';
      historyDetails = `SLA Timer stopped at ${stoppedAt}. Remaining SLA: ${formatTimeForHistory(remainingSlaHours)}. Status changed to On Hold.`;

    } else if (action === 'start') {
      // Validate: can only start when status is 'on_hold'
      if (currentStatus !== 'on_hold') {
        return NextResponse.json({ 
          error: 'SLA timer can only be started when request status is "on_hold"' 
        }, { status: 400 });
      }

      // Check if we have remaining SLA data
      if (!formData.remainingSla || typeof formData.remainingSla !== 'number') {
        return NextResponse.json({ 
          error: 'No remaining SLA data found. Cannot resume timer.' 
        }, { status: 400 });
      }

      // Calculate new due date based on remaining SLA
      const newSlaDueDate = calculateNewSlaDueDate(formData.remainingSla);
      
      // Update formData
      updatedFormData.slaDueDate = newSlaDueDate;
      updatedFormData.slaResumedAt = getPhilippineTimestamp();
      
      // Remove slaIsStop flag and remainingSla (it's now incorporated into new due date)
      delete updatedFormData.slaIsStop;
      delete updatedFormData.remainingSla;
      delete updatedFormData.slaStoppedAt;
      
      newStatus = 'open';
      historyDetails = `SLA Timer resumed. New due date: ${newSlaDueDate}. Status changed to Open.`;
    }

    // Update the request
    const philippineTime = new Date(new Date().getTime() + (8 * 60 * 60 * 1000));
    
    const updatedRequest = await prisma.request.update({
      where: { id: requestId },
      data: {
        status: newStatus as any,
        formData: updatedFormData,
        updatedAt: philippineTime
      }
    });

    // Add history entry
    await addHistory(prisma, {
      requestId,
      action: 'SLA Timer',
      actorId: actor.id,
      actorName: `${actor.emp_fname} ${actor.emp_lname}`,
      actorType: 'user',
      details: historyDetails
    });

    return NextResponse.json({
      success: true,
      message: `SLA timer ${action === 'stop' ? 'stopped' : 'started'} successfully`,
      newStatus,
      remainingSla: action === 'stop' ? updatedFormData.remainingSla : null,
      newSlaDueDate: action === 'start' ? updatedFormData.slaDueDate : null
    });

  } catch (error) {
    console.error('SLA timer error:', error);
    return NextResponse.json(
      { error: 'Failed to update SLA timer' },
      { status: 500 }
    );
  }
}
