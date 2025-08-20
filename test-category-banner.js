const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCategoryBanner() {
  try {
    console.log('🧪 Testing Template Category Banner Fix');
    
    // Find a template with category information
    const template = await prisma.template.findFirst({
      where: {
        categoryId: { not: null }
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true,
          }
        },
        slaService: {
          select: {
            id: true,
            name: true,
            resolutionDays: true,
            resolutionHours: true,
            resolutionMinutes: true,
          }
        }
      }
    });
    
    if (!template) {
      console.log('❌ No templates found with category information');
      return;
    }
    
    console.log('✅ Found template with category:');
    console.log('Template ID:', template.id);
    console.log('Template Name:', template.name);
    console.log('Template Type:', template.type);
    console.log('Category ID:', template.categoryId);
    console.log('Category Name:', template.category?.name);
    console.log('SLA Service:', template.slaService?.name);
    
    console.log('\n🎯 Banner should now show:');
    console.log(`"${template.type === 'service' ? 'Service' : 'Incident'} Template: ${template.name} | Category: ${template.category?.name || 'General'} | ${template.type === 'service' && template.slaService ? `SLA: ${template.slaService.name} (Resolution: X hours upon full approvals)` : 'SLA based on priority'}"`)
    
    console.log(`\n🔗 Test at: http://localhost:3000/requests/templateid/${template.id}?type=${template.type}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCategoryBanner();
