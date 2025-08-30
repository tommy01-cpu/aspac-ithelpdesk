const mysql = require('mysql2/promise');

async function checkRawOperationalHours() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'it_helpdesk'
  });

  try {
    console.log('🔍 RAW OPERATIONAL HOURS TABLE DATA:');
    console.log('============================================================');
    
    const [rows] = await connection.execute('SELECT * FROM operational_hours ORDER BY id');
    
    console.log('📊 Complete table data:');
    rows.forEach((row, index) => {
      console.log(`\nRow ${index + 1}:`);
      console.log(`  ID: ${row.id}`);
      console.log(`  Day: ${row.day}`);
      console.log(`  Enabled: ${row.enabled}`);
      console.log(`  Start Time: ${row.start_time}`);
      console.log(`  End Time: ${row.end_time}`);
      console.log(`  Break Start: ${row.break_start}`);
      console.log(`  Break End: ${row.break_end}`);
      console.log(`  Created At: ${row.created_at}`);
      console.log(`  Updated At: ${row.updated_at}`);
    });

    console.log('\n🎯 SUMMARY:');
    const enabledDays = rows.filter(row => row.enabled === 'Yes' || row.enabled === '1' || row.enabled === 1);
    console.log(`- Total rows: ${rows.length}`);
    console.log(`- Enabled days: ${enabledDays.length}`);
    console.log(`- Disabled days: ${rows.length - enabledDays.length}`);
    
    if (enabledDays.length === 0) {
      console.log('\n❌ PROBLEM: NO WORKING DAYS ARE ENABLED!');
      console.log('This explains why SLA calculation is not working correctly.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkRawOperationalHours();
