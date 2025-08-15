const fs = require('fs');
const path = require('path');

// Copy request detail page
const sourceDetail = 'app/users/requests/[id]/page.tsx';
const targetDetail = 'app/technician/requests/[id]/page.tsx';

// Copy new template page  
const sourceTemplate = 'app/users/requests/new/template/page.tsx';
const targetTemplate = 'app/technician/requests/new/template/page.tsx';

try {
  // Copy detail page
  fs.copyFileSync(sourceDetail, targetDetail);
  console.log('✅ Copied request detail page');
  
  // Copy template page
  fs.copyFileSync(sourceTemplate, targetTemplate);
  console.log('✅ Copied new template page');
  
  console.log('All files copied successfully!');
} catch (error) {
  console.error('Error copying files:', error);
}
