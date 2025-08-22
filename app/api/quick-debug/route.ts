import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { requestId } = await req.json();
    
    console.log(`🔍 Quick debug for request: ${requestId}`);
    
    // Just return a simple response to test the endpoint
    return NextResponse.json({
      message: `Debugging request ${requestId}`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Debug error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
