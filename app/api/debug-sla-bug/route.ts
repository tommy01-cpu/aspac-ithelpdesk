import { NextRequest, NextResponse } from 'next/server';
import { calculateSLADueDate, getOperationalHours } from '@/lib/sla-calculator';

export async function POST(request: NextRequest) {
  try {
    // Test the exact problematic scenario step by step
    const startTime = new Date('2025-08-30T11:36:12.875Z'); // Saturday 11:36 AM
    const slaHours = 4;
    
    console.log('=== Debug SLA Calculator Bug ===');
    console.log('Start:', startTime.toISOString());
    console.log('Start (PH):', startTime.toLocaleString());
    console.log('SLA Hours:', slaHours);
    
    // Manual step-by-step calculation
    console.log('\n=== Manual Calculation ===');
    console.log('Saturday working hours: 08:00-12:00 (4 hours)');
    console.log('Start at 11:36 AM, end at 12:00 PM = 24 minutes used');
    console.log('Remaining: 4 hours - 24 minutes = 3 hours 36 minutes = 216 minutes');
    
    console.log('\nMonday working hours: 08:00-18:00 with break 12:00-13:00 (9 net hours)');
    console.log('Monday 08:00 AM + 216 minutes = 08:00 AM + 3:36 = 11:36 AM');
    console.log('Expected result: Monday 11:36 AM (before break)');
    
    // Test with actual SLA calculator
    const operationalHours = await getOperationalHours();
    console.log('\n=== Operational Hours Config ===');
    const mondayConfig = operationalHours?.workingDays.find(day => day.dayOfWeek === 1);
    console.log('Monday config:', JSON.stringify(mondayConfig, null, 2));
    
    const actualResult = await calculateSLADueDate(startTime, slaHours, { useOperationalHours: true });
    
    console.log('\n=== Actual Result ===');
    console.log('Result:', actualResult.toISOString());
    console.log('Result (PH):', actualResult.toLocaleString());
    
    // Check if it's landing at break time
    const resultHour = actualResult.getUTCHours() + 8; // Convert to PH time
    const resultMinute = actualResult.getUTCMinutes();
    const isAtBreakStart = (resultHour === 12 && resultMinute === 0);
    
    console.log('\n=== Analysis ===');
    console.log('Result hour (PH):', resultHour);
    console.log('Result minute:', resultMinute);
    console.log('Is landing at break start (12:00 PM)?', isAtBreakStart);
    console.log('Expected time: 11:36 AM');
    console.log('Actual time:', `${resultHour}:${resultMinute.toString().padStart(2, '0')}`);
    
    return NextResponse.json({
      test: 'SLA Calculator Bug Debug',
      startTime: startTime.toISOString(),
      expectedResult: 'Monday 11:36 AM',
      actualResult: actualResult.toISOString(),
      actualResultPH: actualResult.toLocaleString(),
      isLandingAtBreakStart,
      hourDifference: resultHour - 11,
      minuteDifference: resultMinute - 36,
      suspectedIssue: isAtBreakStart ? 'Landing exactly at break start - likely break handling bug' : 'Different issue'
    });
    
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to debug SLA calculator', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
