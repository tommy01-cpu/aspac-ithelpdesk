import { NextRequest, NextResponse } from 'next/server';
import { getEmailConfig, defaultEmailConfig } from '@/lib/email-config';

export async function GET(request: NextRequest) {
  try {
    console.log('=== TESTING DATABASE CONNECTION ===');
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('DATABASE_URL preview:', process.env.DATABASE_URL?.substring(0, 20) + '...');
    
    const config = await getEmailConfig();
    
    console.log('Raw config result:', config);
    console.log('Config is null:', config === null);
    
    if (!config) {
      return NextResponse.json({ 
        error: 'No config found in database',
        defaultUsed: true,
        defaultConfig: defaultEmailConfig 
      });
    }

    return NextResponse.json({ 
      success: true,
      fromDatabase: true,
      config: config 
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : String(error),
      defaultUsed: true
    });
  }
}
