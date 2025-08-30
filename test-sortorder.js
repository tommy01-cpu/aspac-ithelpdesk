const { PrismaClient } = require('@prisma/client');

async function testSortOrder() {
  const prisma = new PrismaClient();
  
  try {
    // Test ServiceCategory
    console.log('Testing ServiceCategory...');
    const categories = await prisma.serviceCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        sortOrder: true
      }
    });
    console.log('ServiceCategory query successful:', categories.length, 'records');
    
    // Test ServiceCatalogItem
    console.log('Testing ServiceCatalogItem...');
    const services = await prisma.serviceCatalogItem.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        sortOrder: true
      }
    });
    console.log('ServiceCatalogItem query successful:', services.length, 'records');
    
    // Test IncidentCatalogItem
    console.log('Testing IncidentCatalogItem...');
    const incidents = await prisma.incidentCatalogItem.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        sortOrder: true
      }
    });
    console.log('IncidentCatalogItem query successful:', incidents.length, 'records');
    
    console.log('All tests passed! sortOrder fields are working.');
    
  } catch (error) {
    console.error('Error testing sortOrder:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testSortOrder();
