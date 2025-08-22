import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export interface MailServerConfig {
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

export async function getMailServerSettings(): Promise<MailServerConfig | null> {
  try {
    const client = await pool.connect();
    
    // First check if table exists, if not create it
    await client.query(`
      CREATE TABLE IF NOT EXISTS mail_server_settings (
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
    
    const result = await client.query(
      'SELECT * FROM mail_server_settings WHERE is_active = true ORDER BY created_at DESC LIMIT 1'
    );
    
    client.release();
    
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
    console.error('Error fetching mail server settings:', error);
    return null;
  }
}

export async function saveMailServerSettings(settings: MailServerConfig): Promise<boolean> {
  try {
    const client = await pool.connect();
    
    // Deactivate existing settings
    await client.query('UPDATE mail_server_settings SET is_active = false WHERE is_active = true');
    
    // Insert new settings
    await client.query(
      `INSERT INTO mail_server_settings 
       (server_name, alternate_server, port, protocol, sender_name, reply_to, username, password, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        settings.serverName,
        settings.alternateServer || null,
        settings.port,
        settings.protocol,
        settings.senderName,
        settings.replyTo,
        settings.username || null,
        settings.password || null
      ]
    );
    
    client.release();
    return true;
  } catch (error) {
    console.error('Error saving mail server settings:', error);
    return false;
  }
}
