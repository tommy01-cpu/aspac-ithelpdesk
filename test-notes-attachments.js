const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testNotesWithAttachments() {
  try {
    console.log('🧪 Testing notes with attachments implementation...');

    // 1. Find a request to test with
    const request = await prisma.request.findFirst({
      select: {
        id: true,
        templateName: true,
        formData: true,
        status: true
      }
    });

    if (!request) {
      console.log('❌ No requests found for testing');
      return;
    }

    console.log(`📝 Testing with request #${request.id}: ${request.templateName}`);

    // 2. Get current conversations from formData
    const currentFormData = request.formData || {};
    const existingConversations = currentFormData.conversations || [];

    console.log(`📊 Current conversations: ${existingConversations.length}`);

    // 3. Create a test conversation with attachments
    const testConversation = {
      id: `conv_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'user',
      message: 'This is a test note with attachments for verification',
      author: 'Test User',
      timestamp: new Date(Date.now() - (8 * 60 * 60 * 1000)).toISOString(),
      authorId: 1,
      attachments: [
        {
          id: 'test_attachment_1',
          originalName: 'test-document.pdf',
          size: 1024576, // 1MB
          mimeType: 'application/pdf'
        },
        {
          id: 'test_attachment_2', 
          originalName: 'screenshot.png',
          size: 512000, // 500KB
          mimeType: 'image/png'
        }
      ]
    };

    // 4. Add the test conversation
    const updatedConversations = [...existingConversations, testConversation];
    const updatedFormData = {
      ...currentFormData,
      conversations: updatedConversations
    };

    // 5. Update the request
    await prisma.request.update({
      where: { id: request.id },
      data: {
        formData: updatedFormData,
        updatedAt: new Date()
      }
    });

    console.log('✅ Test conversation with attachments added successfully!');
    console.log(`📎 Added ${testConversation.attachments.length} test attachments:`);
    testConversation.attachments.forEach((att, i) => {
      console.log(`   ${i + 1}. ${att.originalName} (${(att.size / 1024).toFixed(1)}KB)`);
    });

    console.log(`\n🌐 Test the implementation by visiting:`);
    console.log(`   http://localhost:3001/users/requests/${request.id}`);
    console.log(`   Navigate to the "Details" tab and check the "Notes" section`);

  } catch (error) {
    console.error('❌ Error testing notes with attachments:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testNotesWithAttachments();
