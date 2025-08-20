const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTemplate() {
  try {
    const template = await prisma.template.findUnique({
      where: { id: 24 }
    });
    
    console.log('Template fields:', JSON.stringify(template.fields, null, 2));
    
    // Find priority field
    const priorityField = template.fields?.find(f => f.type === 'priority');
    console.log('Priority field:', priorityField);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTemplate();
