"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Save, Eye, Settings, Plus, Trash2, Edit3, Edit,
  Type, Hash, Calendar, Clock, FileText, CheckSquare, 
  List, Upload, Users, Mail, Phone, MapPin, Star,
  ChevronDown, ChevronRight, ChevronUp, ArrowUp, ArrowDown, X, AlertCircle, Check, User
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
import { Switch } from '@/components/ui/switch';
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
  // Default/System Fields (ordered as they appear in default fields - 13 total)
  { id: 'name_text', name: 'Name/Text Input', icon: Type, description: 'Single line text input', color: 'bg-blue-100 text-blue-600', actualType: 'text' },
  { id: 'priority', name: 'Priority', icon: Star, description: 'Priority selector', color: 'bg-amber-100 text-amber-600', actualType: 'priority' },
  { id: 'mode_select', name: 'Mode/Dropdown', icon: List, description: 'Single selection dropdown', color: 'bg-purple-100 text-purple-600', actualType: 'mode' },
  { id: 'request_type', name: 'Request Type', icon: List, description: 'Request type (Service/Incident)', color: 'bg-purple-100 text-purple-600', actualType: 'request_type' },
  { id: 'status', name: 'Request Status', icon: CheckSquare, description: 'Request status selector', color: 'bg-yellow-100 text-yellow-600', actualType: 'status' },
  { id: 'category', name: 'Category', icon: List, description: 'Incident category selector', color: 'bg-indigo-100 text-indigo-600', actualType: 'category' },
  { id: 'group', name: 'Support Group', icon: Users, description: 'Support group selector', color: 'bg-blue-100 text-blue-600', actualType: 'group' },
  { id: 'technician', name: 'Technician', icon: Users, description: 'Technician selector', color: 'bg-green-100 text-green-600', actualType: 'technician' },
  { id: 'subject_text', name: 'Subject', icon: Type, description: 'Subject/title text input', color: 'bg-blue-100 text-blue-600', actualType: 'text' },
  { id: 'description_richtext', name: 'Description', icon: FileText, description: 'Rich text editor with formatting toolbar', color: 'bg-green-100 text-green-600', actualType: 'richtext' },
  { id: 'email_notify', name: 'E-mail Id(s) To Notify', icon: Mail, description: 'Email notification addresses', color: 'bg-cyan-100 text-cyan-600', actualType: 'email-list' },
  { id: 'resolution_richtext', name: 'Resolution', icon: FileText, description: 'Resolution text area', color: 'bg-green-100 text-green-600', actualType: 'richtext' },
  { id: 'approvers_select', name: 'Select Approvers', icon: Users, description: 'Approver selection dropdown', color: 'bg-purple-100 text-purple-600', actualType: 'input-list' },
  
  // Standard Fields
  { id: 'text', name: 'Text Input', icon: Type, description: 'Single line text input', color: 'bg-blue-100 text-blue-600' },
  { id: 'textarea', name: 'Text Area', icon: FileText, description: 'Multi-line text input', color: 'bg-green-100 text-green-600' },
  { id: 'richtext', name: 'Rich Text', icon: FileText, description: 'Rich text editor with formatting toolbar', color: 'bg-green-100 text-green-600' },
  { id: 'select', name: 'Dropdown', icon: List, description: 'Single selection dropdown', color: 'bg-purple-100 text-purple-600' },
  { id: 'multiselect', name: 'Multi-Select', icon: CheckSquare, description: 'Multiple selection', color: 'bg-orange-100 text-orange-600' },
  { id: 'number', name: 'Number', icon: Hash, description: 'Numeric input', color: 'bg-red-100 text-red-600' },
  { id: 'date', name: 'Date Picker', icon: Calendar, description: 'Date selection', color: 'bg-yellow-100 text-yellow-600' },
  { id: 'time', name: 'Time Picker', icon: Clock, description: 'Time selection', color: 'bg-pink-100 text-pink-600' },
  { id: 'file', name: 'File Upload', icon: Upload, description: 'File attachment', color: 'bg-indigo-100 text-indigo-600' },
  { id: 'image', name: 'Image Upload', icon: Upload, description: 'Image attachment and display', color: 'bg-indigo-100 text-indigo-600' },
  { id: 'user', name: 'User Selector', icon: Users, description: 'Select users', color: 'bg-teal-100 text-teal-600' },
  { id: 'email', name: 'Email', icon: Mail, description: 'Email address input', color: 'bg-cyan-100 text-cyan-600' },
  { id: 'phone', name: 'Phone', icon: Phone, description: 'Phone number input', color: 'bg-lime-100 text-lime-600' },
  { id: 'location', name: 'Location', icon: MapPin, description: 'Location picker', color: 'bg-emerald-100 text-emerald-600' }
];

// Predefined options for special field types
const PRIORITY_OPTIONS = [
  'Low',
  'Medium', 
  'High',
  'Top'
];

// Priority help text mapping
const PRIORITY_HELP_TEXT: Record<string, string> = {
  'Low': 'Affects only you as an individual',
  'Medium': 'Affects the delivery of your services',
  'High': 'Affects the company\'s business',
  'Top': 'Utmost action needed as classified by Management'
};

const REQUEST_STATUS_OPTIONS = [
  'For Approval',
  'Cancelled',
  'Open',
  'On-Hold',
  'Resolved',
  'Closed'
];

// Mode options (predefined values for request submission mode)
const MODE_OPTIONS = [
  'Self-Service Portal',
  'Phone Call',
  'Chat',
  'Email'
];

const REQUEST_TYPE_OPTIONS = ['Service', 'Incident'];

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
  approvers: Array<{
    id: number;
    name: string;
    email: string;
  }>; // User objects for template definition
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
  'general-incident': {
    name: 'Default',
    description: 'Standard incident request template with common fields',
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
        options: ['Incident'],
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
        helpText: 'Select the appropriate incident category',
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
        placeholder: 'Brief description of the incident',
        helpText: 'Enter a clear, concise subject line',
        technicianOnly: false
      },
      {
        id: '9',
        type: 'richtext',
        label: 'Description',
        required: true,
        placeholder: 'Provide detailed description of the incident...',
        helpText: 'Detailed description of the incident including any specific requirements',
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
  
  // Data States for dropdowns and selections
  const [users, setUsers] = useState<{ id: number; name: string; email?: string; isSpecial?: boolean; isServiceApprover?: boolean }[]>([]);
  const [supportGroups, setSupportGroups] = useState<{ id: number; name: string }[]>([]);
  const [technicians, setTechnicians] = useState<{ id: number; name: string }[]>([]);
  const [serviceCategories, setServiceCategories] = useState<{ id: number; name: string }[]>([]);
  const [slaData, setSlaData] = useState<{ id: number; name: string; deliveryTime: number }[]>([]);
  
  // Template active status
  const [templateIsActive, setTemplateIsActive] = useState<boolean>(false);
  
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
        options: ['Incident'],
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
        helpText: 'Select the appropriate incident category',
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
        placeholder: 'Brief description of the incident request',
        helpText: 'Enter a clear, concise subject line',
        technicianOnly: false
      },
      {
        id: '9',
        type: 'richtext',
        label: 'Description',
        required: true,
        placeholder: 'Provide detailed description of the incident needed...',
        helpText: 'Detailed description of the incident request including any specific requirements',
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
    // Load template data from localStorage when coming from preview edit
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

    // Fetch data for dropdowns and selectors
    const fetchSupportGroups = async () => {
      try {
        const response = await fetch('/api/support-groups');
        if (response.ok) {
          const data = await response.json();
          setSupportGroups(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching support groups:', error);
      }
    };

    const fetchTechnicians = async () => {
      try {
        const response = await fetch('/api/technicians');
        if (response.ok) {
          const data = await response.json();
          setTechnicians(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching technicians:', error);
      }
    };

    const fetchServiceCategories = async () => {
      try {
        const response = await fetch('/api/service-categories');
        if (response.ok) {
          const data = await response.json();
          setServiceCategories(data.data || []);
        } else {
          // Fallback data if API fails
          const testCategories = [
            { id: 1, name: 'Hardware' },
            { id: 2, name: 'Email' },
            { id: 3, name: 'Software' },
            { id: 4, name: 'Network' }
          ];
          setServiceCategories(testCategories);
        }
      } catch (error) {
        console.error('Error fetching service categories:', error);
        // Fallback data if API fails
        const testCategories = [
          { id: 1, name: 'Hardware' },
          { id: 2, name: 'Email' },
          { id: 3, name: 'Software' },
          { id: 4, name: 'Network' }
        ];
        setServiceCategories(testCategories);
      }
    };

    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users?limit=100');
        if (response.ok) {
          const responseData = await response.json();
          
          // Check if response has success property and users array
          const usersArray = responseData.success ? responseData.users : responseData;
          console.log('Raw users from API:', usersArray.map((u: any) => ({ 
            name: `${u.emp_fname} ${u.emp_lname}`, 
            isServiceApprover: u.isServiceApprover 
          })));
          
          const formattedUsers = usersArray.map((user: any) => ({
            id: user.id,
            name: `${user.emp_fname} ${user.emp_lname}`.trim(),
            email: user.emp_email || '',
            isSpecial: user.isSpecial || false,
            isServiceApprover: user.isServiceApprover || false
          }));
          console.log('Formatted users with isServiceApprover:', formattedUsers.filter((u: any) => u.isServiceApprover));
          setUsers(formattedUsers);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    const fetchSLAData = async () => {
      try {
        const response = await fetch('/api/sla-service');
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.success && Array.isArray(data.data)) {
            const formattedSLAData = data.data.map((sla: any) => ({
              id: sla.id,
              name: sla.name,
              deliveryTime: (sla.resolutionDays || 0) * 24 + (sla.resolutionHours || 0) + (sla.resolutionMinutes || 0) / 60
            }));
            setSlaData(formattedSLAData);
          }
        }
      } catch (error) {
        console.error('Error fetching SLA data:', error);
      }
    };

    fetchSupportGroups();
    fetchTechnicians();
    fetchServiceCategories();
    fetchUsers();
    fetchSLAData();
  }, []);

  // Update form fields when support groups, technicians, service categories, and users are loaded
  useEffect(() => {
    if ((Array.isArray(supportGroups) && supportGroups.length > 0) || 
        (Array.isArray(technicians) && technicians.length > 0) || 
        (Array.isArray(serviceCategories) && serviceCategories.length > 0) || 
        (Array.isArray(users) && users.length > 0)) {
      setFormFields(prevFields => 
        Array.isArray(prevFields) ? prevFields.map(field => {
          if (field.type === 'group' && Array.isArray(supportGroups) && supportGroups.length > 0) {
            return { ...field, options: supportGroups.map(group => group.name) };
          }
          if (field.type === 'technician' && Array.isArray(technicians) && technicians.length > 0) {
            return { ...field, options: technicians.map(tech => tech.name) };
          }
          if (field.type === 'category' && Array.isArray(serviceCategories) && serviceCategories.length > 0) {
            return { ...field, options: serviceCategories.map(category => category.name) };
          }
          return field;
        }) : []
      );
    }
  }, [supportGroups, technicians, serviceCategories, users]);

  // Approval Level Modal Functions
  const handleApprovalLevelSave = (levelData: { 
    displayName: string; 
    approvers: Array<{
      id: number;
      name: string;
      email: string;
    }> 
  }) => {
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
  // Component to render the actual form field preview
  const renderFormField = (field: FormField) => {
    const isRequired = field.required;
    const isTechnicianDisabled = currentView === 'user' && field.technicianOnly;
    const isFieldReadonly = field.readonly || false;
    const isFieldDisabled = field.disabled || isTechnicianDisabled;
    const rawFieldValue = field.defaultValue || '';
    const fieldValue = Array.isArray(rawFieldValue) ? rawFieldValue.join(', ') : rawFieldValue;
    
    return (
      <div key={field.id} className="space-y-2">
        <Label className={`text-sm font-medium ${isFieldDisabled ? 'text-gray-400' : 'text-slate-700'}`}>
          {field.label}
          {isRequired && <span className={`ml-1 ${isFieldDisabled ? 'text-gray-400' : 'text-red-500'}`}>*</span>}
          <div className="inline-flex gap-1 ml-2">
            {field.technicianOnly && (
              <Badge variant="outline" className={`text-xs ${isFieldDisabled ? 'bg-gray-100 text-gray-400 border-gray-300' : 'bg-slate-200 text-slate-700'}`}>
                Technician Only
              </Badge>
            )}
            {isFieldReadonly && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                Read Only
              </Badge>
            )}
            {field.disabled && (
              <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                Disabled
              </Badge>
            )}
          </div>
        </Label>
        
        {field.helpText && (
          <div className={`text-xs ${isFieldDisabled ? 'text-gray-400' : 'text-slate-500'}`}>
            {field.type === 'priority' ? (
              <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed">{field.helpText}</pre>
            ) : (
              <p>{field.helpText}</p>
            )}
          </div>
        )}
        
        {field.type === 'text' && (
          <Input
            placeholder={field.placeholder}
            value={fieldValue}
            disabled={true}
            readOnly={isFieldReadonly}
            className={`${isFieldDisabled ? 'bg-gray-100 opacity-60' : isFieldReadonly ? 'bg-blue-50 border-blue-200' : 'bg-slate-50'}`}
          />
        )}
        
        {field.type === 'email' && (
          <Input
            type="email"
            placeholder={field.placeholder}
            value={fieldValue}
            disabled={true}
            readOnly={isFieldReadonly}
            className={`${isFieldDisabled ? 'bg-gray-100 opacity-60' : isFieldReadonly ? 'bg-blue-50 border-blue-200' : 'bg-slate-50'}`}
          />
        )}
        
        {field.type === 'phone' && (
          <Input
            type="tel"
            placeholder={field.placeholder}
            value={fieldValue}
            disabled={true}
            readOnly={isFieldReadonly}
            className={`${isFieldDisabled ? 'bg-gray-100 opacity-60' : isFieldReadonly ? 'bg-blue-50 border-blue-200' : 'bg-slate-50'}`}
          />
        )}
        
        {field.type === 'number' && (
          <Input
            type="number"
            placeholder={field.placeholder}
            value={fieldValue}
            disabled={true}
            readOnly={isFieldReadonly}
            className={`${isFieldDisabled ? 'bg-gray-100 opacity-60' : isFieldReadonly ? 'bg-blue-50 border-blue-200' : 'bg-slate-50'}`}
          />
        )}
        
        {field.type === 'textarea' && (
          <RichTextEditor
            key={`${field.id}-${field.placeholder}`}
            placeholder={field.placeholder}
            value={fieldValue}
            disabled={isFieldDisabled || isFieldReadonly}
            className={`min-h-[120px] preview-editor ${isFieldDisabled ? 'opacity-60' : isFieldReadonly ? 'readonly-editor' : ''}`}
          />
        )}
        
        {field.type === 'richtext' && (
          <RichTextEditor
            key={`${field.id}-${field.placeholder}`}
            placeholder={field.placeholder}
            value={fieldValue}
            disabled={isFieldDisabled || isFieldReadonly}
            className={`min-h-[120px] preview-editor ${isFieldDisabled ? 'opacity-60' : isFieldReadonly ? 'readonly-editor' : ''}`}
          />
        )}
        
        {(field.type === 'select' || field.type === 'priority' || field.type === 'status' || field.type === 'request_type' || field.type === 'mode' || field.type === 'group' || field.type === 'technician' || field.type === 'category') && (
          <div className={`p-3 border rounded-md text-sm relative ${isFieldDisabled ? 'bg-gray-100 border-gray-300 text-gray-400 opacity-60' : isFieldReadonly ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
            {(() => {
              // For all select fields, show the default value or first option if available
              if (fieldValue && typeof fieldValue === 'string' && field.options && field.options.includes(fieldValue)) {
                const displayValue = fieldValue;
                return <span>{displayValue}</span>;
              }
              
              // Show default value if it exists and is valid
              if (fieldValue) {
                return fieldValue;
              }
              
              // Show first option if available and no default value
              if (field.options && field.options.length > 0) {
                return <span className="text-slate-400">{field.options[0]}</span>;
              }
              
              // Fallback placeholder
              return <span className="text-slate-400">{field.placeholder || `Select ${field.label.toLowerCase()}`}</span>;
            })()}
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          </div>
        )}

        {field.type === 'multiselect' && (
          <div className={`p-3 border rounded-md text-sm min-h-[42px] ${isFieldDisabled ? 'bg-gray-100 border-gray-300 text-gray-400 opacity-60' : isFieldReadonly ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
            {field.options && field.options.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                  {field.options[0]}
                </span>
                {field.options.length > 1 && (
                  <span className="text-xs text-slate-400">
                    +{field.options.length - 1} more options available
                  </span>
                )}
              </div>
            ) : (
              <span className="text-slate-400">{field.placeholder || `Select multiple ${field.label.toLowerCase()}`}</span>
            )}
          </div>
        )}

        {field.type === 'date' && (
          <Input
            type="date"
            placeholder={field.placeholder}
            value={fieldValue}
            disabled={true}
            readOnly={isFieldReadonly}
            className={`${isFieldDisabled ? 'bg-gray-100 opacity-60' : isFieldReadonly ? 'bg-blue-50 border-blue-200' : 'bg-slate-50'}`}
          />
        )}

        {field.type === 'time' && (
          <Input
            type="time"
            placeholder={field.placeholder}
            value={fieldValue}
            disabled={true}
            readOnly={isFieldReadonly}
            className={`${isFieldDisabled ? 'bg-gray-100 opacity-60' : isFieldReadonly ? 'bg-blue-50 border-blue-200' : 'bg-slate-50'}`}
          />
        )}

        {field.type === 'datetime' && (
          <Input
            type="datetime-local"
            placeholder={field.placeholder}
            value={fieldValue}
            disabled={true}
            readOnly={isFieldReadonly}
            className={`${isFieldDisabled ? 'bg-gray-100 opacity-60' : isFieldReadonly ? 'bg-blue-50 border-blue-200' : 'bg-slate-50'}`}
          />
        )}

        {field.type === 'checkbox' && (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              disabled={true}
              checked={fieldValue === 'true' || fieldValue === true}
              readOnly={isFieldReadonly}
              className={`rounded ${isFieldDisabled ? 'opacity-60' : ''}`}
            />
            <span className={`text-sm ${isFieldDisabled ? 'text-gray-400' : 'text-slate-700'}`}>
              {field.placeholder || 'Checkbox option'}
            </span>
          </div>
        )}

        {field.type === 'radio' && (
          <div className="space-y-2">
            {field.options && field.options.length > 0 ? (
              field.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name={`${field.id}-radio`}
                    disabled={true}
                    checked={index === 0} // Show first option as selected
                    readOnly={isFieldReadonly}
                    className={`${isFieldDisabled ? 'opacity-60' : ''}`}
                  />
                  <span className={`text-sm ${isFieldDisabled ? 'text-gray-400' : 'text-slate-700'}`}>
                    {option}
                  </span>
                </div>
              ))
            ) : (
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  disabled={true}
                  className={`${isFieldDisabled ? 'opacity-60' : ''}`}
                />
                <span className={`text-sm ${isFieldDisabled ? 'text-gray-400' : 'text-slate-700'}`}>
                  Radio option
                </span>
              </div>
            )}
          </div>
        )}

        {field.type === 'file' && (
          <div className={`p-6 border-2 border-dashed rounded-md text-center ${isFieldDisabled ? 'border-gray-200 bg-gray-50 opacity-60' : isFieldReadonly ? 'border-blue-200 bg-blue-50' : 'border-slate-300 bg-slate-50'}`}>
            <Upload className={`w-8 h-8 mx-auto mb-2 ${isFieldDisabled ? 'text-gray-400' : 'text-slate-400'}`} />
            <p className={`text-sm ${isFieldDisabled ? 'text-gray-400' : 'text-slate-600'}`}>
              {field.placeholder || 'Click to upload files or drag and drop'}
            </p>
          </div>
        )}

        {field.type === 'image' && (
          <div className={`p-6 border-2 border-dashed rounded-md text-center ${isFieldDisabled ? 'border-gray-200 bg-gray-50 opacity-60' : isFieldReadonly ? 'border-blue-200 bg-blue-50' : 'border-slate-300 bg-slate-50'}`}>
            <ImageIcon className={`w-8 h-8 mx-auto mb-2 ${isFieldDisabled ? 'text-gray-400' : 'text-slate-400'}`} />
            <p className={`text-sm ${isFieldDisabled ? 'text-gray-400' : 'text-slate-600'}`}>
              {field.placeholder || 'Click to upload an image or drag and drop'}
            </p>
            <p className={`text-xs mt-1 ${isFieldDisabled ? 'text-gray-400' : 'text-slate-500'}`}>
              PNG, JPG, JPEG, GIF up to 10MB
            </p>
          </div>
        )}

        {field.type === 'url' && (
          <Input
            type="url"
            placeholder={field.placeholder || "https://example.com"}
            value={fieldValue}
            disabled={true}
            readOnly={isFieldReadonly}
            className={`${isFieldDisabled ? 'bg-gray-100 opacity-60' : isFieldReadonly ? 'bg-blue-50 border-blue-200' : 'bg-slate-50'}`}
          />
        )}
      </div>
    );
  };
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
                    router.push('/admin/catalog-management/incident/template/preview');
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
                  {/* Default/System Fields */}
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      Default Fields
                    </h4>
                    {fieldTypes.slice(0, 13).map((fieldType) => {
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
                  </div>
                  
                  {/* Separator */}
                  <div className="border-t border-slate-200 my-3"></div>
                  
                  {/* Standard Fields */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                      <Type className="w-3 h-3" />
                      Standard Fields
                    </h4>
                    {fieldTypes.slice(13).map((fieldType) => {
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
                  </div>
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
                      {selectedFieldData.type === 'priority' ? (
                        <Textarea
                          value={selectedFieldData.helpText || ''}
                          onChange={(e) => updateField(selectedFieldData.id, { helpText: e.target.value })}
                          placeholder="Enter help text for priority selection"
                          rows={4}
                          className="min-h-[100px]"
                        />
                      ) : (
                        <Input
                          value={selectedFieldData.helpText || ''}
                          onChange={(e) => updateField(selectedFieldData.id, { helpText: e.target.value })}
                          placeholder="Enter help text"
                        />
                      )}
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

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">Read Only</label>
                      <input
                        type="checkbox"
                        checked={selectedFieldData.readonly || false}
                        onChange={(e) => updateField(selectedFieldData.id, { readonly: e.target.checked })}
                        className="rounded border-slate-300"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">Disabled</label>
                      <input
                        type="checkbox"
                        checked={selectedFieldData.disabled || false}
                        onChange={(e) => updateField(selectedFieldData.id, { disabled: e.target.checked })}
                        className="rounded border-slate-300"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Default Value</label>
                      {selectedFieldData.type === 'request_type' ? (
                        <Input
                          value={selectedFieldData.defaultValue || 'Incident'}
                          disabled={true}
                          placeholder="Incident (locked for incident templates)"
                          className="bg-gray-100 text-gray-600"
                        />
                      ) : selectedFieldData.type === 'category' ? (
                        <Input
                          value={selectedFieldData.defaultValue || ''}
                          disabled={true}
                          placeholder="Category (auto-selected based on your selection)"
                          className="bg-gray-100 text-gray-600"
                        />
                      ) : (selectedFieldData.type === 'select' || selectedFieldData.type === 'priority' || 
                        selectedFieldData.type === 'status' || selectedFieldData.type === 'mode') && selectedFieldData.options && selectedFieldData.options.length > 0 ? (
                        <select
                          value={selectedFieldData.defaultValue || ''}
                          onChange={(e) => updateField(selectedFieldData.id, { defaultValue: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select default value</option>
                          {selectedFieldData.options.map((option, index) => (
                            <option 
                              key={index} 
                              value={option}
                            >
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          value={selectedFieldData.defaultValue || ''}
                          onChange={(e) => updateField(selectedFieldData.id, { defaultValue: e.target.value })}
                          placeholder="Enter default value"
                        />
                      )}
                    </div>

                    {(selectedFieldData.type === 'select' || selectedFieldData.type === 'multiselect' || 
                      selectedFieldData.type === 'priority' || selectedFieldData.type === 'status' || 
                      selectedFieldData.type === 'request_type' || selectedFieldData.type === 'mode' || selectedFieldData.type === 'group' || 
                      selectedFieldData.type === 'technician') && (
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">Options</label>
                        {(selectedFieldData.type === 'priority' || selectedFieldData.type === 'status' || 
                          selectedFieldData.type === 'request_type' || selectedFieldData.type === 'mode' || selectedFieldData.type === 'group' || 
                          selectedFieldData.type === 'technician') ? (
                          <div className="p-3 bg-slate-50 rounded-md text-sm text-slate-600">
                            <p className="font-medium mb-2">Predefined Options:</p>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {selectedFieldData.options?.map((option, index) => (
                                <div key={index} className="text-xs text-slate-500">{option}</div>
                              ))}
                            </div>
                            <p className="text-xs text-slate-500 mt-2 italic">
                              These options are system-defined and cannot be edited.
                            </p>
                          </div>
                        ) : (
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
                        )}
                      </div>
                    )}

                    {selectedFieldData.type === 'image' && (
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">Image Settings</label>
                        <div className="p-3 bg-slate-50 rounded-md text-sm text-slate-600">
                          <p className="font-medium mb-2">Accepted formats:</p>
                          <p className="text-xs">PNG, JPG, JPEG, GIF</p>
                          <p className="text-xs">Maximum size: 10MB</p>
                          <p className="text-xs mt-2 text-slate-500 italic">
                            Users will be able to upload and preview images in this field.
                          </p>
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

                  {/* Template Active/Inactive Toggle - Show for all templates */}
                  <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Template Status</label>
                        <p className="text-xs text-slate-500">
                          {templateIsActive ? 'Template will be active and visible to users when saved' : 'Template will be inactive and hidden from users when saved'}
                        </p>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-3">
                        <span className={`text-sm font-medium ${templateIsActive ? 'text-green-600' : 'text-slate-500'}`}>
                          {templateIsActive ? 'Active' : 'Inactive'}
                        </span>
                        <Switch
                          checked={templateIsActive}
                          onCheckedChange={setTemplateIsActive}
                          className="data-[state=checked]:bg-green-600"
                        />
                      </div>
                    </div>
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
                            Configure approval levels and workflow settings for this template
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

                    <CardContent className="max-h-[500px] overflow-y-auto">
                      {isApprovalEnabled ? (
                        <div className="space-y-6">
                          {/* Approval Configuration */}
                          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200/50">
                            <div className="space-y-4">
                              <div>
                                <Label className="text-sm font-medium text-slate-700 mb-3 block">
                                  Approval Method
                                </Label>
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
                              <Label className="text-sm font-medium text-slate-700 mb-3 block">
                                Approval Options
                              </Label>
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
                                      className="border border-slate-200 rounded-lg bg-white hover:shadow-sm transition-shadow duration-200"
                                    >
                                      <div className="flex items-center justify-between p-4">
                                        <div className="flex items-center gap-3">
                                          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-medium text-sm">
                                            {index + 1}
                                          </div>
                                          <div>
                                            <div className="font-medium text-slate-700">{level.displayName}</div>
                                            <div className="text-sm text-gray-500">
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
                                            className="text-slate-600 hover:text-slate-800"
                                          >
                                            <Edit className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              setApprovalLevels(prev => prev.filter(l => l.id !== level.id));
                                            }}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>

                                      {/* Approvers Display */}
                                      <div className="px-4 pb-3">
                                        {level.approvers.length > 0 ? (
                                          <div className="flex flex-wrap gap-2">
                                            {level.approvers.map((appr) => (
                                              <div
                                                key={appr.id}
                                                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700"
                                                title={appr.email}
                                              >
                                                <User className="w-4 h-4 text-slate-500" />
                                                <span className="text-sm font-medium">{appr.name}</span>
                                                {appr.email && (
                                                  <span className="text-xs text-slate-500 hidden sm:inline">({appr.email})</span>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="text-sm text-slate-500 italic">No approvers selected</div>
                                        )}
                                      </div>

                                      {/* Inline Approval Level Form for this specific level */}
                                      {isApprovalModalOpen && editingApprovalLevel?.id === level.id && (
                                        <div className="border-t border-slate-200 p-4 bg-blue-50">
                                          <ApprovalLevelModal
                                            level={editingApprovalLevel}
                                            onSave={handleApprovalLevelSave}
                                            onClose={closeApprovalLevelModal}
                                            users={users}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              // Only show empty state if modal is not open
                              !isApprovalModalOpen && (
                                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                                  <Settings className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                  <p className="font-medium mb-1">No approval levels configured</p>
                                  <p className="text-sm">Add approval levels to require approval before processing requests</p>
                                </div>
                              )
                            )}

                            {/* Inline Approval Level Form for adding new level - Show regardless of existing levels */}
                            {isApprovalModalOpen && !editingApprovalLevel && (
                              <div className="mt-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
                                <h5 className="font-medium text-blue-900 mb-3">Add New Approval Level</h5>
                                <ApprovalLevelModal
                                  level={editingApprovalLevel}
                                  onSave={handleApprovalLevelSave}
                                  onClose={closeApprovalLevelModal}
                                  users={users}
                                />
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

      </div>
    </SessionWrapper>
    </>
  );
}

// Approval Level Modal Component
interface ApprovalLevelModalProps {
  level: ApprovalLevel | null;
  onSave: (levelData: { 
    displayName: string; 
    approvers: Array<{
      id: number;
      name: string;
      email: string;
    }> 
  }) => void;
  onClose: () => void;
  users: Array<{ id: number; name: string; email?: string; isServiceApprover?: boolean }>; // Add users prop
}

const ApprovalLevelModal: React.FC<ApprovalLevelModalProps> = ({ level, onSave, onClose, users }) => {
  const [displayName, setDisplayName] = useState(level?.displayName || '');
  const [approvers, setApprovers] = useState<Array<{
    id: number;
    name: string;
    email: string;
  }>>(level?.approvers || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Special approvers for dynamic selection
  const specialApprovers = [
    {
      id: -1, // Use negative ID to distinguish from real users
      name: 'Reporting to',
      email: 'rt',
      isSpecial: true,
      description: 'The direct supervisor/manager of the user who submitted the request'
    },
    {
      id: -2, // Use negative ID to distinguish from real users
      name: 'Department Head',
      email: 'dh',
      isSpecial: true,
      description: 'The department head of the user who submitted the request'
    }
  ];

  // Filter users to only include Service Request Approvers and special approvers
  const filteredUsers = [
    // Add special approvers first if they match search and aren't already selected
    ...specialApprovers.filter(special => {
      const matchesSearch = searchTerm === '' || 
                           special.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           special.description.toLowerCase().includes(searchTerm.toLowerCase());
      const notAlreadySelected = !approvers.some(approver => approver.id === special.id);
      return matchesSearch && notAlreadySelected;
    }),
    // Then add regular users who are Service Request Approvers
    ...users.filter(user => {
      const matchesSearch = searchTerm === '' || 
                           user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()));
      const notAlreadySelected = !approvers.some(approver => approver.id === user.id);
      // Only include users marked as Service Request Approvers
      const isServiceRequestApprover = user.isServiceApprover === true;
      
      // Debug logging
      if (searchTerm === '') {
        console.log('User filtering debug:', {
          userName: user.name,
          isServiceApprover: user.isServiceApprover,
          matchesSearch,
          notAlreadySelected,
          isServiceRequestApprover
        });
      }
      
      return matchesSearch && notAlreadySelected && isServiceRequestApprover;
    }).map(user => ({ ...user, isSpecial: false, description: undefined })) // Ensure regular users have isSpecial and description properties
  ];

  // Debug logging for final filtered users
  if (searchTerm === '') {
    console.log('Total users passed to modal:', users.length);
    console.log('Filtered users count:', filteredUsers.length);
    console.log('Users with isServiceApprover=true:', users.filter(u => u.isServiceApprover === true).length);
  }

  const handleAddApprover = (user: { id: number; name: string; email?: string; isSpecial?: boolean; description?: string }) => {
    const newApprover = {
      id: user.id,
      name: user.name,
      email: user.email || ''
    };
    setApprovers([...approvers, newApprover]);
    setSearchTerm('');
    setIsDropdownOpen(false);
  };

  const handleRemoveApprover = (approverId: number) => {
    setApprovers(approvers.filter(approver => approver.id !== approverId));
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
        
        {/* Search Users */}
        <div className="relative mb-3">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between text-left font-normal"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <span className="text-muted-foreground">
              Add approvers...
            </span>
            <ChevronDown 
              className={`h-4 w-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
            />
          </Button>
          
          {/* Dropdown with user list */}
          {isDropdownOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-hidden">
              {/* Search Input inside dropdown */}
              <div className="p-2 border-b border-gray-100">
                <Input
                  type="text"
                  placeholder="Select Approvers"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8"
                  autoFocus
                />
              </div>
              
              {/* Scrollable list */}
              <div className="max-h-48 overflow-y-auto">
                {filteredUsers.length > 0 ? (
                  <>
                    {filteredUsers.map((user) => {
                      const isSelected = approvers.some(approver => approver.id === user.id);
                      return (
                        <div
                          key={user.id}
                          className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-b-0"
                          onClick={() => handleAddApprover(user)}
                        >
                          <div className="flex items-center mr-3">
                            {isSelected ? (
                              <Check className="h-4 w-4 text-blue-600" />
                            ) : (
                              <div className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className={`font-medium flex items-center gap-2 ${
                              user.isSpecial ? 'text-blue-900' : 'text-gray-900'
                            }`}>
                              {user.name}
                              {user.isSpecial && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                  Dynamic
                                </span>
                              )}
                            </div>
                            {user.isSpecial ? (
                              <div className="text-sm text-blue-600">
                                {user.description}
                              </div>
                            ) : user.email ? (
                              <div className="text-sm text-gray-500">
                                {user.email}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    {users.length === 0 ? 'No Service Request Approvers available in the system.' : 
                     searchTerm ? 'No Service Request Approvers found matching your search.' : 'Start typing to search for approvers...'}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Click outside to close dropdown */}
          {isDropdownOpen && (
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsDropdownOpen(false)}
            />
          )}
        </div>

        {/* Selected Approvers List */}
        {approvers.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {approvers.map((approver) => {
              const isSpecial = approver.id < 0; // Special approvers have negative IDs
              
              // Handle special approvers
              if (approver.email === 'rt') {
                return (
                  <div key={approver.id} className="inline-flex items-center bg-green-100 text-green-800 px-2 py-1 rounded-md text-sm">
                    <span>Reporting to</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveApprover(approver.id)}
                      className="ml-1 hover:bg-green-200 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              }
              
              if (approver.email === 'dh') {
                return (
                  <div key={approver.id} className="inline-flex items-center bg-purple-100 text-purple-800 px-2 py-1 rounded-md text-sm">
                    <span>Department Head</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveApprover(approver.id)}
                      className="ml-1 hover:bg-purple-200 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              }
              
              // Regular user approvers
              return (
                <div key={approver.id} className="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm">
                  <span>{approver.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveApprover(approver.id)}
                    className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {approvers.length === 0 && (
          <div className="text-center py-4 text-slate-500 border-2 border-dashed border-slate-200 rounded">
            <User className="h-8 w-8 mx-auto mb-2 text-slate-400" />
            <p className="text-sm">No approvers added yet</p>
            <p className="text-xs text-slate-400 mt-1">Search and select users to add as approvers</p>
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
