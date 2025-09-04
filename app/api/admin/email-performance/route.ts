import { NextRequest, NextResponse } from 'next/server';
import { sendEmailOptimized, getEmailPerformanceStats } from '@/lib/email-performance-optimizer';

export async function POST(request: NextRequest) {
  try {
    const { testEmail } = await request.json();
    
    if (!testEmail) {
      return NextResponse.json({ 
        success: false, 
        error: 'Test email address is required' 
      }, { status: 400 });
    }

    console.log('🧪 Starting email performance test...');
    console.time('Total Email Test Duration');
    
    const startTime = Date.now();
    
    const result = await sendEmailOptimized({
      to: testEmail,
      subject: '🚀 Email Performance Test',
      htmlMessage: `
        <h2>Email Performance Test</h2>
        <p>This is a test email to measure sending performance.</p>
        <p><strong>Sent at:</strong> ${new Date().toISOString()}</p>
        <p><strong>From:</strong> IT Helpdesk System</p>
      `,
      message: `Email Performance Test\n\nThis is a test email to measure sending performance.\nSent at: ${new Date().toISOString()}\nFrom: IT Helpdesk System`
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.timeEnd('Total Email Test Duration');
    
    const stats = getEmailPerformanceStats();
    
    return NextResponse.json({
      success: result,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      performance: {
        ...stats,
        durationMs: duration,
        status: duration < 2000 ? 'excellent' : duration < 5000 ? 'good' : 'needs_optimization'
      }
    });
    
  } catch (error) {
    console.error('❌ Email performance test failed:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const stats = getEmailPerformanceStats();
    
    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
      recommendations: {
        connectionPooling: stats.transporterCached ? '✅ Active' : '❌ Not active',
        cacheStatus: stats.cacheAge < 300000 ? '✅ Fresh' : '⚠️ Stale',
        tips: [
          'Use connection pooling for better performance',
          'Cache transporter instances',
          'Set appropriate timeout values',
          'Monitor email sending durations'
        ]
      }
    });
    
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
