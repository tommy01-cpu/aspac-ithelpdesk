-- Backup Approvers Feature - PostgreSQL Schema
-- Created: September 23, 2025
-- Description: Tables for managing backup approver configurations and audit trail

-- Table to store backup approver configurations
CREATE TABLE backup_approvers (
    id SERIAL PRIMARY KEY,
    original_approver_id INTEGER NOT NULL,
    backup_approver_id INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    divert_pending BOOLEAN DEFAULT TRUE,
    reason VARCHAR(500) NULL, -- Optional reason for backup (e.g., vacation, sick leave)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER NOT NULL,
    deactivated_at TIMESTAMP WITH TIME ZONE NULL,
    deactivated_by INTEGER NULL,
    
    -- Foreign key constraints
    CONSTRAINT fk_backup_approvers_original_approver FOREIGN KEY (original_approver_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_backup_approvers_backup_approver FOREIGN KEY (backup_approver_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_backup_approvers_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_backup_approvers_deactivated_by FOREIGN KEY (deactivated_by) REFERENCES users(id) ON DELETE RESTRICT,
    
    -- Constraints
    CONSTRAINT chk_different_approvers CHECK (original_approver_id != backup_approver_id),
    CONSTRAINT chk_valid_date_range CHECK (end_date >= start_date),
    CONSTRAINT chk_future_dates CHECK (end_date >= CURRENT_DATE)
);

-- Indexes for performance
CREATE INDEX idx_backup_approvers_original_approver ON backup_approvers(original_approver_id);
CREATE INDEX idx_backup_approvers_backup_approver ON backup_approvers(backup_approver_id);
CREATE INDEX idx_backup_approvers_date_range ON backup_approvers(start_date, end_date);
CREATE INDEX idx_backup_approvers_active_configs ON backup_approvers(is_active, start_date, end_date);

-- Create enum type for diversion types
CREATE TYPE diversion_type_enum AS ENUM ('automatic', 'manual');
CREATE TYPE reversion_type_enum AS ENUM ('automatic', 'manual', 'expired');

-- Table to track approval diversions (audit trail)
CREATE TABLE approval_diversions (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL,
    original_approver_id INTEGER NOT NULL,
    backup_approver_id INTEGER NOT NULL,
    diverted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reverted_at TIMESTAMP WITH TIME ZONE NULL,
    backup_config_id INTEGER NOT NULL,
    diversion_type diversion_type_enum DEFAULT 'automatic',
    reversion_type reversion_type_enum NULL,
    notes TEXT NULL,
    
    -- Foreign key constraints
    CONSTRAINT fk_approval_diversions_request FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_approval_diversions_original_approver FOREIGN KEY (original_approver_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_approval_diversions_backup_approver FOREIGN KEY (backup_approver_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_approval_diversions_backup_config FOREIGN KEY (backup_config_id) REFERENCES backup_approvers(id) ON DELETE RESTRICT
);

-- Indexes for performance
CREATE INDEX idx_approval_diversions_request_id ON approval_diversions(request_id);
CREATE INDEX idx_approval_diversions_backup_config ON approval_diversions(backup_config_id);
CREATE INDEX idx_approval_diversions_dates ON approval_diversions(diverted_at, reverted_at);
CREATE INDEX idx_approval_diversions_pending ON approval_diversions(reverted_at) WHERE reverted_at IS NULL; -- For pending diversions

-- Create enum type for backup approver log actions
CREATE TYPE backup_approver_log_action AS ENUM ('created', 'activated', 'deactivated', 'expired', 'updated', 'diversion', 'reversion');

-- Table for backup approver activity logs
CREATE TABLE backup_approver_logs (
    id SERIAL PRIMARY KEY,
    backup_config_id INTEGER NOT NULL,
    action_type backup_approver_log_action NOT NULL,
    details JSONB NULL,
    performed_by INTEGER NULL,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_backup_approver_logs_config FOREIGN KEY (backup_config_id) REFERENCES backup_approvers(id) ON DELETE CASCADE,
    CONSTRAINT fk_backup_approver_logs_performed_by FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for backup approver logs
CREATE INDEX idx_backup_approver_logs_config_logs ON backup_approver_logs(backup_config_id, performed_at);
CREATE INDEX idx_backup_approver_logs_action_type ON backup_approver_logs(action_type);
CREATE INDEX idx_backup_approver_logs_performed_at ON backup_approver_logs(performed_at);



-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on backup_approvers table
CREATE TRIGGER update_backup_approvers_updated_at 
    BEFORE UPDATE ON backup_approvers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON backup_approvers TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON approval_diversions TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON backup_approver_logs TO your_app_user;
-- GRANT USAGE ON SEQUENCE backup_approvers_id_seq TO your_app_user;
-- GRANT USAGE ON SEQUENCE approval_diversions_id_seq TO your_app_user;
-- GRANT USAGE ON SEQUENCE backup_approver_logs_id_seq TO your_app_user;

-- Insert sample data (optional, for testing)
-- INSERT INTO backup_approvers (original_approver_id, backup_approver_id, start_date, end_date, created_by, reason)
-- VALUES (1, 2, '2025-09-20', '2025-09-30', 1, 'Vacation leave');

COMMENT ON TABLE backup_approvers IS 'Stores backup approver configurations';
COMMENT ON TABLE approval_diversions IS 'Tracks approval routing diversions for audit trail';
COMMENT ON TABLE backup_approver_logs IS 'Activity logs for backup approver operations';