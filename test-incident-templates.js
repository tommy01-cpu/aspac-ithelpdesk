const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testIncidentTemplates() {
  try {
    console.log('=== Testing Incident Templates ===');
    
    // 1. Check all templates with type 'incident'
    console.log('\n1. All incident templates:');
    const incidentTemplates = await prisma.template.findMany({
      where: { type: 'incident' },
      include: {
        incidentCatalogItems: true,
        creator: {
          select: { emp_fname: true, emp_lname: true }
        }
      }
    });
    
    console.log(`Found ${incidentTemplates.length} incident templates:`);
    incidentTemplates.forEach(template => {
      console.log(`- ID: ${template.id}, Name: "${template.name}", Active: ${template.isActive}, Created: ${template.createdAt}`);
      console.log(`  Creator: ${template.creator?.emp_fname} ${template.creator?.emp_lname}`);
      console.log(`  Catalog Items: ${template.incidentCatalogItems.length}`);
    });

    // 2. Check all incident catalog items
    console.log('\n2. All incident catalog items:');
    const incidentCatalogItems = await prisma.incidentCatalogItem.findMany({
      include: {
        template: { select: { id: true, name: true, type: true } },
        category: { select: { id: true, name: true } }
      }
    });
    
    console.log(`Found ${incidentCatalogItems.length} incident catalog items:`);
    incidentCatalogItems.forEach(item => {
      console.log(`- ID: ${item.id}, Name: "${item.name}", Active: ${item.isActive}`);
      console.log(`  Template: ${item.template?.name} (ID: ${item.templateId})`);
      console.log(`  Category: ${item.category?.name} (ID: ${item.categoryId})`);
    });

    // 3. Check categories
    console.log('\n3. Service categories:');
    const categories = await prisma.serviceCategory.findMany({
      select: { id: true, name: true, isActive: true }
    });
    
    console.log(`Found ${categories.length} categories:`);
    categories.forEach(cat => {
      console.log(`- ID: ${cat.id}, Name: "${cat.name}", Active: ${cat.isActive}`);
    });

  } catch (error) {
    console.error('Error testing incident templates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testIncidentTemplates();
