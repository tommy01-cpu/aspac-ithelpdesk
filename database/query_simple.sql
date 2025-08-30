SELECT id, name, "approvalWorkflow"::text as workflow_text 
FROM public.template 
WHERE "approvalWorkflow" IS NOT NULL 
ORDER BY id ASC 
LIMIT 3;
