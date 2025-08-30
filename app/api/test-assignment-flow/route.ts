import { NextRequest, NextResponse } from 'next/server';
import { calculateSLADueDate } from '@/lib/sla-calculator';

export async function POST(request: NextRequest) {
  try {
    // Simulate the exact flow from the SLA assignment route
    const slaStartAt = new Date('2025-08-30T10:57:21'); // Your exact start time
    const slaHours = 4;
    const useOperationalHours = true;
    
    console.log('=== SLA Assignment Route Simulation ===');
    console.log('🕐 SLA Start Time (ISO):', slaStartAt.toISOString());
    console.log('⏰ SLA Hours:', slaHours);
    console.log('🔧 Use Operational Hours:', useOperationalHours);
    
    // Step 1: Calculate due date (same as in assignment route)
    const dueDate = await calculateSLADueDate(slaStartAt, slaHours, { 
      useOperationalHours: useOperationalHours ?? true
    });
    
    console.log('✅ Due Date calculated:', dueDate.toISOString());
    
    // Step 2: Format to Philippine time (same as in assignment route)
    const slaStartAtPH = new Date(slaStartAt).toLocaleString('en-PH', { 
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/, '$3-$1-$2 $4:$5:$6');

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

    const slaCalculationTime = new Date();
    const slaCalculatedAtPH = new Date(slaCalculationTime).toLocaleString('en-PH', { 
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/, '$3-$1-$2 $4:$5:$6');

    console.log('🕐 SLA Start Time (PH String):', slaStartAtPH);
    console.log('🕐 SLA Due Date (PH String):', slaDueDatePH);
    console.log('🕐 SLA Calculated At (PH String):', slaCalculatedAtPH);
    
    // Step 3: Show what would be saved to formData
    const formDataToSave = {
      slaHours: slaHours.toString(),
      slaDueDate: slaDueDatePH,
      slaCalculatedAt: slaCalculatedAtPH,
      slaStartAt: slaStartAtPH,
      assignedDate: slaStartAtPH
    };
    
    return NextResponse.json({
      test: 'SLA Assignment Route Simulation',
      originalDueDate: dueDate.toISOString(),
      originalDueDateLocal: dueDate.toLocaleString(),
      formDataToSave,
      yourDatabaseValue: '2025-09-01 12:00:00',
      calculatedValue: slaDueDatePH,
      match: slaDueDatePH === '2025-09-01 12:00:00',
      timeDiscrepancy: '12:00:00 vs ' + slaDueDatePH.split(' ')[1]
    });
    
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to simulate assignment route', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
