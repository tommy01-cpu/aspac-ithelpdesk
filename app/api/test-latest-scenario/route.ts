import { NextRequest, NextResponse } from 'next/server';
import { calculateSLADueDate } from '@/lib/sla-calculator';

export async function POST(request: NextRequest) {
  try {
    // Test the exact scenario from the latest request
    const startTime = new Date('2025-08-30T11:25:58'); // Saturday 11:25 AM
    const slaHours = 4;
    
    console.log('=== Latest Request Scenario Debug ===');
    console.log('Start Time:', startTime.toISOString());
    console.log('Start Time (PH):', startTime.toLocaleString());
    console.log('SLA Hours:', slaHours);
    
    // Manual calculation:
    // Saturday 11:25 AM to 12:00 PM = 35 minutes = 0.583 hours
    // Remaining: 4 - 0.583 = 3.417 hours
    // Monday 8:00 AM + 3.417 hours = 11:25 AM (before break)
    
    console.log('Expected manual calculation:');
    console.log('- Saturday 11:25 AM to 12:00 PM = 35 minutes = 0.583 hours');
    console.log('- Remaining: 3.417 hours');
    console.log('- Monday 8:00 AM + 3.417 hours = 11:25 AM');
    
    // Test with the actual SLA calculator
    const result = await calculateSLADueDate(startTime, slaHours, { useOperationalHours: true });
    
    console.log('Actual result:', result.toISOString());
    console.log('Actual result (PH):', result.toLocaleString());
    
    // Format the same way as in the request route
    const formattedResult = new Date(result).toLocaleString('en-PH', { 
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }).replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/, '$3-$1-$2 $4:$5:$6');
    
    return NextResponse.json({
      test: 'Latest Request Scenario Debug',
      startTime: startTime.toISOString(),
      startTimeLocal: startTime.toLocaleString(),
      expectedResult: '2025-09-01 11:25:00', // Manual calculation
      actualResult: result.toISOString(),
      actualResultLocal: result.toLocaleString(),
      formattedForDB: formattedResult,
      discrepancy: formattedResult !== '2025-09-01 11:25:00',
      analysis: {
        saturdayAvailable: '35 minutes (11:25 AM to 12:00 PM)',
        remainingHours: '3.417 hours',
        mondayStartTime: '8:00 AM',
        expectedFinish: '11:25 AM (8:00 + 3.417 hours)',
        actualFinish: formattedResult.split(' ')[1],
        isLandingAtBreakTime: formattedResult.includes('12:00:00')
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to debug latest scenario', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
