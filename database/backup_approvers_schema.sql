-- Backup Approvers Feature - Database Schema
-- Created: September 17, 2025
-- Description: Tables for managing backup approver configurations and audit trail

-- Table to store backup approver configurations
CREATE TABLE backup_approvers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    original_approver_id INT NOT NULL,
    backup_approver_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    divert_pending BOOLEAN DEFAULT TRUE,
    reason VARCHAR(500) NULL COMMENT 'Optional reason for backup (e.g., vacation, sick leave)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    deactivated_at TIMESTAMP NULL,
    deactivated_by INT NULL,
    
    -- Foreign key constraints
    FOREIGN KEY (original_approver_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (backup_approver_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (deactivated_by) REFERENCES users(id) ON DELETE RESTRICT,
    
    -- Indexes for performance
    INDEX idx_original_approver (original_approver_id),
    INDEX idx_backup_approver (backup_approver_id),
    INDEX idx_date_range (start_date, end_date),
    INDEX idx_active_configs (is_active, start_date, end_date),
    
    -- Constraints
    CONSTRAINT chk_different_approvers CHECK (original_approver_id != backup_approver_id),
    CONSTRAINT chk_valid_date_range CHECK (end_date >= start_date),
    CONSTRAINT chk_future_dates CHECK (end_date >= CURDATE())
);

-- Table to track approval diversions (audit trail)
CREATE TABLE approval_diversions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    request_id INT NOT NULL,
    original_approver_id INT NOT NULL,
    backup_approver_id INT NOT NULL,
    diverted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reverted_at TIMESTAMP NULL,
    backup_config_id INT NOT NULL,
    diversion_type ENUM('automatic', 'manual') DEFAULT 'automatic',
    reversion_type ENUM('automatic', 'manual', 'expired') NULL,
    notes TEXT NULL,
    
    -- Foreign key constraints
    FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
    FOREIGN KEY (original_approver_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (backup_approver_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (backup_config_id) REFERENCES backup_approvers(id) ON DELETE RESTRICT,
    
    -- Indexes for performance
    INDEX idx_request_id (request_id),
    INDEX idx_backup_config (backup_config_id),
    INDEX idx_diversion_dates (diverted_at, reverted_at),
    INDEX idx_pending_diversions (reverted_at) -- NULL values for pending diversions
);

-- Table for backup approver activity logs
CREATE TABLE backup_approver_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    backup_config_id INT NOT NULL,
    action_type ENUM('created', 'activated', 'deactivated', 'expired', 'updated', 'diversion', 'reversion') NOT NULL,
    details JSON NULL,
    performed_by INT NULL,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (backup_config_id) REFERENCES backup_approvers(id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Indexes
    INDEX idx_config_logs (backup_config_id, performed_at),
    INDEX idx_action_type (action_type),
    INDEX idx_performed_at (performed_at)
);

-- Add indexes to existing tables if needed for better performance
-- Note: These should be added carefully to avoid conflicts with existing indexes

-- Index on requests table for faster approval lookups
-- ALTER TABLE requests ADD INDEX idx_approval_status (status, approval_status);

-- Index on users table for approver role lookups
-- ALTER TABLE users ADD INDEX idx_role_active (role, is_active);

-- Create a view for active backup configurations
CREATE VIEW active_backup_approvers AS
SELECT 
    ba.*,
    orig.name as original_approver_name,
    orig.email as original_approver_email,
    backup.name as backup_approver_name,
    backup.email as backup_approver_email,
    creator.name as created_by_name,
    DATEDIFF(ba.end_date, CURDATE()) as days_remaining,
    CASE 
        WHEN CURDATE() < ba.start_date THEN 'scheduled'
        WHEN CURDATE() > ba.end_date THEN 'expired'
        ELSE 'active'
    END as current_status
FROM backup_approvers ba
JOIN users orig ON ba.original_approver_id = orig.id
JOIN users backup ON ba.backup_approver_id = backup.id
JOIN users creator ON ba.created_by = creator.id
WHERE ba.is_active = TRUE;

-- Create a view for backup approver statistics
CREATE VIEW backup_approver_stats AS
SELECT 
    COUNT(*) as total_configs,
    SUM(CASE WHEN CURDATE() BETWEEN start_date AND end_date THEN 1 ELSE 0 END) as active_configs,
    SUM(CASE WHEN CURDATE() < start_date THEN 1 ELSE 0 END) as scheduled_configs,
    SUM(CASE WHEN CURDATE() > end_date THEN 1 ELSE 0 END) as expired_configs
FROM backup_approvers 
WHERE is_active = TRUE;