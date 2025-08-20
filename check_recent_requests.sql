-- Check recent requests and their templates
SELECT 
  r.id,
  r."templateId",
  r."formData"->>'slaName' as stored_sla_name,
  t.name as template_name,
  s.name as correct_sla_name
FROM requests r 
LEFT JOIN template t ON r."templateId"::int = t.id 
LEFT JOIN sla_service s ON t."slaServiceId" = s.id 
ORDER BY r.id DESC 
LIMIT 5;
