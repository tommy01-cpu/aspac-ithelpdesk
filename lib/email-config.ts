// Database utility functions for email configuration
// Using direct PostgreSQL queries

export interface EmailConfigData {
  id?: number;
  serverName: string;
  alternateServer?: string;
  port: number;
  protocol: string;
  senderName: string;
  replyTo: string;
  username?: string;
  password?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

import { Pool } from 'pg';

// Create database connection
const getDbConnection = () => {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
  });
};

// Ensure email_configuration table exists
const ensureTableExists = async (pool: Pool) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_configuration (
        id SERIAL PRIMARY KEY,
        server_name VARCHAR(255) NOT NULL,
        alternate_server VARCHAR(255),
        port INTEGER NOT NULL,
        protocol VARCHAR(50) DEFAULT 'SMTP',
        sender_name VARCHAR(255) NOT NULL,
        reply_to VARCHAR(255) NOT NULL,
        username VARCHAR(255),
        password VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (error) {
    console.error('Error ensuring table exists:', error);
  }
};

export async function getEmailConfig(): Promise<EmailConfigData | null> {
  const pool = getDbConnection();
  
  try {
    await ensureTableExists(pool);
    
    const result = await pool.query(
      'SELECT * FROM email_configuration WHERE is_active = true ORDER BY created_at DESC LIMIT 1'
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      serverName: row.server_name,
      alternateServer: row.alternate_server,
      port: row.port,
      protocol: row.protocol,
      senderName: row.sender_name,
      replyTo: row.reply_to,
      username: row.username,
      password: row.password,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  } catch (error) {
    console.error('Error fetching email config:', error);
    return null;
  } finally {
    await pool.end();
  }
}

export async function saveEmailConfig(config: EmailConfigData): Promise<boolean> {
  const pool = getDbConnection();
  
  try {
    await ensureTableExists(pool);
    
    // Start transaction
    await pool.query('BEGIN');
    
    // Deactivate existing configs
    await pool.query('UPDATE email_configuration SET is_active = false WHERE is_active = true');
    
    // Insert new config
    await pool.query(
      `INSERT INTO email_configuration 
       (server_name, alternate_server, port, protocol, sender_name, reply_to, username, password, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        config.serverName,
        config.alternateServer || null,
        config.port,
        config.protocol,
        config.senderName,
        config.replyTo,
        config.username || null,
        config.password || null
      ]
    );
    
    // Commit transaction
    await pool.query('COMMIT');
    return true;
  } catch (error) {
    // Rollback on error
    await pool.query('ROLLBACK');
    console.error('Error saving email config:', error);
    return false;
  } finally {
    await pool.end();
  }
}

export const defaultEmailConfig: EmailConfigData = {
  serverName: 'smtp.gmail.com',
  alternateServer: '',
  senderName: 'IT Helpdesk',
  replyTo: 'no-reply@aspacphils.com.ph',
  protocol: 'SMTP',
  port: 587,
  username: '',
  password: ''
};

// Function to get email configuration for use in email service
export async function getEmailConfigForService(): Promise<EmailConfigData> {
  try {
    const config = await getEmailConfig();
    return config || defaultEmailConfig;
  } catch (error) {
    console.error('Error getting email config for service:', error);
    return defaultEmailConfig;
  }
}
