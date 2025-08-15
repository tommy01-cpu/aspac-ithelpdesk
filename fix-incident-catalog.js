const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixIncidentCatalogItems() {
  try {
    console.log('=== Fixing Missing Incident Catalog Items ===');
    
    // Find incident templates without catalog items
    const incidentTemplates = await prisma.template.findMany({
      where: { 
        type: 'incident',
        incidentCatalogItems: {
          none: {}
        }
      },
      include: {
        incidentCatalogItems: true,
        creator: {
          select: { id: true, emp_fname: true, emp_lname: true }
        }
      }
    });
    
    console.log(`Found ${incidentTemplates.length} incident templates without catalog items`);
    
    for (const template of incidentTemplates) {
      console.log(`\nCreating catalog item for template: "${template.name}" (ID: ${template.id})`);
      
      // Create the missing incident catalog item
      const catalogItem = await prisma.incidentCatalogItem.create({
        data: {
          name: template.name,
          description: template.description || `Incident template: ${template.name}`,
          categoryId: template.categoryId || 1, // Default to first category if not set
          templateId: template.id,
          isActive: template.isActive,
          createdBy: template.createdBy,
          updatedBy: template.updatedBy,
        },
      });
      
      console.log(`✅ Created incident catalog item: "${catalogItem.name}" (ID: ${catalogItem.id})`);
    }
    
    // Verify the fix
    console.log('\n=== Verification ===');
    const updatedCount = await prisma.incidentCatalogItem.count();
    console.log(`Total incident catalog items now: ${updatedCount}`);
    
    const allIncidentCatalogItems = await prisma.incidentCatalogItem.findMany({
      include: {
        template: { select: { id: true, name: true, type: true } },
        category: { select: { id: true, name: true } }
      }
    });
    
    console.log('\nAll incident catalog items:');
    allIncidentCatalogItems.forEach(item => {
      console.log(`- "${item.name}" (Template: ${item.template?.name}, Category: ${item.category?.name})`);
    });

  } catch (error) {
    console.error('Error fixing incident catalog items:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixIncidentCatalogItems();
