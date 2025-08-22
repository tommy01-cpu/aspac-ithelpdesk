import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getEmailConfig, saveEmailConfig, defaultEmailConfig, EmailConfigData } from '@/lib/email-config';

interface SMTPSettings {
  serverName: string;
  alternateServerName?: string;
  senderName: string;
  replyTo: string;
  protocol: string;
  port: number;
  username: string;
  password: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await getEmailConfig();
    
    console.log('=== EMAIL CONFIG DEBUG ===');
    console.log('Raw config from database:', config);

    if (!config) {
      console.log('No config found, returning defaults');
      return NextResponse.json(defaultEmailConfig);
    }

    const response = {
      serverName: config.serverName,
      alternateServerName: config.alternateServer || '',
      senderName: config.senderName,
      replyTo: config.replyTo,
      protocol: config.protocol,
      port: config.port,
      username: config.username || '',
      password: config.password || ''
    };
    
    console.log('API response:', response);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching email config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email configuration' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: SMTPSettings = await request.json();
    const { serverName, alternateServerName, senderName, replyTo, protocol, port, username, password } = body;

    // Validate required fields
    if (!serverName || !replyTo) {
      return NextResponse.json({ 
        error: 'Server name and reply-to email are required' 
      }, { status: 400 });
    }

    const configData: EmailConfigData = {
      serverName,
      alternateServer: alternateServerName || '',
      senderName,
      replyTo,
      protocol,
      port: parseInt(port.toString()),
      username: username || '',
      password: password || ''
    };

    const success = await saveEmailConfig(configData);

    if (success) {
      return NextResponse.json({ success: true, config: configData });
    } else {
      return NextResponse.json(
        { error: 'Failed to save email configuration' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error saving email config:', error);
    return NextResponse.json(
      { error: 'Failed to save email configuration' },
      { status: 500 }
    );
  }
}
