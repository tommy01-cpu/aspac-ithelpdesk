// Test script to verify image processing functionality
const { processImagesForEmail } = require('./lib/email-image-processor');

async function testImageProcessing() {
  console.log('🧪 Testing email image processing...');
  
  const testHtml = '<p>test<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77owAAAABJRU5ErkJggg=="></p>';
  const requestId = 'test_123';
  
  try {
    const result = await processImagesForEmail(testHtml, requestId);
    console.log('✅ Processing completed:');
    console.log('- Images processed:', result.imageCount);
    console.log('- Saved images:', result.savedImages);
    console.log('- Processed HTML length:', result.processedHtml.length);
    console.log('- Contains base64:', result.processedHtml.includes('data:image'));
    console.log('- Contains HTTP URL:', result.processedHtml.includes('http'));
    
    if (result.imageCount > 0 && !result.processedHtml.includes('data:image')) {
      console.log('🎉 Image processing working correctly!');
    } else if (result.imageCount === 0) {
      console.log('ℹ️  No images found to process');
    } else {
      console.log('⚠️  Images found but not processed correctly');
    }
  } catch (error) {
    console.error('❌ Error testing image processing:', error);
  }
}

// Run the test
if (require.main === module) {
  testImageProcessing().then(() => {
    console.log('Test completed');
    process.exit(0);
  });
}
