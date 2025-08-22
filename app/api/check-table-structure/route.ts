import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET(request: NextRequest) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    console.log('=== CHECKING TABLE STRUCTURE ===');
    
    // Get column information for email_templates table
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'email_templates' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('Columns found:', result.rows);
    
    // Also get a sample row to see actual data
    const sampleData = await pool.query('SELECT * FROM email_templates LIMIT 1');
    console.log('Sample data:', sampleData.rows[0] || 'No data');
    
    return NextResponse.json({
      success: true,
      columns: result.rows,
      sampleData: sampleData.rows[0] || null,
      totalRows: sampleData.rowCount
    });
    
  } catch (error) {
    console.error('Error checking table structure:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  } finally {
    await pool.end();
  }
}
