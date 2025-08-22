const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugRequest() {
  try {
    console.log('🔍 Checking request 226...');
    
    const request = await prisma.request.findUnique({
      where: { id: 226 },
      include: {
        user: true
      }
    });
    
    if (!request) {
      console.log('❌ Request 226 not found');
      return;
    }
    
    console.log('✅ Request found:');
    console.log('- ID:', request.id);
    console.log('- Status:', request.status);
    console.log('- Template ID:', request.templateId);
    console.log('- User:', `${request.user.emp_fname} ${request.user.emp_lname}`);
    
    const formData = request.formData;
    const description = formData?.['9'] || 'No description';
    
    console.log('📋 Description analysis:');
    console.log('- Length:', description.length);
    console.log('- Contains <img>:', description.includes('<img'));
    console.log('- Contains data:image:', description.includes('data:image'));
    console.log('- Contains http:', description.includes('http'));
    
    if (description.includes('<img')) {
      console.log('🖼️ Image found in description:');
      console.log('- First 300 chars:', description.substring(0, 300));
      
      // Extract img src
      const imgMatch = description.match(/<img[^>]+src="([^"]+)"/);
      if (imgMatch) {
        console.log('- Image src:', imgMatch[1]);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugRequest();
