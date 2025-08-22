const { Pool } = require('pg');

async function testConnection() {
  console.log('=== TESTING DATABASE CONNECTION ===');
  
  // Test with correct URL-encoded password
  const correctUrl = "postgresql://postgres:P%40SSW0RD@localhost:5432/ithelpdesk_db";
  const wrongUrl = "postgresql://postgres:P@SSW0RD@localhost:5432/ithelpdesk_db";
  
  console.log('Testing with URL-encoded password...');
  try {
    const pool1 = new Pool({ connectionString: correctUrl });
    const result1 = await pool1.query('SELECT NOW()');
    console.log('✅ URL-encoded password WORKS:', result1.rows[0]);
    
    // Test if email_config table has data
    const emailResult = await pool1.query('SELECT * FROM email_config WHERE is_active = true ORDER BY created_at DESC LIMIT 1');
    console.log('Email config records found:', emailResult.rows.length);
    if (emailResult.rows.length > 0) {
      console.log('Email config data:', JSON.stringify(emailResult.rows[0], null, 2));
    }
    
    await pool1.end();
  } catch (error) {
    console.log('❌ URL-encoded password FAILED:', error.message);
  }
  
  console.log('\nTesting with raw @ password...');
  try {
    const pool2 = new Pool({ connectionString: wrongUrl });
    const result2 = await pool2.query('SELECT NOW()');
    console.log('✅ Raw @ password WORKS:', result2.rows[0]);
    await pool2.end();
  } catch (error) {
    console.log('❌ Raw @ password FAILED:', error.message);
  }
}

testConnection();
