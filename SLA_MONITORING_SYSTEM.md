# 🚨 SLA Monitoring System - Complete Guide

## 📊 **Updated SLA Rules Based on Your Priority Enum**

### **Priority Levels & SLA Times**

| **Priority** | **Response Time** | **Resolution Time** | **Escalation Time** | **Auto-Escalate** |
|--------------|-------------------|---------------------|---------------------|-------------------|
| **Top** | 4 hours | 24 hours (1 day) | 2 hours | ✅ Yes |
| **High** | 8 hours | 72 hours (3 days) | 4 hours | ✅ Yes |
| **Medium** | 24 hours | 168 hours (7 days) | 12 hours | ✅ Yes |
| **Low** | 48 hours | 336 hours (14 days) | 24 hours | ❌ No |

---

## ⏰ **Monitoring Schedule**

### **SLA Compliance Checks**
- **Frequency**: Every **30 minutes** (48 times per day)
- **Process**: Scans all active requests for SLA breaches
- **Action**: Sends escalation emails when thresholds exceeded

### **Auto-Close Process**
- **Schedule**: Daily at **12:00 AM (Midnight)**
- **Target**: Requests with status `resolved` for 10+ days
- **Action**: Automatically changes status to `closed`

---

## 📧 **Email Notifications**

### **SLA Escalation Email Template**
- **Template**: `notify-sla-escalation` (Template ID: 19)
- **Triggered When**: 
  - Response time breached + escalation time passed
  - Resolution time approaching (75% threshold)
  - Critical resolution time breached

### **Email Variables Available**
```typescript
{
  request_id: "123",
  requester_name: "John Doe",
  requester_email: "john.doe@company.com",
  hours_overdue: "12",
  breach_type: "response" | "resolution",
  sla_response_time: "8",
  sla_resolution_time: "72",
  request_priority: "High",
  request_summary: "Computer not working",
  escalation_level: "1",
  dashboard_url: "https://helpdesk.com/dashboard",
  priority_sla_rules: "High Priority: 8h response, 72h resolution"
}
```

---

## 🔧 **How the System Works**

### **1. SLA Configuration Priority**
1. **Database SLA Service** (if template has assigned SLA)
2. **Default Priority-Based Rules** (fallback based on request priority)

### **2. Breach Detection Logic**
```typescript
// Response Time Breach
if (hoursElapsed > slaService.responseTime) {
  breachType = 'response';
}

// Resolution Time Breach  
if (hoursElapsed > slaService.resolutionHours) {
  breachType = 'resolution'; // More critical
}

// Escalation Needed
if (autoEscalate && breached && 
    hoursElapsed > (responseTime + escalationTime)) {
  sendEscalationEmail();
}
```

### **3. Safety Features**
- **5-minute timeout** per monitoring cycle
- **Error isolation** - failures won't crash main system
- **Batch processing** - handles multiple requests efficiently  
- **Development mode** - reduced logging in dev environment

---

## 🎯 **Manual Testing & Control**

### **Manual Triggers Available**
```typescript
// Test SLA monitoring
await safeSLAMonitoringService.manualTriggerSLA();

// Test auto-close
await safeSLAMonitoringService.manualTriggerAutoClose();

// Check service status
const status = safeSLAMonitoringService.getStatus();
```

### **Service Control**
```typescript
// Get system status
const status = safeBackgroundServiceManager.getSystemStatus();

// Manual trigger specific service
await safeBackgroundServiceManager.manualTrigger('sla-monitoring');
await safeBackgroundServiceManager.manualTrigger('auto-close');
```

---

## 📈 **Monitoring Dashboard Data**

### **Request Status Tracking**
- **Active Requests**: `open`, `in_progress`, `pending_approval`
- **Resolved Requests**: `resolved` (monitored for auto-close)
- **Closed Requests**: `closed` (no further monitoring)

### **SLA Metrics Available**
- Total requests monitored
- SLA breaches detected
- Escalation emails sent
- Auto-close actions performed
- Error rates and failures

---

## 🚀 **Implementation Benefits**

1. **✅ Automated SLA Compliance** - No manual monitoring needed
2. **⚡ Real-time Breach Detection** - 30-minute intervals ensure quick response
3. **🛡️ System Safety** - Background failures won't affect main helpdesk
4. **📊 Priority-Based Rules** - Matches your existing priority enum perfectly
5. **🔄 Auto-Resolution** - Prevents requests from staying in resolved status indefinitely

---

## 🔧 **Configuration Notes**

- **Holiday Exclusion**: SLA timers pause during holidays (configurable)
- **Weekend Handling**: Currently continues during weekends (configurable)
- **Operational Hours**: Respects business hours (configurable)
- **Email Template**: Uses existing `notify-sla-escalation` template

The system is now fully aligned with your **Low → Medium → High → Top** priority structure and will automatically ensure your IT helpdesk maintains service level agreements! 🎉
