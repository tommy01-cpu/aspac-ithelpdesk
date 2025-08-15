const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyIncidentTemplateWorkflow() {
  try {
    console.log('=== Incident Template Workflow Verification ===');
    
    // 1. Count incident templates
    const templateCount = await prisma.template.count({
      where: { type: 'incident' }
    });
    
    // 2. Count incident catalog items
    const catalogCount = await prisma.incidentCatalogItem.count();
    
    // 3. Check active incident templates
    const activeTemplates = await prisma.template.findMany({
      where: { 
        type: 'incident',
        isActive: true
      },
      include: {
        incidentCatalogItems: {
          select: { id: true, name: true, isActive: true }
        }
      }
    });
    
    console.log(`📊 Statistics:`);
    console.log(`- Total incident templates: ${templateCount}`);
    console.log(`- Total incident catalog items: ${catalogCount}`);
    console.log(`- Active incident templates: ${activeTemplates.length}`);
    
    console.log(`\n✅ Active Incident Templates with Catalog Items:`);
    activeTemplates.forEach(template => {
      const catalogItems = template.incidentCatalogItems;
      console.log(`- "${template.name}" (ID: ${template.id})`);
      console.log(`  └─ Catalog Items: ${catalogItems.length}`);
      catalogItems.forEach(item => {
        console.log(`     └─ "${item.name}" (Active: ${item.isActive})`);
      });
    });
    
    // 4. Summary
    console.log(`\n📋 Summary:`);
    if (templateCount === catalogCount) {
      console.log(`✅ All incident templates have corresponding catalog items`);
    } else {
      console.log(`❌ Mismatch: ${templateCount} templates vs ${catalogCount} catalog items`);
    }
    
    if (activeTemplates.length > 0) {
      console.log(`✅ ${activeTemplates.length} incident templates are active and visible`);
    } else {
      console.log(`❌ No active incident templates found`);
    }

  } catch (error) {
    console.error('Error verifying incident template workflow:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyIncidentTemplateWorkflow();
