import { NextRequest, NextResponse } from 'next/server';
import { calculateSLADueDate, getOperationalHours, componentsToWorkingHours } from '@/lib/sla-calculator';

export async function GET() {
  try {
    console.log('=== Testing Service SLA Conversion Logic ===');
    
    // Test 168 hours (7 calendar days) - typical for "Special SLA for Computer Hardware Services"
    const rawHours = 168;
    const testStart = new Date('2025-01-15T19:13:00+08:00'); // Wednesday 7:13 PM Philippine time
    
    let slaHours: number;
    let useOperationalHours: boolean;
    
    // Apply the same logic as in the SLA assignment route
    if (rawHours > 72) {
      // Convert from what appears to be working hours to actual working hours
      try {
        const oh = await getOperationalHours();
        if (oh && oh.workingTimeType !== 'round-clock') {
          // Estimate working days from raw hours (assuming ~8-9 hours per working day)
          const estimatedDays = Math.ceil(rawHours / 8);
          slaHours = componentsToWorkingHours(estimatedDays, 0, 0, oh);
          useOperationalHours = true;
          console.log(`Converting legacy SLA hours: ${rawHours}h -> ${estimatedDays} working days -> ${slaHours}h`);
        } else {
          slaHours = rawHours;
          useOperationalHours = false;
        }
      } catch (e) {
        console.warn('Failed to convert legacy SLA hours:', e);
        slaHours = rawHours;
        useOperationalHours = false;
      }
    } else {
      slaHours = rawHours;
      useOperationalHours = false;
    }
    
    // Calculate due date
    const dueDate = await calculateSLADueDate(testStart, slaHours, { useOperationalHours });
    
    return NextResponse.json({
      success: true,
      test: 'Service SLA Conversion',
      input: {
        rawHours,
        startTime: {
          iso: testStart.toISOString(),
          philippine: testStart.toLocaleString('en-US', { timeZone: 'Asia/Manila' }),
          day: testStart.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Manila' })
        }
      },
      conversion: {
        estimatedDays: rawHours > 72 ? Math.ceil(rawHours / 8) : null,
        convertedHours: slaHours,
        useOperationalHours
      },
      result: {
        dueDate: {
          iso: dueDate.toISOString(),
          philippine: dueDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' }),
          day: dueDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Manila' })
        }
      },
      analysis: {
        description: `${rawHours}h service SLA -> ${slaHours}h working time`,
        shouldBe: useOperationalHours ? 'Working hours calculation' : 'Calendar hours calculation'
      }
    });
    
  } catch (error) {
    console.error('Error in service SLA test:', error);
    return NextResponse.json(
      { 
        error: 'Service SLA test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
