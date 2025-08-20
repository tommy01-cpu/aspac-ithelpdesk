const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkIncidentSLA() {
  try {
    console.log('🔍 Checking recent incident SLA data...');
    
    // Get a recent incident with SLA
    const incident = await prisma.incident.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        sla: true,
        incidentType: true
      }
    });
    
    if (!incident) {
      console.log('❌ No incidents found');
      return;
    }
    
    console.log('\n📋 Latest incident:');
    console.log('- ID:', incident.id);
    console.log('- Type:', incident.incidentType?.name);
    console.log('- Created:', incident.createdAt);
    console.log('- SLA Start:', incident.sla?.startTime);
    console.log('- SLA Due:', incident.sla?.dueTime);
    console.log('- SLA Hours:', incident.sla?.slaHours);
    
    // Check if there are multiple operational hours configs
    const allOperationalHours = await prisma.operationalHours.findMany();
    console.log('\n📊 All operational hours configurations:');
    allOperationalHours.forEach((config, index) => {
      console.log(`${index + 1}. ID: ${config.id}, Active: ${config.isActive}, Type: ${config.workingTimeType}`);
    });
    
    // Check if incident type has specific operational hours
    if (incident.incidentType) {
      const incidentTypeConfig = await prisma.incidentType.findUnique({
        where: { id: incident.incidentType.id },
        include: { operationalHours: true }
      });
      
      if (incidentTypeConfig?.operationalHours) {
        console.log('\n⚙️  Incident type has specific operational hours:');
        console.log('- Type:', incidentTypeConfig.operationalHours.workingTimeType);
        console.log('- Start:', incidentTypeConfig.operationalHours.standardStartTime);
        console.log('- End:', incidentTypeConfig.operationalHours.standardEndTime);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkIncidentSLA();
