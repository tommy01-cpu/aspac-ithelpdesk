-- Add sample service categories
INSERT INTO "ServiceCategory" (name, description, icon, "isActive", "createdBy", "createdAt", "updatedAt", "sortOrder")
VALUES 
  ('IT Support', 'General IT support and technical assistance', 'desktop.png', true, 1, NOW(), NOW(), 1),
  ('Software', 'Software installation, updates, and licensing', 'software.svg', true, 1, NOW(), NOW(), 2),
  ('Hardware', 'Hardware requests and maintenance', 'hardware.svg', true, 1, NOW(), NOW(), 3),
  ('Network', 'Network connectivity and infrastructure', 'network1.png', true, 1, NOW(), NOW(), 4),
  ('Email', 'Email accounts and mail services', 'email.svg', true, 1, NOW(), NOW(), 5)
ON CONFLICT (name) DO NOTHING;
