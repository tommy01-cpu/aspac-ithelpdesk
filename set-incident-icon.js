const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setIncidentTemplateIcon() {
  try {
    console.log('=== Setting Icon for Incident Template ===');
    
    // Update the first incident template to have an icon
    const updated = await prisma.template.update({
      where: { id: 108 }, // "New Incident Template"
      data: { icon: 'emergency.png' }
    });
    
    console.log(`✅ Updated template "${updated.name}" with icon: ${updated.icon}`);

  } catch (error) {
    console.error('Error setting incident template icon:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setIncidentTemplateIcon();
