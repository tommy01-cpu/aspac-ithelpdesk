# IT Helpdesk - FormData Field Mappings

This document explains the field mappings used in the IT Helpdesk system's `formData` JSON structure.

## Field Number Mappings

Based on the system's JSON structure, here are the field mappings:

```json
{
  "1": "Requester Name",
  "2": "Priority Level", 
  "3": "Request Source",
  "4": "Request Type",
  "5": "Status",
  "6": "Service Category",
  "8": "Subject/Title",
  "9": "Description/Details",
  "10": "Attachments (Array)",
  "12": "Additional Data (Array)"
}
```

## Example Data Structure

```json
{
  "1": "Angelbert De Ramos",
  "2": "Low", 
  "3": "self-service_portal",
  "4": "Service",
  "5": "for_approval",
  "6": "Computer Hardware",
  "8": "Temporary Loan of IT Equipment",
  "9": "<p>I need to borrow a laptop for a business trip next week. Please prepare it with standard software.</p>",
  "10": [],
  "12": []
}
```

## Field Details

### Field 1 - Requester Name
- **Type**: String
- **Purpose**: Name of the person making the request
- **Example**: "Angelbert De Ramos"

### Field 2 - Priority Level
- **Type**: String
- **Values**: "Low", "Medium", "High", "Top"
- **Purpose**: Request priority level
- **Example**: "Low"

### Field 3 - Request Source
- **Type**: String
- **Values**: "self-service_portal", "email", "phone", "walk-in"
- **Purpose**: How the request was submitted
- **Example**: "self-service_portal"

### Field 4 - Request Type
- **Type**: String
- **Values**: "Service", "Incident", "Change", "Problem"
- **Purpose**: Type of IT request
- **Example**: "Service"

### Field 5 - Status
- **Type**: String
- **Values**: "new", "for_approval", "in_progress", "resolved", "closed"
- **Purpose**: Current status of the request
- **Example**: "for_approval"

### Field 6 - Service Category
- **Type**: String
- **Purpose**: Category of IT service requested
- **Example**: "Computer Hardware"

### Field 8 - Subject/Title
- **Type**: String
- **Purpose**: Brief title or subject of the request
- **Example**: "Temporary Loan of IT Equipment"

### Field 9 - Description/Details
- **Type**: String (may contain HTML)
- **Purpose**: Detailed description of the request
- **Example**: "<p>I need to borrow a laptop for a business trip next week. Please prepare it with standard software.</p>"

### Field 10 - Attachments
- **Type**: Array
- **Purpose**: File attachments related to the request
- **Example**: [] (empty array if no attachments)

### Field 12 - Additional Data
- **Type**: Array
- **Purpose**: Additional metadata or custom fields
- **Example**: [] (empty array if no additional data)

## Usage in Code

### Extracting Values
```typescript
// Parse formData JSON
const formData = JSON.parse(request.formData);

// Extract common fields
const requesterName = formData['1'];
const priority = formData['2'];
const requestSource = formData['3'];
const requestType = formData['4'];
const status = formData['5'];
const serviceCategory = formData['6'];
const subject = formData['8'];
const description = formData['9'];
const attachments = formData['10'] || [];
const additionalData = formData['12'] || [];
```

### Common Fallbacks
```typescript
// Subject with fallbacks
const subject = formData?.['8'] || formData?.subject || template?.name || 'No Subject';

// Description with fallbacks  
const description = formData?.['9'] || formData?.description || formData?.details || '';

// Priority with fallback
const priority = formData?.['2'] || formData?.priority || 'Medium';
```

## Notes

- Not all fields may be present in every request
- Some legacy requests may use different field names instead of numbers
- Always provide fallback values when accessing formData fields
- HTML content in field 9 should be properly sanitized when displayed
- Empty arrays in fields 10 and 12 are normal for requests without attachments or additional data

## API Endpoints Using These Fields

- `/api/reports` - Uses fields 1, 2, 4, 5, 6, 8, 9 for display and filtering
- `/api/technician/dashboard` - Uses fields 8, 9 for request summaries
- `/api/approvals` - Uses field 9 for approval descriptions
- `/api/notifications` - Uses fields 8, 9 for email content

## Last Updated
September 4, 2025
