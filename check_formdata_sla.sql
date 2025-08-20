-- Check the formData to see what slaName is stored
SELECT 
  r.id,
  r."formData"->>'slaName' as sla_name_in_formdata,
  t.name as template_name,
  s.name as actual_sla_name
FROM requests r
LEFT JOIN template t ON r."templateId"::int = t.id  
LEFT JOIN sla_service s ON t."slaServiceId" = s.id
WHERE r.id = 152;
