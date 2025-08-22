import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get('id');
    
    if (!requestId) {
      return NextResponse.json({ error: 'Request ID required' }, { status: 400 });
    }
    
    console.log(`🔍 Debugging request ID: ${requestId}`);
    
    const request = await prisma.request.findUnique({
      where: { id: parseInt(requestId) },
      include: {
        user: true,
        template: true
      }
    });
    
    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    
    const formData = request.formData as any;
    const description = formData?.['9'] || 'No description';
    
    console.log('📋 Request details:');
    console.log('- ID:', request.id);
    console.log('- Status:', request.status);
    console.log('- Template:', request.template?.name);
    console.log('- Description length:', description.length);
    console.log('- Contains img tag:', description.includes('<img'));
    console.log('- Contains base64:', description.includes('data:image'));
    console.log('- Contains http:', description.includes('http'));
    console.log('- First 200 chars:', description.substring(0, 200));
    
    return NextResponse.json({
      requestId: request.id,
      status: request.status,
      templateName: request.template?.name,
      description: description,
      descriptionLength: description.length,
      hasImgTag: description.includes('<img'),
      hasBase64: description.includes('data:image'),
      hasHttp: description.includes('http'),
      preview: description.substring(0, 500)
    });
    
  } catch (error) {
    console.error('❌ Error debugging request:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
