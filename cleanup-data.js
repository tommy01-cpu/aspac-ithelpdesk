const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupData() {
  try {
    console.log('🧹 Starting data cleanup...');
    
    // Delete in order to respect foreign key constraints
    console.log('Deleting requests...');
    await prisma.request.deleteMany({});
    
    console.log('Deleting service catalog items...');
    await prisma.serviceCatalogItem.deleteMany({});
    
    console.log('Deleting incident catalog items...');
    await prisma.incidentCatalogItem.deleteMany({});
    
    console.log('Deleting template support groups...');
    await prisma.templateSupportGroup.deleteMany({});
    
    console.log('Deleting templates...');
    await prisma.template.deleteMany({});
    
    console.log('Deleting service categories...');
    await prisma.serviceCategory.deleteMany({});
    
    console.log('Deleting technician support groups...');
    await prisma.technicianSupportGroup.deleteMany({});
    
    console.log('Deleting technician skills...');
    await prisma.technicianSkill.deleteMany({});
    
    console.log('Deleting technicians...');
    await prisma.technician.deleteMany({});
    
    console.log('Deleting support groups...');
    await prisma.supportGroup.deleteMany({});
    
    console.log('Deleting skills...');
    await prisma.skill.deleteMany({});
    
    console.log('Deleting SLA service escalations...');
    await prisma.sLAServiceEscalation.deleteMany({});
    
    console.log('Deleting SLA services...');
    await prisma.sLAService.deleteMany({});
    
    console.log('Deleting priority SLA...');
    await prisma.prioritySLA.deleteMany({});
    
    console.log('Deleting SLA incidents...');
    await prisma.sLAIncident.deleteMany({});
    
    console.log('Deleting departments...');
    await prisma.department.deleteMany({});
    
    console.log('Deleting holidays...');
    await prisma.holiday.deleteMany({});
    
    console.log('Deleting operational hours data...');
    await prisma.breakHours.deleteMany({});
    await prisma.workingDay.deleteMany({});
    await prisma.exclusionRule.deleteMany({});
    await prisma.operationalHours.deleteMany({});
    
    console.log('✅ Data cleanup completed successfully!');
    console.log('ℹ️  Users table preserved for login access');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupData();
