import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    console.log('GET /api/requests called');
    
    const session = await getServerSession(authOptions);
    console.log('Session:', session ? 'exists' : 'null');
    
    if (!session?.user) {
      console.log('No session or user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit')) || 10;
    const page = Number(searchParams.get('page')) || 1;
    const skip = (page - 1) * limit;

    console.log('Fetching requests for user:', session.user.id);

    const requests = await prisma.request.findMany({
      where: {
        userId: parseInt(session.user.id),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip,
    });

    const total = await prisma.request.count({
      where: {
        userId: parseInt(session.user.id),
      },
    });

    console.log('Found requests:', requests.length);

    return NextResponse.json({
      requests,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        current: page,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/requests:', error);
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    console.log('POST /api/requests called');
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { templateId, templateName, type, formData, attachments } = data;

    console.log('Creating request with data:', { templateId, templateName, type });

    // Create the request in the database
    const newRequest = await prisma.request.create({
      data: {
        templateId: String(templateId),
        templateName,
        type,
        status: formData.status || 'open',
        priority: formData.priority || 'medium',
        userId: parseInt(session.user.id),
        formData: formData,
        attachments: attachments || [],
      },
    });

    console.log('Request created with ID:', newRequest.id);

    return NextResponse.json({ success: true, request: newRequest });
  } catch (error) {
    console.error('Error creating request:', error);
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
  }
}
