-- Backup Approver Feature - Database Tables Created
-- Generated: September 18, 2025
-- These tables have been created in your PostgreSQL database

-- 1. BACKUP_APPROVERS TABLE
-- Stores backup approver configurations
/*
CREATE TABLE backup_approvers (
    id SERIAL PRIMARY KEY,
    original_approver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    backup_approver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    divert_pending BOOLEAN DEFAULT TRUE,
    reason VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    deactivated_at TIMESTAMP NULL,
    deactivated_by INTEGER REFERENCES users(id) ON DELETE RESTRICT
);

-- Indexes for performance
CREATE INDEX idx_backup_approvers_original ON backup_approvers(original_approver_id);
CREATE INDEX idx_backup_approvers_backup ON backup_approvers(backup_approver_id);
CREATE INDEX idx_backup_approvers_dates ON backup_approvers(start_date, end_date);
CREATE INDEX idx_backup_approvers_active ON backup_approvers(is_active, start_date, end_date);
*/

-- 2. APPROVAL_DIVERSIONS TABLE
-- Tracks when approvals are diverted from original to backup approvers
/*
CREATE TABLE approval_diversions (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    original_approver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    backup_approver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    diverted_at TIMESTAMP DEFAULT NOW(),
    reverted_at TIMESTAMP NULL,
    backup_config_id INTEGER NOT NULL REFERENCES backup_approvers(id) ON DELETE RESTRICT,
    diversion_type TEXT DEFAULT 'automatic' CHECK (diversion_type IN ('automatic', 'manual')),
    reversion_type TEXT CHECK (reversion_type IN ('automatic', 'manual', 'expired')),
    notes TEXT
);

-- Indexes for performance
CREATE INDEX idx_approval_diversions_request ON approval_diversions(request_id);
CREATE INDEX idx_approval_diversions_config ON approval_diversions(backup_config_id);
CREATE INDEX idx_approval_diversions_dates ON approval_diversions(diverted_at, reverted_at);
CREATE INDEX idx_approval_diversions_pending ON approval_diversions(reverted_at); -- NULL for pending
*/

-- 3. BACKUP_APPROVER_LOGS TABLE
-- Logs all actions performed on backup approver configurations
/*
CREATE TABLE backup_approver_logs (
    id SERIAL PRIMARY KEY,
    backup_config_id INTEGER NOT NULL REFERENCES backup_approvers(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('created', 'activated', 'deactivated', 'expired', 'updated', 'diversion', 'reversion')),
    details JSONB,
    performed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    performed_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_backup_approver_logs_config ON backup_approver_logs(backup_config_id, performed_at);
CREATE INDEX idx_backup_approver_logs_action ON backup_approver_logs(action_type);
CREATE INDEX idx_backup_approver_logs_date ON backup_approver_logs(performed_at);
*/

-- VERIFICATION QUERIES
-- Run these queries to verify the tables were created successfully:

-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('backup_approvers', 'approval_diversions', 'backup_approver_logs')
ORDER BY table_name;

-- Check table structures
\d backup_approvers;
\d approval_diversions;
\d backup_approver_logs;

-- Check for foreign key constraints
SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('backup_approvers', 'approval_diversions', 'backup_approver_logs')
ORDER BY tc.table_name, tc.constraint_name;

-- Check indexes
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('backup_approvers', 'approval_diversions', 'backup_approver_logs')
ORDER BY tablename, indexname;