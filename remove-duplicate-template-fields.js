const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function removeDuplicateTemplateFields() {
  try {
    console.log('Starting removal of duplicate template fields from requests table...');
    
    // First, let's check how many requests we have
    const requestCount = await prisma.$queryRaw`SELECT COUNT(*) FROM requests;`;
    console.log(`Total requests in database: ${requestCount[0].count}`);
    
    // Show some sample data before removal
    console.log('\nSample data before removal:');
    const sampleData = await prisma.$queryRaw`
      SELECT id, "templateId", "templateName", type, priority 
      FROM requests 
      LIMIT 5;
    `;
    console.table(sampleData);
    
    console.log('\nRemoving duplicate template fields...');
    
    // Remove the columns one by one to avoid any issues
    console.log('1. Removing templateName column...');
    await prisma.$executeRaw`ALTER TABLE requests DROP COLUMN IF EXISTS "templateName";`;
    
    console.log('2. Removing type column...');
    await prisma.$executeRaw`ALTER TABLE requests DROP COLUMN IF EXISTS type;`;
    
    console.log('3. Removing priority column...');
    await prisma.$executeRaw`ALTER TABLE requests DROP COLUMN IF EXISTS priority;`;
    
    console.log('\n✅ Successfully removed duplicate template fields from requests table!');
    
    // Verify the new structure
    console.log('\nNew table structure:');
    const newStructure = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'requests' 
      ORDER BY ordinal_position;
    `;
    console.table(newStructure);
    
    // Show sample data after removal
    console.log('\nSample data after removal:');
    const sampleDataAfter = await prisma.$queryRaw`
      SELECT id, "templateId", "userId", status, "createdAt" 
      FROM requests 
      LIMIT 5;
    `;
    console.table(sampleDataAfter);
    
  } catch (error) {
    console.error('Error removing duplicate template fields:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
removeDuplicateTemplateFields()
  .then(() => {
    console.log('\n🎉 Migration completed successfully!');
    console.log('Note: You should also update your Prisma schema file to reflect these changes.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
