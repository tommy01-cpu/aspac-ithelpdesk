import { NextRequest, NextResponse } from 'next/server';
import { calculateSLADueDate, getOperationalHours } from '@/lib/sla-calculator';

export async function POST(request: NextRequest) {
  try {
    const operationalHours = await getOperationalHours();
    
    // Test exact scenario but with detailed logging
    const startTime = new Date('2025-08-30T10:57:21'); // Saturday 10:57 AM
    const slaHours = 4;
    
    console.log('=== Break Hours Debug Test ===');
    console.log('Start Time:', startTime.toISOString());
    console.log('SLA Hours:', slaHours);
    
    // Check Monday's break hours specifically
    const mondayConfig = operationalHours?.workingDays.find(day => day.dayOfWeek === 1);
    console.log('Monday config:', JSON.stringify(mondayConfig, null, 2));
    
    // Manual calculation to see where it should land
    // Saturday: 10:57 AM to 12:00 PM = 1 hour 3 minutes = 1.05 hours used
    // Remaining: 4 - 1.05 = 2.95 hours
    // Monday: Start at 8:00 AM, add 2.95 hours = 10:57 AM (before break)
    
    console.log('Expected calculation:');
    console.log('- Saturday 10:57 AM to 12:00 PM = 1.05 hours');
    console.log('- Remaining: 2.95 hours');
    console.log('- Monday 8:00 AM + 2.95 hours = 10:57 AM (before break)');
    
    // Calculate actual result
    const result = await calculateSLADueDate(startTime, slaHours, { useOperationalHours: true });
    
    const resultPH = new Date(result).toLocaleString('en-PH', { 
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/, '$3-$1-$2 $4:$5:$6');
    
    console.log('Actual result:', result.toISOString());
    console.log('Formatted result:', resultPH);
    
    // Check if the result lands exactly at break time
    const resultTime = resultPH.split(' ')[1];
    const isBreakTime = resultTime === '12:00:00';
    const isBeforeBreak = resultTime < '12:00:00';
    const isAfterBreak = resultTime > '13:00:00';
    
    return NextResponse.json({
      test: 'Break Hours Debug Test',
      startTime: startTime.toISOString(),
      actualResult: resultPH,
      expectedResult: '2025-09-01 10:57:00',
      yourDatabaseValue: '2025-09-01 12:00:00',
      timeAnalysis: {
        resultTime,
        isBreakTime,
        isBeforeBreak,
        isAfterBreak,
        breakStart: '12:00:00',
        breakEnd: '13:00:00'
      },
      mondayBreakHours: mondayConfig?.breakHours,
      suspicion: isBreakTime ? 'Result lands exactly at break time - this might be the bug!' : 'Result does not land at break time'
    });
    
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to debug break hours', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
