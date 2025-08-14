const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixConversion() {
  try {
    console.log('=== Fixing conversion to properly convert all hours to days ===');
    
    // Update ALL records to convert hours to days properly
    await prisma.$executeRaw`
      UPDATE sla_service 
      SET 
        resolution_days = ("resolutionTime" / 24)::INTEGER,
        resolution_hours = 0,
        resolution_minutes = 0
    `;
    
    console.log('✅ Fixed conversion - all hours converted to days');
    
    // Show results
    const results = await prisma.$queryRaw`
      SELECT 
        id, 
        name, 
        "resolutionTime" as old_hours,
        resolution_days,
        resolution_hours, 
        resolution_minutes
      FROM sla_service 
      ORDER BY id
    `;
    
    console.log('\n=== Final Conversion Results ===');
    results.forEach(row => {
      console.log(`ID ${row.id}: ${row.old_hours}h -> ${row.resolution_days} days, ${row.resolution_hours} hours, ${row.resolution_minutes} minutes`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixConversion();
