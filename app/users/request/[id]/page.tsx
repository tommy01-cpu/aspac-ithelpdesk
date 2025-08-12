"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css'; // Import Quill styles

// Quill styles
const quillStyles = `
  .ql-editor {
    min-height: 150px;
    font-family: inherit;
    font-size: 14px;
    line-height: 1.5;
    color: #334155;
  }
  .ql-toolbar {
    border-top: none;
    border-left: none;
    border-right: none;
    border-bottom: 1px solid #cbd5e1;
    background-color: #f8fafc;
  }
  .ql-container {
    border: none;
  }
  .ql-toolbar .ql-stroke {
    fill: none;
    stroke: #64748b;
  }
  .ql-toolbar .ql-fill {
    fill: #64748b;
    stroke: none;
  }
  .ql-toolbar button:hover .ql-stroke {
    stroke: #334155;
  }
  .ql-toolbar button:hover .ql-fill {
    fill: #334155;
  }
`;
import { 
  ArrowLeft, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Upload, 
  X, 
  Plus,
  Eye,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Tag,
  Users,
  Zap,
  Paperclip,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SessionWrapper } from '@/components/session-wrapper';
import { toast } from '@/hooks/use-toast';
import { getStatusColor, getPriorityColor } from '@/lib/status-colors';

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { 
  ssr: false,
  loading: () => <div className="h-32 bg-slate-50 rounded border animate-pulse" />
});

// Format a duration in hours or minutes; templateData.slaService fields seem to be in hours.
function formatDurationFromHours(totalHours: number): string {
  if (!isFinite(totalHours) || totalHours < 0) totalHours = 0;
  const totalMinutes = Math.round(totalHours * 60);
  const minutesPerDay = 24 * 60;
  const days = Math.floor(totalMinutes / minutesPerDay);
  const hours = Math.floor((totalMinutes % minutesPerDay) / 60);
  const minutes = Math.floor(totalMinutes % 60);
  const parts: string[] = [];
  parts.push(`${days} day${days === 1 ? '' : 's'}`);
  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
  return parts.join(' ');
}

// Enhanced Rich Text Editor Component with Image Upload
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
  useEffect(() => {
    setEditorKey(prev => prev + 1);
  }, [placeholder]);

  // Enhanced modules with more formatting options and font size controls
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'align': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      ['blockquote', 'code-block'],
      ['link', 'image', 'video'],
      [{ 'direction': 'rtl' }],
      ['clean']
    ],
    clipboard: {
      matchVisual: false,
    }
  };

  const formats = [
    'header', 'font', 'size', 'bold', 'italic', 'underline', 'strike',
    'color', 'background', 'script', 'align', 'list', 'bullet', 'indent',
    'blockquote', 'code-block', 'link', 'image', 'video', 'direction'
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

// Email Tag Input Component
interface ApproverTagSelectProps {
  selectedApproverIds: string[];
  onChange: (approverIds: string[]) => void;
  users: any[];
  disabled?: boolean;
  placeholder?: string;
}

const ApproverTagSelect: React.FC<ApproverTagSelectProps> = ({ 
  selectedApproverIds, 
  onChange, 
  users,
  disabled = false,
  placeholder = 'Search for approvers...'
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Get user objects for selected IDs
  const selectedApprovers = selectedApproverIds
    .map(id => users.find(user => String(user.id) === id))
    .filter(Boolean);

  // Filter suggestions based on search input
  useEffect(() => {
    if (searchInput.trim()) {
      const filtered = users
        .filter(user => 
          !selectedApproverIds.includes(String(user.id)) &&
          (
            user.emp_fname?.toLowerCase().includes(searchInput.toLowerCase()) ||
            user.emp_lname?.toLowerCase().includes(searchInput.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchInput.toLowerCase()) ||
            user.department?.toLowerCase().includes(searchInput.toLowerCase())
          )
        )
        .slice(0, 5);
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchInput, users, selectedApproverIds]);

  const addApprover = useCallback((user: any) => {
    if (!user) return;
    
    const userIdStr = String(user.id); // Ensure it's a string
    
    if (selectedApproverIds.includes(userIdStr)) {
      setError('Approver already added');
      return;
    }
    
    onChange([...selectedApproverIds, userIdStr]);
    setSearchInput('');
    setSuggestions([]);
    setShowSuggestions(false);
    setError('');
    inputRef.current?.focus();
  }, [selectedApproverIds, onChange]);

  const removeApprover = (userId: string | number) => {
    const userIdStr = String(userId); // Convert to string for consistent comparison
    onChange(selectedApproverIds.filter(id => String(id) !== userIdStr));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchInput.trim()) {
      e.preventDefault();
      if (suggestions.length > 0) {
        addApprover(suggestions[0]);
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* Search Input with + Button */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setError('');
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => searchInput.trim() && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={placeholder}
            className="bg-white/70 border-slate-200 focus:border-slate-400"
            disabled={disabled}
          />
          
          {/* Suggestions dropdown */}
          {showSuggestions && (
            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-slate-200 max-h-60 overflow-auto">
              {suggestions.length > 0 ? (
                suggestions.map((user) => (
                  <div
                    key={user.id}
                    className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex items-center gap-3"
                    onMouseDown={() => addApprover(user)}
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                      <User className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {user.emp_fname || user.name} {user.emp_lname || ''}
                      </div>
                      <div className="text-sm text-slate-500">
                        {user.department} • {user.email}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-slate-500 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  No users found matching "{searchInput}"
                </div>
              )}
            </div>
          )}
          
          {error && (
            <p className="text-red-500 text-xs mt-1">{error}</p>
          )}
        </div>
        
        <Button
          type="button"
          onClick={() => {
            if (suggestions.length > 0) {
              addApprover(suggestions[0]);
            }
          }}
          disabled={disabled || !searchInput.trim()}
          size="sm"
          className="bg-slate-600 hover:bg-slate-700 text-white"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Approver List Below Input */}
      {selectedApprovers.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-slate-600">Approvers for this request</p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="space-y-2">
              {selectedApprovers.map((user) => (
                <div 
                  key={user.id} 
                  className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded"
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-600" />
                    <span className="text-sm text-slate-700">
                      {user.emp_fname || user.name} {user.emp_lname || ''}
                    </span>
                    <span className="text-xs text-slate-500">
                      ({user.department || 'No department'})
                    </span>
                  </div>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => removeApprover(String(user.id))}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
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
  technicianOnly: boolean;
  helpText?: string;
  defaultValue?: string | string[];
  readonly?: boolean;
  disabled?: boolean;
}

interface TemplateData {
  id?: string;
  name: string;
  description: string;
  category: string;
  type: 'service' | 'incident';
  fields: FormField[];
  selectedTemplate?: string;
  slaServiceId?: string;
  slaService?: {
    id: string;
    name: string;
    description?: string;
    responseTime: number;
    resolutionTime: number;
    priority: string;
  };
}

interface SLAData {
  id: string;
  name: string;
  description: string;
  resolutionTime: number;
  responseTime: number;
  timeUnit: string;
}

// Enhanced Email Tag Input Component
interface EmailTagInputProps {
  emails: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

const EmailTagInput: React.FC<EmailTagInputProps> = ({ 
  emails, 
  onChange, 
  placeholder = 'Enter email address and press Enter or click +',
  disabled = false 
}) => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  // Enhanced email validation
  const validateEmail = useCallback((email: string) => {
    // Improved regex for email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  const addEmail = useCallback(() => {
    const email = inputValue.trim();
    if (!email) return;
    
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (emails.includes(email)) {
      setError('Email already added');
      return;
    }

    onChange([...emails, email]);
    setInputValue('');
    setError('');
  }, [inputValue, emails, onChange, validateEmail]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addEmail();
    }
  }, [addEmail]);

  const removeEmail = useCallback((emailToRemove: string) => {
    onChange(emails.filter(email => email !== emailToRemove));
  }, [emails, onChange]);

  return (
    <div className="space-y-3">
      {/* Email Input with + Button */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setError(''); // Clear error when typing
            }}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            type="email"
            className="bg-white/70 border-slate-200 focus:border-slate-400"
            disabled={disabled}
          />
          {error && (
            <p className="text-red-500 text-xs mt-1">{error}</p>
          )}
        </div>
        <Button
          type="button"
          onClick={addEmail}
          disabled={disabled || !inputValue.trim()}
          size="sm"
          className="bg-slate-600 hover:bg-slate-700 text-white"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Email List Below Input */}
      {emails.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-slate-600">Additional email addresses to notify about this request</p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="space-y-2">
              {emails.map((email, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-600" />
                    <span className="text-sm text-slate-700">{email}</span>
                  </div>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => removeEmail(email)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function RequestPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [templateData, setTemplateData] = useState<TemplateData | null>(null);
  const [slaData, setSlaData] = useState<SLAData | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [supportGroups, setSupportGroups] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const templateId = params?.id as string;
  const requestType = searchParams?.get('type') || 'service'; // 'service' or 'incident'
  const incidentId = searchParams?.get('incidentId');

  useEffect(() => {
    if (templateId) {
      fetchTemplateData();
      fetchSupportGroups();
      fetchTechnicians();
      fetchAllUsers();
    }
  }, [templateId, session]);

  const fetchTemplateData = async () => {
    try {
      const response = await fetch(`/api/templates/${templateId}`);
      if (response.ok) {
        const template = await response.json();
        
        // Parse fields if they come as a JSON string
        if (template.fields && typeof template.fields === 'string') {
          try {
            template.fields = JSON.parse(template.fields);
          } catch (parseError) {
            console.error('Error parsing template fields:', parseError);
            template.fields = [];
          }
        }
        
        setTemplateData(template);
        
        // Set SLA data from template
        if (template.slaService) {
          setSlaData({
            id: template.slaService.id,
            name: template.slaService.name,
            description: template.slaService.description || '',
            resolutionTime: template.slaService.resolutionTime,
            responseTime: template.slaService.responseTime,
            timeUnit: 'hours'
          });
        }
        
        // Initialize form data with default values and current user info
        const initialFormData: Record<string, any> = {};
        if (Array.isArray(template.fields)) {
          template.fields.forEach((field: FormField) => {
            if (field.defaultValue) {
              // Handle different field types for default values
              switch (field.type) {
                case 'priority':
                  initialFormData[field.id] = typeof field.defaultValue === 'string'
                    ? field.defaultValue.toLowerCase()
                    : field.defaultValue;
                  break;
                case 'status':
                  initialFormData[field.id] = typeof field.defaultValue === 'string'
                    ? field.defaultValue.toLowerCase().replace(/\s+/g, '-')
                    : Array.isArray(field.defaultValue)
                      ? field.defaultValue.map(v => typeof v === 'string' ? v.toLowerCase().replace(/\s+/g, '-') : v)
                      : field.defaultValue;
                  break;
                case 'select':
                  initialFormData[field.id] = typeof field.defaultValue === 'string'
                    ? field.defaultValue.toLowerCase().replace(/\s+/g, '-')
                    : Array.isArray(field.defaultValue)
                      ? field.defaultValue.map(v => typeof v === 'string' ? v.toLowerCase().replace(/\s+/g, '-') : v)
                      : field.defaultValue;
                  break;
                case 'multiselect':
                  initialFormData[field.id] = Array.isArray(field.defaultValue) ? field.defaultValue : [field.defaultValue];
                  break;
                default:
                  initialFormData[field.id] = field.defaultValue;
              }
            } else if (field.type === 'priority' && field.options && field.options.length > 0) {
              // Set default priority to the first option if no default value is specified
              initialFormData[field.id] = field.options[0];
            }
            
            // Auto-populate name field with current user's name
            if (field.type === 'text' && (field.label.toLowerCase().includes('name') || field.id.toLowerCase().includes('name')) && session?.user) {
              const userName = session.user.name || '';
              if (userName) {
                initialFormData[field.id] = userName;
              }
            }
          });
        }
        setFormData(initialFormData);
      }
    } catch (error) {
      console.error('Error fetching template:', error);
      toast({
        title: "Error",
        description: "Failed to load template data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSupportGroups = async () => {
    try {
      const response = await fetch('/api/support-groups?limit=100');
      if (response.ok) {
        const data = await response.json();
        setSupportGroups(data.supportGroups || []);
      }
    } catch (error) {
      console.error('Error fetching support groups:', error);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const response = await fetch('/api/technicians?limit=100');
      if (response.ok) {
        const data = await response.json();
        setTechnicians(data.technicians?.filter((tech: any) => tech.isActive) || []);
      }
    } catch (error) {
      console.error('Error fetching technicians:', error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setAllUsers(data.users || data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Note: Email handling is now managed by the enhanced EmailTagInput component

  // File upload handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    console.log('Drag over');
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    console.log('Drag leave');
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    console.log('Files dropped');
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFiles = (files: File[]) => {
    console.log('Files received:', files);
    
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File too large",
          description: `File ${file.name} is too large. Maximum size is 10MB.`,
          variant: "destructive"
        });
        return false;
      }
      return true;
    });

    console.log('Valid files:', validFiles);
    
    setUploadedFiles(prev => {
      const newFiles = [...prev, ...validFiles];
      console.log('Updated uploadedFiles:', newFiles);
      return newFiles;
    });
    setAttachments(prev => [...prev, ...validFiles]);
  };

  const removeFile = useCallback((index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleFieldChange = (fieldId: string, value: any) => {
    console.log(`Field ${fieldId} changed to:`, value, typeof value);
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate required fields
      const templateFields = Array.isArray(templateData?.fields) ? templateData.fields : [];
      const requiredFields = templateFields.filter(field => field.required && !field.technicianOnly);
      const missingFields = requiredFields?.filter(field => !formData[field.id] || formData[field.id] === '');
      
      if (missingFields && missingFields.length > 0) {
        toast({
          title: "Missing Required Fields",
          description: `Please fill in: ${missingFields.map(f => f.label).join(', ')}`,
          variant: "destructive"
        });
        return;
      }

      // First, upload files if any
      let uploadedFileData: any[] = [];
      if (uploadedFiles.length > 0) {
        const fileFormData = new FormData();
        uploadedFiles.forEach(file => {
          fileFormData.append('files', file);
        });
        
        const fileUploadResponse = await fetch('/api/attachments', {
          method: 'POST',
          body: fileFormData
        });

        if (fileUploadResponse.ok) {
          const fileResult = await fileUploadResponse.json();
          uploadedFileData = fileResult.files || [];
          console.log('Files uploaded successfully to database:', uploadedFileData);
        } else {
          throw new Error('Failed to upload files to database');
        }
      }

      // Prepare the request data
      const requestData = {
        templateId: templateData?.id,
        templateName: templateData?.name,
        type: templateData?.type,
        formData,
        attachments: uploadedFileData.map(f => f.originalName), // Use original file names for linking
      };

      console.log('Submitting request:', requestData);
      
      // Submit to the API endpoint
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Server error response:', error);
        throw new Error(error.error || error.details || 'Failed to submit request');
      }

      const result = await response.json();
      console.log('Request submitted successfully:', result);

      toast({
        title: "Request Submitted Successfully",
        description: `Your ${requestType} request has been submitted with ID: ${result.request?.id || 'N/A'}`,
      });

      // Redirect to the requests tab instead of dashboard
      router.push('/users?tab=requests');
      
    } catch (error) {
      console.error('Error submitting request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit request';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.id] || '';
    const isDisabled = field.disabled || field.readonly || (field.technicianOnly && session?.user?.roles?.includes('technician') !== true);
    const isRequired = field.required && !isDisabled;

    // Always use ApproverTagSelect for Select Approvers if type is 'input-list' and label matches
   if (field.type === 'input-list' && field.label.toLowerCase().includes('approver')) {
  // Value should be an array of approver IDs
  const approverIds = Array.isArray(value) ? value : [];
  return (
    <ApproverTagSelect
      selectedApproverIds={approverIds}
      onChange={(ids) => handleFieldChange(field.id, ids)}
      users={allUsers}
      disabled={isDisabled}
      placeholder="Search by name, email, or department"
    />
  );
}

    // ...existing code...
    switch (field.type) {
      case 'text':
      case 'email':
      case 'url':
        return (
          <Input
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            disabled={isDisabled}
            required={isRequired}
            type={field.type}
            className={`w-full bg-white/70 border-slate-200 focus:border-slate-400 ${isDisabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}
          />
        );

      case 'phone':
        return (
          <Input
            placeholder={field.placeholder || 'Enter phone number'}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            disabled={isDisabled}
            required={isRequired}
            type="tel"
            className={`w-full bg-white/70 border-slate-200 focus:border-slate-400 ${isDisabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}
          />
        );

      case 'textarea':
      case 'richtext':
        if (field.type === 'richtext') {
          return (
            <RichTextEditor
              value={value}
              onChange={(val) => handleFieldChange(field.id, val)}
              placeholder={field.placeholder}
              disabled={isDisabled}
              className="bg-white/70 border-slate-200"
            />
          );
        }
        return (
          <Textarea
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            disabled={isDisabled}
            required={isRequired}
            rows={4}
            className={`w-full bg-white/70 border-slate-200 focus:border-slate-400 ${isDisabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}
          />
        );

      case 'select':
        return (
          <Select 
            value={value} 
            onValueChange={(val) => handleFieldChange(field.id, val)} 
            disabled={isDisabled}
            required={isRequired}
          >
            <SelectTrigger className={`bg-white/70 border-slate-200 focus:border-slate-400 ${isDisabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}>
              <SelectValue placeholder={`${field.label.charAt(0).toUpperCase() + field.label.slice(1)}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option: string) => (
                <SelectItem key={option} value={option.toLowerCase().replace(/\s+/g, '-')}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'priority':
        return (
          <Select 
            value={value} 
            onValueChange={(val) => handleFieldChange(field.id, val)} 
            disabled={isDisabled}
            required={isRequired}
          >
            <SelectTrigger className={`bg-white/70 border-slate-200 focus:border-slate-400 ${isDisabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}>
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option: string) => (
                <SelectItem key={option} value={option.toLowerCase()}>
                  <div className="flex items-center gap-2">
                    <Badge className={getPriorityColor(option)} variant="outline">
                      {option}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'status':
        return (
          <Select 
            value={value} 
            onValueChange={(val) => handleFieldChange(field.id, val)} 
            disabled={isDisabled}
            required={isRequired}
          >
            <SelectTrigger className={`bg-white/70 border-slate-200 focus:border-slate-400 ${isDisabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option: string) => (
                <SelectItem key={option} value={option.toLowerCase().replace(/\s+/g, '-')}>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(option)} variant="outline">
                      {option}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'group':
        return (
          <Select 
            value={value} 
            onValueChange={(val) => handleFieldChange(field.id, val)} 
            disabled={isDisabled}
            required={isRequired}
          >
            <SelectTrigger className={`bg-white/70 border-slate-200 focus:border-slate-400 ${isDisabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}>
              <SelectValue placeholder="Select support group" />
            </SelectTrigger>
            <SelectContent>
              {supportGroups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <div>
                      <div className="font-medium">{group.name}</div>
                      <div className="text-sm text-gray-500">{group.description}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'technician':
        return (
          <Select 
            value={value || ""} 
            onValueChange={(val) => handleFieldChange(field.id, val === "none" ? "" : val)} 
            disabled={isDisabled}
            required={isRequired}
          >
            <SelectTrigger className={`bg-white/70 border-slate-200 focus:border-slate-400 ${isDisabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}>
              <SelectValue placeholder="Select technician or leave for automatic assignment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <div>
                    <div className="font-medium">None (Automatic Assignment)</div>
                    <div className="text-sm text-gray-500">System will auto-assign a technician</div>
                  </div>
                </div>
              </SelectItem>
              {technicians.map((tech) => (
                <SelectItem key={tech.id} value={tech.id}>
                  <div className="flex items-center gap-2 py-1">
                    <User className="h-4 w-4 shrink-0 text-gray-600" />
                    <div className="flex flex-col">
                      <span className="font-medium leading-tight">{tech.displayName} •  {tech.employeeId} • {tech.department?.name}</span>
                    </div>
                  </div>
                </SelectItem>

              ))}
            </SelectContent>
          </Select>
        );

      case 'email-list':
      case 'emails':
        const currentEmails = Array.isArray(value) ? value : (value ? [value] : []);
        return (
          <EmailTagInput
            emails={currentEmails}
            onChange={(emails) => handleFieldChange(field.id, emails)}
            placeholder="Enter email address and press Enter or click +"
            disabled={isDisabled}
          />
        );

    case 'approvers':
    case 'approver-list': {
      // Value should be an array of approver IDs
      const approverIds = Array.isArray(value) ? value : [];
      return (
        <ApproverTagSelect
          selectedApproverIds={approverIds}
          onChange={(ids) => handleFieldChange(field.id, ids)}
          users={allUsers}
          disabled={isDisabled}
          placeholder="Search by name, email, or department"
        />
      );
    }

      case 'category':
        return (
          <Input
            value={value || field.defaultValue || 'No category selected'}
            placeholder="No category selected"
            disabled={true}
            readOnly={true}
            className="w-full bg-blue-50 border-blue-200 text-blue-700"
          />
        );

      case 'multiselect':
        return (
          <div className={`space-y-2 ${isDisabled ? 'opacity-60' : ''}`}>
            {field.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Checkbox 
                  id={`${field.id}-${index}`}
                  checked={Array.isArray(value) && value.includes(option)}
                  onCheckedChange={(checked) => {
                    const currentValues = Array.isArray(value) ? value : [];
                    if (checked) {
                      handleFieldChange(field.id, [...currentValues, option]);
                    } else {
                      handleFieldChange(field.id, currentValues.filter((v: string) => v !== option));
                    }
                  }}
                  disabled={isDisabled}
                />
                <Label htmlFor={`${field.id}-${index}`} className={isDisabled ? 'opacity-60' : ''}>
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            disabled={isDisabled}
            required={isRequired}
            className={`w-full bg-white/70 border-slate-200 focus:border-slate-400 ${isDisabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}
          />
        );

      case 'time':
        return (
          <Input
            type="time"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            disabled={isDisabled}
            required={isRequired}
            className={`w-full bg-white/70 border-slate-200 focus:border-slate-400 ${isDisabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}
          />
        );

      default:
        return (
          <Input
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            disabled={isDisabled}
            required={isRequired}
            className={`w-full bg-white/70 border-slate-200 focus:border-slate-400 ${isDisabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}
          />
        );
    }
  };

  if (loading) {
    return (
      <SessionWrapper>
        <div className="container mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </SessionWrapper>
    );
  }

  if (!templateData) {
    return (
      <SessionWrapper>
        <div className="container mx-auto p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Template not found or failed to load.
            </AlertDescription>
          </Alert>
        </div>
      </SessionWrapper>
    );
  }

  return (
    <SessionWrapper>
      <style jsx global>{quillStyles}</style>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
       
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    {templateData.name}
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">{templateData.description}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto p-6">
          

          {/* Template Info Alert */}
              {slaData && (
                <Alert className="mb-6 border-amber-200 bg-amber-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="flex items-center justify-between text-amber-900">
                    <div>
                      <strong>{templateData.type === 'service' ? 'Service' : 'Incident'} Template:</strong> {templateData.name} |
                      <strong> Category:</strong> {templateData.type} |
                      {templateData.slaService && (
                        <>
                          <strong> SLA:</strong> {templateData.slaService.name}
                          (Resolution: {formatDurationFromHours(templateData.slaService.resolutionTime)})
                        </>
                      )}
                      {templateData.selectedTemplate && (
                        <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-700 border-amber-300 status-badge">Requires Approval</Badge>
                      )}
                    
                    </div>
                  </AlertDescription>
                </Alert>
              )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Main Form Card */}
            <Card className="bg-white/70 backdrop-blur-sm border-slate-200/60 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {requestType === 'incident' ? 'Incident Report Details' : 'Service Request Details'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                {Array.isArray(templateData.fields) ? templateData.fields
                  .filter((field) => !field.label.toLowerCase().includes('resolution') && field.type !== 'resolution')
                  .map((field) => (
                  <div key={field.id} className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      {field.type === 'email' && <Mail className="h-4 w-4 text-slate-600" />}
                      {(field.type === 'email-list' || field.type === 'emails') && <Mail className="h-4 w-4 text-slate-600" />}
                      {field.type === 'phone' && <Phone className="h-4 w-4 text-slate-600" />}
                      {field.type === 'date' && <Calendar className="h-4 w-4 text-slate-600" />}
                      {field.type === 'location' && <MapPin className="h-4 w-4 text-slate-600" />}
                      {field.type === 'category' && <Tag className="h-4 w-4 text-slate-600" />}
                      {field.type === 'group' && <Users className="h-4 w-4 text-slate-600" />}
                      {field.type === 'technician' && <User className="h-4 w-4 text-slate-600" />}
                      {(field.type === 'approvers' || field.type === 'approver-list') && <Users className="h-4 w-4 text-slate-600" />}
                      
                      {field.label}
                      {field.required && <span className="text-red-500">*</span>}
                      
                      {field.helpText && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-slate-400 hover:text-slate-600 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-md p-3 text-wrap break-words">
                              <p className="text-sm whitespace-pre-wrap">{field.helpText}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </label>
                    
                    {renderField(field)}
                  </div>
                )) : (
                  <div className="text-center py-8">
                    <p className="text-slate-500">No form fields available for this template.</p>
                  </div>
                )}

                {/* Attachments Section within main form */}
                <div className="pt-6 border-t border-slate-200">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2 mb-4">
                    <Paperclip className="h-4 w-4 text-slate-600" />
                    Attachments
                  </label>
                  <div className="space-y-4">
                    <div 
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                        dragActive 
                          ? 'border-slate-400 bg-slate-50' 
                          : 'border-slate-300 bg-white/50 hover:border-slate-400 hover:bg-slate-50'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => {
                        fileInputRef.current?.click();
                      }}
                    >
                      <Upload className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                      <p className="text-sm text-slate-600 mb-2">
                        Drag and drop files here, or click to browse
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt,.zip"
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        className="border-slate-300 text-slate-700 hover:bg-slate-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                      >
                        Browse Files
                      </Button>
                      <p className="text-xs text-slate-500 mt-2">Maximum file size: 10MB</p>
                    </div>
                    
                    {uploadedFiles.length > 0 && (
                      <div className="space-y-2">
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-white/70 rounded border border-slate-200">
                            <div className="flex items-center gap-2">
                              <Paperclip className="h-4 w-4 text-slate-400" />
                              <span className="text-sm text-slate-700">{file.name}</span>
                              <span className="text-xs text-slate-500">
                                ({(file.size / 1024 / 1024).toFixed(2)} MB)
                              </span>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removeFile(index)}
                              className="text-red-500 hover:text-red-600"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex gap-4 pt-6">
              <Button 
                type="submit" 
                disabled={submitting} 
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {requestType === 'incident' ? 'Submitting Incident Report...' : 'Submitting Service Request...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {requestType === 'incident' ? 'Submit Incident Report' : 'Submit Service Request'}
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()} className="border-slate-300 text-slate-700 hover:bg-slate-50">
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </SessionWrapper>
  );
}
