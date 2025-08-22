import { NextRequest, NextResponse } from 'next/server';
import { processImagesForEmailAuto } from '@/lib/email-image-processor-enhanced';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Testing smart email image processing via API...');
    
    // Test with different sized images
    const smallImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77owAAAABJRU5ErkJggg=='; // Very small 1x1 pixel
    const largerImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABpIAAADTCAYAAACCyoAEAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJ'; // Truncated for demo
    
    const testHtml = `
      <p>Small image (should be embedded):</p>
      <img src="${smallImage}">
      <p>Large image (should be saved as file):</p>
      <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABpIAAADTCAYAAACCyoAEAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJ">
    `;
    
    const requestId = 'smart_test_456';
    
    const result = await processImagesForEmailAuto(testHtml, requestId);
    
    console.log('✅ Smart processing completed:');
    console.log('- Total images:', result.imageCount);
    console.log('- Embedded images:', result.embedCount);
    console.log('- Saved as files:', result.savedImages.length);
    console.log('- Saved images:', result.savedImages);
    console.log('- Contains base64:', result.processedHtml.includes('data:image'));
    console.log('- Contains HTTP URL:', result.processedHtml.includes('http'));
    
    return NextResponse.json({
      success: true,
      totalImages: result.imageCount,
      embeddedImages: result.embedCount,
      savedImages: result.savedImages,
      processedHtmlLength: result.processedHtml.length,
      containsBase64: result.processedHtml.includes('data:image'),
      containsHttpUrl: result.processedHtml.includes('http'),
      summary: `${result.embedCount} embedded, ${result.savedImages.length} saved as files`
    });
    
  } catch (error) {
    console.error('❌ Error testing smart image processing:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
