import { NextRequest, NextResponse } from 'next/server';
import { checkAndGenerateHolidays } from '@/lib/recurring-holidays-service';

// GET /api/holidays/auto-generate - Automatically check and generate recurring holidays
export async function GET(request: NextRequest) {
  try {
    console.log('🤖 Automated holiday generation service triggered...');
    
    const result = await checkAndGenerateHolidays();
    
    return NextResponse.json({
      success: true,
      message: result.message,
      results: result.results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in automated holiday generation:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate holidays',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// POST /api/holidays/auto-generate - Force generate holidays (for manual trigger if needed)
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Manual holiday generation service triggered...');
    
    const result = await checkAndGenerateHolidays();
    
    return NextResponse.json({
      success: true,
      message: result.message,
      results: result.results,
      timestamp: new Date().toISOString(),
      triggered: 'manual'
    });
    
  } catch (error) {
    console.error('❌ Error in manual holiday generation:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate holidays',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
