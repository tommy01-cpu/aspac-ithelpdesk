SELECT id, name, "approvalWorkflow"::text 
FROM public.template 
WHERE "approvalWorkflow"::text LIKE '%Reported to%' 
ORDER BY id ASC;
