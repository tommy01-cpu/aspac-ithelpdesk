SELECT id, name, "approvalWorkflow" 
FROM public.template 
WHERE "approvalWorkflow" IS NOT NULL 
ORDER BY id ASC;
