import { NextResponse } from 'next/server';
import { calculateSLADueDate } from '@/lib/sla-calculator';

export async function GET() {
  try {
    // Test with exact same parameters
    const ticketCreatedDate = new Date('2025-08-12T18:55:00.000Z'); // 6:55 PM Philippine time
    const slaHours = 36; // 4 working days × 9 hours per day
    
    console.log('=== SLA Debug Calculation ===');
    console.log('Input:');
    console.log('- Ticket created:', ticketCreatedDate.toISOString());
    console.log('- Philippine time:', ticketCreatedDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    console.log('- Day of week:', ticketCreatedDate.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', weekday: 'long' }));
    console.log('- SLA hours required:', slaHours);
    
    const dueDate = await calculateSLADueDate(ticketCreatedDate, slaHours);
    
    console.log('\nOutput:');
    console.log('- Due date:', dueDate.toISOString());
    console.log('- Philippine time:', dueDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    console.log('- Day of week:', dueDate.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', weekday: 'long' }));
    
    // Calculate difference
    const diffMs = dueDate.getTime() - ticketCreatedDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    console.log('- Total hours difference:', diffHours);
    
    // Expected calculation
    console.log('\nExpected calculation:');
    console.log('Wed 6:55 PM → Thu 8:00 AM → start counting');
    console.log('Thu: 9 hours (8AM-6PM minus lunch) → 27 remaining');
    console.log('Fri: 9 hours (8AM-6PM minus lunch) → 18 remaining');  
    console.log('Sat: 4 hours (8AM-12PM) → 14 remaining');
    console.log('Sun: 0 hours (non-working) → 14 remaining');
    console.log('Mon: 9 hours (8AM-6PM minus lunch) → 5 remaining');
    console.log('Tue: 5 hours (8AM-1PM) → 0 remaining');
    console.log('Expected due: Tuesday 1:00 PM Philippine');
    
    return NextResponse.json({
      success: true,
      debug: {
        input: {
          iso: ticketCreatedDate.toISOString(),
          philippine: ticketCreatedDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' }),
          day: ticketCreatedDate.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', weekday: 'long' }),
          slaHours
        },
        output: {
          iso: dueDate.toISOString(),
          philippine: dueDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' }),
          day: dueDate.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', weekday: 'long' }),
          totalHoursDiff: diffMs / (1000 * 60 * 60)
        },
        issue: "Getting Monday 2:00 PM instead of Tuesday 1:00 PM"
      }
    });
    
  } catch (error) {
    console.error('SLA debug error:', error);
    return NextResponse.json({ 
      error: 'SLA calculation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
