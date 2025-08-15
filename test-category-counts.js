const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCategoryCounts() {
  try {
    console.log('=== Testing Category Counts ===');
    
    // Get category with both service and incident items
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
    
    console.log('Category counts:');
    categories.forEach(category => {
      const serviceCount = category._count.serviceCatalogItems;
      const incidentCount = category._count.incidentCatalogItems;
      const totalCount = serviceCount + incidentCount;
      
      console.log(`- ${category.name}:`);
      console.log(`  Services: ${serviceCount}`);
      console.log(`  Incidents: ${incidentCount}`);
      console.log(`  Total: ${totalCount}`);
    });
    
    // Focus on Test Category 2
    const testCategory = categories.find(cat => cat.name === 'Test Category 2');
    if (testCategory) {
      console.log(`\n📊 Test Category 2 Details:`);
      console.log(`- Services: ${testCategory._count.serviceCatalogItems}`);
      console.log(`- Incidents: ${testCategory._count.incidentCatalogItems}`);
      console.log(`- Total: ${testCategory._count.serviceCatalogItems + testCategory._count.incidentCatalogItems}`);
      
      // Get actual items
      const serviceItems = await prisma.serviceCatalogItem.findMany({
        where: { categoryId: testCategory.id },
        select: { id: true, name: true, isActive: true }
      });
      
      const incidentItems = await prisma.incidentCatalogItem.findMany({
        where: { categoryId: testCategory.id },
        select: { id: true, name: true, isActive: true }
      });
      
      console.log(`\nActual items in Test Category 2:`);
      console.log(`Service items (${serviceItems.length}):`);
      serviceItems.forEach(item => console.log(`  - ${item.name} (Active: ${item.isActive})`));
      
      console.log(`Incident items (${incidentItems.length}):`);
      incidentItems.forEach(item => console.log(`  - ${item.name} (Active: ${item.isActive})`));
    }

  } catch (error) {
    console.error('Error testing category counts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCategoryCounts();
