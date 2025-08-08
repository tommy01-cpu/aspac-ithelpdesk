# Priority Help Text Update Scripts

These scripts will update all priority fields in your service templates to use the standardized help text format.

## Files

1. **`update-priority-helptext.js`** - JavaScript version (recommended for production)
2. **`update-priority-helptext.ts`** - TypeScript version (requires compilation)

## What the script does

- Finds all service templates in your database
- Locates priority fields within each template
- Updates the `helpText` property to the new standardized format:

```
Select from: 
Low - affects only you as an individual 
Medium - affects the delivery of your services 
High - affects the company's business 
Top - utmost action needed as classified by Management
```

## How to run

### Option 1: JavaScript version (Recommended)

```bash
# Navigate to your project directory
cd c:\wamp\www\ithelpdesk\Project

# Run the script
node update-priority-helptext.js
```

### Option 2: TypeScript version

```bash
# Navigate to your project directory
cd c:\wamp\www\ithelpdesk\Project

# Compile and run (if you have ts-node installed)
npx ts-node update-priority-helptext.ts

# OR compile first, then run
npx tsc update-priority-helptext.ts
node update-priority-helptext.js
```

## Output

The script will show:
- Number of templates checked
- Each priority field found and updated
- Summary of changes made
- The new help text format applied

## Safety

- The script only updates fields with `type: 'priority'`
- It preserves all other field properties
- Uses Prisma transactions for data safety
- Shows detailed logging of what's being changed

## Example Output

```
🔍 Starting update of priority field help text...
📋 Found 5 service templates to check
   📝 Found priority field: "Request Priority" in template "Hardware Support"
   ✅ Updated help text for priority field: "Request Priority"
✅ Updated template: "Hardware Support"

📊 Update Summary:
   📋 Total templates checked: 5
   🎯 Total priority fields found: 3
   ✅ Templates updated: 3

✨ Priority field help text update completed successfully!
```

## Rollback

If you need to rollback changes, you should restore from a database backup taken before running this script.
