-- Update approval workflows to change "Reported to" to "Reporting to"
UPDATE public.template 
SET "approvalWorkflow" = replace("approvalWorkflow"::text, '"Reported to"', '"Reporting to"')::json
WHERE "approvalWorkflow"::text LIKE '%"Reported to"%';
