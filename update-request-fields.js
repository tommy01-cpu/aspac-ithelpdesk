const fs = require('fs');
const path = require('path');

// List of files that need to be updated
const filesToUpdate = [
  'app/technician/requests/[id]/page.tsx',
  'app/requests/requests/[id]/page.tsx',
];

const baseDir = process.cwd();

// Function to update a file
function updateFile(filePath) {
  const fullPath = path.join(baseDir, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf-8');
  let updated = false;

  // Replace requestData.priority with formData priority
  const priorityRegex = /getPriorityColor\(requestData\.priority\)/g;
  if (priorityRegex.test(content)) {
    content = content.replace(priorityRegex, 'getPriorityColor(requestData.formData?.[\"2\"] || requestData.formData?.priority || \"medium\")');
    updated = true;
  }

  // Replace priority display text
  const priorityDisplayRegex = /requestData\.priority\.charAt\(0\)\.toUpperCase\(\) \+ requestData\.priority\.slice\(1\)/g;
  if (priorityDisplayRegex.test(content)) {
    content = content.replace(priorityDisplayRegex, '(requestData.formData?.[\"2\"] || requestData.formData?.priority || \"medium\").charAt(0).toUpperCase() + (requestData.formData?.[\"2\"] || requestData.formData?.priority || \"medium\").slice(1)');
    updated = true;
  }

  // Replace requestData.type with formData type
  const typeRegex = /requestData\.type/g;
  if (typeRegex.test(content)) {
    content = content.replace(typeRegex, 'requestData.formData?.[\"4\"] || requestData.formData?.type || \"Request\"');
    updated = true;
  }

  // Replace requestData.templateName with templateData?.name
  const templateNameRegex = /requestData\.templateName/g;
  if (templateNameRegex.test(content)) {
    content = content.replace(templateNameRegex, 'templateData?.name || \"Unknown Template\"');
    updated = true;
  }

  if (updated) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`✅ Updated: ${filePath}`);
  } else {
    console.log(`✖️ No changes needed: ${filePath}`);
  }
}

// Update all files
console.log('Updating files to use formData instead of removed fields...\n');

filesToUpdate.forEach(updateFile);

console.log('\n🎉 All files have been processed!');
