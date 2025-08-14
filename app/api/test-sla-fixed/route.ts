import { NextRequest, NextResponse } from 'next/server';
import { calculateSLADueDate } from '@/lib/sla-calculator';

export async function GET(request: NextRequest) {
  try {
    // Test case: Aug 14, 2025 at 4:00 PM Philippine time with 49 hours SLA
    // Create date directly in Philippine time (local time, no UTC conversion)
    const startDate = new Date('2025-08-14T16:00:00'); // 4:00 PM PH
    const slaHours = 49;
    
    console.log('🧪 Testing SLA Due Date Calculation (Fixed)');
    console.log('📅 Start Date PH:', startDate.toLocaleString());
    console.log('⏰ SLA Hours:', slaHours);
    
    const dueDate = await calculateSLADueDate(startDate, slaHours, { useOperationalHours: true });
    
    console.log('📍 Calculated Due Date PH:', dueDate.toLocaleString());
    
    // Expected: Aug 21, 2025 at 4:00 PM Philippine time (corrected expectation)
    const expectedPH = new Date('2025-08-21T16:00:00'); // 4:00 PM PH
    
    const isCorrect = Math.abs(dueDate.getTime() - expectedPH.getTime()) < 60000; // Within 1 minute
    
    return NextResponse.json({
      test: 'SLA Due Date Calculation (Fixed)',
      startDate: startDate.toLocaleString(),
      startDatePH: 'Aug 14, 2025, 4:00 PM',
      slaHours,
      calculatedDueDate: dueDate.toLocaleString(), 
      expectedDueDate: expectedPH.toLocaleString(),
      expectedDueDatePH: 'Aug 21, 2025, 4:00 PM',
      isCorrect,
      status: isCorrect ? 'PASS ✅' : 'FAIL ❌',
      timeDifferenceMinutes: (dueDate.getTime() - expectedPH.getTime()) / (1000 * 60)
    });
    
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to test SLA calculation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
