# SLA Escalation Fix Summary

## Problem Identified
The SLA monitoring service was incorrectly handling incident vs service requests:
1. **All requests** were being treated as services and only looking up `sla_service` table
2. **Incident requests** should use `sla_incident` table based on priority mappings
3. **Service requests** should use `sla_service` → `sla_service_escalation` tables
4. **Escalation emails** were coming after due date instead of before

## Root Cause
- `getSLAServiceForRequest()` function only checked `template.slaService` field
- No differentiation between incident vs service request types
- Missing logic to query `sla_incident` table for incident-type requests
- Hardcoded lookups bypassed proper SLA configuration routing

## Changes Made

### 1. Enhanced `getSLAServiceForRequest()` Method
- **Added template type detection**: Checks `template.type` field ("incident" vs "service")
- **Route to appropriate SLA table**:
  - Incident requests → `getSLAIncidentForRequest()`
  - Service requests → existing `template.slaService` lookup

### 2. New `getSLAIncidentForRequest()` Method
- **Priority-based lookup**: Queries `priority_sla` table based on request priority
- **Incident SLA retrieval**: Gets proper `sla_incident` configuration
- **Compatibility mapping**: Maps incident fields to unified SLA format

### 3. New `mapIncidentEscalationLevels()` Method
- **Converts incident escalation structure** to service escalation format
- **Ensures compatibility** with existing escalation processing logic
- **Maintains "before" escalation timing** for all incident levels

### 4. Updated `shouldSendEscalationNow()` Method
- **Unified parameter**: Changed from `slaIncident` to `slaConfig`
- **Added service escalation support**: `checkServiceEscalationLevels()`
- **Added incident escalation support**: `checkIncidentEscalationLevels()`
- **Proper escalation detection** based on SLA configuration type

### 5. Fixed Escalation Logic References
- **Removed hardcoded `sla_incident` lookups** from form data
- **Updated all `slaIncident` references** to use unified `slaConfig`
- **Enhanced logging** to show request type and SLA configuration

## Expected Behavior After Fix

### For Incident Requests (template.type = "incident")
1. **Template Detection**: System recognizes incident type from `template.type`
2. **Priority Mapping**: Looks up `priority_sla` table based on request priority
3. **SLA Configuration**: Uses `sla_incident` table for escalation rules
4. **Escalation Timing**: Sends escalations BEFORE due date based on incident SLA settings

### For Service Requests (template.type = "service")
1. **Template Detection**: System recognizes service type from `template.type`
2. **SLA Service Lookup**: Uses `template.slaService` relationship
3. **SLA Configuration**: Uses `sla_service` and `sla_service_escalation` tables
4. **Escalation Timing**: Sends escalations based on service escalation levels

## Database Tables Used

### For Incidents
```
template (type = "incident") 
    ↓
priority_sla (by request.priority)
    ↓
sla_incident (escalation configuration)
```

### For Services
```
template (type = "service")
    ↓
sla_service (via template.slaServiceId)
    ↓
sla_service_escalation (escalation levels)
```

## Testing Instructions

1. **Create incident request** with template.type = "incident"
2. **Verify priority mapping** to sla_incident table
3. **Check escalation timing** occurs BEFORE due date
4. **Monitor logs** for proper SLA configuration detection

## Files Modified
- `lib/safe-sla-monitoring-service.ts` - Main SLA monitoring logic
- Added comprehensive logging for debugging escalation routing

## Verification
The fix addresses the user's concern that "incident and service incident go to sla_incident if service go to sla_service → sla_service_escalation" by properly routing requests based on their template type to the correct SLA configuration tables.
