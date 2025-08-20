-- Check reset password email template
SELECT 
  id, 
  name, 
  type, 
  "categoryId", 
  "slaServiceId" 
FROM template 
WHERE name LIKE '%Reset Password of an Email Account%';

-- Also check SLA service details
SELECT 
  s.id,
  s.name,
  s.priority,
  s."responseTime",
  s.resolution_hours,
  s.resolution_days
FROM sla_service s
WHERE s.id = 17 OR s.name LIKE '%HRIS%' OR s.name LIKE '%Regular%';
