-- Add new fields to users table
-- This script adds the missing fields requested by the user

-- Add description field
ALTER TABLE users ADD COLUMN IF NOT EXISTS description TEXT;

-- Add landline and local numbers
ALTER TABLE users ADD COLUMN IF NOT EXISTS landline_no VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS local_no VARCHAR(20);

-- Add requester view permission (already have reportingToId and isServiceApprover)
ALTER TABLE users ADD COLUMN IF NOT EXISTS requester_view_permission VARCHAR(50) DEFAULT 'own_requests';

-- Add comments for the new fields
COMMENT ON COLUMN users.description IS 'User description or notes';
COMMENT ON COLUMN users.landline_no IS 'Landline phone number';
COMMENT ON COLUMN users.local_no IS 'Local extension number';
COMMENT ON COLUMN users.requester_view_permission IS 'Permission level for viewing requests: own_requests or department_requests';

-- Update the existing reportingToId to ensure it has proper foreign key reference
-- (This is already properly set up in the schema)

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('description', 'landline_no', 'local_no', 'requester_view_permission')
ORDER BY column_name;
