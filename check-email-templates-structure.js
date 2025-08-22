const { Pool } = require('pg');

async function checkEmailTemplatesStructure() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    console.log('=== CHECKING EMAIL_TEMPLATES TABLE STRUCTURE ===');
    
    // Check table structure
    const structureQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'email_templates'
      ORDER BY ordinal_position;
    `;
    
    const structure = await pool.query(structureQuery);
    console.log('Table structure:');
    console.table(structure.rows);
    
    // Check if table has any data
    const dataQuery = 'SELECT COUNT(*) as count FROM email_templates';
    const count = await pool.query(dataQuery);
    console.log('Total records in email_templates:', count.rows[0].count);
    
    // Get sample data if exists
    if (parseInt(count.rows[0].count) > 0) {
      const sampleQuery = 'SELECT * FROM email_templates LIMIT 3';
      const sample = await pool.query(sampleQuery);
      console.log('Sample data:');
      console.table(sample.rows);
    }
    
    console.log('=== CHECK COMPLETE ===');
    
  } catch (error) {
    console.error('Error checking table structure:', error.message);
  } finally {
    await pool.end();
  }
}

checkEmailTemplatesStructure();
