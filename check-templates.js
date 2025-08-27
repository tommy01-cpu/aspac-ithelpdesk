const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTemplates() {
  try {
    const templates = await prisma.email_templates.findMany({ 
      select: { 
        id: true, 
        template_key: true, 
        title: true, 
        is_active: true 
      },
      orderBy: { id: 'asc' }
    });
    
    console.log('📧 Email Templates in Database:');
    console.log('=====================================');
    templates.forEach(t => {
      console.log(`ID: ${t.id} | Key: ${t.template_key} | Title: ${t.title} | Active: ${t.is_active}`);
    });
    console.log('=====================================');
    console.log(`Total templates: ${templates.length}`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTemplates();
