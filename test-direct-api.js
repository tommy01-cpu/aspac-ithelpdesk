const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDirectAPICall() {
  try {
    console.log('=== Testing Direct API Logic ===');
    
    // Simulate the API call logic
    const categoryId = 7; // Test Category 2
    
    // Get incident catalog items for this category
    const incidentCatalogItems = await prisma.incidentCatalogItem.findMany({
      where: { categoryId: categoryId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
          },
        },
        template: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        creator: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    console.log(`Found ${incidentCatalogItems.length} incident catalog items for category ${categoryId}:`);
    
    incidentCatalogItems.forEach(item => {
      console.log(`- ID: ${item.id}, Name: "${item.name}"`);
      console.log(`  Template: ${item.template?.name} (ID: ${item.templateId})`);
      console.log(`  Category: ${item.category.name}`);
      console.log(`  Active: ${item.isActive}`);
    });

    // Also test service categories API logic for incident type
    console.log('\n=== Testing Service Categories with type=incident ===');
    
    const categories = await prisma.serviceCategory.findMany({
      include: {
        _count: {
          select: {
            serviceCatalogItems: true,
            incidentCatalogItems: true,
          },
        },
      },
    });
    
    const testCategory = categories.find(cat => cat.id === 7);
    if (testCategory) {
      console.log(`Test Category 2 counts:`);
      console.log(`- Services: ${testCategory._count.serviceCatalogItems}`);
      console.log(`- Incidents: ${testCategory._count.incidentCatalogItems}`);
      console.log(`- For type=incident, should return incidentCount: ${testCategory._count.incidentCatalogItems}`);
      console.log(`- For default, should return serviceCount: ${testCategory._count.serviceCatalogItems + testCategory._count.incidentCatalogItems}`);
    }

  } catch (error) {
    console.error('Error testing direct API call:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDirectAPICall();
