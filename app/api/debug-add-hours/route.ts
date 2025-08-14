import { NextRequest, NextResponse } from 'next/server';
import { getOperationalHours } from '@/lib/sla-calculator';

// Test the addWorkingHoursToTimePHT function specifically
function addWorkingHoursToTimePHTDebug(
  phtDate: Date,
  hoursToAdd: number,
  operationalHours: any
): { result: Date, steps: string[] } {
  const dayOfWeek = phtDate.getDay();
  const steps: string[] = [];
  
  const workingDay = operationalHours.workingDays.find(
    (day: any) => day.dayOfWeek === dayOfWeek
  );
  
  if (!workingDay) {
    steps.push('No working day found');
    return { result: phtDate, steps };
  }
  
  // Convert hours to minutes for precision
  let minutesToAdd = hoursToAdd * 60;
  let currentPHT = new Date(phtDate);
  steps.push(`Starting at ${currentPHT.toLocaleString()} with ${minutesToAdd} minutes to add`);
  
  // Add minutes while accounting for breaks
  const breaks = workingDay.breakHours || [];
  steps.push(`Breaks for this day: ${JSON.stringify(breaks)}`);
  
  while (minutesToAdd > 0) {
    const currentTimeStr = currentPHT.toTimeString().slice(0, 5);
    steps.push(`Current time: ${currentTimeStr}, minutes left: ${minutesToAdd}`);
    
    // Check if we're about to hit a break
    let nextBreak = null;
    for (const b of breaks) {
      if (currentTimeStr < b.startTime) {
        if (!nextBreak || b.startTime < nextBreak.startTime) {
          nextBreak = b;
        }
      }
    }
    
    if (nextBreak) {
      steps.push(`Next break found: ${nextBreak.startTime}-${nextBreak.endTime}`);
      // Calculate minutes until break starts
      const [ch, cm] = currentTimeStr.split(':').map(n => parseInt(n, 10));
      const [bh, bm] = nextBreak.startTime.split(':').map(n => parseInt(n, 10));
      const minutesUntilBreak = (bh * 60 + bm) - (ch * 60 + cm);
      steps.push(`Minutes until break: ${minutesUntilBreak}`);
      
      if (minutesToAdd <= minutesUntilBreak) {
        // We'll finish before the break
        steps.push(`Will finish before break, adding ${minutesToAdd} minutes`);
        currentPHT.setMinutes(currentPHT.getMinutes() + minutesToAdd);
        minutesToAdd = 0;
      } else {
        // We'll hit the break, skip over it
        steps.push(`Will hit break, skipping to end of break`);
        const [beh, bem] = nextBreak.endTime.split(':').map(n => parseInt(n, 10));
        currentPHT.setHours(beh, bem, 0, 0);
        minutesToAdd -= minutesUntilBreak;
        steps.push(`After break skip, current time: ${currentPHT.toTimeString().slice(0, 5)}, minutes left: ${minutesToAdd}`);
      }
    } else {
      // No more breaks, just add the remaining minutes
      steps.push(`No more breaks, adding remaining ${minutesToAdd} minutes`);
      currentPHT.setMinutes(currentPHT.getMinutes() + minutesToAdd);
      minutesToAdd = 0;
    }
  }
  
  steps.push(`Final result: ${currentPHT.toLocaleString()}`);
  return { result: currentPHT, steps };
}

export async function GET(request: NextRequest) {
  try {
    const operationalHours = await getOperationalHours();
    
    // Test: Thursday 8/21/2025 at 8:00 AM + 7 hours
    const startDate = new Date('2025-08-21T08:00:00+08:00'); // 8 AM Philippine time
    const phtDate = new Date(startDate.getTime() + (8 * 60 * 60 * 1000)); // Convert to PHT
    
    const { result, steps } = addWorkingHoursToTimePHTDebug(phtDate, 7, operationalHours);
    
    return NextResponse.json({
      test: "Add Working Hours Debug",
      startDate: startDate.toLocaleString(),
      startDatePHT: phtDate.toLocaleString(),
      hoursToAdd: 7,
      result: result.toLocaleString(),
      steps,
      operationalHours
    });
    
  } catch (error) {
    console.error('Debug add hours error:', error);
    return NextResponse.json(
      { error: 'Failed to debug add hours' },
      { status: 500 }
    );
  }
}
