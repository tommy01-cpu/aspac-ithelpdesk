import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processImagesForEmailAuto } from '@/lib/email-image-processor-enhanced';

export async function POST(req: NextRequest) {
  try {
    const { requestId } = await req.json();
    
    console.log(`🔍 Testing image processing for request ${requestId}`);
    
    const request = await prisma.request.findUnique({
      where: { id: parseInt(requestId) },
      include: { user: true }
    });
    
    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    
    const formData = request.formData as any;
    const originalDescription = formData?.['9'] || 'No description';
    
    console.log('📋 Original description info:');
    console.log('- Length:', originalDescription.length);
    console.log('- Contains img tag:', originalDescription.includes('<img'));
    console.log('- Contains base64:', originalDescription.includes('data:image'));
    console.log('- First 200 chars:', originalDescription.substring(0, 200));
    
    // Process images using auto mode (will embed for internal networks)
    const processed = await processImagesForEmailAuto(originalDescription, requestId.toString());
    
    console.log('✅ Processed description info:');
    console.log('- Length:', processed.processedHtml.length);
    console.log('- Contains img tag:', processed.processedHtml.includes('<img'));
    console.log('- Contains base64:', processed.processedHtml.includes('data:image'));
    console.log('- Contains http:', processed.processedHtml.includes('http'));
    console.log('- Images processed:', processed.imageCount);
    console.log('- Images embedded:', processed.embedCount);
    console.log('- Images saved:', processed.savedImages);
    console.log('- First 300 chars:', processed.processedHtml.substring(0, 300));
    
    return NextResponse.json({
      success: true,
      original: {
        length: originalDescription.length,
        hasImg: originalDescription.includes('<img'),
        hasBase64: originalDescription.includes('data:image'),
        preview: originalDescription.substring(0, 300)
      },
      processed: {
        length: processed.processedHtml.length,
        hasImg: processed.processedHtml.includes('<img'),
        hasBase64: processed.processedHtml.includes('data:image'),
        hasHttp: processed.processedHtml.includes('http'),
        imageCount: processed.imageCount,
        embedCount: processed.embedCount,
        savedImages: processed.savedImages,
        preview: processed.processedHtml.substring(0, 300)
      }
    });
    
  } catch (error) {
    console.error('❌ Error testing image processing:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
