const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTemplateStructure() {
  try {
    const template = await prisma.template.findUnique({
      where: { id: 46 },
      select: {
        id: true,
        name: true,
        fields: true
      }
    });
    
    if (template) {
      console.log('Template:', template.name);
      console.log('Fields structure type:', typeof template.fields);
      console.log('Fields:', JSON.stringify(template.fields, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTemplateStructure();
