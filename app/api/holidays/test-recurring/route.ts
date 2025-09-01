import { NextRequest, NextResponse } from 'next/server';
import { testRecurringHolidays } from '@/lib/recurring-holidays-service';

// GET /api/holidays/test-recurring - Test the recurring holidays functionality
export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing recurring holidays functionality...');
    
    await testRecurringHolidays();
    
    return NextResponse.json({
      success: true,
      message: 'Recurring holidays test completed. Check server console for detailed output.',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in recurring holidays test:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to test recurring holidays',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
