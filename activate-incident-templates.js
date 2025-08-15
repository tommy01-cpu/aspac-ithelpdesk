const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function activateIncidentTemplates() {
  try {
    console.log('=== Activating Incident Templates ===');
    
    // Activate all incident templates
    const result = await prisma.template.updateMany({
      where: { 
        type: 'incident',
        isActive: false
      },
      data: {
        isActive: true
      }
    });
    
    console.log(`✅ Activated ${result.count} incident templates`);
    
    // Also activate their catalog items
    const catalogResult = await prisma.incidentCatalogItem.updateMany({
      where: { 
        isActive: false
      },
      data: {
        isActive: true
      }
    });
    
    console.log(`✅ Activated ${catalogResult.count} incident catalog items`);
    
    // Verify
    const activeTemplates = await prisma.template.findMany({
      where: { type: 'incident', isActive: true },
      select: { id: true, name: true, isActive: true }
    });
    
    console.log(`\nActive incident templates (${activeTemplates.length}):`);
    activeTemplates.forEach(template => {
      console.log(`- "${template.name}" (ID: ${template.id})`);
    });

  } catch (error) {
    console.error('Error activating incident templates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

activateIncidentTemplates();
