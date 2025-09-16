-- Migration: Simple Backup Settings
-- This migration adds a simple table to store backup directory and schedule time only

CREATE TABLE backup_settings (
    id SERIAL PRIMARY KEY,
    backup_directory VARCHAR(500) NOT NULL DEFAULT 'C:\BackupDB',
    backup_time VARCHAR(5) NOT NULL DEFAULT '00:00', -- HH:MM format (24-hour)
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Insert default settings (12 midnight)
INSERT INTO backup_settings (backup_directory, backup_time, is_enabled) 
VALUES ('C:\BackupDB', '00:00', true);

-- Create index for performance
CREATE INDEX idx_backup_settings_enabled ON backup_settings(is_enabled);
