# 🚀 Quick Reference Card

## FormData Field Numbers (Most Used)

```
1 = Requester Name     | 8 = Subject/Title
2 = Priority Level     | 9 = Description  
4 = Request Type       | 10 = Attachments
5 = Status            | 12 = Additional Data
```

## Priority Values
- `Low` | `Medium` | `High` | `Critical`

## Request Types  
- `Service` | `Incident` | `Change` | `Problem`

## Status Values
- `new` | `for_approval` | `in_progress` | `resolved` | `closed`

## Code Examples

### Extract Description
```typescript
const description = formData?.['9'] || formData?.description || '';
```

### Extract Subject
```typescript  
const subject = formData?.['8'] || formData?.subject || 'No Subject';
```

### Extract Priority
```typescript
const priority = formData?.['2'] || formData?.priority || 'Medium';
```

## API Endpoints
- `GET /api/reports` - Reports with filtering
- `GET /api/technician/dashboard` - Technician data
- `POST /api/approvals` - Approval actions

---
*Quick access to essential information - See full docs in other files*
