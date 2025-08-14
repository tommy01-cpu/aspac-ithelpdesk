const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function removeResolutionTimeField() {
  try {
    console.log('=== Removing resolutionTime field from sla_service table ===');
    
    // Drop the column
    await prisma.$executeRaw`
      ALTER TABLE sla_service 
      DROP COLUMN IF EXISTS "resolutionTime"
    `;
    
    console.log('✅ Removed resolutionTime column');
    
    // Verify the table structure
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'sla_service' 
      AND column_name LIKE '%resolution%'
      ORDER BY column_name
    `;
    
    console.log('\n=== Current resolution-related columns in sla_service ===');
    columns.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

removeResolutionTimeField();
