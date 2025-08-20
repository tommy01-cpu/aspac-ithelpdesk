-- Check the actual request to see what template it references
SELECT 
  r.id as request_id,
  r."templateId",
  r.status,
  r.priority,
  t.name as template_name,
  t."slaServiceId" as template_sla_id,
  s.name as sla_name
FROM requests r
LEFT JOIN template t ON r."templateId"::int = t.id
LEFT JOIN sla_service s ON t."slaServiceId" = s.id
WHERE r.id = 152;

-- Also check if there's something in the formData that might be overriding
SELECT 
  r.id,
  r."templateId",
  r."formData"
FROM requests r
WHERE r.id = 152;
