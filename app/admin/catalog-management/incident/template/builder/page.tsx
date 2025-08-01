"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Save, Eye, Settings, Plus, Trash2, Edit3, Edit,
  Type, Hash, Calendar, Clock, FileText, CheckSquare, 
  List, Upload, Users, Mail, Phone, MapPin, Star,
  ChevronDown, ChevronRight, ChevronUp, ArrowUp, ArrowDown, X, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { SessionWrapper } from '@/components/session-wrapper';
import SLAAssignment from '@/components/sla-assignment';
import TemplateSupportGroupAssignment from '@/components/template-support-group-assignment';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { 
  ssr: false,
  loading: () => <div className="h-32 bg-slate-50 rounded border animate-pulse" />
});

// Field types for incident templates
const fieldTypes = [
  { id: 'text', name: 'Text Input', icon: Type, description: 'Single line text input', color: 'bg-blue-100 text-blue-600' },
  { id: 'textarea', name: 'Text Area', icon: FileText, description: 'Multi-line text input', color: 'bg-green-100 text-green-600' },
  { id: 'richtext', name: 'Rich Text', icon: FileText, description: 'Rich text editor with formatting toolbar', color: 'bg-green-100 text-green-600' },
  { id: 'select', name: 'Dropdown', icon: List, description: 'Single selection dropdown', color: 'bg-purple-100 text-purple-600' },
  { id: 'multiselect', name: 'Multi-Select', icon: CheckSquare, description: 'Multiple selection', color: 'bg-orange-100 text-orange-600' },
  { id: 'number', name: 'Number', icon: Hash, description: 'Numeric input', color: 'bg-red-100 text-red-600' },
  { id: 'date', name: 'Date Picker', icon: Calendar, description: 'Date selection', color: 'bg-yellow-100 text-yellow-600' },
  { id: 'time', name: 'Time Picker', icon: Clock, description: 'Time selection', color: 'bg-pink-100 text-pink-600' },
  { id: 'file', name: 'File Upload', icon: Upload, description: 'File attachment', color: 'bg-indigo-100 text-indigo-600' },
  { id: 'user', name: 'User Selector', icon: Users, description: 'Select users', color: 'bg-teal-100 text-teal-600' },
  { id: 'email', name: 'Email', icon: Mail, description: 'Email address input', color: 'bg-cyan-100 text-cyan-600' },
  { id: 'phone', name: 'Phone', icon: Phone, description: 'Phone number input', color: 'bg-lime-100 text-lime-600' },
  { id: 'location', name: 'Location', icon: MapPin, description: 'Location picker', color: 'bg-emerald-100 text-emerald-600' },
  { id: 'priority', name: 'Priority', icon: Star, description: 'Priority selector', color: 'bg-amber-100 text-amber-600' }
];

// Rich Text Editor Component
interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  value = '', 
  onChange, 
  placeholder = 'Enter text...', 
  disabled = false,
  className = ''
}) => {
  const [editorKey, setEditorKey] = useState(0);

  // Force re-render when placeholder changes
  React.useEffect(() => {
    setEditorKey(prev => prev + 1);
  }, [placeholder]);

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      ['link', 'blockquote'],
      [{ 'align': [] }],
      [{ 'color': [] }, { 'background': [] }],
      ['clean']
    ],
    clipboard: {
      matchVisual: false,
    }
  };

  const formats = [
    'header', 'font', 'size', 'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent', 'link', 'blockquote', 'align', 'color', 'background'
  ];

  return (
    <div className={`rich-text-editor ${disabled ? 'disabled' : ''} ${className}`}>
      <ReactQuill
        key={`quill-${editorKey}-${placeholder}`}
        theme="snow"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={disabled}
        modules={disabled ? { toolbar: false } : modules}
        formats={formats}
        style={{
          backgroundColor: disabled ? '#f8fafc' : 'white',
        }}
      />
    </div>
  );
};

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  helpText?: string;
  technicianOnly: boolean;
}

// Approval interfaces
interface ApprovalLevel {
  id: string;
  displayName: string;
  approvers: string[]; // User names/emails for template definition
  order: number;
}

interface ApprovalConfig {
  approvalMethod: 'all' | 'first';
  sendApprovalNotification: boolean;
  assignTechnicianAfterApproval: boolean;
}

interface SupportGroupAssignment {
  id?: number;
  supportGroupId: number;
  supportGroup?: {
    id: number;
    name: string;
    description?: string;
    isActive: boolean;
    technicianCount?: number;
  };
  isActive: boolean;
  loadBalanceType: 'round_robin' | 'least_load' | 'random';
  priority: number;
}

interface IncidentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
  fields: FormField[];
  createdAt: string;
  updatedAt: string;
}

// Predefined template configurations
const TEMPLATE_PRESETS: Record<string, Partial<IncidentTemplate>> = {
  'general-service': {
    name: 'Default',
    description: 'Standard service request template with common fields',
    category: 'template',
    fields: [
      {
        id: '1',
        type: 'text',
        label: 'Name',
        required: true,
        placeholder: 'Enter your full name',
        helpText: 'Full name of the person submitting the request',
        technicianOnly: false
      },
      {
        id: '2',
        type: 'select',
        label: 'Priority',
        required: true,
        options: ['Low', 'Medium', 'High', 'Critical'],
        helpText: 'Select the priority level for this request',
        technicianOnly: false
      },
      {
        id: '3',
        type: 'select',
        label: 'Mode',
        required: true,
        options: ['Email', 'Phone', 'Walk-in', 'Web Portal', 'Chat'],
        helpText: 'How was this request submitted?',
        technicianOnly: true
      },
      {
        id: '4',
        type: 'select',
        label: 'Request Type',
        required: true,
        options: ['Service', 'Incident', 'Change', 'Problem'],
        helpText: 'Type of request being submitted',
        technicianOnly: true
      },
      {
        id: '5',
        type: 'select',
        label: 'Status',
        required: true,
        options: ['Open', 'Assigned', 'In Progress', 'On-Hold', 'Cancelled', 'Closed'],
        helpText: 'Current status of the request',
        technicianOnly: true
      },
      {
        id: '6',
        type: 'select',
        label: 'Category',
        required: true,
        options: ['Hardware', 'Software', 'Network', 'Access Management', 'Communication', 'Other'],
        helpText: 'Select the appropriate service category',
        technicianOnly: false
      },
      {
        id: '7',
        type: 'select',
        label: 'Technician',
        required: false,
        options: ['John Smith', 'Sarah Johnson', 'Mike Davis', 'Lisa Wilson', 'David Brown'],
        helpText: 'Assign to a specific technician',
        technicianOnly: true
      },
      {
        id: '8',
        type: 'text',
        label: 'Subject',
        required: true,
        placeholder: 'Brief description of the service request',
        helpText: 'Enter a clear, concise subject line',
        technicianOnly: false
      },
      {
        id: '9',
        type: 'richtext',
        label: 'Description',
        required: true,
        placeholder: 'Provide detailed description of the service needed...',
        helpText: 'Detailed description of the service request including any specific requirements',
        technicianOnly: false
      },
      {
        id: '10',
        type: 'text',
        label: 'E-mail Id(s) To Notify',
        required: false,
        placeholder: 'email1@company.com, email2@company.com',
        helpText: 'Additional email addresses to notify about this request',
        technicianOnly: false
      },
      {
        id: '11',
        type: 'richtext',
        label: 'RESOLUTION',
        required: false,
        placeholder: 'Resolution summary...',
        helpText: 'Summary of how the request was resolved',
        technicianOnly: true
      }
    ]
  },
  'laptop-request': {
    name: 'Laptop Request',
    description: 'Request a new laptop or laptop replacement',
    category: 'Hardware',
    fields: [
      {
        id: '1',
        type: 'text',
        label: 'Employee Name',
        required: true,
        placeholder: 'Full name of the employee',
        helpText: 'Enter the full name of the employee requesting the laptop',
        technicianOnly: false
      },
      {
        id: '2',
        type: 'select',
        label: 'Laptop Type',
        required: true,
        options: ['Standard Business Laptop', 'High Performance Laptop', 'Developer Workstation', 'Executive Laptop'],
        helpText: 'Select the type of laptop needed',
        technicianOnly: false
      },
      {
        id: '3',
        type: 'textarea',
        label: 'Business Justification',
        required: true,
        placeholder: 'Explain why this laptop is needed...',
        helpText: 'Provide business justification for the laptop request',
        technicianOnly: false
      },
      {
        id: '4',
        type: 'select',
        label: 'Urgency',
        required: true,
        options: ['Standard', 'Urgent', 'Emergency'],
        helpText: 'How urgently is this laptop needed?',
        technicianOnly: false
      },
      {
        id: '5',
        type: 'date',
        label: 'Required Date',
        required: true,
        helpText: 'When do you need the laptop by?',
        technicianOnly: false
      }
    ]
  },
  'software-installation': {
    name: 'Software Installation Request',
    description: 'Request installation of software applications',
    category: 'Software',
    fields: [
      {
        id: '1',
        type: 'text',
        label: 'Software Name',
        required: true,
        placeholder: 'e.g., Adobe Photoshop, Microsoft Office',
        helpText: 'Name of the software to be installed',
        technicianOnly: false
      },
      {
        id: '2',
        type: 'text',
        label: 'Version',
        required: false,
        placeholder: 'e.g., 2024, Latest',
        helpText: 'Specific version if required',
        technicianOnly: false
      },
      {
        id: '3',
        type: 'textarea',
        label: 'Business Purpose',
        required: true,
        placeholder: 'Explain how this software will be used...',
        helpText: 'Business purpose for the software',
        technicianOnly: false
      },
      {
        id: '4',
        type: 'select',
        label: 'License Type',
        required: true,
        options: ['Individual License', 'Team License', 'Enterprise License', 'Free/Open Source'],
        helpText: 'What type of license is needed?',
        technicianOnly: false
      },
      {
        id: '5',
        type: 'multiselect',
        label: 'Target Users',
        required: true,
        options: ['Individual User', 'Department Team', 'Project Team', 'All Employees'],
        helpText: 'Who will be using this software?',
        technicianOnly: false
      }
    ]
  },
  'network-access': {
    name: 'Network Access Request',
    description: 'Request access to network resources and systems',
    category: 'Network',
    fields: [
      {
        id: '1',
        type: 'text',
        label: 'Employee Name',
        required: true,
        placeholder: 'Full name of employee',
        helpText: 'Name of person needing network access',
        technicianOnly: false
      },
      {
        id: '2',
        type: 'multiselect',
        label: 'Access Type',
        required: true,
        options: ['VPN Access', 'File Server Access', 'Database Access', 'WiFi Access', 'Guest Network'],
        helpText: 'What type of network access is needed?',
        technicianOnly: false
      },
      {
        id: '3',
        type: 'text',
        label: 'Department',
        required: true,
        placeholder: 'Employee department',
        helpText: 'Which department does the employee belong to?',
        technicianOnly: false
      },
      {
        id: '4',
        type: 'textarea',
        label: 'Access Justification',
        required: true,
        placeholder: 'Explain why this access is needed...',
        helpText: 'Business justification for network access',
        technicianOnly: false
      },
      {
        id: '5',
        type: 'date',
        label: 'Start Date',
        required: true,
        helpText: 'When should the access begin?',
        technicianOnly: false
      }
    ]
  },
  'email-setup': {
    name: 'Email Account Setup',
    description: 'Request setup of new email account or mailbox',
    category: 'Communication',
    fields: [
      {
        id: '1',
        type: 'text',
        label: 'Employee Name',
        required: true,
        placeholder: 'Full name of employee',
        helpText: 'Name of the person who needs the email account',
        technicianOnly: false
      },
      {
        id: '2',
        type: 'text',
        label: 'Preferred Email Address',
        required: true,
        placeholder: 'firstname.lastname@company.com',
        helpText: 'Desired email address format',
        technicianOnly: false
      },
      {
        id: '3',
        type: 'text',
        label: 'Department',
        required: true,
        placeholder: 'Employee department',
        helpText: 'Which department is the employee in?',
        technicianOnly: false
      },
      {
        id: '4',
        type: 'select',
        label: 'Mailbox Type',
        required: true,
        options: ['Standard Mailbox', 'Shared Mailbox', 'Resource Mailbox', 'Distribution List'],
        helpText: 'Type of email account needed',
        technicianOnly: false
      },
      {
        id: '5',
        type: 'multiselect',
        label: 'Additional Services',
        required: false,
        options: ['Calendar Access', 'Mobile Sync', 'Outlook Setup', 'Archive Mailbox'],
        helpText: 'Additional email services required',
        technicianOnly: false
      },
      {
        id: '6',
        type: 'date',
        label: 'Required Date',
        required: true,
        helpText: 'When is the email account needed by?',
        technicianOnly: false
      }
    ]
  },
  'system-access': {
    name: 'System Access Request',
    description: 'Request access to business systems and applications',
    category: 'Access Management',
    fields: [
      {
        id: '1',
        type: 'text',
        label: 'Employee Name',
        required: true,
        placeholder: 'Full name of employee needing access',
        helpText: 'Name of the person who needs access',
        technicianOnly: false
      },
      {
        id: '2',
        type: 'text',
        label: 'Employee ID',
        required: true,
        placeholder: 'Employee ID number',
        helpText: 'Company employee identification number',
        technicianOnly: false
      },
      {
        id: '3',
        type: 'text',
        label: 'Department',
        required: true,
        placeholder: 'Department name',
        helpText: 'Which department does the employee belong to?',
        technicianOnly: false
      },
      {
        id: '4',
        type: 'multiselect',
        label: 'Systems/Applications',
        required: true,
        options: ['CRM System', 'ERP System', 'HR System', 'Finance System', 'Project Management', 'Time Tracking', 'Database Access'],
        helpText: 'Which systems need access?',
        technicianOnly: false
      },
      {
        id: '5',
        type: 'select',
        label: 'Access Level',
        required: true,
        options: ['Read Only', 'Standard User', 'Power User', 'Administrator'],
        helpText: 'Level of access required',
        technicianOnly: false
      },
      {
        id: '6',
        type: 'textarea',
        label: 'Business Justification',
        required: true,
        placeholder: 'Explain why this access is needed...',
        helpText: 'Business reason for the access request',
        technicianOnly: false
      },
      {
        id: '7',
        type: 'date',
        label: 'Start Date',
        required: true,
        helpText: 'When should the access become effective?',
        technicianOnly: false
      }
    ]
  }
};

export default function IncidentTemplateBuilderPage() {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templateName, setTemplateName] = useState('New Incident Template');
  const [templateDescription, setTemplateDescription] = useState('');
  const [currentView, setCurrentView] = useState<'user' | 'technician'>('technician');
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
  
  // Approval Workflow State
  const [isApprovalEnabled, setIsApprovalEnabled] = useState(false);
  const [approvalLevels, setApprovalLevels] = useState<ApprovalLevel[]>([]);
  const [approvalConfig, setApprovalConfig] = useState<ApprovalConfig>({
    approvalMethod: 'all',
    sendApprovalNotification: true,
    assignTechnicianAfterApproval: true
  });
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [editingApprovalLevel, setEditingApprovalLevel] = useState<ApprovalLevel | null>(null);
  
  // Template Type and SLA State (Fixed for Incident Templates)
  const templateType = 'incident' as const;
  const [selectedSLAId, setSelectedSLAId] = useState<number | null>(null);
  
  // Support Group Assignment State
  const [supportGroupAssignments, setSupportGroupAssignments] = useState<SupportGroupAssignment[]>([]);
  
  const [formFields, setFormFields] = useState<FormField[]>([
      {
        id: '1',
        type: 'text',
        label: 'Name',
        required: true,
        placeholder: 'Enter your full name',
        helpText: 'Full name of the person submitting the request',
        technicianOnly: false
      },
      {
        id: '2',
        type: 'select',
        label: 'Priority',
        required: true,
        options: ['Low', 'Medium', 'High', 'Critical'],
        helpText: 'Select the priority level for this request',
        technicianOnly: false
      },
      {
        id: '3',
        type: 'select',
        label: 'Mode',
        required: true,
        options: ['Email', 'Phone', 'Walk-in', 'Web Portal', 'Chat'],
        helpText: 'How was this request submitted?',
        technicianOnly: true
      },
      {
        id: '4',
        type: 'select',
        label: 'Request Type',
        required: true,
        options: ['Service'],
        helpText: 'Type of request being submitted',
        technicianOnly: true
      },
      {
        id: '5',
        type: 'select',
        label: 'Status',
        required: true,
        options: ['Open', 'Assigned', 'In Progress', 'On-Hold', 'Cancelled', 'Closed'],
        helpText: 'Current status of the request',
        technicianOnly: true
      },
      {
        id: '6',
        type: 'select',
        label: 'Category',
        required: true,
        options: ['Hardware', 'Software', 'Network', 'Access Management', 'Communication', 'Other'],
        helpText: 'Select the appropriate service category',
        technicianOnly: true
      },
      {
        id: '7',
        type: 'select',
        label: 'Technician',
        required: false,
        options: ['John Smith', 'Sarah Johnson', 'Mike Davis', 'Lisa Wilson', 'David Brown'],
        helpText: 'Assign to a specific technician',
        technicianOnly: true
      },
      {
        id: '8',
        type: 'text',
        label: 'Subject',
        required: true,
        placeholder: 'Brief description of the service request',
        helpText: 'Enter a clear, concise subject line',
        technicianOnly: false
      },
      {
        id: '9',
        type: 'richtext',
        label: 'Description',
        required: true,
        placeholder: 'Provide detailed description of the service needed...',
        helpText: 'Detailed description of the service request including any specific requirements',
        technicianOnly: false
      },
      {
        id: '10',
        type: 'text',
        label: 'E-mail Id(s) To Notify',
        required: false,
        placeholder: 'email1@company.com, email2@company.com',
        helpText: 'Additional email addresses to notify about this request',
        technicianOnly: false
      },
      {
        id: '11',
        type: 'richtext',
        label: 'RESOLUTION',
        required: false,
        placeholder: 'Resolution summary...',
        helpText: 'Summary of how the request was resolved',
        technicianOnly: true
      }
    ]);

  // Load template data from localStorage when coming from preview edit
  useEffect(() => {
    const editTemplateData = localStorage.getItem('editTemplate');
    if (editTemplateData) {
      try {
        const parsedTemplate = JSON.parse(editTemplateData);
        setTemplateName(parsedTemplate.name || 'New Incident Template');
        setTemplateDescription(parsedTemplate.description || '');
        setFormFields(parsedTemplate.fields || []);
        // Clear the editTemplate data after loading
        localStorage.removeItem('editTemplate');
      } catch (error) {
        console.error('Failed to parse edit template data:', error);
      }
    }
  }, []);

  // Approval Level Modal Functions
  const handleApprovalLevelSave = (levelData: { displayName: string; approvers: string[] }) => {
    if (editingApprovalLevel) {
      // Update existing level
      setApprovalLevels(prev => 
        prev.map(level => 
          level.id === editingApprovalLevel.id 
            ? { ...level, ...levelData }
            : level
        )
      );
    } else {
      // Create new level
      const newLevel: ApprovalLevel = {
        id: Date.now().toString(),
        displayName: levelData.displayName,
        approvers: levelData.approvers,
        order: approvalLevels.length + 1
      };
      setApprovalLevels(prev => [...prev, newLevel]);
    }
    setIsApprovalModalOpen(false);
    setEditingApprovalLevel(null);
  };

  const handleApprovalModalClose = () => {
    setIsApprovalModalOpen(false);
    setEditingApprovalLevel(null);
  };

  const loadTemplate = (templateId: string) => {
    if (templateId && TEMPLATE_PRESETS[templateId]) {
      const preset = TEMPLATE_PRESETS[templateId];
      setTemplateName(preset.name || 'New Incident Template');
      setTemplateDescription(preset.description || '');
      setFormFields(preset.fields || []);
      setSelectedTemplate(templateId);
      setSelectedField(null);
      setIsConfigPanelOpen(false);
    }
  };

  const createNewTemplate = () => {
    setSelectedTemplate('');
    setTemplateName('New Incident Template');
    setTemplateDescription('');
    setFormFields([]);
    setSelectedField(null);
    setIsConfigPanelOpen(false);
  };

  const addField = (fieldType: string) => {
    const fieldTypeInfo = fieldTypes.find(ft => ft.id === fieldType);
    
    let defaultPlaceholder = `Enter ${fieldTypeInfo?.name.toLowerCase()}`;
    if (fieldType === 'textarea') {
      defaultPlaceholder = 'Describe in detail...';
    } else if (fieldType === 'email') {
      defaultPlaceholder = 'example@company.com';
    } else if (fieldType === 'phone') {
      defaultPlaceholder = '+1 (555) 123-4567';
    } else if (fieldType === 'location') {
      defaultPlaceholder = 'Building, floor, room';
    }
    
    const newField: FormField = {
      id: Date.now().toString(),
      type: fieldType,
      label: fieldTypeInfo?.name || 'New Field',
      required: false,
      placeholder: defaultPlaceholder,
      helpText: '',
      technicianOnly: false,
      ...(fieldType === 'select' || fieldType === 'multiselect' ? { options: ['Option 1', 'Option 2', 'Option 3'] } : {})
    };
    setFormFields([...formFields, newField]);
    setSelectedField(newField.id);
    setIsConfigPanelOpen(true);
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setFormFields(formFields.map(field => 
      field.id === fieldId ? { ...field, ...updates } : field
    ));
  };

  const deleteField = (fieldId: string) => {
    setFormFields(formFields.filter(field => field.id !== fieldId));
    if (selectedField === fieldId) {
      setSelectedField(null);
      setIsConfigPanelOpen(false);
    }
  };

  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    const index = formFields.findIndex(field => field.id === fieldId);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === formFields.length - 1)
    ) {
      return;
    }

    const newFields = [...formFields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    setFormFields(newFields);
  };

  const getVisibleFields = () => {
    // Always return all fields for the new approach
    return formFields;
  };

  const selectedFieldData = formFields.find(field => field.id === selectedField);

  // Component to render the actual form field preview
  const renderFormField = (field: FormField) => {
    const isRequired = field.required;
    const isDisabled = currentView === 'user' && field.technicianOnly;
    
    return (
      <div key={field.id} className="space-y-2">
        <Label className={`text-sm font-medium ${isDisabled ? 'text-gray-400' : 'text-slate-700'}`}>
          {field.label}
          {isRequired && <span className={`ml-1 ${isDisabled ? 'text-gray-400' : 'text-red-500'}`}>*</span>}
          {field.technicianOnly && (
            <Badge variant="outline" className={`ml-2 text-xs ${isDisabled ? 'bg-gray-100 text-gray-400 border-gray-300' : 'bg-slate-200 text-slate-700'}`}>
              Technician Only
            </Badge>
          )}
        </Label>
        
        {field.helpText && (
          <p className={`text-xs ${isDisabled ? 'text-gray-400' : 'text-slate-500'}`}>{field.helpText}</p>
        )}
        
        {field.type === 'text' && (
          <Input
            placeholder={field.placeholder}
            disabled={true}
            className={`${isDisabled ? 'bg-gray-100 opacity-60' : 'bg-slate-50'}`}
          />
        )}
        
        {field.type === 'email' && (
          <Input
            type="email"
            placeholder={field.placeholder}
            disabled={true}
            className={`${isDisabled ? 'bg-gray-100 opacity-60' : 'bg-slate-50'}`}
          />
        )}
        
        {field.type === 'phone' && (
          <Input
            type="tel"
            placeholder={field.placeholder}
            disabled={true}
            className={`${isDisabled ? 'bg-gray-100 opacity-60' : 'bg-slate-50'}`}
          />
        )}
        
        {field.type === 'number' && (
          <Input
            type="number"
            placeholder={field.placeholder}
            disabled={true}
            className={`${isDisabled ? 'bg-gray-100 opacity-60' : 'bg-slate-50'}`}
          />
        )}
        
        {field.type === 'textarea' && (
          <RichTextEditor
            key={`${field.id}-${field.placeholder}`}
            placeholder={field.placeholder}
            value=""
            disabled={true}
            className={`min-h-[120px] preview-editor ${isDisabled ? 'opacity-60' : ''}`}
          />
        )}
        
        {field.type === 'richtext' && (
          <RichTextEditor
            key={`${field.id}-${field.placeholder}`}
            placeholder={field.placeholder}
            value=""
            disabled={true}
            className={`min-h-[120px] preview-editor ${isDisabled ? 'opacity-60' : ''}`}
          />
        )}
        
        {(field.type === 'select' || field.type === 'priority') && (
          <Select disabled={true}>
            <SelectTrigger className={`${isDisabled ? 'bg-gray-100 opacity-60' : 'bg-slate-50'}`}>
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options
                ?.filter(option => option && option.trim() !== '') // Filter out empty options
                ?.map((option, index) => {
                  const value = option.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || `option-${index}`;
                  return (
                    <SelectItem key={index} value={value}>
                      {option}
                    </SelectItem>
                  );
                })}
            </SelectContent>
          </Select>
        )}
        
        {field.type === 'multiselect' && (
          <div className={`space-y-2 ${isDisabled ? 'opacity-60' : ''}`}>
            {field.options
              ?.filter(option => option && option.trim() !== '') // Filter out empty options
              ?.slice(0, 3)
              ?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Checkbox disabled={true} />
                  <Label className={`text-sm ${isDisabled ? 'text-gray-400' : 'text-slate-600'}`}>{option}</Label>
                </div>
              ))}
            {field.options && field.options.filter(option => option && option.trim() !== '').length > 3 && (
              <p className={`text-xs ${isDisabled ? 'text-gray-400' : 'text-slate-500'}`}>+ {field.options.filter(option => option && option.trim() !== '').length - 3} more options</p>
            )}
          </div>
        )}
        
        {field.type === 'date' && (
          <Input
            type="date"
            disabled={true}
            className={`${isDisabled ? 'bg-gray-100 opacity-60' : 'bg-slate-50'}`}
          />
        )}
        
        {field.type === 'time' && (
          <Input
            type="time"
            disabled={true}
            className={`${isDisabled ? 'bg-gray-100 opacity-60' : 'bg-slate-50'}`}
          />
        )}
        
        {field.type === 'file' && (
          <div className={`border-2 border-dashed rounded-lg p-4 text-center ${isDisabled ? 'border-gray-300 bg-gray-100 opacity-60' : 'border-slate-300 bg-slate-50'}`}>
            <Upload className={`w-6 h-6 mx-auto mb-2 ${isDisabled ? 'text-gray-400' : 'text-slate-400'}`} />
            <p className={`text-sm ${isDisabled ? 'text-gray-400' : 'text-slate-500'}`}>
              {isDisabled ? 'File upload disabled' : 'Click to upload or drag and drop'}
            </p>
          </div>
        )}
        
        {field.type === 'user' && (
          <Select disabled={true}>
            <SelectTrigger className={`${isDisabled ? 'bg-gray-100 opacity-60' : 'bg-slate-50'}`}>
              <SelectValue placeholder="Select user..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user1">John Doe</SelectItem>
              <SelectItem value="user2">Jane Smith</SelectItem>
              <SelectItem value="user3">Mike Johnson</SelectItem>
            </SelectContent>
          </Select>
        )}
        
        {field.type === 'location' && (
          <div className={`flex items-center space-x-2 p-3 border border-slate-300 rounded-md ${isDisabled ? 'bg-gray-100 opacity-60' : 'bg-slate-50'}`}>
            <MapPin className={`w-4 h-4 ${isDisabled ? 'text-gray-400' : 'text-slate-400'}`} />
            <span className={`text-sm ${isDisabled ? 'text-gray-400' : 'text-slate-500'}`}>Click to select location</span>
          </div>
        )}
      </div>
    );
  };

  // Modal handling functions
  const openApprovalLevelModal = (level?: ApprovalLevel) => {
    if (level) {
      setEditingApprovalLevel(level);
    } else {
      setEditingApprovalLevel(null);
    }
    setIsApprovalModalOpen(true);
  };

  const closeApprovalLevelModal = () => {
    setIsApprovalModalOpen(false);
    setEditingApprovalLevel(null);
  };

  const saveApprovalLevel = () => {
    // This will be handled by the modal component
  };

  const deleteApprovalLevel = (levelToDelete: string) => {
    setApprovalLevels(prev => prev.filter(level => level.id !== levelToDelete));
  };

  return (
    <>
      <SessionWrapper>
        <style jsx global>{`
          /* Rich Text Editor Styling - Aligned with Project Theme */
        .rich-text-editor .ql-editor {
          min-height: 120px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          font-size: 14px;
          line-height: 1.6;
          color: #334155;
          padding: 12px 16px;
          border: none;
        }
        
        .rich-text-editor .ql-toolbar {
          border: 1px solid #e2e8f0;
          border-bottom: none;
          border-radius: 8px 8px 0 0;
          background: #ffffff;
          padding: 8px 12px;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }
        
        .rich-text-editor .ql-container {
          border: 1px solid #e2e8f0;
          border-top: none;
          border-radius: 0 0 8px 8px;
          font-family: inherit;
          background: #ffffff;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }
        
        /* Toolbar Button Styling */
        .rich-text-editor .ql-toolbar button {
          padding: 6px 8px;
          border-radius: 6px;
          margin: 0 2px;
          border: none;
          background: transparent;
          transition: all 0.2s ease;
        }
        
        .rich-text-editor .ql-toolbar button:hover {
          background-color: #f1f5f9;
          transform: translateY(-1px);
        }
        
        .rich-text-editor .ql-toolbar button.ql-active {
          background-color: #e0f2fe;
          color: #0369a1;
        }
        
        /* Icon Styling */
        .rich-text-editor .ql-toolbar .ql-stroke {
          stroke: #64748b;
          transition: stroke 0.2s ease;
        }
        
        .rich-text-editor .ql-toolbar .ql-fill {
          fill: #64748b;
          transition: fill 0.2s ease;
        }
        
        .rich-text-editor .ql-toolbar button:hover .ql-stroke {
          stroke: #3b82f6;
        }
        
        .rich-text-editor .ql-toolbar button:hover .ql-fill {
          fill: #3b82f6;
        }
        
        .rich-text-editor .ql-toolbar button.ql-active .ql-stroke {
          stroke: #1d4ed8;
        }
        
        .rich-text-editor .ql-toolbar button.ql-active .ql-fill {
          fill: #1d4ed8;
        }
        
        /* Placeholder Styling */
        .rich-text-editor .ql-editor.ql-blank::before {
          color: #94a3b8;
          font-style: normal;
          left: 16px;
          right: 16px;
          font-family: inherit;
          font-size: 14px;
          line-height: 1.6;
        }
        
        /* Disabled State */
        .rich-text-editor.disabled .ql-toolbar {
          background-color: #f8fafc;
          border-color: #e2e8f0;
          opacity: 0.7;
          pointer-events: none;
        }
        
        .rich-text-editor.disabled .ql-container {
          background-color: #f8fafc;
          border-color: #e2e8f0;
        }
        
        .rich-text-editor.disabled .ql-editor {
          background-color: #f8fafc;
          color: #64748b;
          cursor: not-allowed;
        }
        
        .rich-text-editor.disabled .ql-editor.ql-blank::before {
          color: #94a3b8;
        }
        
        /* Focus State */
        .rich-text-editor:focus-within .ql-toolbar {
          border-color: #3b82f6;
          box-shadow: 0 0 0 1px #3b82f6;
        }
        
        .rich-text-editor:focus-within .ql-container {
          border-color: #3b82f6;
          box-shadow: 0 0 0 1px #3b82f6;
        }
        
        /* Dropdown Styling */
        .rich-text-editor .ql-picker {
          color: #64748b;
        }
        
        .rich-text-editor .ql-picker-options {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          padding: 4px;
        }
        
        .rich-text-editor .ql-picker-item {
          padding: 6px 12px;
          border-radius: 4px;
          margin: 2px 0;
        }
        
        .rich-text-editor .ql-picker-item:hover {
          background-color: #f1f5f9;
          color: #3b82f6;
        }
        
        /* Content Styling */
        .rich-text-editor .ql-editor h1 {
          font-size: 1.875rem;
          font-weight: 700;
          color: #1e293b;
          margin: 1rem 0 0.5rem 0;
        }
        
        .rich-text-editor .ql-editor h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0.875rem 0 0.5rem 0;
        }
        
        .rich-text-editor .ql-editor h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0.75rem 0 0.5rem 0;
        }
        
        .rich-text-editor .ql-editor ul, .rich-text-editor .ql-editor ol {
          padding-left: 1.5rem;
        }
        
        .rich-text-editor .ql-editor li {
          margin: 0.25rem 0;
        }
        
        .rich-text-editor .ql-editor blockquote {
          border-left: 4px solid #3b82f6;
          padding-left: 1rem;
          margin: 1rem 0;
          color: #64748b;
          background-color: #f8fafc;
          padding: 0.75rem 1rem;
          border-radius: 0 6px 6px 0;
        }
        
        .rich-text-editor .ql-editor a {
          color: #3b82f6;
          text-decoration: underline;
        }
        
        .rich-text-editor .ql-editor a:hover {
          color: #1d4ed8;
        }
        
        /* Scrollbar Styling */
        .rich-text-editor .ql-editor::-webkit-scrollbar {
          width: 6px;
        }
        
        .rich-text-editor .ql-editor::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }
        
        .rich-text-editor .ql-editor::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        
        .rich-text-editor .ql-editor::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        
        /* Remove default borders */
        .rich-text-editor .ql-container.ql-snow,
        .rich-text-editor .ql-toolbar.ql-snow {
          border: none;
        }
        
        /* Separator styling */
        .rich-text-editor .ql-toolbar .ql-separator {
          width: 1px;
          height: 20px;
          background-color: #e2e8f0;
          margin: 0 8px;
        }
        
        /* Preview Editor Specific Styling */
        .rich-text-editor.preview-editor {
          transition: all 0.2s ease;
        }
        
        .rich-text-editor.preview-editor:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        
        .rich-text-editor.preview-editor .ql-container {
          min-height: 120px;
        }
        
        /* Config Preview Specific Styling */
        .rich-text-editor.config-preview {
          transform: scale(0.95);
          transition: transform 0.2s ease;
        }
        
        .rich-text-editor.config-preview:hover {
          transform: scale(1);
        }
        
        .rich-text-editor.config-preview .ql-toolbar {
          padding: 6px 8px;
        }
        
        .rich-text-editor.config-preview .ql-editor {
          min-height: 80px;
          font-size: 13px;
        }
      `}</style>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl border-b border-purple-200/60 sticky top-0 z-40">
          <div className="w-full px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={() => router.push('/admin/catalog-management?tab=incident')}
                  className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Incident Template Builder</h1>
                  <p className="text-xs text-gray-600">Design incident request forms</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex bg-slate-100 rounded-lg p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentView('technician')}
                    className={`px-4 ${currentView === 'technician' ? 'bg-slate-600 text-white hover:bg-slate-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
                  >
                    Technician View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentView('user')}
                    className={`px-4 ${currentView === 'user' ? 'bg-slate-600 text-white hover:bg-slate-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
                  >
                    Requester View
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Save current template state to localStorage for preview
                    const templateData = {
                      name: templateName,
                      description: templateDescription,
                      fields: formFields,
                      approvalEnabled: isApprovalEnabled,
                      approvalLevels: approvalLevels,
                      approvalConfig: approvalConfig,
                      selectedTemplate: selectedTemplate
                    };
                    localStorage.setItem('previewTemplate', JSON.stringify(templateData));
                    router.push('/admin/incident-template/template/preview');
                  }}
                  className="text-slate-600 hover:text-slate-900"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
                
                <Button
                  onClick={() => {
                    const templateData = {
                      id: Date.now().toString(),
                      name: templateName,
                      description: templateDescription,
                      fields: formFields,
                      approvalEnabled: isApprovalEnabled,
                      approvalLevels: approvalLevels,
                      approvalConfig: approvalConfig,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString()
                    };
                    
                    // Save to localStorage
                    const existingTemplates = JSON.parse(localStorage.getItem('incidentTemplates') || '[]');
                    existingTemplates.push(templateData);
                    localStorage.setItem('incidentTemplates', JSON.stringify(existingTemplates));
                    
                    alert('Template saved successfully!');
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Template
                </Button>
                
                
              </div>
            </div>
          </div>
        </div>

        {/* Template Selection */}
        <div className="w-full px-6 py-4">
          <Card className="bg-white/90 backdrop-blur-sm shadow-sm border border-purple-200/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-slate-700">Template Selection</CardTitle>
              <p className="text-sm text-gray-600">Choose a pre-built template or start from scratch</p>
            </CardHeader>
            
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <Select
                    value={selectedTemplate}
                    onValueChange={loadTemplate}
                  >
                    <SelectTrigger className="w-70">
                      <SelectValue placeholder="Copy Existing Template" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TEMPLATE_PRESETS).map(([key, template]) => (
                        <SelectItem key={key} value={key}>
                          {template.name} - {template.category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={createNewTemplate}
                    className="whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Start Fresh
                  </Button>
                  
                  {/* {selectedTemplate && (
                    <Badge variant="secondary">
                      Editing: {TEMPLATE_PRESETS[selectedTemplate]?.category}
                    </Badge>
                  )} */}
                </div>
              </div>
              
              {/* Template Preview Info dont remove this please */}
              {/* {selectedTemplate && (
                <div className="mt-4 pt-4 border-t border-purple-200/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 mb-2">Template Details</h4>
                      <div className="space-y-1 text-xs">
                        <p><span className="font-medium">Name:</span> {TEMPLATE_PRESETS[selectedTemplate]?.name}</p>
                        <p><span className="font-medium">Category:</span> {TEMPLATE_PRESETS[selectedTemplate]?.category}</p>
                        <p><span className="font-medium">Fields:</span> {TEMPLATE_PRESETS[selectedTemplate]?.fields?.length} configured</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Included Fields</h4>
                      <div className="flex flex-wrap gap-1">
                        {TEMPLATE_PRESETS[selectedTemplate]?.fields?.slice(0, 6).map((field, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {field.label}
                          </Badge>
                        ))}
                        {TEMPLATE_PRESETS[selectedTemplate]?.fields && TEMPLATE_PRESETS[selectedTemplate].fields.length > 6 && (
                          <Badge variant="outline" className="text-xs">
                            +{TEMPLATE_PRESETS[selectedTemplate].fields.length - 6} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )} */}
            </CardContent>
          </Card>
        </div>

        <div className="w-full px-6">
          <div className="grid grid-cols-12 gap-6 h-100">
            {/* Left Column Group - Field Types, Configuration, Builder & Approval Workflow */}
            <div className="col-span-8 space-y-6">
              {/* Top Row - Field Types, Configuration, Form Builder */}
              <div className="grid grid-cols-12 gap-6">
                {/* Field Types */}
                <div className="col-span-3">
              <Card className="bg-white/90 backdrop-blur-sm shadow-sm border border-slate-200/60 h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-semibold text-slate-700">Field Types</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 overflow-y-auto">
                  {fieldTypes.map((fieldType) => {
                    const IconComponent = fieldType.icon;
                    return (
                      <div
                        key={fieldType.id}
                        className="p-2 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all duration-200 group"
                        onClick={() => addField(fieldType.id)}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded ${fieldType.color} flex items-center justify-center`}>
                            <IconComponent className="w-3 h-3" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-700 group-hover:text-blue-600 transition-colors">
                              {fieldType.name}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>                </div>

                {/* Field Configuration */}
                <div className="col-span-3">
              <Card className={`bg-white/90 backdrop-blur-sm shadow-sm border border-slate-200/60 h-full transition-all duration-300 ${
                isConfigPanelOpen ? 'opacity-100' : 'opacity-50'
              }`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-slate-700">
                      Field Configuration
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsConfigPanelOpen(!isConfigPanelOpen)}
                    >
                      {isConfigPanelOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardHeader>
                
                {isConfigPanelOpen && selectedFieldData ? (
                  <CardContent className="space-y-4 overflow-y-auto">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Field Label</label>
                      <Input
                        value={selectedFieldData.label}
                        onChange={(e) => updateField(selectedFieldData.id, { label: e.target.value })}
                        placeholder="Enter field label"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Placeholder Text
                        {selectedFieldData.type === 'textarea' && (
                          <span className="text-xs text-slate-500 ml-1">(shown when editor is empty)</span>
                        )}
                      </label>
                      <Input
                        value={selectedFieldData.placeholder || ''}
                        onChange={(e) => updateField(selectedFieldData.id, { placeholder: e.target.value })}
                        placeholder={selectedFieldData.type === 'textarea' ? 
                          "Enter what users should type here..." : 
                          "Enter placeholder text"
                        }
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Help Text</label>
                      <Input
                        value={selectedFieldData.helpText || ''}
                        onChange={(e) => updateField(selectedFieldData.id, { helpText: e.target.value })}
                        placeholder="Enter help text"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">Required Field</label>
                      <input
                        type="checkbox"
                        checked={selectedFieldData.required}
                        onChange={(e) => updateField(selectedFieldData.id, { required: e.target.checked })}
                        className="rounded border-slate-300"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">Technician Only</label>
                      <input
                        type="checkbox"
                        checked={selectedFieldData.technicianOnly}
                        onChange={(e) => updateField(selectedFieldData.id, { technicianOnly: e.target.checked })}
                        className="rounded border-slate-300"
                      />
                    </div>

                    {(selectedFieldData.type === 'select' || selectedFieldData.type === 'multiselect') && (
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">Options</label>
                        <div className="space-y-2">
                          {selectedFieldData.options?.map((option, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Input
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...(selectedFieldData.options || [])];
                                  newOptions[index] = e.target.value;
                                  updateField(selectedFieldData.id, { options: newOptions });
                                }}
                                onBlur={(e) => {
                                  // Remove empty options on blur
                                  if (!e.target.value.trim()) {
                                    const newOptions = selectedFieldData.options?.filter((_, i) => i !== index);
                                    updateField(selectedFieldData.id, { options: newOptions });
                                  }
                                }}
                                className="flex-1"
                                placeholder="Enter option text"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newOptions = selectedFieldData.options?.filter((_, i) => i !== index);
                                  updateField(selectedFieldData.id, { options: newOptions });
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newOptions = [...(selectedFieldData.options || []), 'New Option'];
                              updateField(selectedFieldData.id, { options: newOptions });
                            }}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Option
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                ) : (
                  <CardContent className="space-y-4 overflow-y-auto">
                    <div className="text-center py-8 text-slate-500">
                      <Settings className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-xs">Select a field to configure its properties</p>
                    </div>
                  </CardContent>
                )}
              </Card>                </div>

                {/* Form Builder */}
                <div className="col-span-6">
              <Card className="bg-white/90 backdrop-blur-sm shadow-sm border border-slate-200/60 h-full">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold text-slate-700">
                        Form Builder
                      </CardTitle>
                      <Badge className={`mt-1 ${currentView === 'user' ? 'bg-blue-500 text-white' : 'bg-slate-600 text-white'}`}>
                        {currentView === 'user' ? 'Requester View' : 'Technician View'}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsConfigPanelOpen(!isConfigPanelOpen)}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="overflow-y-auto">
                  {/* Template Info */}
                  <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                    <Input
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="text-lg font-semibold mb-2 bg-transparent border-none p-0 focus:bg-white"
                      placeholder="Template Name"
                    />
                    <Input
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      className="text-sm bg-transparent border-none p-0 focus:bg-white"
                      placeholder="Template description..."
                    />
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-3">
                    {getVisibleFields().map((field, index) => {
                      const fieldTypeInfo = fieldTypes.find(ft => ft.id === field.type);
                      const IconComponent = fieldTypeInfo?.icon || Type;
                      
                      return (
                        <div
                          key={field.id}
                          className={`p-3 rounded-lg border transition-all duration-200 ${
                            selectedField === field.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                          onClick={() => {
                            setSelectedField(field.id);
                            setIsConfigPanelOpen(true);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveField(field.id, 'up');
                                }}
                                disabled={index === 0}
                                className="h-5 w-5 p-0 text-slate-400 hover:text-slate-600"
                              >
                                <ArrowUp className="w-2 h-2" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveField(field.id, 'down');
                                }}
                                disabled={index === getVisibleFields().length - 1}
                                className="h-5 w-5 p-0 text-slate-400 hover:text-slate-600"
                              >
                                <ArrowDown className="w-2 h-2" />
                              </Button>
                            </div>
                            
                            <div className={`w-5 h-5 rounded ${fieldTypeInfo?.color} flex items-center justify-center`}>
                              <IconComponent className="w-2 h-2" />
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-700">{field.label}</span>
                                {field.required && <span className="text-red-500">*</span>}
                                {field.technicianOnly && (
                                  <Badge variant="secondary" className="text-xs">Tech Only</Badge>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteField(field.id);
                                }}
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {getVisibleFields().length === 0 && (
                    <div className="text-center py-16 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium mb-2">No fields yet</p>
                      <p>Start building your service template by adding fields from the left panel.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
              </div>

              {/* Approval Workflow Section - Below the top row */}
              <div className="col-span-12">
                <Card className="bg-white/90 backdrop-blur-sm shadow-sm border border-slate-200/60">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                          <Settings className="w-5 h-5" />
                          Approval Workflow
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          Configure approval levels for this service template
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="approval-enabled" className="text-sm font-medium">
                          Enable Approval
                        </Label>
                        <Checkbox
                          id="approval-enabled"
                          checked={isApprovalEnabled}
                          onCheckedChange={(checked) => setIsApprovalEnabled(checked as boolean)}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="max-h-[400px] overflow-y-auto">
                      {isApprovalEnabled ? (
                        <div className="space-y-6">
                          {/* Approval Configuration */}
                          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                            <div className="space-y-4">
                              <div>
                               
                                <RadioGroup
                                  value={approvalConfig.approvalMethod}
                                  onValueChange={(value: 'all' | 'first') => 
                                    setApprovalConfig(prev => ({ ...prev, approvalMethod: value }))
                                  }
                                  className="space-y-3"
                                >
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="all" id="all-must-approve" />
                                    <Label htmlFor="all-must-approve" className="text-sm">
                                      All approvers must approve
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="first" id="first-approval-action" />
                                    <Label htmlFor="first-approval-action" className="text-sm">
                                      Apply first approval action
                                    </Label>
                                  </div>
                                </RadioGroup>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="send-notification"
                                  checked={approvalConfig.sendApprovalNotification}
                                  onCheckedChange={(checked) => 
                                    setApprovalConfig(prev => ({ ...prev, sendApprovalNotification: checked as boolean }))
                                  }
                                />
                                <Label htmlFor="send-notification" className="text-sm">
                                  Send approval notifications
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="assign-after-approval"
                                  checked={approvalConfig.assignTechnicianAfterApproval}
                                  onCheckedChange={(checked) => 
                                    setApprovalConfig(prev => ({ ...prev, assignTechnicianAfterApproval: checked as boolean }))
                                  }
                                />
                                <Label htmlFor="assign-after-approval" className="text-sm">
                                  Auto-assign technician after approval
                                </Label>
                              </div>
                            </div>
                          </div>

                          {/* Approval Levels */}
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-base font-semibold text-slate-700">Approval Levels</h4>
                              <Button
                                onClick={() => {
                                  setEditingApprovalLevel(null);
                                  setIsApprovalModalOpen(true);
                                }}
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Level
                              </Button>
                            </div>

                            {approvalLevels.length > 0 ? (
                              <div className="space-y-3">
                                {approvalLevels
                                  .sort((a, b) => a.order - b.order)
                                  .map((level, index) => (
                                    <div
                                      key={level.id}
                                      className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-white"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-medium text-sm">
                                          {index + 1}
                                        </div>
                                        <div>
                                          <div className="font-medium text-slate-700">{level.displayName}</div>
                                          <div className="text-sm text-gray-600">
                                            {level.approvers.length} approver{level.approvers.length !== 1 ? 's' : ''}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setEditingApprovalLevel(level);
                                            setIsApprovalModalOpen(true);
                                          }}
                                        >
                                          <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setApprovalLevels(prev => prev.filter(l => l.id !== level.id));
                                          }}
                                          className="text-red-600 hover:text-red-700"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                                <Settings className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p className="font-medium mb-1">No approval levels configured</p>
                                <p className="text-sm">Add approval levels to require approval before processing requests</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          <Settings className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg font-medium mb-2">Approval Workflow Disabled</p>
                          <p>Enable approval workflow to configure approval levels and settings</p>
                        </div>
                      )}
                    </CardContent>
                </Card>
              </div>

              {/* Template Configuration - Incident Template Info & Support Groups */}
              <div className="col-span-12">
                <Card className="bg-white/90 backdrop-blur-sm shadow-sm border border-slate-200/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Template Configuration
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Incident template configuration and assignment settings
                    </p>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    {/* Incident Template SLA Information */}
                    <Card className="bg-blue-50 border-blue-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          SLA Assignment for Incident Templates
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-blue-600 space-y-2">
                          <p>For incident templates, SLA is automatically determined by the <strong>Priority</strong> field.</p>
                          <p>Configure priority-based SLA mappings in the SLA management settings to automatically assign SLAs based on incident priority levels (Low, Medium, High, Critical).</p>
                          <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                            <p className="text-xs text-blue-700">
                              <strong>How it works:</strong> When an incident is created with a specific priority, 
                              the system automatically assigns the corresponding SLA incident configuration based on the priority-to-SLA mappings you've configured.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Support Group Assignment Section */}
                    <div>
                      <TemplateSupportGroupAssignment
                        assignments={supportGroupAssignments}
                        onAssignmentsChange={setSupportGroupAssignments}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Live Preview - Fixed Position */}
            <div className="col-span-4">
              <Card className="bg-white/80 backdrop-blur-sm shadow-lg border border-white/20 h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-semibold text-slate-700">
                    Live Preview
                  </CardTitle>
                  <Badge variant="outline" className="mt-1">
                    {currentView === 'user' ? 'Requester Form' : 'Technician Form'}
                  </Badge>
                </CardHeader>
                
                <CardContent className="overflow-y-auto">
                  <div className="space-y-6 max-w-2xl">
                    {/* Template Header */}
                    <div className="border-b border-slate-200 pb-6">
                      <h2 className="text-2xl font-semibold text-slate-700">{templateName}</h2>
                      {templateDescription && (
                        <p className="text-base text-slate-600 mt-2">{templateDescription}</p>
                      )}
                    </div>
                    
                    {/* Form Fields Preview */}
                    {getVisibleFields().length > 0 ? (
                      <div className="space-y-6">
                        {getVisibleFields().map((field) => renderFormField(field))}
                        
                        {/* Submit Button */}
                        <div className="pt-6 border-t border-slate-200">
                          <Button className="w-full bg-blue-600 hover:bg-blue-700 py-3 text-base" disabled>
                            Submit Incident Report
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-24 text-slate-500">
                        <Eye className="w-16 h-16 mx-auto mb-6 text-slate-300" />
                        <p className="text-xl font-medium mb-3">Form Preview</p>
                        <p className="text-base">Add fields to see the live preview</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            </div>
          </div>

      {/* Approval Level Modal */}
      {isApprovalModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-700">
                {editingApprovalLevel ? 'Edit Approval Level' : 'Add Approval Level'}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleApprovalModalClose}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <ApprovalLevelModal
              level={editingApprovalLevel}
              onSave={handleApprovalLevelSave}
              onClose={handleApprovalModalClose}
            />
          </div>
        </div>
      )}
      </div>
    </SessionWrapper>
    </>
  );
}

// Approval Level Modal Component
interface ApprovalLevelModalProps {
  level: ApprovalLevel | null;
  onSave: (levelData: { displayName: string; approvers: string[] }) => void;
  onClose: () => void;
}

const ApprovalLevelModal: React.FC<ApprovalLevelModalProps> = ({ level, onSave, onClose }) => {
  const [displayName, setDisplayName] = useState(level?.displayName || '');
  const [approvers, setApprovers] = useState<string[]>(level?.approvers || []);
  const [newApprover, setNewApprover] = useState('');

  const handleAddApprover = () => {
    if (newApprover.trim() && !approvers.includes(newApprover.trim())) {
      setApprovers([...approvers, newApprover.trim()]);
      setNewApprover('');
    }
  };

  const handleRemoveApprover = (approverToRemove: string) => {
    setApprovers(approvers.filter(approver => approver !== approverToRemove));
  };

  const handleSave = () => {
    if (displayName.trim()) {
      onSave({
        displayName: displayName.trim(),
        approvers
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="level-name" className="text-sm font-medium text-slate-700">
          Level Name
        </Label>
        <Input
          id="level-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g., Manager Approval, HR Review"
          className="mt-1"
        />
      </div>

      <div>
        <Label className="text-sm font-medium text-slate-700 mb-2 block">
          Approvers
        </Label>
        
        <div className="flex gap-2">
          <Input
            value={newApprover}
            onChange={(e) => setNewApprover(e.target.value)}
            placeholder="Enter approver name or email"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddApprover();
              }
            }}
            className="flex-1"
          />
          <Button
            type="button"
            onClick={handleAddApprover}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Approvers List */}
        {approvers.length > 0 && (
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {approvers.map((approver, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-slate-50 rounded border"
              >
                <span className="text-sm text-slate-700">{approver}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveApprover(approver)}
                  className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {approvers.length === 0 && (
          <div className="text-center py-4 text-slate-500 border-2 border-dashed border-slate-200 rounded">
            <p className="text-sm">No approvers added yet</p>
          </div>
        )}
      </div>

      {/* Modal Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          variant="outline"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!displayName.trim()}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {level ? 'Update Level' : 'Add Level'}
        </Button>
      </div>
    </div>
  );
};
