-- Create backup_configurations table
CREATE TABLE backup_configurations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    database_names TEXT NOT NULL, -- JSON array of database names
    backup_directory VARCHAR(500) NOT NULL DEFAULT 'C:\BackupDB',
    pg_host VARCHAR(255) NOT NULL DEFAULT 'localhost',
    pg_user VARCHAR(255) NOT NULL DEFAULT 'postgres',
    pg_password VARCHAR(255), -- Encrypted password
    backup_time VARCHAR(10) NOT NULL DEFAULT '02:00', -- HH:MM format
    backup_days VARCHAR(20) NOT NULL DEFAULT 'daily', -- daily, weekly, or specific days like 'mon,wed,fri'
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    last_backup_at TIMESTAMP,
    last_backup_status VARCHAR(50) DEFAULT 'pending' -- pending, success, failed
);

-- Add some sample data
INSERT INTO backup_configurations (name, database_names, backup_directory, backup_time, backup_days) 
VALUES ('Daily IT Helpdesk Backup', '["ithelpdesk_db", "ithelpdesk_attachments"]', 'C:\BackupDB', '02:00', 'daily');

-- Create index for performance
CREATE INDEX idx_backup_configurations_active ON backup_configurations(is_active);
CREATE INDEX idx_backup_configurations_time ON backup_configurations(backup_time);
