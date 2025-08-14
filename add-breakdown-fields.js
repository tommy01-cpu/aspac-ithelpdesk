const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addBreakdownFields() {
  try {
    console.log('=== Adding resolution breakdown fields to SLA Service ===');
    
    // Add the fields using raw SQL
    await prisma.$executeRaw`
      ALTER TABLE sla_service 
      ADD COLUMN IF NOT EXISTS resolution_days INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS resolution_hours INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS resolution_minutes INTEGER DEFAULT 0
    `;
    
    console.log('✅ Added breakdown fields');
    
    // Update existing records
    await prisma.$executeRaw`
      UPDATE sla_service 
      SET 
        resolution_days = ("resolutionTime" / 24)::INTEGER,
        resolution_hours = 0,
        resolution_minutes = 0
      WHERE resolution_days = 0 AND resolution_hours = 0 AND resolution_minutes = 0
    `;
    
    console.log('✅ Converted existing data');
    
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
    
    console.log('\n=== Conversion Results ===');
    results.forEach(row => {
      console.log(`ID ${row.id}: ${row.old_hours}h -> ${row.resolution_days} days, ${row.resolution_hours} hours, ${row.resolution_minutes} minutes`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addBreakdownFields();
