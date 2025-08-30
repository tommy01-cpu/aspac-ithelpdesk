import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateSLADueDate } from '@/lib/sla-calculator';

export async function POST(request: NextRequest) {
  try {
    const { requestId } = await request.json();
    
    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }
    
    console.log('=== Fix SLA for Request ===');
    console.log('Request ID:', requestId);
    
    // Get the request
    const requestData = await prisma.request.findUnique({
      where: { id: parseInt(requestId) },
      select: {
        id: true,
        formData: true,
        createdAt: true,
        updatedAt: true,
        priority: true,
        type: true
      }
    });
    
    if (!requestData) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    
    const formData = requestData.formData as any;
    console.log('Current SLA data:', {
      slaHours: formData?.slaHours,
      slaDueDate: formData?.slaDueDate,
      slaStartAt: formData?.slaStartAt
    });
    
    // Get the SLA start time and hours
    const slaStartAt = formData?.slaStartAt ? new Date(formData.slaStartAt) : new Date(requestData.createdAt);
    const slaHours = parseFloat(formData?.slaHours || '4'); // Default to 4 hours for top priority
    
    console.log('Recalculating with:', {
      slaStartAt: slaStartAt.toISOString(),
      slaHours
    });
    
    // Recalculate the correct SLA due date
    const correctDueDate = await calculateSLADueDate(slaStartAt, slaHours, { useOperationalHours: true });
    
    // Format to Philippine time string
    const correctSlaDueDatePH = new Date(correctDueDate).toLocaleString('en-PH', { 
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/, '$3-$1-$2 $4:$5:$6');
    
    console.log('Correct due date:', correctSlaDueDatePH);
    
    // Update the request with the correct SLA
    const updatedRequest = await prisma.request.update({
      where: { id: parseInt(requestId) },
      data: {
        formData: {
          ...formData,
          slaDueDate: correctSlaDueDatePH,
          slaFixed: true,
          slaFixedAt: new Date().toISOString()
        }
      }
    });
    
    // Verify the fix
    const verificationData = updatedRequest.formData as any;
    
    return NextResponse.json({
      success: true,
      message: 'SLA fixed successfully',
      requestId,
      before: {
        slaDueDate: formData?.slaDueDate,
        slaHours: formData?.slaHours,
        slaStartAt: formData?.slaStartAt
      },
      after: {
        slaDueDate: verificationData?.slaDueDate,
        slaHours: verificationData?.slaHours,
        slaStartAt: verificationData?.slaStartAt
      },
      calculation: {
        startTime: slaStartAt.toISOString(),
        hoursToAdd: slaHours,
        calculatedDueDate: correctDueDate.toISOString(),
        formattedDueDate: correctSlaDueDatePH
      },
      fixed: formData?.slaDueDate !== correctSlaDueDatePH
    });
    
  } catch (error) {
    console.error('Error fixing SLA:', error);
    return NextResponse.json(
      { error: 'Failed to fix SLA', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
