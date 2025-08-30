import { NextRequest, NextResponse } from 'next/server';
import { calculateSLADueDate } from '@/lib/sla-calculator';

export async function POST(request: NextRequest) {
  try {
    // Test the exact scenario from your database
    const startTime = new Date('2025-08-30T10:57:21'); // Saturday 10:57 AM
    const slaHours = 4; // Top Priority
    
    console.log('=== Real Scenario Test ===');
    console.log('Start Time:', startTime.toISOString());
    console.log('Start Time (Local):', startTime.toLocaleString());
    console.log('SLA Hours:', slaHours);
    
    // Calculate SLA due date
    const dueDate = await calculateSLADueDate(startTime, slaHours);
    
    console.log('Calculated Due Date:', dueDate.toISOString());
    console.log('Calculated Due Date (Local):', dueDate.toLocaleString());
    
    // Format to Philippine time string (like in the assignment route)
    const slaDueDatePH = new Date(dueDate).toLocaleString('en-PH', { 
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/, '$3-$1-$2 $4:$5:$6');
    
    console.log('Formatted for DB:', slaDueDatePH);
    
    return NextResponse.json({
      test: 'Real Scenario SLA Test',
      startTime: startTime.toISOString(),
      startTimeLocal: startTime.toLocaleString(),
      calculatedDueDate: dueDate.toISOString(),
      calculatedDueDateLocal: dueDate.toLocaleString(),
      formattedForDB: slaDueDatePH,
      expectedInDB: '2025-09-01 12:00:00',
      match: slaDueDatePH === '2025-09-01 12:00:00'
    });
    
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to test scenario', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
