import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Test reorder endpoint called');
    
    const body = await request.json();
    console.log('📝 Request body:', body);
    
    return NextResponse.json({
      success: true,
      message: 'Test endpoint working',
      receivedData: body
    });
    
  } catch (error) {
    console.error('❌ Test reorder error:', error);
    return NextResponse.json(
      { 
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('🧪 Test reorder PUT endpoint called');
    
    const body = await request.json();
    console.log('📝 Request body:', body);
    
    return NextResponse.json({
      success: true,
      message: 'Test PUT endpoint working',
      receivedData: body
    });
    
  } catch (error) {
    console.error('❌ Test reorder PUT error:', error);
    return NextResponse.json(
      { 
        error: 'Test PUT failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
