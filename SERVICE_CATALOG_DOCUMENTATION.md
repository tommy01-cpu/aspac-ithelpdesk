# Service Catalog Database Structure Documentation

## Overview

This document outlines the comprehensive database structure for the Service Catalog system, designed to handle service requests, incident management, approval workflows, and template-based forms.

## Key Features

- **Service Categories**: Organize services and incidents into logical categories
- **Service & Incident Templates**: Configurable templates with custom form fields
- **Approval Workflows**: Multi-level approval system with flexible approver types
- **Support Groups**: Team-based assignment and escalation
- **SLA Management**: Service Level Agreements with response and resolution times
- **Request Management**: Complete lifecycle management of service requests and incidents
- **File Attachments**: Support for file uploads with requests
- **Comments System**: Internal and external communication tracking

## Core Entities

### 1. Service Categories (`service_categories`)
Organizes services and incidents into logical groups.

```typescript
// Example usage
const categories = [
  { name: "IT Services", icon: "laptop", sortOrder: 1 },
  { name: "HR Services", icon: "users", sortOrder: 2 },
  { name: "Facilities", icon: "building", sortOrder: 3 }
];
```

### 2. Support Groups (`support_groups`)
Teams responsible for handling specific types of requests.

```typescript
// Example support groups
const supportGroups = [
  { name: "IT Helpdesk", description: "General IT support" },
  { name: "Network Team", description: "Network infrastructure" },
  { name: "Security Team", description: "Information security" }
];
```

### 3. SLA (`slas`)
Service Level Agreements defining response and resolution times.

```typescript
// Example SLAs
const slas = [
  { name: "Standard", responseTime: 60, resolutionTime: 480 }, // 1hr response, 8hr resolution
  { name: "High Priority", responseTime: 30, resolutionTime: 240 }, // 30min response, 4hr resolution
  { name: "Critical", responseTime: 15, resolutionTime: 120 } // 15min response, 2hr resolution
];
```

### 4. Service Templates (`service_templates`)
Configurable templates for service requests.

```typescript
// Example service template
const serviceTemplate = {
  name: "New User Account",
  description: "Create a new user account",
  categoryId: 1, // IT Services
  slaId: 1, // Standard SLA
  requiresApproval: true,
  technicianViewConfig: {
    priority: { visible: true, editable: true },
    mode: { visible: true, editable: false },
    subject: { visible: true, editable: true }
  },
  userViewConfig: {
    priority: { visible: false, editable: false },
    mode: { visible: false, editable: false },
    subject: { visible: true, editable: true }
  }
};
```

### 5. Approval Workflows (`approval_levels`, `level_approvers`)
Multi-level approval system supporting various approver types.

```typescript
// Example approval workflow
const approvalLevels = [
  {
    levelNumber: 1,
    name: "Manager Approval",
    approvers: [
      { approverType: "REPORTING_TO" } // User's direct manager
    ]
  },
  {
    levelNumber: 2,
    name: "Department Head Approval",
    approvers: [
      { approverType: "DEPARTMENT_HEAD" } // Department head
    ]
  },
  {
    levelNumber: 3,
    name: "IT Director Approval",
    approvers: [
      { 
        approverType: "SPECIFIC_APPROVER",
        specificApproverId: 123 // Specific user ID
      }
    ]
  }
];
```

### 6. Requests (`requests`)
Main entity for tracking service requests and incidents.

```typescript
// Example request
const request = {
  requestNumber: "REQ-2024-000001", // Auto-generated
  requestType: "SERVICE",
  serviceTemplateId: 1,
  categoryId: 1,
  requesterId: 456,
  priority: "MEDIUM",
  mode: "SELF_SERVICE_PORTAL",
  status: "SUBMITTED",
  subject: "New laptop request",
  description: "<p>Rich text content from ReactQuill</p>",
  emailNotifications: JSON.stringify(["manager@company.com", "it@company.com"])
};
```

## Field Configuration System

### JSON-based Configuration
Templates use JSON fields to configure form behavior:

```typescript
interface FieldConfig {
  [fieldName: string]: {
    visible: boolean;
    editable: boolean;
    required?: boolean;
    defaultValue?: any;
  };
}

// Example configuration
const technicianViewConfig: FieldConfig = {
  priority: { visible: true, editable: true, required: true },
  mode: { visible: true, editable: false },
  subject: { visible: true, editable: true, required: true },
  description: { visible: true, editable: true, required: true },
  emailNotifications: { visible: true, editable: true }
};

const userViewConfig: FieldConfig = {
  priority: { visible: false, editable: false },
  mode: { visible: false, editable: false },
  subject: { visible: true, editable: true, required: true },
  description: { visible: true, editable: true, required: true },
  emailNotifications: { visible: true, editable: true }
};
```

## Implementation Steps

### 1. Database Migration
Replace your current `schema.prisma` with the `integrated-schema.prisma` content, then run:

```bash
# Generate Prisma client
npx prisma generate

# Create and apply migration
npx prisma migrate dev --name "add-service-catalog"

# (Optional) Reset database if needed
npx prisma migrate reset
```

### 2. Seed Data
Create initial data for testing:

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create service categories
  const itCategory = await prisma.serviceCategory.create({
    data: {
      name: "IT Services",
      description: "Information Technology services",
      icon: "laptop",
      sortOrder: 1,
      createdBy: 1 // Admin user ID
    }
  });

  // Create SLA
  const standardSLA = await prisma.sLA.create({
    data: {
      name: "Standard",
      description: "Standard service level",
      responseTime: 60, // 1 hour
      resolutionTime: 480 // 8 hours
    }
  });

  // Create support group
  const itHelpdesk = await prisma.supportGroup.create({
    data: {
      name: "IT Helpdesk",
      description: "General IT support team"
    }
  });

  // Create service template
  const newUserTemplate = await prisma.serviceTemplate.create({
    data: {
      name: "New User Account",
      description: "Request a new user account",
      categoryId: itCategory.id,
      slaId: standardSLA.id,
      requiresApproval: true,
      createdBy: 1,
      technicianViewConfig: {
        priority: { visible: true, editable: true },
        mode: { visible: true, editable: false },
        subject: { visible: true, editable: true },
        description: { visible: true, editable: true }
      },
      userViewConfig: {
        priority: { visible: false, editable: false },
        mode: { visible: false, editable: false },
        subject: { visible: true, editable: true },
        description: { visible: true, editable: true }
      }
    }
  });

  // Associate template with support group
  await prisma.serviceTemplateGroup.create({
    data: {
      serviceTemplateId: newUserTemplate.id,
      supportGroupId: itHelpdesk.id
    }
  });

  // Create approval level
  await prisma.approvalLevel.create({
    data: {
      serviceTemplateId: newUserTemplate.id,
      levelNumber: 1,
      name: "Manager Approval",
      approvers: {
        create: {
          approverType: "REPORTING_TO"
        }
      }
    }
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### 3. API Routes
Create API routes to support the Service Catalog:

```typescript
// app/api/service-catalog/categories/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const categories = await prisma.serviceCategory.findMany({
      where: { isActive: true },
      include: {
        serviceTemplates: {
          where: { status: 'ACTIVE' },
          include: {
            sla: true,
            supportGroups: {
              include: {
                supportGroup: true
              }
            }
          }
        },
        incidentTemplates: {
          where: { status: 'ACTIVE' }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });

    return NextResponse.json(categories);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
```

### 4. Frontend Components
Create components to interact with the Service Catalog:

```typescript
// components/service-catalog/ServiceCatalog.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ServiceCategory {
  id: number;
  name: string;
  description: string;
  icon: string;
  serviceTemplates: ServiceTemplate[];
}

interface ServiceTemplate {
  id: number;
  name: string;
  description: string;
  icon: string;
}

export default function ServiceCatalog() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);

  useEffect(() => {
    fetch('/api/service-catalog/categories')
      .then(res => res.json())
      .then(setCategories);
  }, []);

  const handleSelectService = (templateId: number) => {
    // Navigate to request form with template
    window.location.href = `/requests/new?template=${templateId}`;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Service Catalog</h1>
      
      {categories.map(category => (
        <Card key={category.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">{category.icon}</span>
              {category.name}
            </CardTitle>
            {category.description && (
              <p className="text-muted-foreground">{category.description}</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {category.serviceTemplates.map(template => (
                <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {template.icon && (
                        <span className="text-xl">{template.icon}</span>
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold">{template.name}</h3>
                        {template.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {template.description}
                          </p>
                        )}
                        <Button 
                          className="mt-3" 
                          size="sm"
                          onClick={() => handleSelectService(template.id)}
                        >
                          Request
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

## Integration with Existing Request Form

Your existing request form in `app/requests/new/page.tsx` can be enhanced to work with templates:

```typescript
// In your request form component
const [selectedTemplate, setSelectedTemplate] = useState<ServiceTemplate | null>(null);

useEffect(() => {
  const templateId = searchParams.get('template');
  if (templateId) {
    fetch(`/api/service-catalog/templates/${templateId}`)
      .then(res => res.json())
      .then(setSelectedTemplate);
  }
}, [searchParams]);

// Use template configuration to show/hide fields
const showPriority = selectedTemplate?.userViewConfig?.priority?.visible !== false;
const allowEditPriority = selectedTemplate?.userViewConfig?.priority?.editable !== false;
```

## Benefits

1. **Flexibility**: JSON-based field configuration allows easy customization
2. **Scalability**: Template-based approach supports unlimited service types
3. **Workflow Management**: Multi-level approval system with various approver types
4. **Integration**: Works with your existing ReactQuill-based request form
5. **Tracking**: Complete audit trail for requests and approvals
6. **Team Management**: Support group assignments and escalation
7. **SLA Compliance**: Built-in SLA tracking and reporting

This structure provides a solid foundation for a comprehensive Service Catalog system while maintaining compatibility with your existing codebase.
