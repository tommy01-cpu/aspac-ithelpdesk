const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPriorityFix() {
  console.log('Testing priority SLA mapping...\n');
  
  try {
    // Test all priority levels
    const priorities = ['Top', 'High', 'Medium', 'Low'];
    
    for (const priority of priorities) {
      console.log(`Testing priority: ${priority}`);
      
      // Check Priority SLA mapping
      const prioritySLA = await prisma.prioritySLA.findUnique({
        where: { priority },
        include: {
          slaIncident: {
            select: {
              id: true,
              name: true,
              resolutionHours: true,
              resolutionDays: true,
              operationalHoursEnabled: true
            }
          }
        }
      });
      
      if (prioritySLA) {
        console.log(`✅ Found mapping: ${priority} → SLA Incident ID ${prioritySLA.slaIncident.id}`);
        console.log(`   SLA: ${prioritySLA.slaIncident.name}`);
        console.log(`   Resolution: ${prioritySLA.slaIncident.resolutionDays}d ${prioritySLA.slaIncident.resolutionHours}h`);
        console.log(`   Operational Hours: ${prioritySLA.slaIncident.operationalHoursEnabled}`);
      } else {
        console.log(`❌ No mapping found for ${priority}`);
      }
      console.log('');
    }
    
    // Test lowercase variations (what was being sent before the fix)
    console.log('Testing lowercase variations (old behavior):\n');
    const lowercasePriorities = ['top', 'high', 'medium', 'low'];
    
    for (const priority of lowercasePriorities) {
      console.log(`Testing lowercase priority: ${priority}`);
      
      const prioritySLA = await prisma.prioritySLA.findUnique({
        where: { priority: priority.charAt(0).toUpperCase() + priority.slice(1) },
        include: {
          slaIncident: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
      
      if (prioritySLA) {
        console.log(`✅ Mapping works: ${priority} → ${prioritySLA.slaIncident.name}`);
      } else {
        console.log(`❌ No mapping for ${priority} (when converted to proper case)`);
      }
    }
    
  } catch (error) {
    console.error('Error testing priority mappings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPriorityFix();
