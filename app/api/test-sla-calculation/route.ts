import { NextRequest, NextResponse } from 'next/server';
import { calculateSLADueDate } from '@/lib/sla-calculator';

export async function GET(request: NextRequest) {
  try {
    // Test case: Aug 14, 2025 at 4:00 PM Philippine time with 49 hours SLA
    // 4:00 PM PH = 08:00 UTC (PH is UTC+8)
    const startDate = new Date('2025-08-14T08:00:00.000Z');
    const slaHours = 49;
    
    console.log('🧪 Testing SLA Due Date Calculation');
    console.log('📅 Start Date UTC:', startDate.toISOString());
    
    // Convert to Philippine time for display
    const startDatePH = new Date(startDate.getTime() + (8 * 60 * 60 * 1000));
    console.log('📅 Start Date PH:', startDatePH.toLocaleString('en-PH'));
    console.log('⏰ SLA Hours:', slaHours);
    
    const dueDate = await calculateSLADueDate(startDate, slaHours, { useOperationalHours: true });
    
    console.log('📍 Calculated Due Date UTC:', dueDate.toISOString());
    
    // Convert to Philippine time for display
    const dueDatePH = new Date(dueDate.getTime() + (8 * 60 * 60 * 1000));
    const dueDatePHString = dueDatePH.toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    // Expected: Aug 21, 2025 at 4:00 PM Philippine time
    // 4:00 PM PH = 08:00 UTC
    const expectedPH = new Date('2025-08-21T08:00:00.000Z');
    const expectedPHString = new Date(expectedPH.getTime() + (8 * 60 * 60 * 1000)).toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    const isCorrect = Math.abs(dueDate.getTime() - expectedPH.getTime()) < 60000; // Within 1 minute
    
    return NextResponse.json({
      test: 'SLA Due Date Calculation',
      startDate: startDate.toISOString(),
      startDatePH: 'Aug 14, 2025, 4:00 PM',
      slaHours,
      calculatedDueDate: dueDate.toISOString(),
      calculatedDueDatePH: dueDatePHString,
      expectedDueDate: expectedPH.toISOString(),
      expectedDueDatePH: 'Aug 21, 2025, 4:00 PM',
      isCorrect,
      status: isCorrect ? 'PASS ✅' : 'FAIL ❌',
      debug: {
        startDatePHCalc: startDatePH.toLocaleString('en-PH'),
        dueDatePHCalc: dueDatePH.toLocaleString('en-PH'),
        timeDifferenceHours: (dueDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to test SLA calculation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
