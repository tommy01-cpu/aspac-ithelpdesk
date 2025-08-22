const { Pool } = require('pg');

async function checkTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%email%' OR table_name LIKE '%template%')
      ORDER BY table_name
    `);
    
    console.log('Email/Template related tables:');
    if (result.rows.length === 0) {
      console.log('No email or template tables found');
    } else {
      result.rows.forEach(row => {
        console.log('- ' + row.table_name);
      });
    }
    
    // Also check all tables
    const allTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\nAll tables in database:');
    allTables.rows.forEach(row => {
      console.log('- ' + row.table_name);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();
