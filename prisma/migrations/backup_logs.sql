-- Migration: Add Backup Logs Table
-- This migration adds a table to track backup execution history

CREATE TABLE backup_logs (
    id SERIAL PRIMARY KEY,
    backup_directory VARCHAR(500) NOT NULL,
    backup_time VARCHAR(5) NOT NULL,
    database_name VARCHAR(255) NOT NULL,
    backup_file_path VARCHAR(1000),
    status VARCHAR(50) NOT NULL, -- 'success', 'failed', 'running'
    error_message TEXT,
    file_size_bytes BIGINT,
    started_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX idx_backup_logs_status ON backup_logs(status);
CREATE INDEX idx_backup_logs_started_at ON backup_logs(started_at);
CREATE INDEX idx_backup_logs_database ON backup_logs(database_name);
