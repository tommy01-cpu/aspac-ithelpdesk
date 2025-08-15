const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyServiceCounts() {
  try {
    console.log('=== Verifying Service-Only Counts ===');
    
    // Get Test Category 2 counts
    const testCategory = await prisma.serviceCategory.findFirst({
      where: { name: 'Test Category 2' },
      include: {
        _count: {
          select: {
            serviceCatalogItems: true,
            incidentCatalogItems: true,
          },
        },
      },
    });
    
    if (testCategory) {
      console.log(`Test Category 2 (ID: ${testCategory.id}):`);
      console.log(`- Services only: ${testCategory._count.serviceCatalogItems}`);
      console.log(`- Incidents only: ${testCategory._count.incidentCatalogItems}`);
      console.log(`- Combined total: ${testCategory._count.serviceCatalogItems + testCategory._count.incidentCatalogItems}`);
      
      console.log(`\n✅ Expected behavior:`);
      console.log(`- Service page should show count: ${testCategory._count.serviceCatalogItems} (services only)`);
      console.log(`- Incident page should show count: ${testCategory._count.incidentCatalogItems} (incidents only)`);
      console.log(`- Legacy pages should show count: ${testCategory._count.serviceCatalogItems + testCategory._count.incidentCatalogItems} (combined)`);
    }

  } catch (error) {
    console.error('Error verifying service counts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyServiceCounts();
