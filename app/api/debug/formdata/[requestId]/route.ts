import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const requestId = parseInt(params.requestId);
    
    const requestData = await prisma.request.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        formData: true,
      }
    });

    if (!requestData) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    return NextResponse.json({
      requestId: requestData.id,
      formData: requestData.formData,
      formDataKeys: Object.keys(requestData.formData || {}),
      field8: (requestData.formData as any)?.['8'],
      field9: (requestData.formData as any)?.['9'],
      fieldSubject: (requestData.formData as any)?.subject,
      fieldDescription: (requestData.formData as any)?.description,
      fieldTitle: (requestData.formData as any)?.title,
      fieldDetails: (requestData.formData as any)?.details,
    });
  } catch (error) {
    console.error('Error fetching request formData:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
