-- Check service category for the template
SELECT 
  sc.id,
  sc.name,
  sc.description
FROM service_category sc
WHERE sc.id = 2;

-- Check if there are multiple templates with similar names
SELECT 
  id, 
  name, 
  type, 
  "categoryId", 
  "slaServiceId" 
FROM template 
WHERE name LIKE '%Reset%Password%' OR name LIKE '%Email%';
