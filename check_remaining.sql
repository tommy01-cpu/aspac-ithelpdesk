SELECT COUNT(*) as remaining_count
FROM public.template 
WHERE "approvalWorkflow"::text LIKE '%"Reported to"%';
