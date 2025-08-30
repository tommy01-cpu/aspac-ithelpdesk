-- Add recurring holiday fields
ALTER TABLE holidays 
ADD COLUMN "recurringType" VARCHAR,
ADD COLUMN "recurringRule" JSONB;

-- Add some sample recurring holidays
INSERT INTO holidays (name, date, description, "isRecurring", "recurringType", "recurringRule", "isActive") VALUES 
('New Year''s Day', '2025-01-01', 'New Year''s Day - Recurring Yearly', true, 'yearly', '{"month": 0, "day": 1}', true),
('Christmas Day', '2025-12-25', 'Christmas Day - Recurring Yearly', true, 'yearly', '{"month": 11, "day": 25}', true),
('Independence Day', '2025-06-12', 'Independence Day - Recurring Yearly', true, 'yearly', '{"month": 5, "day": 12}', true);
