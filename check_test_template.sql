-- Check template ID 106 (test2 Copy) and its SLA assignment
SELECT 
  t.id as template_id,
  t.name as template_name,
  t.type,
  t."slaServiceId",
  s.id as sla_id,
  s.name as sla_name,
  s.description as sla_description,
  s.priority as sla_priority,
  s."responseTime",
  s.resolution_days,
  s.resolution_hours,
  s.resolution_minutes
FROM template t
LEFT JOIN sla_service s ON t."slaServiceId" = s.id
WHERE t.id = 106 OR t.name LIKE '%test2%';

-- Also check if this SLA is being used by other templates
SELECT DISTINCT
  s.name as sla_name,
  COUNT(t.id) as template_count,
  STRING_AGG(t.name, ', ') as template_names
FROM sla_service s
LEFT JOIN template t ON s.id = t."slaServiceId"
WHERE s.name LIKE '%Accounts%Passwords%'
GROUP BY s.name;
