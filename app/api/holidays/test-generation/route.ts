import { NextResponse } from 'next/server';
import { checkAndGenerateHolidays } from '@/lib/recurring-holidays-service';

export async function POST() {
  try {
    console.log('🧪 Manual test of holiday generation...');
    
    const result = await checkAndGenerateHolidays();
    
    return NextResponse.json({
      success: true,
      message: 'Holiday generation test completed',
      result
    });
    
  } catch (error) {
    console.error('❌ Holiday generation test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Just run the check without generating
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    console.log(`📅 Holiday check simulation for ${todayDate.toDateString()}...`);
    
    return NextResponse.json({
      success: true,
      message: 'Holiday generation check endpoint ready',
      currentDate: todayDate.toDateString(),
      instruction: 'Use POST to actually run the holiday generation'
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
