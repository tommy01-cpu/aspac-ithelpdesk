-- Add ordering fields to catalog tables
-- This migration adds sortOrder fields to enable drag-and-drop reordering

-- Add sortOrder to service_category
ALTER TABLE "service_category" ADD COLUMN "sort_order" INTEGER;

-- Add sortOrder to service_catalog_item  
ALTER TABLE "service_catalog_item" ADD COLUMN "sort_order" INTEGER;

-- Add sortOrder to incident_catalog_item
ALTER TABLE "incident_catalog_item" ADD COLUMN "sort_order" INTEGER;

-- Initialize sort orders based on current IDs (maintains current order)
-- Service Categories
UPDATE "service_category" SET "sort_order" = "id" WHERE "sort_order" IS NULL;

-- Service Catalog Items (order by category, then by ID)
WITH ordered_services AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY "categoryId" ORDER BY id) as new_order
  FROM "service_catalog_item"
)
UPDATE "service_catalog_item" 
SET "sort_order" = ordered_services.new_order
FROM ordered_services 
WHERE "service_catalog_item".id = ordered_services.id 
AND "service_catalog_item"."sort_order" IS NULL;

-- Incident Catalog Items (order by category, then by ID)
WITH ordered_incidents AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY "categoryId" ORDER BY id) as new_order
  FROM "incident_catalog_item"
)
UPDATE "incident_catalog_item" 
SET "sort_order" = ordered_incidents.new_order
FROM ordered_incidents 
WHERE "incident_catalog_item".id = ordered_incidents.id 
AND "incident_catalog_item"."sort_order" IS NULL;

-- Set NOT NULL constraints (optional, can be added later if needed)
-- ALTER TABLE "service_category" ALTER COLUMN "sort_order" SET NOT NULL;
-- ALTER TABLE "service_catalog_item" ALTER COLUMN "sort_order" SET NOT NULL; 
-- ALTER TABLE "incident_catalog_item" ALTER COLUMN "sort_order" SET NOT NULL;
