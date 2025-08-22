// Quick utility to check email configuration data in database
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:P%40SSW0RD@localhost:5432/ithelpdesk_db'
});

async function checkEmailConfig() {
  try {
    const client = await pool.connect();
    
    // Check if table exists and show structure
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'email_configuration'
      );
    `);
    
    console.log('Table exists:', tableExists.rows[0].exists);
    
    if (tableExists.rows[0].exists) {
      // Show all records
      const records = await client.query('SELECT * FROM email_configuration ORDER BY created_at DESC');
      console.log('\n=== Email Configuration Records ===');
      console.log(`Found ${records.rows.length} records:`);
      
      records.rows.forEach((row, index) => {
        console.log(`\nRecord ${index + 1}:`);
        console.log(`  ID: ${row.id}`);
        console.log(`  Server: ${row.server_name}:${row.port}`);
        console.log(`  Protocol: ${row.protocol}`);
        console.log(`  Sender: ${row.sender_name}`);
        console.log(`  Reply-to: ${row.reply_to}`);
        console.log(`  Username: ${row.username || 'Not set'}`);
        console.log(`  Password: ${row.password ? '[HIDDEN]' : 'Not set'}`);
        console.log(`  Active: ${row.is_active}`);
        console.log(`  Created: ${row.created_at}`);
        console.log(`  Updated: ${row.updated_at}`);
      });
    }
    
    client.release();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error checking email config:', error);
    process.exit(1);
  }
}

checkEmailConfig();
