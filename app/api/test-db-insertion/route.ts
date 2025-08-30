import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateSLADueDate } from '@/lib/sla-calculator';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Database Insertion Test ===');
    
    // Test the exact same scenario - Saturday 10:13 AM with 4 hours SLA
    const testStartDate = new Date('2025-08-30T10:13:41');
    const slaHours = 4;
    
    console.log('1. Input date:', testStartDate.toISOString());
    console.log('2. SLA Hours:', slaHours);
    
    // Calculate SLA due date
    const calculatedDueDate = await calculateSLADueDate(testStartDate, slaHours, { 
      useOperationalHours: true 
    });
    console.log('3. Calculated due date:', calculatedDueDate.toISOString());
    
    // Convert to Philippine time format (same as assignment route)
    const slaStartAtPH = new Date(testStartDate).toLocaleString('en-PH', { 
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/, '$3-$1-$2 $4:$5:$6');

    const slaDueDatePH = new Date(calculatedDueDate).toLocaleString('en-PH', { 
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/, '$3-$1-$2 $4:$5:$6');

    const slaCalculatedAtPH = new Date().toLocaleString('en-PH', { 
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/, '$3-$1-$2 $4:$5:$6');

    console.log('4. PH formatted start time:', slaStartAtPH);
    console.log('5. PH formatted due date:', slaDueDatePH);
    console.log('6. PH formatted calculated time:', slaCalculatedAtPH);
    
    // Create test formData (same structure as assignment route)
    const testFormData = {
      slaHours: slaHours.toString(),
      slaDueDate: slaDueDatePH,
      slaCalculatedAt: slaCalculatedAtPH,
      slaStartAt: slaStartAtPH,
      priority: 'top',
      testEntry: 'Database insertion test'
    };
    
    console.log('7. Test formData to save:', testFormData);
    
    // Create Philippine time for database updatedAt (same as assignment route)
    const slaStartAtForDB = new Date(testStartDate.getTime() + (8 * 60 * 60 * 1000));
    console.log('8. Database updatedAt (PH):', slaStartAtForDB.toISOString());
    
    // Instead of creating a new record, let's test with an existing one
    // First, find any existing request
    const existingRequest = await prisma.request.findFirst({
      orderBy: { id: 'desc' },
      take: 1
    });
    
    if (!existingRequest) {
      return NextResponse.json({ error: 'No existing requests found to test with' }, { status: 404 });
    }
    
    console.log('8.1. Using existing request ID:', existingRequest.id);
    console.log('8.2. Current formData:', existingRequest.formData);
    
    // Update the existing request with our test SLA data
    const updatedRequest = await prisma.request.update({
      where: { id: existingRequest.id },
      data: {
        updatedAt: slaStartAtForDB,
        formData: {
          ...(existingRequest.formData as any || {}),
          ...testFormData,
          originalTest: 'Database insertion test - backup of original data',
          originalFormData: existingRequest.formData
        }
      }
    });
    
    console.log('9. Updated request ID:', updatedRequest.id);
    console.log('10. Saved updatedAt:', updatedRequest.updatedAt.toISOString());
    
    // Read the record back to verify
    const verifyRecord = await prisma.request.findUnique({
      where: { id: updatedRequest.id },
      select: { 
        id: true,
        updatedAt: true, 
        formData: true,
        createdAt: true
      }
    });
    
    console.log('11. Verification - Record found:', !!verifyRecord);
    console.log('12. Verification - Database updatedAt:', verifyRecord?.updatedAt.toISOString());
    console.log('13. Verification - Database createdAt:', verifyRecord?.createdAt.toISOString());
    console.log('14. Verification - FormData keys:', Object.keys(verifyRecord?.formData as any || {}));
    
    const savedFormData = verifyRecord?.formData as any;
    console.log('15. Verification - Saved slaDueDate:', savedFormData?.slaDueDate);
    console.log('16. Verification - Saved slaStartAt:', savedFormData?.slaStartAt);
    console.log('17. Verification - Saved slaHours:', savedFormData?.slaHours);
    
    // Compare what we intended to save vs what was actually saved
    const comparison = {
      intended: {
        slaDueDate: slaDueDatePH,
        slaStartAt: slaStartAtPH,
        slaHours: slaHours.toString()
      },
      actualSaved: {
        slaDueDate: savedFormData?.slaDueDate,
        slaStartAt: savedFormData?.slaStartAt,
        slaHours: savedFormData?.slaHours
      },
      match: {
        slaDueDate: slaDueDatePH === savedFormData?.slaDueDate,
        slaStartAt: slaStartAtPH === savedFormData?.slaStartAt,
        slaHours: slaHours.toString() === savedFormData?.slaHours
      }
    };
    
    console.log('18. Comparison results:', comparison);
    
    // Restore the original data
    await prisma.request.update({
      where: { id: existingRequest.id },
      data: {
        updatedAt: existingRequest.updatedAt,
        formData: existingRequest.formData
      }
    });
    console.log('19. Original data restored');
    
    return NextResponse.json({
      test: 'Database Insertion Test',
      inputData: {
        startDate: testStartDate.toISOString(),
        slaHours: slaHours,
        calculatedDueDate: calculatedDueDate.toISOString()
      },
      formattedData: {
        slaStartAtPH,
        slaDueDatePH,
        slaCalculatedAtPH
      },
      databaseOperations: {
        savedUpdatedAt: updatedRequest.updatedAt.toISOString(),
        retrievedUpdatedAt: verifyRecord?.updatedAt.toISOString(),
        retrievedCreatedAt: verifyRecord?.createdAt.toISOString()
      },
      comparison,
      success: true
    });
    
  } catch (error) {
    console.error('Database insertion test error:', error);
    return NextResponse.json(
      { 
        error: 'Database insertion test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
