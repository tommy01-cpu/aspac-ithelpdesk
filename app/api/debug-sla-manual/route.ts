import { NextRequest, NextResponse } from 'next/server';
import { getOperationalHours } from '@/lib/sla-calculator';

export async function GET(request: NextRequest) {
  try {
    const operationalHours = await getOperationalHours();
    
    if (!operationalHours) {
      return NextResponse.json({ error: 'No operational hours configuration found' });
    }
    
    // Manual calculation: Aug 30, 2025 at 10:13 AM (Saturday) with 4 hours SLA
    const startDatePH = new Date('2025-08-30T10:13:41'); // Your exact case
    let remainingHours = 4; // Top Priority SLA
    let currentPHT = new Date(startDatePH);
    
    const calculation = [];
    
    console.log('=== Manual SLA Calculation Debug ===');
    console.log('Start:', currentPHT.toLocaleString());
    console.log('SLA Hours:', remainingHours);
    
    while (remainingHours > 0) {
      const dayOfWeek = currentPHT.getDay();
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek];
      const dateStr = currentPHT.toLocaleDateString();
      const timeStr = currentPHT.toTimeString().slice(0, 5);
      
      // Check working day
      const workingDay = operationalHours.workingDays.find(day => day.dayOfWeek === dayOfWeek);
      const isWorkingDay = workingDay?.isEnabled && workingDay.scheduleType !== 'not-set';
      
      if (!isWorkingDay) {
        calculation.push(`${dayName} ${dateStr} - Non-working day, skip to next day`);
        currentPHT.setDate(currentPHT.getDate() + 1);
        
        // Find next working day and set to its start time
        let foundNextWorkingDay = false;
        for (let i = 0; i < 7 && !foundNextWorkingDay; i++) {
          const nextDayOfWeek = currentPHT.getDay();
          const nextWorkingDay = operationalHours.workingDays.find(day => day.dayOfWeek === nextDayOfWeek);
          
          if (nextWorkingDay?.isEnabled && nextWorkingDay.scheduleType !== 'not-set') {
            const nextStartTime = nextWorkingDay.scheduleType === 'custom' 
              ? (nextWorkingDay.customStartTime || '08:00')
              : (operationalHours.standardStartTime || '08:00');
            const [sh, sm] = nextStartTime.split(':').map(n => parseInt(n, 10));
            currentPHT.setHours(sh, sm, 0, 0);
            foundNextWorkingDay = true;
          } else {
            currentPHT.setDate(currentPHT.getDate() + 1);
          }
        }
        continue;
      }
      
      // Get working hours for this day
      const startTime = workingDay.scheduleType === 'custom' 
        ? (workingDay.customStartTime || '08:00')
        : (operationalHours.standardStartTime || '08:00');
      const endTime = workingDay.scheduleType === 'custom'
        ? (workingDay.customEndTime || '18:00') 
        : (operationalHours.standardEndTime || '18:00');
      
      // Calculate working hours available in this day
      const [sh, sm] = startTime.split(':').map(n => parseInt(n, 10));
      const [eh, em] = endTime.split(':').map(n => parseInt(n, 10));
      let workingMinutes = (eh * 60 + em) - (sh * 60 + sm);
      
      // Subtract breaks
      const breaks = workingDay.breakHours || [];
      let totalBreakMinutes = 0;
      for (const b of breaks) {
        const [bsh, bsm] = b.startTime.split(':').map(n => parseInt(n, 10));
        const [beh, bem] = b.endTime.split(':').map(n => parseInt(n, 10));
        totalBreakMinutes += (beh * 60 + bem) - (bsh * 60 + bsm);
      }
      workingMinutes -= totalBreakMinutes;
      const workingHours = workingMinutes / 60;
      
      console.log(`${dayName} ${dateStr}: Total time ${(eh * 60 + em) - (sh * 60 + sm)}min, breaks ${totalBreakMinutes}min, net working ${workingMinutes}min (${workingHours}h)`);
      
      // Calculate remaining hours in current day
      let remainingInDay;
      if (timeStr < startTime) {
        remainingInDay = workingHours;
      } else if (timeStr >= endTime) {
        remainingInDay = 0;
      } else {
        const [ch, cm] = timeStr.split(':').map(n => parseInt(n, 10));
        let remainingMinutes = (eh * 60 + em) - (ch * 60 + cm);
        
        // Subtract future breaks only (breaks that haven't happened yet)
        for (const b of breaks) {
          const [bsh, bsm] = b.startTime.split(':').map(n => parseInt(n, 10));
          const [beh, bem] = b.endTime.split(':').map(n => parseInt(n, 10));
          const currentMinutes = ch * 60 + cm;
          const breakStartMinutes = bsh * 60 + bsm;
          const breakEndMinutes = beh * 60 + bem;
          
          if (currentMinutes < breakStartMinutes) {
            // Break is in the future, subtract it
            remainingMinutes -= (breakEndMinutes - breakStartMinutes);
          } else if (currentMinutes >= breakStartMinutes && currentMinutes < breakEndMinutes) {
            // Currently in break, calculate from break end
            remainingMinutes = (eh * 60 + em) - breakEndMinutes;
          }
          // If break is in the past, don't subtract anything
        }
        remainingInDay = Math.max(0, remainingMinutes) / 60;
      }
      
      if (remainingHours <= remainingInDay) {
        // Finish within this day
        const minutesToAdd = remainingHours * 60;
        const newTime = new Date(currentPHT.getTime() + (minutesToAdd * 60 * 1000));
        calculation.push(`${dayName} ${dateStr} ${timeStr} - Need ${remainingHours}h, available ${remainingInDay}h (of ${workingHours}h net) - FINISH at ${newTime.toTimeString().slice(0, 5)}`);
        currentPHT = newTime;
        remainingHours = 0;
      } else {
        // Use all hours in this day
        calculation.push(`${dayName} ${dateStr} ${timeStr} - Use ${remainingInDay}h of ${workingHours}h net working time - Remaining: ${remainingHours - remainingInDay}h`);
        remainingHours -= remainingInDay;
        currentPHT.setDate(currentPHT.getDate() + 1);
        
        // Find next working day and set to its start time
        let foundNextWorkingDay = false;
        for (let i = 0; i < 7 && !foundNextWorkingDay; i++) {
          const nextDayOfWeek = currentPHT.getDay();
          const nextWorkingDay = operationalHours.workingDays.find(day => day.dayOfWeek === nextDayOfWeek);
          
          if (nextWorkingDay?.isEnabled && nextWorkingDay.scheduleType !== 'not-set') {
            const nextStartTime = nextWorkingDay.scheduleType === 'custom' 
              ? (nextWorkingDay.customStartTime || '08:00')
              : (operationalHours.standardStartTime || '08:00');
            const [sh, sm] = nextStartTime.split(':').map(n => parseInt(n, 10));
            currentPHT.setHours(sh, sm, 0, 0);
            foundNextWorkingDay = true;
          } else {
            currentPHT.setDate(currentPHT.getDate() + 1);
          }
        }
      }
    }
    
    return NextResponse.json({
      test: 'Manual SLA Calculation Debug',
      startDate: startDatePH.toLocaleString(),
      endDate: currentPHT.toLocaleString(),
      calculation: calculation,
      operationalHours: {
        workingTimeType: operationalHours.workingTimeType,
        standardStartTime: operationalHours.standardStartTime,
        standardEndTime: operationalHours.standardEndTime,
        workingDays: operationalHours.workingDays.map(day => ({
          dayOfWeek: day.dayOfWeek,
          isEnabled: day.isEnabled,
          scheduleType: day.scheduleType,
          customStartTime: day.customStartTime,
          customEndTime: day.customEndTime,
          breakHours: day.breakHours
        }))
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to debug SLA calculation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
