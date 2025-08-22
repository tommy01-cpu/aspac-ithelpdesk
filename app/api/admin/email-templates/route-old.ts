import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Create database connection using DATABASE_URL (same as mail-settings API)
const getDbConnection = () => {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
  });
};

export async function GET(request: NextRequest) {
  const pool = getDbConnection();
  
  try {
    console.log('=== EMAIL TEMPLATES API DEBUG ===');
    console.log('Attempting to query email_templates table...');
    
    const result = await pool.query(`
      SELECT 
        id,
        title as name,
        subject,
        COALESCE(template_key, 'unknown') as type,
        is_active as status,
        updated_at as "lastModified"
      FROM email_templates 
      ORDER BY title ASC
    `);
    
    console.log('Query successful! Found', result.rows.length, 'templates');
    console.log('Sample data:', result.rows[0] || 'No data');
    
    // Transform the data to match the frontend interface
    const templates = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      subject: row.subject,
      type: row.type || 'unknown',
      status: row.status ? 'active' : 'inactive',
      lastModified: row.lastModified ? new Date(row.lastModified).toLocaleDateString() : 'Unknown'
    }));
    
    console.log('Transformed templates:', templates);
    return NextResponse.json(templates);
    
  } catch (error) {
    console.error('Error fetching email templates:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch email templates: ' + errorMessage },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}

export async function POST(request: NextRequest) {
  const pool = getDbConnection();
  
  try {
    const body = await request.json();
    const { name, subject, contentHtml, type, isActive = true } = body;
    
    if (!name || !subject || !contentHtml) {
      return NextResponse.json(
        { error: 'Name, subject, and content are required' },
        { status: 400 }
      );
    }
    
    console.log('=== CREATING EMAIL TEMPLATE ===');
    console.log('Data:', { name, subject, type, isActive });
    
    // Insert new email template into email_templates table
    const result = await pool.query(`
      INSERT INTO email_templates (template_key, title, subject, content_html, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id, title as name, subject, template_key as type, is_active as status, updated_at as "lastModified"
    `, [type, name, subject, contentHtml, isActive]);
    
    const newTemplate = {
      id: result.rows[0].id,
      name: result.rows[0].name,
      subject: result.rows[0].subject,
      type: result.rows[0].type || 'unknown',
      status: result.rows[0].status ? 'active' : 'inactive',
      lastModified: new Date(result.rows[0].lastModified).toLocaleDateString()
    };
    
    console.log('Template created successfully:', newTemplate);
    return NextResponse.json(newTemplate, { status: 201 });
    
  } catch (error) {
    console.error('Error creating email template:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create email template: ' + errorMessage },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}
