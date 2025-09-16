-- Migration: Add backup configurations table
-- Date: 2025-09-15

-- Create backup_configurations table
CREATE TABLE IF NOT EXISTS backup_configurations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    databases TEXT[] NOT NULL, -- Array of database names to backup
    backup_directory VARCHAR(500) NOT NULL,
    schedule_time TIME NOT NULL DEFAULT '00:00:00', -- Time to run backup (24-hour format)
    schedule_enabled BOOLEAN NOT NULL DEFAULT true,
    pg_host VARCHAR(255) NOT NULL DEFAULT 'localhost',
    pg_port INTEGER NOT NULL DEFAULT 5432,
    pg_user VARCHAR(255) NOT NULL DEFAULT 'postgres',
    pg_password_encrypted TEXT, -- Store encrypted password
    backup_format VARCHAR(10) NOT NULL DEFAULT 'custom', -- 'custom', 'sql', 'tar'
    compression_enabled BOOLEAN NOT NULL DEFAULT true,
    retention_days INTEGER DEFAULT 30, -- How many days to keep backups
    last_backup_at TIMESTAMP,
    last_backup_status VARCHAR(50), -- 'success', 'failed', 'running'
    last_backup_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_backup_configurations_schedule_enabled ON backup_configurations(schedule_enabled);
CREATE INDEX IF NOT EXISTS idx_backup_configurations_schedule_time ON backup_configurations(schedule_time);
CREATE INDEX IF NOT EXISTS idx_backup_configurations_active ON backup_configurations(is_active);

-- Add default backup configuration
INSERT INTO backup_configurations (
    name, 
    description, 
    databases, 
    backup_directory, 
    schedule_time, 
    pg_host, 
    pg_user
) VALUES (
    'Default IT Helpdesk Backup',
    'Automatic backup of IT Helpdesk databases at midnight',
    ARRAY['ithelpdesk_db', 'ithelpdesk_attachments'],
    'C:\BackupDB',
    '00:00:00',
    'localhost',
    'postgres'
) ON CONFLICT DO NOTHING;

-- Create backup_logs table to track backup history
CREATE TABLE IF NOT EXISTS backup_logs (
    id SERIAL PRIMARY KEY,
    configuration_id INTEGER NOT NULL REFERENCES backup_configurations(id) ON DELETE CASCADE,
    backup_date DATE NOT NULL,
    backup_time TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'success', 'failed', 'partial'
    databases_backed_up TEXT[],
    files_created TEXT[],
    total_size_mb DECIMAL(10,2),
    duration_seconds INTEGER,
    error_message TEXT,
    backup_directory VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for backup logs
CREATE INDEX IF NOT EXISTS idx_backup_logs_configuration_id ON backup_logs(configuration_id);
CREATE INDEX IF NOT EXISTS idx_backup_logs_backup_date ON backup_logs(backup_date);
CREATE INDEX IF NOT EXISTS idx_backup_logs_status ON backup_logs(status);

COMMENT ON TABLE backup_configurations IS 'Configuration settings for automated database backups';
COMMENT ON TABLE backup_logs IS 'Historical log of backup operations';
