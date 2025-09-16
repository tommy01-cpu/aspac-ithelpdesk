const { PrismaClient } = require('@prisma/client');

async function getTemplates() {
  const prisma = new PrismaClient();
  
  try {
    const templates = await prisma.request_templates.findMany({
      select: { 
        id: true, 
        template_name: true 
      }
    });
    
    console.log('Available templates:');
    templates.forEach(t => console.log(`- ID: ${t.id}, Name: ${t.template_name}`));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getTemplates();
