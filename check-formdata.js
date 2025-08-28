const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkFormData() {
  try {
    console.log('Checking formData structure in request table...\n');
    
    // Get a few recent requests to examine their formData
    const requests = await prisma.request.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        templateId: true,
        formData: true,
        createdAt: true
      }
    });

    console.log(`Found ${requests.length} recent requests:\n`);

    requests.forEach((request, index) => {
      console.log(`--- Request #${request.id} (${index + 1}/${requests.length}) ---`);
      console.log(`Template ID: ${request.templateId}`);
      console.log(`Created: ${request.createdAt}`);
      
      let formData;
      try {
        formData = typeof request.formData === 'string' 
          ? JSON.parse(request.formData) 
          : request.formData;
      } catch (error) {
        console.log('Error parsing formData:', error.message);
        formData = request.formData;
      }
      
      console.log('FormData structure:');
      if (formData && typeof formData === 'object') {
        Object.keys(formData).forEach(key => {
          const value = formData[key];
          const displayValue = typeof value === 'string' && value.length > 100 
            ? value.substring(0, 100) + '...' 
            : value;
          console.log(`  ${key}: ${JSON.stringify(displayValue)}`);
        });
      } else {
        console.log('  Raw formData:', formData);
      }
      console.log('\n');
    });

  } catch (error) {
    console.error('Error checking formData:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFormData();
