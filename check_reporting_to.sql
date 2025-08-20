SELECT COUNT(*) as reporting_to_count
FROM public.template 
WHERE "approvalWorkflow"::text LIKE '%"Reporting to"%';
