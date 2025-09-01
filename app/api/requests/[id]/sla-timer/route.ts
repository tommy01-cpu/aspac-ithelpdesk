import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addHistory } from '@/lib/history';
import { calculateSLADueDate, getSLAStatus } from '@/lib/sla-calculator';

// Helper function to get current timestamp without timezone (YYYY-MM-DD HH:MM:SS format)
function getCurrentTimestampWithoutTZ(): string {
  const now = new Date();
  
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Helper function to format timestamp for history display
function formatTimestampForHistory(timestamp: string): string {
  const date = new Date(timestamp);
  
  // Format as "September 2, 2025 4:34 PM"
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila'
  });
}
// Helper function to calculate remaining SLA time in hours when stopping
async function calculateRemainingSlaHours(formData: any): Promise<number> {
  // Get original SLA hours
  const originalSlaHours = parseFloat(formData.slaHours || '0');
  
  // Get SLA start time
  const slaStartAt = formData.slaStartAt;
  if (!slaStartAt) {
    console.log('🛑 No slaStartAt found, returning original SLA hours:', originalSlaHours);
    return originalSlaHours;
  }
  
  console.log('🛑 Calculating remaining SLA hours:', {
    originalSlaHours,
    slaStartAt,
    currentTime: new Date().toISOString()
  });
  
  try {
    // Use proper SLA calculator to get current status
    const startDate = new Date(slaStartAt);
    const now = new Date();
    
    console.log('🛑 Using SLA calculator with dates:', {
      startDate: startDate.toISOString(),
      now: now.toISOString(),
      originalSlaHours
    });
    
    const slaStatus = await getSLAStatus(startDate, originalSlaHours, now);
    
    console.log('🛑 SLA calculator returned:', slaStatus);
    
    // Return the remaining hours from the proper SLA calculation
    const remainingHours = Math.max(0, slaStatus.remainingHours + (slaStatus.remainingMinutes / 60));
    
    console.log('🛑 Final remaining hours:', remainingHours);
    
    return remainingHours;
  } catch (error) {
    console.error('🛑 Error calculating remaining SLA with proper calculator:', error);
    
    // Fallback to simple calculation if SLA calculator fails
    const now = new Date();
    const startDate = new Date(slaStartAt);
    const elapsedMs = now.getTime() - startDate.getTime();
    const elapsedHours = elapsedMs / (1000 * 60 * 60);
    
    const remainingHours = Math.max(0, originalSlaHours - elapsedHours);
    
    console.log('🛑 Using fallback calculation:', {
      elapsedHours,
      remainingHours
    });
    
    return remainingHours;
  }
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
async function calculateNewSlaDueDate(remainingHours: number): Promise<string> {
  const now = new Date();
  
  console.log('🔄 Calculating new SLA due date:', {
    remainingHours,
    currentTime: now.toISOString(),
    currentTimePH: now.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })
  });
  
  // Use the proper SLA calculator that accounts for operational hours, breaks, and holidays
  const newDueDate = await calculateSLADueDate(now, remainingHours, { 
    useOperationalHours: true 
  });
  
  console.log('🔄 SLA calculator returned due date:', {
    newDueDate: newDueDate.toISOString(),
    newDueDatePH: newDueDate.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })
  });
  
  // Convert to Philippine time format without Z suffix for formData storage
  const slaDueDatePH = new Date(newDueDate).toLocaleString('en-PH', { 
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/, '$3-$1-$2 $4:$5:$6');
  
  console.log('🔄 Final formatted due date:', slaDueDatePH);
  
  return slaDueDatePH;
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

    const { action, reason } = await request.json();
    
    if (!action || !['start', 'stop'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be "start" or "stop"' }, { status: 400 });
    }

    // Validate reason for stop action
    if (action === 'stop' && (!reason || reason.trim() === '')) {
      return NextResponse.json({ error: 'Reason is required when stopping SLA timer' }, { status: 400 });
    }

    // Get current user and check if they are a technician
    const actor = await prisma.users.findFirst({
      where: { emp_email: session.user.email },
      include: {
        technician: true // Include technician relationship
      }
    });

    console.log('🔍 SLA Timer API Debug:', {
      userEmail: session.user.email,
      actorFound: !!actor,
      actorId: actor?.id,
      hasTechnician: !!actor?.technician,
      technicianId: actor?.technician?.id,
      sessionIsTechnician: session.user.isTechnician
    });

    if (!actor) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is a technician by looking up technician table
    if (!actor.technician) {
      console.log('❌ SLA Timer Access Denied:', {
        userId: actor.id,
        userEmail: actor.emp_email,
        hasTechnician: !!actor.technician,
        sessionSaysIsTechnician: session.user.isTechnician
      });
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
      if (!formData.slaHours || !formData.slaDueDate) {
        return NextResponse.json({ 
          error: 'No SLA data found for this request' 
        }, { status: 400 });
      }

      // Calculate remaining SLA time in hours
      const remainingSlaHours = await calculateRemainingSlaHours(formData);
      const stoppedAt = getCurrentTimestampWithoutTZ();
      
      // Update formData
      updatedFormData.remainingSla = remainingSlaHours;
      updatedFormData.slaStop = true;
      updatedFormData.slaStoppedAt = stoppedAt;
      updatedFormData.slaStopReason = reason.trim();
      
      newStatus = 'on_hold';
      historyDetails = `SLA Timer stopped at ${formatTimestampForHistory(stoppedAt)}.\nReason: ${reason.trim()}.\nRemaining SLA: ${formatTimeForHistory(remainingSlaHours)}.\nStatus changed to On Hold.`;

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

      // Calculate new due date based on remaining SLA hours
      console.log('🔄 SLA Resume - Calculating new due date');
      console.log('🔄 Remaining SLA hours:', formData.remainingSla);
      console.log('🔄 Current time:', new Date().toISOString());
      
      const newSlaDueDate = await calculateNewSlaDueDate(formData.remainingSla);
      const resumedAt = getCurrentTimestampWithoutTZ();
      
      console.log('🔄 New calculated due date:', newSlaDueDate);
      console.log('🔄 Resumed at:', resumedAt);
      
      // Update formData
      updatedFormData.slaDueDate = newSlaDueDate;
      updatedFormData.slaResumedAt = resumedAt;
      updatedFormData.slaStop = false;
      
      // Keep remainingSla for future reference, remove stopped data
      delete updatedFormData.slaStoppedAt;
      delete updatedFormData.slaStopReason;
      
      newStatus = 'open';
      historyDetails = `SLA Timer resumed at ${formatTimestampForHistory(resumedAt)}.\nNew due date: ${formatTimestampForHistory(newSlaDueDate)}.\nStatus changed to Open.`;
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
      newSlaDueDate: action === 'start' ? updatedFormData.slaDueDate : null,
      slaStop: updatedFormData.slaStop,
      slaStoppedAt: updatedFormData.slaStoppedAt || null,
      slaStopReason: updatedFormData.slaStopReason || null,
      slaResumedAt: updatedFormData.slaResumedAt || null
    });

  } catch (error) {
    console.error('SLA timer error:', error);
    return NextResponse.json(
      { error: 'Failed to update SLA timer' },
      { status: 500 }
    );
  }
}
