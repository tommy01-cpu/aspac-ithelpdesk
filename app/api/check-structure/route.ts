import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    console.log('=== CHECKING DATABASE STRUCTURE ===');
    
    // Check table structure
    const structure = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'email_templates'
      ORDER BY ordinal_position;
    `);
    
    console.log('Email templates table structure:');
    console.table(structure.rows);
    
    // Check sample data
    const sample = await pool.query('SELECT * FROM email_templates LIMIT 1');
    console.log('Sample data:');
    console.log(sample.rows[0] || 'No data');
    
    return NextResponse.json({
      structure: structure.rows,
      sampleData: sample.rows[0] || null,
      message: 'Check server console for detailed output'
    });
    
  } catch (error) {
    console.error('Database check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}
