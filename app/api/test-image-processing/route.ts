import { NextRequest, NextResponse } from 'next/server';
import { processImagesForEmail } from '@/lib/email-image-processor';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Testing email image processing via API...');
    
    const testHtml = '<p>test<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77owAAAABJRU5ErkJggg=="></p>';
    const requestId = 'api_test_123';
    
    const result = await processImagesForEmail(testHtml, requestId);
    
    console.log('✅ Processing completed:');
    console.log('- Images processed:', result.imageCount);
    console.log('- Saved images:', result.savedImages);
    console.log('- Processed HTML length:', result.processedHtml.length);
    console.log('- Contains base64:', result.processedHtml.includes('data:image'));
    console.log('- Contains HTTP URL:', result.processedHtml.includes('http'));
    
    return NextResponse.json({
      success: true,
      imageCount: result.imageCount,
      savedImages: result.savedImages,
      processedHtmlLength: result.processedHtml.length,
      containsBase64: result.processedHtml.includes('data:image'),
      containsHttpUrl: result.processedHtml.includes('http'),
      processedHtml: result.processedHtml
    });
    
  } catch (error) {
    console.error('❌ Error testing image processing:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
