"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Eye, Settings, User, Wrench, FileText, Upload, Star, Calendar, Clock, CheckSquare, Type, Hash, Mail, Phone, MapPin, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { 
  ssr: false,
  loading: () => <div className="h-32 bg-slate-50 rounded border animate-pulse" />
});

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
  useEffect(() => {
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
  technicianOnly: boolean;
  helpText?: string;
  defaultValue?: string;
  readonly?: boolean;
  disabled?: boolean;
}

interface TemplateData {
  name: string;
  description: string;
  category: string;
  fields: FormField[];
  selectedTemplate?: string;
}

// Default template if no data is available
const defaultTemplate: TemplateData = {
  name: 'New Incident Template',
  description: 'Template for reporting incidents',
  category: 'General',
  fields: [
    {
      id: '1',
      type: 'text',
      label: 'Incident Title',
      required: true,
      placeholder: 'Brief description of the incident',
      technicianOnly: false,
      helpText: 'Provide a clear, concise title for the incident'
    },
    {
      id: '2',
      type: 'textarea',
      label: 'Incident Description',
      required: true,
      placeholder: 'Detailed description of the incident...',
      technicianOnly: false,
      helpText: 'Describe the incident in detail including what happened, when, and any error messages'
    }
  ]
};

export default function IncidentTemplatePreviewPage() {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<'user' | 'technician'>('technician');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [templateData, setTemplateData] = useState<TemplateData>(defaultTemplate);

  // Load template data from localStorage on component mount
  useEffect(() => {
    const savedTemplate = localStorage.getItem('previewTemplate');
    if (savedTemplate) {
      try {
        const parsedTemplate = JSON.parse(savedTemplate);
        setTemplateData(parsedTemplate);
      } catch (error) {
        console.error('Failed to parse template data:', error);
        setTemplateData(defaultTemplate);
      }
    }
  }, []);

  const getUserFields = () => {
    return templateData.fields.filter(field => !field.technicianOnly);
  };

  const getTechnicianFields = () => {
    return templateData.fields.filter(field => field.technicianOnly);
  };

  const getAllFields = () => {
    return templateData.fields;
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-100 text-red-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderField = (field: FormField, disabled = false) => {
    const value = formData[field.id] || '';

    switch (field.type) {
      case 'text':
        return (
          <Input
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            disabled={disabled}
            className={`w-full ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}
          />
        );

      case 'email':
        return (
          <Input
            type="email"
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            disabled={disabled}
            className={`w-full ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}
          />
        );

      case 'phone':
        return (
          <Input
            type="tel"
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            disabled={disabled}
            className={`w-full ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            disabled={disabled}
            className={`w-full ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}
          />
        );

      case 'textarea':
        return (
          <RichTextEditor
            key={`${field.id}-${field.placeholder}`}
            placeholder={field.placeholder}
            value={value}
            onChange={(val) => handleFieldChange(field.id, val)}
            disabled={disabled}
            className={`min-h-[120px] ${disabled ? 'opacity-60' : ''}`}
          />
        );

      case 'richtext':
        return (
          <RichTextEditor
            key={`${field.id}-${field.placeholder}`}
            placeholder={field.placeholder}
            value={value}
            onChange={(val) => handleFieldChange(field.id, val)}
            disabled={disabled}
            className={`min-h-[120px] ${disabled ? 'opacity-60' : ''}`}
          />
        );

      case 'select':
      case 'priority':
        const selectOptions = (() => {
          const lowerLabel = field.label.toLowerCase();
          if (lowerLabel.includes('priority')) {
            return PRIORITY_OPTIONS;
          }
          if (lowerLabel.includes('status')) {
            return REQUEST_STATUS_OPTIONS;
          }
          if (lowerLabel.includes('mode') || lowerLabel.includes('request mode')) {
            return MODE_OPTIONS;
          }
          return field.options?.map(opt => ({ value: opt.toLowerCase().replace(/\s+/g, '-'), label: opt })) || [];
        })();

        return (
          <Select value={value} onValueChange={(val) => handleFieldChange(field.id, val)} disabled={disabled}>
            <SelectTrigger className={`w-full ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}>
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {selectOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {field.type === 'priority' && (
                    <div className="flex items-center gap-2">
                      <Star className={`w-3 h-3 ${
                        option.label === 'Critical' ? 'text-red-500' :
                        option.label === 'High' ? 'text-orange-500' :
                        option.label === 'Medium' ? 'text-yellow-500' : 'text-green-500'
                      }`} />
                      {option.label}
                    </div>
                  )}
                  {field.type !== 'priority' && option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multiselect':
        return (
          <div className={`space-y-2 ${disabled ? 'opacity-60' : ''}`}>
            {field.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Checkbox 
                  id={`${field.id}-${index}`}
                  checked={Array.isArray(value) && value.includes(option)}
                  onCheckedChange={(checked) => {
                    if (disabled) return;
                    const currentValues = Array.isArray(value) ? value : [];
                    if (checked) {
                      handleFieldChange(field.id, [...currentValues, option]);
                    } else {
                      handleFieldChange(field.id, currentValues.filter(v => v !== option));
                    }
                  }}
                  disabled={disabled}
                />
                <Label htmlFor={`${field.id}-${index}`} className={`text-sm ${disabled ? 'text-gray-400' : 'text-slate-700'}`}>{option}</Label>
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
            disabled={disabled}
            className={`w-full ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}
          />
        );

      case 'time':
        return (
          <Input
            type="time"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            disabled={disabled}
            className={`w-full ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}
          />
        );

      case 'file':
        return (
          <div className={`border-2 border-dashed ${disabled ? 'border-gray-300 bg-gray-100 opacity-60' : 'border-slate-300 hover:border-slate-400'} rounded-lg p-6 text-center transition-colors ${disabled ? 'cursor-not-allowed' : ''}`}>
            <Upload className={`w-8 h-8 ${disabled ? 'text-gray-400' : 'text-slate-400'} mx-auto mb-2`} />
            <p className={`text-sm ${disabled ? 'text-gray-400' : 'text-slate-600'} mb-2`}>
              {disabled ? 'File upload disabled' : 'Drop files here or click to browse'}
            </p>
            <Button variant="outline" size="sm" disabled={disabled}>
              Choose Files
            </Button>
          </div>
        );

      case 'user':
        return (
          <Select value={value} onValueChange={(val) => handleFieldChange(field.id, val)} disabled={disabled}>
            <SelectTrigger className={`w-full ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}>
              <SelectValue placeholder="Select user..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user1">John Doe</SelectItem>
              <SelectItem value="user2">Jane Smith</SelectItem>
              <SelectItem value="user3">Mike Johnson</SelectItem>
            </SelectContent>
          </Select>
        );

      case 'location':
        return (
          <div className={`flex items-center space-x-2 p-3 border border-slate-300 rounded-md ${disabled ? 'bg-gray-100 opacity-60 cursor-not-allowed' : 'bg-white hover:bg-slate-50 cursor-pointer'}`}>
            <MapPin className={`w-4 h-4 ${disabled ? 'text-gray-400' : 'text-slate-400'}`} />
            <span className={`text-sm ${disabled ? 'text-gray-400' : 'text-slate-500'}`}>
              {value || 'Click to select location'}
            </span>
          </div>
        );

      case 'dropdown':
        return (
          <Select value={value} onValueChange={(val) => handleFieldChange(field.id, val)} disabled={disabled}>
            <SelectTrigger className={`w-full ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}>
              <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
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

      case 'radio':
        return (
          <div className={`space-y-2 ${disabled ? 'opacity-60' : ''}`}>
            {field.options?.map((option: string, index: number) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  disabled={disabled}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                />
                <Label className={`text-sm ${disabled ? 'text-gray-400' : 'text-slate-700'}`}>{option}</Label>
              </div>
            ))}
          </div>
        );

      case 'checkbox':
        if (field.options && field.options.length > 0) {
          // Multiple checkboxes
          return (
            <div className={`space-y-2 ${disabled ? 'opacity-60' : ''}`}>
              {field.options.map((option: string, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`${field.id}-${index}`}
                    checked={Array.isArray(value) && value.includes(option)}
                    onCheckedChange={(checked) => {
                      if (disabled) return;
                      const currentValues = Array.isArray(value) ? value : [];
                      if (checked) {
                        handleFieldChange(field.id, [...currentValues, option]);
                      } else {
                        handleFieldChange(field.id, currentValues.filter(v => v !== option));
                      }
                    }}
                    disabled={disabled}
                  />
                  <Label htmlFor={`${field.id}-${index}`} className={`text-sm ${disabled ? 'text-gray-400' : 'text-slate-700'}`}>{option}</Label>
                </div>
              ))}
            </div>
          );
        } else {
          // Single checkbox
          return (
            <div className={`flex items-center space-x-2 ${disabled ? 'opacity-60' : ''}`}>
              <Checkbox 
                id={field.id}
                checked={value === true || value === 'true'}
                onCheckedChange={(checked) => {
                  if (disabled) return;
                  handleFieldChange(field.id, checked);
                }}
                disabled={disabled}
              />
              <Label htmlFor={field.id} className={`text-sm ${disabled ? 'text-gray-400' : 'text-slate-700'}`}>{field.label}</Label>
            </div>
          );
        }

      case 'url':
        return (
          <Input
            type="url"
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            disabled={disabled}
            className={`w-full ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}
          />
        );

      case 'datetime':
      case 'datetime-local':
        return (
          <Input
            type="datetime-local"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            disabled={disabled}
            className={`w-full ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}
          />
        );

      case 'image':
        return (
          <div className={`border-2 border-dashed ${disabled ? 'border-gray-300 bg-gray-100 opacity-60' : 'border-slate-300 hover:border-slate-400'} rounded-lg p-6 text-center transition-colors ${disabled ? 'cursor-not-allowed' : ''}`}>
            <Upload className={`w-8 h-8 ${disabled ? 'text-gray-400' : 'text-slate-400'} mx-auto mb-2`} />
            <p className={`text-sm ${disabled ? 'text-gray-400' : 'text-slate-600'} mb-2`}>
              {disabled ? 'Image upload disabled' : 'Drop images here or click to browse'}
            </p>
            <Button variant="outline" size="sm" disabled={disabled}>
              Choose Images
            </Button>
          </div>
        );

      case 'category':
        return (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">
              Category: {templateData?.category || 'General'}
            </Badge>
          </div>
        );

      case 'request_type':
        return (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">
              Request Type: Incident
            </Badge>
          </div>
        );

      case 'user_info':
        return (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
            <div className="space-y-1 text-sm text-gray-600">
              <div><strong>Name:</strong> [Current User Name]</div>
              <div><strong>Email:</strong> [Current User Email]</div>
              <div><strong>Department:</strong> [Current User Department]</div>
            </div>
          </div>
        );

      case 'auto_increment':
        return (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
            <span className="text-sm text-gray-600">
              Auto-generated: #{field.defaultValue || 'XXXX'}
            </span>
          </div>
        );

      case 'hidden':
        return (
          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-md">
            <span className="text-xs text-yellow-700">
              Hidden field: {field.label} (not visible to users)
            </span>
          </div>
        );

      default:
        return (
          <Input
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            disabled={disabled}
            className={`w-full ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}
          />
        );
    }
  };

  return (
    <SessionWrapper>
      <style jsx global>{`
        /* Rich Text Editor Styling - Aligned with Project Theme */
        .rich-text-editor .ql-editor {
          min-height: 120px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          font-size: 14px;
          line-height: 1.6;
          color: #1e293b;
          padding: 12px 16px;
          border: none;
          background: #ffffff;
        }
        
        .rich-text-editor .ql-toolbar {
          border: 1px solid #e2e8f0;
          border-bottom: none;
          border-radius: 8px 8px 0 0;
          background: #f8fafc;
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
          color: #64748b;
        }
        
        .rich-text-editor .ql-toolbar button:hover {
          background-color: #e2e8f0;
          color: #ef4444;
        }
        
        .rich-text-editor .ql-toolbar button.ql-active {
          background-color: #fef2f2;
          color: #ef4444;
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
          stroke: #3b82f6;
        }
        
        .rich-text-editor .ql-toolbar button.ql-active .ql-fill {
          fill: #3b82f6;
        }
        
        /* Remove default borders */
        .rich-text-editor .ql-container.ql-snow,
        .rich-text-editor .ql-toolbar.ql-snow {
          border: none;
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
          color: #1e293b;
        }
        
        .rich-text-editor .ql-picker-item:hover {
          background-color: #f1f5f9;
          color: #3b82f6;
        }
      `}</style>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
        {/* Header */}
        <div className="bg-white/70 backdrop-blur-sm border-b border-red-200/60 sticky top-0 z-40">
          <div className="w-full px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={() => router.push('/admin/catalog-management/incident/template/builder')}
                  className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Builder
                </Button>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">Incident Template Preview</h1>
                  <p className="text-xs text-gray-600">{templateData.name}</p>
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
                    <Wrench className="w-4 h-4 mr-2" />
                    Technician View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentView('user')}
                    className={`px-4 ${currentView === 'user' ? 'bg-red-500 text-white hover:bg-red-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
                  >
                    <User className="w-4 h-4 mr-2" />
                    Requester View
                  </Button>
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    // Save current template data for editing
                    localStorage.setItem('editTemplate', JSON.stringify(templateData));
                    router.push('/admin/catalog-management/incident/template/builder');
                  }}
                  className="border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Template
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-6">
          {/* Template Info */}
          <Card className="border-0 bg-white/70 backdrop-blur-sm hover:shadow-lg transition-all duration-300 mb-6">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    {templateData.name}
                  </CardTitle>
                  <p className="text-gray-600 mb-3">{templateData.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="bg-slate-100 text-slate-700">{templateData.category}</Badge>
                    <Badge variant="outline">
                      <FileText className="w-3 h-3 mr-1" />
                      {templateData.fields.length} fields
                    </Badge>
                    {templateData.selectedTemplate && (
                      <Badge variant="outline">
                        Template: {templateData.selectedTemplate}
                      </Badge>
                    )}
                    {templateData.approvalEnabled && (
                      <Badge className="bg-amber-100 text-amber-800">
                        Approval Required
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={currentView === 'user' ? 'bg-red-500 text-white' : 'bg-slate-600 text-white'}>
                    {currentView === 'user' ? (
                      <>
                        <User className="w-3 h-3 mr-1" />
                        Requester View
                      </>
                    ) : (
                      <>
                        <Wrench className="w-3 h-3 mr-1" />
                        Technician View
                      </>
                    )}
                  </Badge>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Approval Workflow Info */}
          {templateData.approvalEnabled && templateData.approvalLevels && templateData.approvalLevels.length > 0 && (
            <Card className="border-0 bg-white/70 backdrop-blur-sm hover:shadow-lg transition-all duration-300 mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-amber-600" />
                  Approval Workflow
                </CardTitle>
                <p className="text-sm text-gray-600">
                  This incident template requires approval through {templateData.approvalLevels.length} level(s).
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {templateData.approvalLevels.map((level: any, index: number) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-center justify-center w-6 h-6 bg-amber-200 text-amber-800 text-xs font-bold rounded-full">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{level.name}</p>
                        <p className="text-sm text-gray-600">{level.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Form Preview */}
          <div className="space-y-6">
            {/* Unified Form */}
            {templateData.fields.length > 0 && (
              <Card className="border-0 bg-white/70 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    Incident Report Form
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    {currentView === 'user' 
                      ? 'Fields visible to end users when reporting an incident.'
                      : 'Complete form view including all user and technician fields.'
                    }
                  </p>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {templateData.fields.map((field) => {
                    const isDisabled = currentView === 'user' && field.technicianOnly;
                    return (
                      <div key={field.id} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <label className={`text-sm font-medium ${isDisabled ? 'text-gray-400' : 'text-slate-700'}`}>
                            {field.label}
                          </label>
                          {field.required && <span className={`${isDisabled ? 'text-gray-400' : 'text-red-500'}`}>*</span>}
                          {field.technicianOnly ? (
                            <Badge variant="outline" className={`text-xs ${isDisabled ? 'bg-gray-100 text-gray-400 border-gray-300' : 'bg-slate-200 text-slate-700'}`}>
                              Technician Only
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs bg-red-100 text-red-700">
                              User Field
                            </Badge>
                          )}
                        </div>
                        
                        {renderField(field, isDisabled)}
                        
                        {field.helpText && (
                          <p className={`text-xs ${isDisabled ? 'text-gray-400' : 'text-slate-500'}`}>{field.helpText}</p>
                        )}
                      </div>
                    );
                  })}

                  {/* Form Actions */}
                  <div className="flex justify-between pt-6 border-t border-red-200">
                    {/* <Button variant="outline">
                      Save as Draft
                    </Button> */}
                     <> <p>  </p></>
                    <div className="flex gap-3">
                      <Button variant="outline">
                        Cancel
                      </Button>
                      {currentView === 'user' ? (
                        <Button className="bg-red-600 hover:bg-red-700 text-white">
                          Submit Incident Report
                        </Button>
                      ) : (
                        <Button className="bg-slate-600 hover:bg-slate-700 text-white">
                          Update & Process
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No Fields Message */}
            {templateData.fields.length === 0 && (
              <Card className="bg-white/80 backdrop-blur-sm shadow-lg border border-white/20">
                <CardContent className="text-center py-12">
                  <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-medium text-slate-600 mb-2">No Fields</h3>
                  <p className="text-slate-500">This incident template has no fields configured yet.</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* View Info */}
          <div className="mt-6 p-4 bg-slate-100 rounded-lg border border-slate-200">
            <div className="flex items-start gap-3">
              <Eye className="w-5 h-5 text-slate-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-slate-900 mb-1">Preview Information</h4>
                <p className="text-sm text-slate-700">
                  {currentView === 'user' 
                    ? `This preview shows all ${templateData.fields.length} fields. Technician-only fields (${templateData.fields.filter(field => field.technicianOnly).length}) are displayed but disabled for requesters.`
                    : `This preview shows all ${templateData.fields.length} fields in one unified form. Fields are marked as "User Field" or "Technician Only" to indicate visibility levels.`
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SessionWrapper>
  );
}
