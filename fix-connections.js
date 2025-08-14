const fs = require('fs');
const path = require('path');

// Pattern to add dev-only disconnect
const disconnectPattern = `  } finally {
    // In development, disconnect to free connections quickly
    if (process.env.NODE_ENV !== 'production') {
      try {
        await prisma.$disconnect();
      } catch {}
    }
  }`;

// Find all API route files that import prisma
function findApiRoutes(dir) {
  const routes = [];
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      routes.push(...findApiRoutes(fullPath));
    } else if (file.name === 'route.ts') {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('import { prisma }') && !content.includes('prisma.$disconnect()')) {
        routes.push(fullPath);
      }
    }
  }
  return routes;
}

// Add disconnect to a route file
function addDisconnectToRoute(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find catch blocks that don't already have finally
  const catchBlocks = content.match(/} catch \([^}]+\{[^}]+\}\s*}/g);
  
  if (catchBlocks) {
    for (const block of catchBlocks) {
      if (!block.includes('finally')) {
        const replacement = block.slice(0, -1) + disconnectPattern;
        content = content.replace(block, replacement);
      }
    }
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Added disconnect to: ${filePath}`);
    return true;
  }
  
  return false;
}

// Main execution
const apiDir = './app/api';
const routes = findApiRoutes(apiDir);

console.log(`Found ${routes.length} API routes that need connection management:`);

let fixed = 0;
for (const route of routes) {
  if (addDisconnectToRoute(route)) {
    fixed++;
  }
}

console.log(`✅ Fixed ${fixed} routes with dev-only disconnects`);
