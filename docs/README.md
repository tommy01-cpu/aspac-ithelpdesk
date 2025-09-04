# IT Helpdesk Documentation

This folder contains all the documentation for the IT Helpdesk system. This documentation helps developers and administrators understand the system's architecture, configurations, and data structures.

## 📁 Documentation Files

### Quick Access
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - ⚡ Quick reference card for common field mappings and code examples

### System Architecture & Configuration
- **[LOAD_BALANCING_STATUS.md](./LOAD_BALANCING_STATUS.md)** - Load balancing system status and configuration
- **[SLA_MONITORING_SYSTEM.md](./SLA_MONITORING_SYSTEM.md)** - Service Level Agreement monitoring system documentation

### Data Structure References
- **[FIELD_MAPPINGS.md](./FIELD_MAPPINGS.md)** - FormData field number mappings and data structure reference

## 📋 Quick Reference

### FormData Field Mappings
For quick reference, here are the most commonly used field mappings:

| Field | Description | Example |
|-------|-------------|---------|
| 1 | Requester Name | "Angelbert De Ramos" |
| 2 | Priority Level | "Low", "Medium", "High" |
| 4 | Request Type | "Service", "Incident" |
| 8 | Subject/Title | "Temporary Loan of IT Equipment" |
| 9 | Description | HTML content with request details |

### Common API Endpoints
- `/api/reports` - Main reports data with filtering
- `/api/technician/dashboard` - Technician dashboard data
- `/api/approvals` - Approval workflow management

## 🔄 System Status
- **Load Balancing**: See [LOAD_BALANCING_STATUS.md](./LOAD_BALANCING_STATUS.md)
- **SLA Monitoring**: See [SLA_MONITORING_SYSTEM.md](./SLA_MONITORING_SYSTEM.md)

## 📅 Last Updated
September 4, 2025

## 💡 Usage Tips

1. **For Developers**: Check FIELD_MAPPINGS.md when working with formData parsing
2. **For System Admins**: Review load balancing and SLA monitoring docs for system health
3. **For Troubleshooting**: Use the field mappings to understand data structure issues

## 🔗 Related Files
- Main project README: [../README.md](../README.md)
- Scripts documentation: [../scripts/README.md](../scripts/README.md)

---
*This documentation is maintained as part of the IT Helpdesk project development.*
