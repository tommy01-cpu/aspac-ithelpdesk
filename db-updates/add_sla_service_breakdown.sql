-- Add resolution breakdown fields to sla_service table
-- This preserves existing data and adds new fields with defaults

ALTER TABLE sla_service 
ADD COLUMN IF NOT EXISTS resolution_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS resolution_hours INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS resolution_minutes INTEGER DEFAULT 0;

-- Convert existing resolutionTime (hours) to days
-- Assuming resolutionTime is stored in hours and should be converted to working days

UPDATE sla_service 
SET 
  resolution_days = ("resolutionTime" / 24)::INTEGER,  -- Convert hours to days
  resolution_hours = 0,                                -- Set hours to 0
  resolution_minutes = 0                               -- Set minutes to 0
WHERE resolution_days = 0 AND resolution_hours = 0 AND resolution_minutes = 0;

-- Show the conversion results
SELECT 
  id, 
  name, 
  "resolutionTime" as old_hours,
  resolution_days,
  resolution_hours, 
  resolution_minutes,
  CONCAT(resolution_days, ' days ', resolution_hours, ' hours ', resolution_minutes, ' minutes') as breakdown
FROM sla_service 
ORDER BY id;
