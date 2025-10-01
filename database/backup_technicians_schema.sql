-- Backup Technicians Schema
-- This script creates the tables needed for backup technician functionality

-- Main backup technicians configuration table
CREATE TABLE IF NOT EXISTS backup_technicians (
    id SERIAL PRIMARY KEY,
    original_technician_id INTEGER NOT NULL,
    backup_technician_id INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    divert_existing BOOLEAN DEFAULT false, -- Transfer existing assigned requests
    reason TEXT,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_original_technician FOREIGN KEY (original_technician_id) 
        REFERENCES employees(emp_id) ON DELETE CASCADE,
    CONSTRAINT fk_backup_technician FOREIGN KEY (backup_technician_id) 
        REFERENCES employees(emp_id) ON DELETE CASCADE,
    CONSTRAINT fk_created_by FOREIGN KEY (created_by) 
        REFERENCES employees(emp_id) ON DELETE SET NULL,
    
    -- Business rule constraints
    CONSTRAINT chk_different_technicians CHECK (original_technician_id != backup_technician_id),
    CONSTRAINT chk_valid_date_range CHECK (end_date >= start_date),
    CONSTRAINT chk_future_end_date CHECK (end_date >= CURRENT_DATE)
);

-- Backup technician activity logs table
CREATE TABLE IF NOT EXISTS backup_technician_logs (
    id SERIAL PRIMARY KEY,
    backup_config_id INTEGER NOT NULL,
    original_technician_id INTEGER NOT NULL,
    backup_technician_id INTEGER NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- 'created', 'activated', 'deactivated', 'reversion', 'request_transferred'
    details JSONB, -- Store additional details like number of requests transferred, etc.
    performed_by INTEGER NOT NULL,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_backup_config FOREIGN KEY (backup_config_id) 
        REFERENCES backup_technicians(id) ON DELETE CASCADE,
    CONSTRAINT fk_log_original_technician FOREIGN KEY (original_technician_id) 
        REFERENCES employees(emp_id) ON DELETE CASCADE,
    CONSTRAINT fk_log_backup_technician FOREIGN KEY (backup_technician_id) 
        REFERENCES employees(emp_id) ON DELETE CASCADE,
    CONSTRAINT fk_log_performed_by FOREIGN KEY (performed_by) 
        REFERENCES employees(emp_id) ON DELETE SET NULL
);

-- Request assignments backup table (for tracking original assignments)
CREATE TABLE IF NOT EXISTS request_assignments_backup (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL,
    original_technician_id INTEGER NOT NULL,
    backup_technician_id INTEGER NOT NULL,
    backup_config_id INTEGER NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reverted_at TIMESTAMP NULL,
    
    -- Foreign key constraints
    CONSTRAINT fk_request_backup FOREIGN KEY (request_id) 
        REFERENCES helpdesk_requests(req_id) ON DELETE CASCADE,
    CONSTRAINT fk_request_original_tech FOREIGN KEY (original_technician_id) 
        REFERENCES employees(emp_id) ON DELETE CASCADE,
    CONSTRAINT fk_request_backup_tech FOREIGN KEY (backup_technician_id) 
        REFERENCES employees(emp_id) ON DELETE CASCADE,
    CONSTRAINT fk_request_backup_config FOREIGN KEY (backup_config_id) 
        REFERENCES backup_technicians(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_backup_technicians_original ON backup_technicians(original_technician_id);
CREATE INDEX IF NOT EXISTS idx_backup_technicians_backup ON backup_technicians(backup_technician_id);
CREATE INDEX IF NOT EXISTS idx_backup_technicians_dates ON backup_technicians(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_backup_technicians_active ON backup_technicians(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_backup_logs_config ON backup_technician_logs(backup_config_id);
CREATE INDEX IF NOT EXISTS idx_backup_logs_date ON backup_technician_logs(performed_at);
CREATE INDEX IF NOT EXISTS idx_backup_logs_action ON backup_technician_logs(action_type);

CREATE INDEX IF NOT EXISTS idx_request_assignments_backup_request ON request_assignments_backup(request_id);
CREATE INDEX IF NOT EXISTS idx_request_assignments_backup_config ON request_assignments_backup(backup_config_id);
CREATE INDEX IF NOT EXISTS idx_request_assignments_backup_reverted ON request_assignments_backup(reverted_at) WHERE reverted_at IS NULL;

-- Removed view - will use direct queries in API instead

-- Function to get active backup technician for a given original technician
CREATE OR REPLACE FUNCTION get_active_backup_technician(
    p_original_technician_id INTEGER,
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS INTEGER AS $$
DECLARE
    backup_tech_id INTEGER;
BEGIN
    SELECT backup_technician_id INTO backup_tech_id
    FROM backup_technicians
    WHERE original_technician_id = p_original_technician_id
      AND is_active = true
      AND p_date >= start_date
      AND p_date <= end_date
    ORDER BY created_at DESC
    LIMIT 1;
    
    RETURN COALESCE(backup_tech_id, p_original_technician_id);
END;
$$ LANGUAGE plpgsql;

-- Function to auto-revert expired backup technician configurations
CREATE OR REPLACE FUNCTION auto_revert_expired_backup_technicians() RETURNS TABLE(
    config_id INTEGER,
    original_technician_id INTEGER,
    backup_technician_id INTEGER,
    reverted_requests INTEGER
) AS $$
DECLARE
    config_record RECORD;
    reverted_count INTEGER;
BEGIN
    -- Process each expired active configuration
    FOR config_record IN 
        SELECT * FROM backup_technicians 
        WHERE is_active = true 
        AND end_date < CURRENT_DATE
    LOOP
        -- Count and revert pending requests
        UPDATE helpdesk_requests 
        SET technician_id = config_record.original_technician_id,
            updated_at = CURRENT_TIMESTAMP
        WHERE technician_id = config_record.backup_technician_id
        AND status IN ('open', 'on_hold');
        
        GET DIAGNOSTICS reverted_count = ROW_COUNT;
        
        -- Mark backup assignments as reverted
        UPDATE request_assignments_backup 
        SET reverted_at = CURRENT_TIMESTAMP
        WHERE backup_config_id = config_record.id 
        AND reverted_at IS NULL;
        
        -- Deactivate the configuration
        UPDATE backup_technicians 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = config_record.id;
        
        -- Log the reversion
        INSERT INTO backup_technician_logs (
            backup_config_id, 
            original_technician_id, 
            backup_technician_id, 
            action_type, 
            details, 
            performed_by
        ) VALUES (
            config_record.id,
            config_record.original_technician_id,
            config_record.backup_technician_id,
            'auto_reversion',
            jsonb_build_object(
                'reverted_requests', reverted_count,
                'end_date', config_record.end_date,
                'reason', 'Automatic reversion - backup period expired'
            ),
            1 -- System user, adjust as needed
        );
        
        -- Return the results
        config_id := config_record.id;
        original_technician_id := config_record.original_technician_id;
        backup_technician_id := config_record.backup_technician_id;
        reverted_requests := reverted_count;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions (adjust role names as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON backup_technicians TO helpdesk_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON backup_technician_logs TO helpdesk_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON request_assignments_backup TO helpdesk_app;
-- GRANT EXECUTE ON FUNCTION get_active_backup_technician(INTEGER, DATE) TO helpdesk_app;
-- GRANT EXECUTE ON FUNCTION auto_revert_expired_backup_technicians() TO helpdesk_app;

-- Insert sample data for testing (remove in production)
-- INSERT INTO backup_technicians (original_technician_id, backup_technician_id, start_date, end_date, reason, created_by)
-- VALUES (1, 2, '2025-10-01', '2025-10-15', 'Vacation leave', 1);

COMMENT ON TABLE backup_technicians IS 'Stores backup technician configurations for temporary request assignment redirections';
COMMENT ON TABLE backup_technician_logs IS 'Audit log for all backup technician related activities';
COMMENT ON TABLE request_assignments_backup IS 'Tracks requests that have been assigned to backup technicians for reversion purposes';
COMMENT ON FUNCTION get_active_backup_technician(INTEGER, DATE) IS 'Returns the active backup technician ID for a given original technician and date';
COMMENT ON FUNCTION auto_revert_expired_backup_technicians() IS 'Automatically reverts expired backup technician configurations and returns summary';