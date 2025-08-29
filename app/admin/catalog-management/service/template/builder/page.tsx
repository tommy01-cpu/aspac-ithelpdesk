"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Save, Eye, Settings, Plus, Trash2, Edit3, Edit,
  Type, Hash, Calendar, Clock, FileText, CheckSquare, 
  List, Upload, Users, Mail, Phone, MapPin, Star,
  ChevronDown, ChevronRight, ChevronUp, ArrowUp, ArrowDown, X, User, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { SessionWrapper } from '@/components/session-wrapper';

// Available service icons
const availableIcons = [
  'account-creation-in-ad.svg', 'account-deletion-in-ad.svg', 'additional-client-access-license.svg',
  'alias-for-mailing-list.svg', 'alias-removal.svg', 'application-login.svg', 'application.png',
  'battery.png', 'bluetooth.png', 'broadband.png', 'building-services.png', 'camera.png',
  'change-of-place.svg', 'comm-devices.png', 'communication.svg', 'contractwrkr.png',
  'corporate-website.png', 'data-managagement.svg', 'data-management.svg', 'datamgmt.png',
  'datarequest.png', 'delete-email-account.svg', 'department-change.svg', 'desktop.png',
  'drawing-pad.png', 'dvd-drive.png', 'DVD.png', 'electrical-services.png', 'email-server.png',
  'email.svg', 'emergency-service.png', 'emergency.png', 'employee-leaving.svg', 'ethernet.png',
  'event-support.png', 'exchange-server.png', 'file-download.svg', 'fIle-upload.svg',
  'fire-prevention.png', 'foodservices.png', 'furniture.png', 'furniture_new.png',
  'grounds-maintenance.png', 'hardware.svg', 'hazardous-waste-management.png', 'healthpolicy.png',
  'HVAC.png', 'incident-default.svg', 'increased-email-storage.svg', 'internet-access.svg',
  'internet.svg', 'intranet.png', 'keyboard.png', 'lan.png', 'laptop.png', 'leaverequest.png',
  'lock-and-locksmith.png', 'mail-client-software.svg', 'mail-services.png', 'mailing-list.svg',
  'member-addition-to-existing-mailing-list.svg', 'member-deletion-to-existing-mailing-list.svg',
  'mobile.png', 'monitor.png', 'mouse.png', 'network1.png', 'new-email-account.svg',
  'new-hire.svg', 'online-meeting-setup.svg', 'others.png', 'parking-and-transport.png',
  'password-reset-for-email.svg', 'payroll.png', 'pda.png', 'pendrive.png', 'popular-service.png',
  'printer2.png', 'projector.png', 'proxy-server.png', 'request-apple-device.svg',
  'request-blackeberry-device.svg', 'request-crm-account.svg', 'request-data-backup.svg',
  'request-data-restoration-from-backup.svg', 'request-desktop.svg', 'request-did-extension.svg',
  'request-laptop.svg', 'request-machine-cleanup.svg', 'request-mobile-for-support.svg',
  'request-mssql-account.svg', 'request-ram-upgrade.svg', 'request-telephone-extension.svg',
  'reset-password-in-ad.svg', 'router.png', 'security-services.png', 'security.png',
  'server.png', 'service-default.svg', 'simcard.png', 'software-installation.svg',
  'software-uninstallation.svg', 'software-upgrade.svg', 'software.svg', 'speakers.png',
  'switch.png', 'telephone.png', 'user-management-old.png', 'user-management.svg',
  'userbenefits.png', 'voice-message-cleanup.svg', 'voice-message-password-reset.svg',
  'vpn-account-creation.svg', 'wan.png', 'web-browser.png', 'wifi-access.svg', 'wifi.png'
];
import SLAAssignment from '@/components/sla-assignment';
import TemplateSupportGroupAssignment from '@/components/template-support-group-assignment';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(
  async () => {
    const { default: RQ } = await import('react-quill');
    return RQ;
  },
  { 
    ssr: false,
    loading: () => <div className="h-32 bg-slate-50 rounded border animate-pulse" />
  }
);

// Field types for service templates with predefined options
const fieldTypes = [
  // Default/System Fields (ordered as they appear in default fields - 13 total)
  { id: 'name_text', name: 'Name/Text Input', icon: Type, description: 'Single line text input', color: 'bg-blue-100 text-blue-600', actualType: 'text' },
  { id: 'priority', name: 'Priority', icon: Star, description: 'Priority selector', color: 'bg-amber-100 text-amber-600', actualType: 'priority' },
  { id: 'mode_select', name: 'Mode/Dropdown', icon: List, description: 'Single selection dropdown', color: 'bg-purple-100 text-purple-600', actualType: 'mode' },
  { id: 'request_type', name: 'Request Type', icon: List, description: 'Request type (Service/Incident)', color: 'bg-purple-100 text-purple-600', actualType: 'request_type' },
  { id: 'status', name: 'Request Status', icon: CheckSquare, description: 'Request status selector', color: 'bg-yellow-100 text-yellow-600', actualType: 'status' },
  { id: 'category', name: 'Category', icon: List, description: 'Service category selector', color: 'bg-indigo-100 text-indigo-600', actualType: 'category' },
  { id: 'group', name: 'Support Group', icon: Users, description: 'Support group selector', color: 'bg-blue-100 text-blue-600', actualType: 'group' },
  { id: 'technician', name: 'Technician', icon: Users, description: 'Technician selector', color: 'bg-green-100 text-green-600', actualType: 'technician' },
  { id: 'subject_text', name: 'Subject', icon: Type, description: 'Subject/title text input', color: 'bg-blue-100 text-blue-600', actualType: 'text' },
  { id: 'description_richtext', name: 'Description', icon: FileText, description: 'Rich text editor with formatting toolbar', color: 'bg-green-100 text-green-600', actualType: 'richtext' },
  { id: 'email_notify', name: 'E-mail Id(s) To Notify', icon: Mail, description: 'Email notification addresses', color: 'bg-cyan-100 text-cyan-600', actualType: 'email-list' },
  { id: 'resolution_richtext', name: 'Resolution', icon: FileText, description: 'Resolution text area', color: 'bg-green-100 text-green-600', actualType: 'richtext' },
  { id: 'approvers_select', name: 'Select Approvers', icon: Users, description: 'Approver selection dropdown', color: 'bg-purple-100 text-purple-600', actualType: 'input-list' },
  
  // Standard Fields
  { id: 'textarea', name: 'Text Area', icon: FileText, description: 'Multi-line text input', color: 'bg-green-100 text-green-600', actualType: 'textarea' },
  { id: 'multiselect', name: 'Multi-Select', icon: CheckSquare, description: 'Multiple selection', color: 'bg-orange-100 text-orange-600', actualType: 'multiselect' },
  { id: 'number', name: 'Number', icon: Hash, description: 'Numeric input', color: 'bg-red-100 text-red-600', actualType: 'number' },
  { id: 'date', name: 'Date Picker', icon: Calendar, description: 'Date selection', color: 'bg-yellow-100 text-yellow-600', actualType: 'date' },
  { id: 'time', name: 'Time Picker', icon: Clock, description: 'Time selection', color: 'bg-pink-100 text-pink-600', actualType: 'time' },
  { id: 'file', name: 'File Upload', icon: Upload, description: 'File attachment', color: 'bg-indigo-100 text-indigo-600', actualType: 'file' },
  { id: 'image', name: 'Image Upload', icon: Upload, description: 'Image attachment and display', color: 'bg-indigo-100 text-indigo-600', actualType: 'image' },
  { id: 'user', name: 'User Selector', icon: Users, description: 'Select users', color: 'bg-teal-100 text-teal-600', actualType: 'user' },
  { id: 'phone', name: 'Phone', icon: Phone, description: 'Phone number input', color: 'bg-lime-100 text-lime-600', actualType: 'phone' },
  { id: 'location', name: 'Location', icon: MapPin, description: 'Location picker', color: 'bg-emerald-100 text-emerald-600', actualType: 'location' }
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
  readonly?: boolean;
  disabled?: boolean;
  defaultValue?: string | string[];
}

// Approval interfaces
interface ApprovalLevel {
  id: string;
  displayName: string;
  approvers: Array<{
    id: number;
    name: string;
    email: string;
  }>; // Changed to include user objects with id, name, email
  order: number;
}

interface ApprovalConfig {
  approvalMethod: 'all' | 'first';
  sendApprovalNotification: boolean;
  assignTechnicianAfterApproval: boolean;
}

// Support Group Assignment interface
interface SupportGroupAssignment {
  id?: number;
  supportGroupId: number;
  supportGroup?: {
    id: number;
    name: string;
    description?: string;
    isActive: boolean;
  };
  isActive: boolean;
  priority: number;
}

// Support Group interfaces
interface SupportGroup {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
}

interface SupportGroupAssignment {
  id?: number;
  supportGroupId: number;
  supportGroup?: SupportGroup;
  isActive: boolean;
  priority: number;
}

interface ServiceTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon?: string;
  isActive: boolean;
  fields: FormField[];
  createdAt: string;
  updatedAt: string;
}

// Default template configuration
const TEMPLATE_PRESETS: Record<string, Partial<ServiceTemplate>> = {
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
      technicianOnly: false,
      readonly: true,
      disabled: false,
      defaultValue: ''
    },
    {
      id: '2',
      type: 'priority',
      label: 'Priority',
      required: true,
      options: PRIORITY_OPTIONS,
      helpText: `Select from: 
Low - affects only you as an individual 
Medium - affects the delivery of your services 
High - affects the company's business 
Top - utmost action needed as classified by Management`,
      technicianOnly: false,
      readonly: false,
      disabled: false,
      defaultValue: 'Low'
    },
    {
      id: '3',
      type: 'mode',
      label: 'Mode',
      required: true,
      options: MODE_OPTIONS,
      helpText: 'How was this request submitted?',
      technicianOnly: true,
      readonly: false,
      disabled: false,
      defaultValue: 'Self-Service Portal'
    },
    {
      id: '4',
      type: 'request_type',
      label: 'Request Type',
      required: true,
      options: REQUEST_TYPE_OPTIONS,
      helpText: 'Type of request being submitted',
      technicianOnly: true,
      readonly: true,
      disabled: true,
      defaultValue: 'Service'
    },
    {
      id: '5',
      type: 'status',
      label: 'Request Status',
      required: true,
      options: REQUEST_STATUS_OPTIONS,
      helpText: 'Current status of the request',
      technicianOnly: true,
      readonly: false,
      disabled: false,
      defaultValue: 'For Approval'
    },
    {
      id: '6',
      type: 'category',
      label: 'Category',
      required: true,
      options: [], // Will be populated by useEffect
      helpText: 'Service category (auto-selected based on your selection)',
      technicianOnly: false,
      readonly: true,
      disabled: false,
      defaultValue: ''
    },
 
    {
      id: '7',
      type: 'technician',
      label: 'Assigned Technician',
      required: false,
      options: [], // Will be populated by useEffect
      helpText: 'Assign to a specific technician',
      technicianOnly: false,
      readonly: false,
      disabled: false,
      defaultValue: ''
    },
    {
      id: '8',
      type: 'text',
      label: 'Subject',
      required: true,
      placeholder: 'Brief description of the service request',
      helpText: 'Enter a clear, concise subject line',
      technicianOnly: false,
      readonly: false,
      disabled: false,
      defaultValue: ''
    },
    {
      id: '9',
      type: 'richtext',
      label: 'Description',
      required: true,
      placeholder: 'Provide detailed description of the service needed...',
      helpText: 'Detailed description of the service request including any specific requirements',
      technicianOnly: false,
      readonly: false,
      disabled: false,
      defaultValue: ''
    },
    {
      id: '10',
      type: 'email-list',
      label: 'E-mail Id(s) To Notify',
      required: false,
      placeholder: 'Enter email address and press Enter or click +',
      helpText: 'Additional email addresses to notify about this request',
      technicianOnly: false,
      readonly: false,
      disabled: false,
      defaultValue: []
    },
    {
      id: '11',
      type: 'richtext',
      label: 'Resolution',
      required: false,
      placeholder: 'Resolution summary...',
      helpText: 'Summary of how the request was resolved',
      technicianOnly: true,
      readonly: false,
      disabled: false,
      defaultValue: ''
    },
    {
      id: '12',
      type: 'input-list',
      label: 'Select Approvers',
      required: false,
      options: [],
      helpText: 'Additional approver for the first level of approval workflow',
      technicianOnly: false,
      readonly: false,
      disabled: false,
      defaultValue: []
    }
    ]
  }
};

export default function ServiceTemplateBuilderPage() {
  const router = useRouter();
  
  // Debug URL parameters at component load
  console.log('Component loaded with URL:', typeof window !== 'undefined' ? window.location.href : 'SSR');
  
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templateName, setTemplateName] = useState('New Service Template');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateIcon, setTemplateIcon] = useState<string>('');
  const [templateIsActive, setTemplateIsActive] = useState<boolean>(false); // Template active status
  const [currentView, setCurrentView] = useState<'user' | 'technician'>('technician');
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
  
  // Saved templates state
  const [savedTemplates, setSavedTemplates] = useState<ServiceTemplate[]>([]);
  
  // Dialog states
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  const [fieldToDelete, setFieldToDelete] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentTemplateId, setCurrentTemplateId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  
  // Support Groups and Technicians state
  const [supportGroups, setSupportGroups] = useState<{ id: number; name: string }[]>([]);
  const [technicians, setTechnicians] = useState<{ id: number; name: string }[]>([]);
  const [serviceCategories, setServiceCategories] = useState<{ id: number; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: number; name: string; email?: string; isSpecial?: boolean }[]>([]);
  
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
  
  // Template Type and SLA State
  const [templateType, setTemplateType] = useState<'service' | 'incident'>('service');
  const [selectedSLAId, setSelectedSLAId] = useState<number | null>(null);
  const [slaData, setSlaData] = useState<{ id: number; name: string; deliveryTime: number; }[]>([]);
  const [selectedSlaInfo, setSelectedSlaInfo] = useState<{ name: string; deliveryTime: number; } | null>(null);
  
  // Support Group Assignment State
  const [supportGroupAssignments, setSupportGroupAssignments] = useState<SupportGroupAssignment[]>([]);

  // Fetch support groups and technicians
  useEffect(() => {
    const fetchSupportGroups = async () => {
      try {
        const response = await fetch('/api/support-groups');
        if (response.ok) {
          const groups = await response.json();
          setSupportGroups(groups);
        }
      } catch (error) {
        console.error('Error fetching support groups:', error);
      }
    };

    const fetchTechnicians = async () => {
      try {
        const response = await fetch('/api/technicians/active');
        if (response.ok) {
          const techs = await response.json();
          setTechnicians(techs);
        }
      } catch (error) {
        console.error('Error fetching technicians:', error);
      }
    };

    const fetchServiceCategories = async () => {
      try {
        console.log('Fetching service categories...');
        
        const response = await fetch('/api/service-categories');
        console.log('Service categories response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Service categories API response:', data);
          
          // API returns an object with categories property
          if (data && Array.isArray(data.categories)) {
            console.log('Using API categories data:', data.categories.length, 'items');
            setServiceCategories(data.categories);
          } else if (Array.isArray(data)) {
            console.log('Using API data as array:', data.length, 'items');
            setServiceCategories(data);
          } else {
            console.log('API data format unexpected, using hardcoded categories');
            const testCategories = [
              { id: 1, name: 'Hardware' },
              { id: 2, name: 'Email' },
              { id: 3, name: 'Software' },
              { id: 4, name: 'Network' }
            ];
            setServiceCategories(testCategories);
          }
        } else {
          console.error('Service categories API error:', response.status, response.statusText);
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
        // Fallback to test data
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
          if (field.label === 'Select Approvers' && Array.isArray(users) && users.length > 0) {
            return { ...field, options: users.map(user => user.name) };
          }
          return field;
        }) : prevFields
      );
    }
  }, [supportGroups, technicians, serviceCategories, users]);
  
  // Update selected SLA info when selectedSLAId or slaData changes
  useEffect(() => {
    if (selectedSLAId && Array.isArray(slaData) && slaData.length > 0) {
      const selectedSLA = slaData.find(sla => sla.id === selectedSLAId);
      setSelectedSlaInfo(selectedSLA || null);
    } else {
      setSelectedSlaInfo(null);
    }
  }, [selectedSLAId, slaData]);
  
  const [formFields, setFormFields] = useState<FormField[]>([
    {
      id: '1',
      type: 'text',
      label: 'Name',
      required: true,
      placeholder: 'Enter your full name',
      helpText: 'Full name of the person submitting the request',
      technicianOnly: false,
      readonly: true,
      disabled: false,
      defaultValue: ''
    },
    {
      id: '2',
      type: 'priority',
      label: 'Priority',
      required: true,
      options: PRIORITY_OPTIONS,
      helpText: `Select from: 
Low - affects only you as an individual 
Medium - affects the delivery of your services 
High - affects the company's business 
Top - utmost action needed as classified by Management`,
      technicianOnly: false,
      readonly: false,
      disabled: false,
      defaultValue: 'Low'
    },
    {
      id: '3',
      type: 'mode',
      label: 'Mode',
      required: true,
      options: MODE_OPTIONS,
      helpText: 'How was this request submitted?',
      technicianOnly: true,
      readonly: false,
      disabled: false,
      defaultValue: 'Self-Service Portal'
    },
    {
      id: '4',
      type: 'request_type',
      label: 'Request Type',
      required: true,
      options: REQUEST_TYPE_OPTIONS,
      helpText: 'Type of request being submitted',
      technicianOnly: true,
      readonly: true,
      disabled: true,
      defaultValue: 'Service'
    },
    {
      id: '5',
      type: 'status',
      label: 'Request Status',
      required: true,
      options: REQUEST_STATUS_OPTIONS,
      helpText: 'Current status of the request',
      technicianOnly: true,
      readonly: false,
      disabled: false,
      defaultValue: 'For Approval'
    },
    {
      id: '6',
      type: 'category',
      label: 'Category',
      required: true,
      options: [], // Will be populated by useEffect
      helpText: 'Service category (auto-selected based on your selection)',
      technicianOnly: false,
      readonly: true,
      disabled: false,
      defaultValue: ''
    },
 
    {
      id: '7',
      type: 'technician',
      label: 'Assigned Technician',
      required: false,
      options: [], // Will be populated by useEffect
      helpText: 'Assign to a specific technician',
      technicianOnly: false,
      readonly: false,
      disabled: false,
      defaultValue: ''
    },
    {
      id: '8',
      type: 'text',
      label: 'Subject',
      required: true,
      placeholder: 'Brief description of the service request',
      helpText: 'Enter a clear, concise subject line',
      technicianOnly: false,
      readonly: false,
      disabled: false,
      defaultValue: ''
    },
    {
      id: '9',
      type: 'richtext',
      label: 'Description',
      required: true,
      placeholder: 'Provide detailed description of the service needed...',
      helpText: 'Detailed description of the service request including any specific requirements',
      technicianOnly: false,
      readonly: false,
      disabled: false,
      defaultValue: ''
    },
    {
      id: '10',
      type: 'email-list',
      label: 'E-mail Id(s) To Notify',
      required: false,
      placeholder: 'Enter email address and press Enter or click +',
      helpText: 'Additional email addresses to notify about this request',
      technicianOnly: false,
      readonly: false,
      disabled: false,
      defaultValue: []
    },
    {
      id: '11',
      type: 'richtext',
      label: 'Resolution',
      required: false,
      placeholder: 'Resolution summary...',
      helpText: 'Summary of how the request was resolved',
      technicianOnly: true,
      readonly: false,
      disabled: false,
      defaultValue: ''
    },
    {
      id: '12',
      type: 'input-list',
      label: 'Select Approvers',
      required: false,
      options: [],
      helpText: 'Additional approver for the first level of approval workflow',
      technicianOnly: false,
      readonly: false,
      disabled: false,
      defaultValue: []
    }
  ]);

  // Debug: Monitor formFields state changes
  useEffect(() => {
    if (!Array.isArray(formFields)) {
      console.error('formFields is not an array:', formFields, typeof formFields);
    } else {
      console.log('formFields updated:', formFields.length, 'fields');
    }
  }, [formFields]);

  // Load template data from localStorage when coming from preview edit
  useEffect(() => {
    const editTemplateData = localStorage.getItem('editTemplate');
    if (editTemplateData) {
      try {
        const parsedTemplate = JSON.parse(editTemplateData);
        setTemplateName(parsedTemplate.name || 'New Service Template');
        setTemplateDescription(parsedTemplate.description || '');
        setTemplateIcon(parsedTemplate.icon || '');
        setFormFields(parsedTemplate.fields || []);
        console.log('Loading edit template, fields count:', (parsedTemplate.fields || []).length);
        // Clear the editTemplate data after loading
        localStorage.removeItem('editTemplate');
      } catch (error) {
        console.error('Failed to parse edit template data:', error);
      }
    }
  }, []);

  // Load saved templates from database
  useEffect(() => {
    loadSavedTemplates();
  }, []);

  // Handle URL parameters for editing existing templates and category selection
  useEffect(() => {
    console.log('URL Parameters Effect running...');
    // Use client-side window location as fallback for Next.js 13 compatibility
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const templateId = urlParams.get('id');
      const templateType = urlParams.get('type');
      const categoryId = urlParams.get('categoryId');
      
      console.log('URL Parameters Debug:', {
        templateId,
        templateType,
        categoryId,
        search: window.location.search,
        fullURL: window.location.href
      });
      
      if (templateId) {
        setIsEditMode(true);
        setCurrentTemplateId(Number(templateId));
        console.log('Set edit mode for template:', templateId);
      }
      
      if (templateType === 'service') {
        setTemplateType('service');
        console.log('Set template type to service');
      }
      
      // Set selected category if provided
      if (categoryId) {
        const parsedCategoryId = Number(categoryId);
        console.log('Setting selectedCategoryId to:', parsedCategoryId);
        setSelectedCategoryId(parsedCategoryId);
        // Also save to localStorage as backup
        localStorage.setItem('selectedCategoryId', categoryId);
      } else {
        // Try to restore from localStorage if URL parameter is missing
        const savedCategoryId = localStorage.getItem('selectedCategoryId');
        if (savedCategoryId) {
          const parsedCategoryId = Number(savedCategoryId);
          console.log('Restoring selectedCategoryId from localStorage:', parsedCategoryId);
          setSelectedCategoryId(parsedCategoryId);
        }
      }
    } else {
      console.log('Window not available (SSR)');
    }
  }, []);

  // Pre-select category in form fields when category is selected and service categories are loaded
  useEffect(() => {
    console.log('Pre-select category effect triggered:', {
      selectedCategoryId,
      serviceCategoriesCount: Array.isArray(serviceCategories) ? serviceCategories.length : 0,
      serviceCategories: Array.isArray(serviceCategories) ? serviceCategories.map(cat => ({ id: cat.id, name: cat.name })) : [],
      formFieldsCount: Array.isArray(formFields) ? formFields.length : 0
    });
    
    if (selectedCategoryId && Array.isArray(serviceCategories) && serviceCategories.length > 0 && Array.isArray(formFields) && formFields.length > 0) {
      // Find the category name from the selected category ID
      const selectedCategory = serviceCategories.find(cat => cat.id === selectedCategoryId);
      console.log('Found selected category:', selectedCategory);
      
      if (selectedCategory) {
        // Find the category field and update its default value with the category name
        setFormFields(prev => Array.isArray(prev) ? prev.map(field => 
          field.type === 'category' 
            ? { ...field, defaultValue: selectedCategory.name }
            : field
        ) : prev);
        console.log('Updated category field with value:', selectedCategory.name);
      }
    }
  }, [selectedCategoryId, serviceCategories, Array.isArray(formFields) ? formFields.length : 0]);

  // Load template data when currentTemplateId is set (for edit mode)
  useEffect(() => {
    if (currentTemplateId && isEditMode) {
      console.log('Loading template for edit mode:', currentTemplateId);
      console.log('Current state:', { currentTemplateId, isEditMode, templateType });
      editTemplate(currentTemplateId.toString());
    }
  }, [currentTemplateId, isEditMode]);

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

  const handleApprovalModalClose = () => {
    setIsApprovalModalOpen(false);
    setEditingApprovalLevel(null);
  };

  const handleIconSelect = (iconName: string) => {
    setTemplateIcon(iconName);
    setIsIconPickerOpen(false);
  };

  const loadTemplate = async (templateId: string) => {
    // Check if it's a preset template
    if (templateId && TEMPLATE_PRESETS[templateId]) {
      const preset = TEMPLATE_PRESETS[templateId];
      setTemplateName(preset.name || 'New Service Template');
      setTemplateDescription(preset.description || '');
      setTemplateIcon(''); // Clear template icon when loading preset
      
      // Load fields and update category field with selected category if available
      let fieldsToSet = preset.fields || [];
      if (selectedCategoryId && Array.isArray(serviceCategories) && serviceCategories.length > 0) {
        const selectedCategory = serviceCategories.find(cat => cat.id === selectedCategoryId);
        if (selectedCategory) {
          fieldsToSet = fieldsToSet.map(field => 
            field.type === 'category' 
              ? { ...field, defaultValue: selectedCategory.name }
              : field
          );
        }
      }
      
      setFormFields(fieldsToSet);
      setSelectedTemplate(templateId);
      setSelectedField(null);
      setIsConfigPanelOpen(false);
      // Don't enter edit mode for presets - always create new
      setIsEditMode(false);
      setCurrentTemplateId(null);
    }
    // Check if it's a saved template - copy it, don't edit
    else if (templateId.startsWith('saved-')) {
      const savedTemplateId = templateId.replace('saved-', '');
      try {
        const response = await fetch(`/api/templates/${savedTemplateId}`);
        if (response.ok) {
          const template = await response.json();
          // Copy template data but create as new template
          setTemplateName(`${template.name} (Copy)`);
          setTemplateDescription(template.description);
          setTemplateIcon(template.icon || '');
          
          // Load fields and update category field with selected category if available
          let fieldsToSet = template.fields || [];
          if (selectedCategoryId && Array.isArray(serviceCategories) && serviceCategories.length > 0) {
            const selectedCategory = serviceCategories.find(cat => cat.id === selectedCategoryId);
            if (selectedCategory) {
              fieldsToSet = fieldsToSet.map((field: FormField) => 
                field.type === 'category' 
                  ? { ...field, defaultValue: selectedCategory.name }
                  : field
              );
            }
          }
          setFormFields(fieldsToSet);
          
          // Load approval workflow
          if (template.approvalWorkflow) {
            setIsApprovalEnabled(true);
            setApprovalLevels(template.approvalWorkflow.levels || []);
            setApprovalConfig(template.approvalWorkflow.config || {
              approvalMethod: 'all',
              sendApprovalNotification: true,
              assignTechnicianAfterApproval: true
            });
          } else {
            setIsApprovalEnabled(false);
            setApprovalLevels([]);
          }
          
          // Load SLA assignment
          setSelectedSLAId(template.slaServiceId || null);
          
          // Load support group assignments
          setSupportGroupAssignments(template.supportGroups?.map((sg: any) => ({
            id: sg.id,
            supportGroupId: sg.supportGroupId,
            supportGroup: sg.supportGroup,
            isActive: sg.isActive,
            priority: sg.priority
          })) || []);
          
          setSelectedTemplate(templateId);
          setSelectedField(null);
          setIsConfigPanelOpen(false);
          // Don't enter edit mode - create as copy
          setIsEditMode(false);
          setCurrentTemplateId(null);
        } else {
          alert('Failed to load template');
        }
      } catch (error) {
        console.error('Error loading template:', error);
        alert('Failed to load template');
      }
    }
  };

  const editTemplate = async (templateId: string) => {
    try {
      console.log(`Attempting to load template with ID: ${templateId}`);
      const response = await fetch(`/api/templates/${templateId}`);
      
      console.log(`API response status: ${response.status}`);
      
      if (response.ok) {
        const template = await response.json();
        console.log('Loaded template data:', template);
        
        // Load template for actual editing
        setTemplateName(template.name);
        setTemplateDescription(template.description);
        setTemplateIcon(template.icon || '');
        setTemplateIsActive(template.isActive || false); // Load active status
        
        // Parse fields if they are stored as JSON string
        let parsedFields = [];
        try {
          if (typeof template.fields === 'string') {
            parsedFields = JSON.parse(template.fields);
            console.log('✅ Parsed template fields from JSON string');
          } else if (Array.isArray(template.fields)) {
            parsedFields = template.fields;
            console.log('✅ Template fields already an array');
          } else {
            console.log('⚠️ Template fields in unexpected format, using empty array');
            parsedFields = [];
          }
        } catch (error) {
          console.error('❌ Failed to parse template fields:', error);
          parsedFields = [];
        }
        
        setFormFields(parsedFields);
        console.log('Loading template for editing, fields count:', parsedFields.length);
        console.log('Template fields data:', template.fields);
        console.log('Template fields type:', typeof template.fields);
        console.log('Template fields isArray:', Array.isArray(template.fields));
        console.log('Parsed fields:', parsedFields);
        
        // Load approval workflow
        if (template.approvalWorkflow) {
          console.log('Loading approval workflow:', template.approvalWorkflow);
          setIsApprovalEnabled(true);
          setApprovalLevels(template.approvalWorkflow.levels || []);
          setApprovalConfig(template.approvalWorkflow.config || {
            approvalMethod: 'all',
            sendApprovalNotification: true,
            assignTechnicianAfterApproval: true
          });
        } else {
          console.log('No approval workflow found');
          setIsApprovalEnabled(false);
          setApprovalLevels([]);
        }
        
        // Load SLA assignment
        console.log('Loading SLA assignment:', template.slaServiceId);
        setSelectedSLAId(template.slaServiceId || null);
        
        // Load support group assignments
        console.log('Loading support groups:', template.supportGroups);
        setSupportGroupAssignments(template.supportGroups?.map((sg: any) => ({
          id: sg.id,
          supportGroupId: sg.supportGroupId,
          supportGroup: sg.supportGroup,
          isActive: sg.isActive,
          priority: sg.priority
        })) || []);
        
        setSelectedTemplate('');
        setSelectedField(null);
        setIsConfigPanelOpen(false);
        // Enter edit mode for actual editing
        setIsEditMode(true);
        setCurrentTemplateId(template.id);
      } else {
        const errorData = await response.text();
        console.error(`Failed to load template. Status: ${response.status}, Error: ${errorData}`);
        
        if (response.status === 404) {
          alert(`Template with ID ${templateId} was not found. It may have been deleted. Redirecting to create a new template.`);
          // Reset to create new template mode
          createNewTemplate();
        } else if (response.status === 401) {
          alert('You are not authorized to view this template. Please log in again.');
        } else {
          alert(`Failed to load template for editing. Server returned: ${response.status} - ${errorData}`);
        }
      }
    } catch (error) {
      console.error('Error loading template for editing:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to load template for editing. Network error: ${errorMessage}`);
    }
  };

  const createNewTemplate = () => {
    setSelectedTemplate('');
    setTemplateName('New Service Template');
    setTemplateDescription('');
    setTemplateIcon('');
    setTemplateIsActive(false); // Reset to inactive for new templates
    setFormFields([]);
    setSelectedField(null);
    setIsConfigPanelOpen(false);
    setIsEditMode(false);
    setCurrentTemplateId(null);
  };

  // Save template to database
  const saveTemplateToDatabase = async () => {
    try {
      const templateData = {
        name: templateName,
        description: templateDescription,
        icon: templateIcon,
        type: 'service',
        categoryId: selectedCategoryId,
        isActive: templateIsActive, // Use the template's active status from state
        fields: formFields,
        approvalWorkflow: isApprovalEnabled ? {
          enabled: true,
          levels: approvalLevels,
          config: approvalConfig
        } : null,
        slaServiceId: selectedSLAId,
        supportGroups: supportGroupAssignments
      };

      console.log('Saving template data:', {
        ...templateData,
        approvalWorkflowEnabled: isApprovalEnabled,
        approvalLevelsCount: approvalLevels.length,
        selectedSLAId: selectedSLAId,
        supportGroupsCount: supportGroupAssignments.length
      });

      const response = await fetch(
        isEditMode && currentTemplateId ? '/api/templates' : '/api/templates',
        {
          method: isEditMode && currentTemplateId ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            isEditMode && currentTemplateId 
              ? { ...templateData, id: currentTemplateId }
              : templateData
          ),
        }
      );

      if (response.ok) {
        const result = await response.json();
        alert(isEditMode ? 'Template updated successfully!' : 'Template saved successfully!');
        
        // Update saved templates list
        await loadSavedTemplates();
        
        // Set edit mode
        if (!isEditMode) {
          setIsEditMode(true);
          setCurrentTemplateId(result.id);
        }
        
        // Redirect to service catalog page after successful save/update
        setTimeout(() => {
          router.push('/admin/catalog-management?tab=service');
        }, 1500);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template. Please try again.');
    }
  };

  // Load saved templates from database
  const loadSavedTemplates = async () => {
    try {
      const response = await fetch('/api/templates?type=service');
      if (response.ok) {
        const data = await response.json();
        setSavedTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading saved templates:', error);
    }
  };

  // Delete template from database
  const handleDeleteTemplate = async (templateId: string) => {
    try {
      console.log('Attempting to delete template with ID:', templateId);
      const response = await fetch(`/api/templates?id=${templateId}`, {
        method: 'DELETE',
      });

      console.log('Delete response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Delete response:', result);
        
        // Update saved templates list
        await loadSavedTemplates();
        
        // If we're currently editing this template, reset the form
        if (currentTemplateId === parseInt(templateId)) {
          createNewTemplate();
        }
        
        alert(result.message || 'Template deleted successfully!');
      } else {
        const errorData = await response.json();
        console.error('Delete error:', errorData);
        alert(errorData.error || 'Failed to delete template. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template. Please try again.');
    }
  };

  const addField = (fieldType: string) => {
    const fieldTypeInfo = fieldTypes.find(ft => ft.id === fieldType);
    const actualFieldType = fieldTypeInfo?.actualType || fieldType;
    
    let defaultPlaceholder = `Enter ${fieldTypeInfo?.name.toLowerCase()}`;
    let defaultOptions: string[] = [];
    let defaultValue = '';
    let fieldLabel = fieldTypeInfo?.name || 'New Field';
    
    // Handle predefined field types with specific naming based on context
    if (actualFieldType === 'priority') {
      defaultOptions = PRIORITY_OPTIONS;
      defaultPlaceholder = 'Select priority level';
      defaultValue = 'Low';
      fieldLabel = 'Priority';
    } else if (actualFieldType === 'status') {
      defaultOptions = REQUEST_STATUS_OPTIONS;
      defaultPlaceholder = 'Select request status';
      defaultValue = 'For Approval';
      fieldLabel = 'Request Status';
    } else if (actualFieldType === 'request_type') {
      defaultOptions = REQUEST_TYPE_OPTIONS;
      defaultPlaceholder = 'Select request type';
      defaultValue = 'Service'; // Service template defaults to Service
      fieldLabel = 'Request Type';
    } else if (actualFieldType === 'mode') {
      defaultOptions = MODE_OPTIONS;
      defaultPlaceholder = 'Select submission mode';
      defaultValue = 'Self-Service Portal';
      fieldLabel = 'Mode';
    } else if (actualFieldType === 'group') {
      defaultOptions = Array.isArray(supportGroups) ? supportGroups.map(group => group.name) : [];
      defaultPlaceholder = 'Select support group';
      fieldLabel = 'Support Group';
    } else if (actualFieldType === 'technician') {
      defaultOptions = Array.isArray(technicians) ? technicians.map(tech => tech.name) : [];
      defaultPlaceholder = 'Select technician';
      fieldLabel = 'Assigned Technician';
    } else if (actualFieldType === 'category') {
      defaultOptions = Array.isArray(serviceCategories) ? serviceCategories.map(category => category.name) : [];
      defaultPlaceholder = 'No category selected';
      fieldLabel = 'Category';
      // Set the default value if we have a selected category
      if (selectedCategoryId && Array.isArray(serviceCategories) && serviceCategories.length > 0) {
        const selectedCategory = serviceCategories.find(cat => cat.id === selectedCategoryId);
        if (selectedCategory) {
          defaultValue = selectedCategory.name;
        }
      }
    } else if (fieldType === 'name_text') {
      fieldLabel = 'Name';
      defaultPlaceholder = 'Enter your full name';
    } else if (fieldType === 'subject_text') {
      fieldLabel = 'Subject';
      defaultPlaceholder = 'Brief description of the service request';
    } else if (fieldType === 'description_richtext') {
      fieldLabel = 'Description';
      defaultPlaceholder = 'Provide detailed description of the service needed...';
    } else if (fieldType === 'resolution_richtext') {
      fieldLabel = 'Resolution';
      defaultPlaceholder = 'Resolution summary...';
    } else if (fieldType === 'email_notify') {
      fieldLabel = 'E-mail Id(s) To Notify';
      defaultPlaceholder = 'email1@company.com, email2@company.com';
    } else if (fieldType === 'mode_select') {
      fieldLabel = 'Mode';
      defaultOptions = ['Self-Service Portal', 'Phone Call', 'Chat', 'Email'];
      defaultPlaceholder = 'How was this request submitted?';
      defaultValue = 'Self-Service Portal';
    } else if (fieldType === 'approvers_select') {
      fieldLabel = 'Select Approvers';
      defaultOptions = Array.isArray(users) && users.length > 0 ? users.map(user => user.name) : ['Loading users...'];
      defaultPlaceholder = 'Select approver';
    } else if (actualFieldType === 'text') {
      // Generic text input
      fieldLabel = 'Text Input';
      defaultPlaceholder = 'Enter text';
    } else if (actualFieldType === 'richtext') {
      // Generic rich text
      fieldLabel = 'Rich Text';
      defaultPlaceholder = 'Enter rich text content...';
    } else if (actualFieldType === 'email') {
      // Generic email
      fieldLabel = 'Email';
      defaultPlaceholder = 'example@company.com';
    } else if (actualFieldType === 'select') {
      // Generic select
      fieldLabel = 'Dropdown';
      defaultOptions = ['Option 1', 'Option 2', 'Option 3'];
      defaultPlaceholder = 'Select option';
    } else if (actualFieldType === 'textarea') {
      defaultPlaceholder = 'Describe in detail...';
    } else if (actualFieldType === 'phone') {
      defaultPlaceholder = '+1 (555) 123-4567';
    } else if (actualFieldType === 'location') {
      defaultPlaceholder = 'Building, floor, room';
    } else if (actualFieldType === 'image') {
      defaultPlaceholder = 'Upload an image';
    } else if (actualFieldType === 'multiselect') {
      defaultOptions = ['Option 1', 'Option 2', 'Option 3'];
      defaultPlaceholder = 'Select multiple options';
    }
    
    const newField: FormField = {
      id: Date.now().toString(),
      type: actualFieldType,
      label: fieldLabel,
      required: false,
      placeholder: defaultPlaceholder,
      helpText: actualFieldType === 'category' ? 'Service category (auto-selected based on your selection)' : 
                actualFieldType === 'request_type' ? 'Type of request being submitted' : 
                actualFieldType === 'mode' ? 'How was this request submitted?' : 
                actualFieldType === 'priority' ? `Select from: 
Low - affects only you as an individual 
Medium - affects the delivery of your services 
High - affects the company's business 
Top - utmost action needed as classified by Management` : '',
      technicianOnly: actualFieldType === 'request_type' || actualFieldType === 'mode', // Request type and mode are technician only
      readonly: actualFieldType === 'request_type' || actualFieldType === 'category', // Request type and category fields are readonly
      disabled: actualFieldType === 'request_type', // Make request_type fields disabled by default
      defaultValue: defaultValue,
      ...(defaultOptions.length > 0 ? { options: defaultOptions } : {})
    };
    
    setFormFields(Array.isArray(formFields) ? [...formFields, newField] : [newField]);
    setSelectedField(newField.id);
    setIsConfigPanelOpen(true);
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    if (!Array.isArray(formFields)) return;
    setFormFields(formFields.map(field => 
      field.id === fieldId ? { ...field, ...updates } : field
    ));
  };

  const deleteField = (fieldId: string) => {
    if (!Array.isArray(formFields)) return;
    setFormFields(formFields.filter(field => field.id !== fieldId));
    if (selectedField === fieldId) {
      setSelectedField(null);
      setIsConfigPanelOpen(false);
    }
  };

  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    if (!Array.isArray(formFields)) return;
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
    // Always return all fields - we'll handle display logic in the render
    console.log('getVisibleFields debug:', {
      formFields,
      isArray: Array.isArray(formFields),
      type: typeof formFields,
      length: formFields?.length,
      constructor: formFields?.constructor?.name
    });
    
    // Ensure we always return an array
    if (Array.isArray(formFields)) {
      return formFields;
    }
    
    // If formFields is not an array, return empty array
    console.warn('formFields is not an array, returning empty array');
    return [];
  };

  const selectedFieldData = Array.isArray(formFields) ? formFields.find(field => field.id === selectedField) : undefined;

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
              
              // Show first option as default if available
              if (field.options && field.options.length > 0) {
                const firstOption = field.options[0];
                return <span>{firstOption}</span>;
              }
              
              return `Select ${field.label.toLowerCase()}`;
            })()}
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        )}
        
        
        {field.type === 'multiselect' && (
          <div className={`min-h-[40px] p-3 border rounded-md text-sm relative ${isFieldDisabled ? 'bg-gray-100 border-gray-300 text-gray-400 opacity-60' : isFieldReadonly ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
            {(() => {
              if (fieldValue && typeof fieldValue === 'string') {
                const values = fieldValue.split(',').map((val: string) => val.trim()).filter(Boolean);
                return values.length > 0 ? values.join(', ') : `Select multiple ${field.label.toLowerCase()}`;
              }
              if (Array.isArray(rawFieldValue) && rawFieldValue.length > 0) {
                return rawFieldValue.join(', ');
              }
              if (field.options && field.options.length > 0) {
                // Show first 2 options as example
                const exampleValues = field.options.slice(0, 2).join(', ');
                return `e.g., ${exampleValues}`;
              }
              return `Select multiple ${field.label.toLowerCase()}`;
            })()}
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        )}
        
        {field.type === 'checkbox' && (
          <div className="flex items-center space-x-2">
            <Checkbox 
              id={`checkbox-${field.id}`} 
              disabled={true} 
              checked={Boolean(fieldValue === 'true' || fieldValue === 'checked' || fieldValue)}
              className={`${isFieldDisabled ? 'opacity-60' : isFieldReadonly ? 'border-blue-300' : ''}`}
            />
            <Label 
              htmlFor={`checkbox-${field.id}`} 
              className={`text-sm cursor-pointer ${isFieldDisabled ? 'text-gray-400' : 'text-slate-700'}`}
            >
              {field.placeholder || 'Check this option'}
            </Label>
          </div>
        )}
        
        {field.type === 'radio' && (
          <RadioGroup value={typeof fieldValue === 'string' ? fieldValue : ''} disabled={true} className={`${isFieldDisabled ? 'opacity-60' : ''}`}>
            {field.options
              ?.filter(option => option && option.trim() !== '') // Filter out empty options
              ?.map((option, index) => {
                // Special mapping for status values to match database enums
                let value;
                // Define status mapping that applies to any field with status options
                const statusMap: { [key: string]: string } = {
                  'For Approval': 'for_approval',
                  'Cancelled': 'cancelled',
                  'Open': 'open',
                  'On-Hold': 'on_hold',
                  'Resolved': 'resolved',
                  'Closed': 'closed'
                };
                
                if (field.type === 'status' || statusMap[option]) {
                  // Use status mapping for status fields or any field with status options
                  value = statusMap[option] || option.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                } else {
                  value = option.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || `option-${index}`;
                }
                return (
                  <div key={index} className="flex items-center space-x-2">
                    <RadioGroupItem 
                      value={value} 
                      id={`radio-${field.id}-${index}`} 
                      disabled={true}
                      className={`${isFieldReadonly ? 'border-blue-300' : ''}`}
                    />
                    <Label 
                      htmlFor={`radio-${field.id}-${index}`} 
                      className={`text-sm cursor-pointer ${isFieldDisabled ? 'text-gray-400' : 'text-slate-700'}`}
                    >
                      {option}
                    </Label>
                  </div>
                );
              })}
          </RadioGroup>
        )}
        
        {field.type === 'date' && (
          <Input
            type="date"
            value={fieldValue}
            disabled={true}
            readOnly={isFieldReadonly}
            className={`${isFieldDisabled ? 'bg-gray-100 opacity-60' : isFieldReadonly ? 'bg-blue-50 border-blue-200' : 'bg-slate-50'}`}
          />
        )}
        
        {field.type === 'time' && (
          <Input
            type="time"
            value={fieldValue}
            disabled={true}
            readOnly={isFieldReadonly}
            className={`${isFieldDisabled ? 'bg-gray-100 opacity-60' : isFieldReadonly ? 'bg-blue-50 border-blue-200' : 'bg-slate-50'}`}
          />
        )}
        
        {field.type === 'datetime' && (
          <Input
            type="datetime-local"
            value={fieldValue}
            disabled={true}
            readOnly={isFieldReadonly}
            className={`${isFieldDisabled ? 'bg-gray-100 opacity-60' : isFieldReadonly ? 'bg-blue-50 border-blue-200' : 'bg-slate-50'}`}
          />
        )}
        
        {field.type === 'url' && (
          <Input
            type="url"
            placeholder={field.placeholder}
            value={fieldValue}
            disabled={true}
            readOnly={isFieldReadonly}
            className={`${isFieldDisabled ? 'bg-gray-100 opacity-60' : isFieldReadonly ? 'bg-blue-50 border-blue-200' : 'bg-slate-50'}`}
          />
        )}
        
        {field.type === 'file' && (
          <div className={`border-2 border-dashed rounded-md p-4 text-center text-sm ${isFieldDisabled ? 'border-gray-300 bg-gray-100 text-gray-400 opacity-60' : isFieldReadonly ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-slate-300 bg-slate-50 text-slate-600'}`}>
            <Upload className={`mx-auto h-6 w-6 mb-1 ${isFieldDisabled ? 'text-gray-400' : isFieldReadonly ? 'text-blue-400' : 'text-slate-400'}`} />
            {isFieldDisabled ? 'File upload disabled' : isFieldReadonly ? 'File upload (read-only)' : 'Click to upload file'}
          </div>
        )}
        
        {field.type === 'image' && (
          <div className={`border-2 border-dashed rounded-md p-4 text-center text-sm ${isFieldDisabled ? 'border-gray-300 bg-gray-100 text-gray-400 opacity-60' : isFieldReadonly ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-slate-300 bg-slate-50 text-slate-600'}`}>
            <div className="flex flex-col items-center space-y-2">
              <Upload className={`h-8 w-8 ${isFieldDisabled ? 'text-gray-400' : isFieldReadonly ? 'text-blue-400' : 'text-slate-400'}`} />
              <div className="text-center">
                <p className="font-medium">
                  {isFieldDisabled ? 'Image upload disabled' : isFieldReadonly ? 'Image upload (read-only)' : 'Upload Image'}
                </p>
                <p className="text-xs mt-1">
                  {!isFieldDisabled && !isFieldReadonly && 'PNG, JPG, GIF up to 10MB'}
                </p>
              </div>
              {fieldValue && (
                <div className="mt-2 p-2 bg-white rounded border">
                  <div className={`w-20 h-20 bg-gray-200 rounded flex items-center justify-center ${isFieldDisabled ? 'opacity-50' : ''}`}>
                    <span className="text-xs text-gray-500">Preview</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {field.type === 'user' && (
          <Select value={typeof fieldValue === 'string' ? fieldValue : undefined}>
            <SelectTrigger 
              className={`${isFieldDisabled ? 'bg-gray-100 opacity-60' : isFieldReadonly ? 'bg-blue-50 border-blue-200' : 'bg-slate-50'}`}
              disabled={true}
            >
              <SelectValue placeholder={fieldValue || "Select user..."} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user1">John Doe</SelectItem>
              <SelectItem value="user2">Jane Smith</SelectItem>
              <SelectItem value="user3">Mike Johnson</SelectItem>
            </SelectContent>
          </Select>
        )}
        
        {field.type === 'location' && (
          <div className={`flex items-center space-x-2 p-3 border rounded-md ${isFieldDisabled ? 'border-gray-300 bg-gray-100 opacity-60' : isFieldReadonly ? 'border-blue-200 bg-blue-50' : 'border-slate-300 bg-slate-50'}`}>
            <MapPin className={`w-4 h-4 ${isFieldDisabled ? 'text-gray-400' : isFieldReadonly ? 'text-blue-400' : 'text-slate-400'}`} />
            <span className={`text-sm ${isFieldDisabled ? 'text-gray-400' : isFieldReadonly ? 'text-blue-600' : 'text-slate-500'}`}>
              {fieldValue || 'Click to select location'}
            </span>
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
                  onClick={() => router.push('/admin/catalog-management?tab=service')}
                  className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Service Template Builder</h1>
                  <p className="text-xs text-gray-600">Design service request forms</p>
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
                    className={`px-4 ${currentView === 'user' ? 'bg-blue-500 text-white hover:bg-blue-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
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
                      icon: templateIcon,
                      fields: formFields,
                      approvalEnabled: isApprovalEnabled,
                      approvalLevels: approvalLevels,
                      approvalConfig: approvalConfig,
                      selectedTemplate: selectedTemplate,
                      selectedCategoryId: selectedCategoryId,
                      selectedCategoryName: selectedCategoryId && Array.isArray(serviceCategories) && serviceCategories.length > 0 
                        ? serviceCategories.find(cat => cat.id === selectedCategoryId)?.name 
                        : null
                    };
                    localStorage.setItem('previewTemplate', JSON.stringify(templateData));
                    
                    // Preserve current URL parameters when going to preview
                    const currentParams = new URLSearchParams(window.location.search);
                    const previewUrl = currentParams.toString() 
                      ? `/admin/catalog-management/service/template/preview?${currentParams.toString()}`
                      : '/admin/catalog-management/service/template/preview';
                    
                    router.push(previewUrl);
                  }}
                  className="text-slate-600 hover:text-slate-900"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
                
                <Button
                  onClick={() => setShowSaveDialog(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isEditMode ? 'Update Template' : 'Save Template'}
                </Button>
                
                
              </div>
            </div>
          </div>
        </div>

        {/* Template Selection - Only show when NOT in edit mode */}
        {!isEditMode && (
          <div className="w-full px-6 mt-6">
            <Card className="bg-white/90 backdrop-blur-sm shadow-sm border border-purple-200/60">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-slate-700">Template Selection</CardTitle>
                <p className="text-sm text-gray-600">
                  Choose a template to copy and customize. To edit existing templates, use the Edit button in the Saved Templates section below.
                </p>
              </CardHeader>
              
              <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <Select
                    value={selectedTemplate}
                    onValueChange={loadTemplate}
                  >
                    <SelectTrigger className="w-70">
                      <SelectValue placeholder="Copy from Existing Template" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Default Template */}
                      {Object.entries(TEMPLATE_PRESETS).map(([key, template]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <Star className="w-3 h-3 text-amber-500" />
                            {template.name} (Default)
                          </div>
                        </SelectItem>
                      ))}
                      
                      {/* Separator if saved templates exist */}
                      {savedTemplates.length > 0 && (
                        <div className="px-2 py-1">
                          <div className="border-t border-gray-200"></div>
                        </div>
                      )}
                      
                      {/* Saved Templates */}
                      {savedTemplates.map((template) => (
                        <SelectItem key={`saved-${template.id}`} value={`saved-${template.id}`}>
                          <div className="flex items-center gap-2">
                            {template.icon ? (
                              <img 
                                src={`/serviceicons/${template.icon}`} 
                                alt="" 
                                className="w-3 h-3 object-contain"
                              />
                            ) : (
                              <FileText className="w-3 h-3 text-blue-500" />
                            )}
                            {template.name}
                            <span className="text-xs text-gray-500">
                              ({new Date(template.createdAt).toLocaleDateString()})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                      
                      {/* No saved templates message */}
                      {savedTemplates.length === 0 && (
                        <div className="px-2 py-2">
                          <div className="text-xs text-gray-500 text-center">
                            No saved templates yet. Create and save templates to see them here.
                          </div>
                        </div>
                      )}
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
        )}

        {/* Saved Templates Management dont remove for future reference*/}
        {/* {savedTemplates.length > 0 && (
          <div className="w-full px-6 py-4">
            <Card className="bg-white/90 backdrop-blur-sm shadow-sm border border-purple-200/60">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-slate-700">Saved Templates</CardTitle>
                <p className="text-sm text-gray-600">
                  Manage your saved templates
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedTemplates.map((template) => (
                    <div key={template.id} className="border rounded-lg p-4 hover:border-purple-300 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1 mr-2">
                          {template.icon && (
                            <img 
                              src={`/serviceicons/${template.icon}`} 
                              alt="" 
                              className="w-4 h-4 object-contain flex-shrink-0"
                            />
                          )}
                          <h4 className="font-medium text-slate-700 truncate">{template.name}</h4>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              editTemplate(template.id);
                            }}
                            className="p-1 h-7 w-7"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setDeleteTemplateId(template.id.toString());
                              setShowDeleteDialog(true);
                            }}
                            className="p-1 h-7 w-7 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      {template.description && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{template.description}</p>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{template.fields?.length || 0} fields</span>
                        <span>{new Date(template.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )} */}

        <div className="w-full px-6 mt-6">
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
                          value={selectedFieldData.defaultValue || 'Service'}
                          disabled={true}
                          placeholder="Service (locked for service templates)"
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
                  
                 {/* Template Icon Upload (but actually opens icon picker) */}
                  <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <label className="text-sm font-medium text-slate-700 mb-2 block">Template Icon</label>
                        <div className="relative">
                          {/* No input[type=file] anymore */}
                          <div
                            onClick={() => setIsIconPickerOpen(true)}
                            className="w-16 h-16 border-2 border-dashed border-blue-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group"
                          >
                            {templateIcon ? (
                              <img 
                                src={templateIcon.startsWith("data:") ? templateIcon : `/serviceicons/${templateIcon}`} 
                                alt="Template Icon" 
                                className="w-12 h-12 object-cover rounded"
                              />
                            ) : (
                              <Upload className="w-6 h-6 text-blue-400 group-hover:text-blue-500" />
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-600 mb-1">
                          Choose an icon to represent this template
                        </p>
                        <p className="text-xs text-slate-500">
                          Pick from predefined icons. Recommended size: 64x64px
                        </p>
                        {templateIcon && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTemplateIcon('')}
                            className="mt-1 text-xs text-red-600 hover:text-red-700 p-0 h-auto"
                          >
                            Remove icon
                          </Button>
                        )}
                      </div>
                    </div>
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
                      className="text-sm bg-transparent border-none p-0 focus:bg-white mb-3"
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
                  
                  <CardContent>
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
                                onClick={() => openApprovalLevelModal()}
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
                                      className="flex flex-col border border-slate-200 rounded-lg bg-white"
                                    >
                                      <div className="flex items-center justify-between p-4">
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
                                            onClick={() => openApprovalLevelModal(level)}
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

                                      {/* Selected approvers list */}
                                      <div className="px-4 pb-4">
                                        {Array.isArray(level.approvers) && level.approvers.length > 0 ? (
                                          <div className="flex flex-wrap gap-2">
                                            {level.approvers.map((appr) => (
                                              <div
                                                key={appr.id}
                                                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700"
                                                title={appr.email}
                                              >
                                                <User className="w-4 h-4 text-slate-500" />
                                                <span className="text-sm font-medium">{appr.name}</span>
                                              
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

              {/* Service Configuration - SLA Assignment & Support Groups */}
              <div className="col-span-12">
                <Card className="bg-white/90 backdrop-blur-sm shadow-sm border border-slate-200/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Service Configuration
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Configure SLA assignment and support group settings for service templates
                    </p>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    {/* SLA Assignment Section for Service Templates */}
                    <div>
                      <SLAAssignment
                        templateType={templateType}
                        selectedSLAId={selectedSLAId ?? undefined}
                        onSLAChange={setSelectedSLAId}
                      />
                    </div>

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
                  <div className="flex flex-col gap-2 mt-1">
                    <Badge variant="outline">
                      {currentView === 'user' ? 'Requester Form' : 'Technician Form'}
                    </Badge>
                    {selectedCategoryId && serviceCategories.length > 0 && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 w-fit">
                        Category: {serviceCategories.find(cat => cat.id === selectedCategoryId)?.name || 'Unknown'}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="overflow-y-auto">
                  <div className="space-y-6 max-w-2xl">
                    {/* Template Header */}
                    <div className="border-b border-slate-200 pb-6">
                      <div className="flex items-center gap-3">
                        {templateIcon && (
                          <div className="w-8 h-8 p-1 border rounded-lg bg-white">
                            <img 
                              src={`/serviceicons/${templateIcon}`} 
                              alt="Template Icon" 
                              className="w-full h-full object-contain"
                            />
                          </div>
                        )}
                        <h2 className="text-2xl font-semibold text-slate-700">{templateName}</h2>
                      </div>
                      {templateDescription && (
                        <p className="text-base text-slate-600 mt-2">{templateDescription}</p>
                      )}
                      
                      {/* SLA Information Display */}
                      {selectedSlaInfo && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-600" />
                            <p className="text-sm text-blue-800 font-medium">
                              SLA: {templateType === 'service' 
                                ? `Typically delivered within ${Math.ceil(selectedSlaInfo.deliveryTime / 24)} ${Math.ceil(selectedSlaInfo.deliveryTime / 24) === 1 ? 'day' : 'days'} from full approval`
                                : `Typically resolved within ${Math.ceil(selectedSlaInfo.deliveryTime / 24)} ${Math.ceil(selectedSlaInfo.deliveryTime / 24) === 1 ? 'day' : 'days'}`
                              }
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Form Fields Preview */}
                    {getVisibleFields().length > 0 ? (
                      <div className="space-y-6">
                        {getVisibleFields().map((field) => renderFormField(field))}
                        
                        {/* Submit Button */}
                        <div className="pt-6 border-t border-slate-200">
                          <Button className="w-full bg-blue-600 hover:bg-blue-700 py-3 text-base" disabled>
                            Submit Service Request
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

      {/* Save Confirmation Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">
              {isEditMode ? 'Update Template' : 'Save Template'}
            </h3>
            <p className="text-gray-600 mb-6">
              {isEditMode 
                ? 'Are you sure you want to update this template? This will overwrite the existing template.'
                : 'Are you sure you want to save this template?'
              }
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowSaveDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  setShowSaveDialog(false);
                  await saveTemplateToDatabase();
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isEditMode ? 'Update' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Icon Picker Dialog */}
      <Dialog open={isIconPickerOpen} onOpenChange={setIsIconPickerOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Choose Template Icon</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh] p-4">
            <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
              {availableIcons.map((iconName) => (
                <button
                  key={iconName}
                  onClick={() => handleIconSelect(iconName)}
                  className={`
                    w-12 h-12 p-2 border-2 rounded-lg hover:border-blue-500 transition-colors
                    ${templateIcon === iconName ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                  `}
                  title={iconName}
                >
                  <img 
                    src={`/serviceicons/${iconName}`} 
                    alt={iconName} 
                    className="w-full h-full object-contain"
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setIsIconPickerOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Delete Template</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this template? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeleteTemplateId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  setShowDeleteDialog(false);
                  if (deleteTemplateId) {
                    await handleDeleteTemplate(deleteTemplateId);
                  }
                  setDeleteTemplateId(null);
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </Button>
            </div>
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
