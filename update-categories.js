const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateCategories() {
  try {
    // Update categories to remove "Request" prefix
    await prisma.emailTemplateVariables.updateMany({
      where: { category: 'Request' },
      data: { category: 'General' }
    });

    console.log('Updated categories successfully');
    
    // Show current variables
    const variables = await prisma.emailTemplateVariables.findMany({
      select: {
        variableKey: true,
        displayName: true,
        category: true
      },
      orderBy: [
        { category: 'asc' },
        { displayName: 'asc' }
      ]
    });
    
    console.log('Current variables:');
    variables.forEach(v => {
      console.log(`- ${v.variableKey} (${v.displayName}) - Category: ${v.category}`);
    });

  } catch (error) {
    console.error('Error updating categories:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateCategories();
