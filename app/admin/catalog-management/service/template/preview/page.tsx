"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Eye, Settings, User, Wrench, FileText, Upload, Star, Calendar, Clock, CheckSquare, Type, Hash, Mail, Phone, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { SessionWrapper } from '@/components/session-wrapper';

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
        
        // Initialize form data with default values, especially for category fields
        const initialFormData: Record<string, any> = {};
        parsedTemplate.fields?.forEach((field: FormField) => {
          if (field.type === 'category') {
            // Priority 1: Use the selected category name from the builder
            if (parsedTemplate.selectedCategoryName) {
              initialFormData[field.id] = parsedTemplate.selectedCategoryName;
            }
            // Priority 2: Use the field's default value
            else if (field.defaultValue) {
              initialFormData[field.id] = field.defaultValue;
            }
          } else if (field.defaultValue) {
            initialFormData[field.id] = field.defaultValue;
          }
        });
        setFormData(initialFormData);
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
      case 'status':
      case 'request_type':
      case 'mode':
      case 'group':
      case 'technician':
        if (field.type === 'priority') {
          return (
            <div className="space-y-2">
              <Select value={value} onValueChange={(val) => handleFieldChange(field.id, val)} disabled={disabled}>
                <SelectTrigger className={`w-full ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}>
                  <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {(field.options || PRIORITY_OPTIONS)?.map((option: string) => (
                    <SelectItem key={option} value={option} title={PRIORITY_HELP_TEXT[option] || ''}>
                      <div className="flex items-center gap-2">
                        <Star className={`w-3 h-3 ${
                          option === 'Top' ? 'text-red-500' :
                          option === 'High' ? 'text-orange-500' :
                          option === 'Medium' ? 'text-yellow-500' : 'text-green-500'
                        }`} />
                        {option}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        } else if (field.type === 'status') {
          return (
            <Select value={value} onValueChange={(val) => handleFieldChange(field.id, val)} disabled={disabled}>
              <SelectTrigger className={`w-full ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}>
                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {(field.options || REQUEST_STATUS_OPTIONS)?.map((option: string) => (
                  <SelectItem key={option} value={option}>
                    <div className="flex items-center gap-2">
                      <CheckSquare className={`w-3 h-3 ${
                        option === 'Closed' ? 'text-green-500' :
                        option === 'Open' ? 'text-blue-500' :
                        option === 'On-Hold' ? 'text-yellow-500' :
                        option === 'For Approval' ? 'text-purple-500' : 'text-gray-500'
                      }`} />
                      {option}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        } else if (field.type === 'mode') {
          return (
            <Select value={value} onValueChange={(val) => handleFieldChange(field.id, val)} disabled={disabled}>
              <SelectTrigger className={`w-full ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}>
                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {(field.options || MODE_OPTIONS)?.map((option: string) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        } else if (field.type === 'request_type') {
          return (
            <Input
              value={value || field.defaultValue || 'Service'}
              disabled={true}
              readOnly={true}
              placeholder="Service (locked for service templates)"
              className={`w-full bg-gray-100 text-gray-600 ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            />
          );
        } else {
          return (
            <Select value={value} onValueChange={(val) => handleFieldChange(field.id, val)} disabled={disabled}>
              <SelectTrigger className={`w-full ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}>
                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option: string) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }

      case 'category':
        return (
          <Input
            value={(() => {
              // Priority 1: Check form data first (this is where we set the selected category)
              if (formData[field.id] && formData[field.id].trim() !== '') {
                return formData[field.id];
              }
              // Priority 2: Check field's default value
              if (field.defaultValue && field.defaultValue.trim() !== '') {
                return field.defaultValue;
              }
              // Priority 3: Show first option if available
              if (field.options && field.options.length > 0) {
                return field.options[0];
              }
              return 'No category selected';
            })()}
            placeholder="No category selected"
            disabled={true}
            readOnly={true}
            className={`w-full bg-blue-50 border-blue-200 text-blue-700 ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          />
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
          color: #3b82f6;
        }
        
        .rich-text-editor .ql-toolbar button.ql-active {
          background-color: #dbeafe;
          color: #3b82f6;
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
        <div className="bg-white/70 backdrop-blur-sm border-b border-purple-200/60 sticky top-0 z-40">
          <div className="w-full px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={() => {
                    // Preserve current URL parameters when going back to builder
                    const currentParams = new URLSearchParams(window.location.search);
                    const builderUrl = currentParams.toString() 
                      ? `/admin/catalog-management/service/template/builder?${currentParams.toString()}`
                      : '/admin/catalog-management/service/template/builder';
                    
                    router.push(builderUrl);
                  }}
                  className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Builder
                </Button>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Template Preview</h1>
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
                    className={`px-4 ${currentView === 'user' ? 'bg-blue-500 text-white hover:bg-blue-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
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
                    
                    // Preserve current URL parameters when going to edit
                    const currentParams = new URLSearchParams(window.location.search);
                    const builderUrl = currentParams.toString() 
                      ? `/admin/catalog-management/service/template/builder?${currentParams.toString()}`
                      : '/admin/catalog-management/service/template/builder';
                    
                    router.push(builderUrl);
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
                  <CardTitle className="text-xl font-bold text-gray-800 mb-2">
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
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={currentView === 'user' ? 'bg-blue-500 text-white' : 'bg-slate-600 text-white'}>
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

          {/* Form Preview */}
          <div className="space-y-6">
            {/* Unified Form */}
            {templateData.fields.length > 0 && (
              <Card className="border-0 bg-white/70 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                  Form Preview
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
                            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                              User Field
                            </Badge>
                          )}
                        </div>
                        
                        {renderField(field, isDisabled)}
                        
                        {field.helpText && (
                          <div className={`text-xs ${isDisabled ? 'text-gray-400' : 'text-slate-500'}`}>
                            {field.type === 'priority' ? (
                              <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed">
                                {field.helpText}
                              </pre>
                            ) : (
                              <p>
                                {field.type === 'priority' ? 
                                  `Select from: Low - Affects only you as an individual, Medium - Affects the delivery of your services, High - Affects the company's business, Top - Utmost action needed as classified by Management` 
                                  : field.helpText
                                }
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Form Actions */}
                  <div className="flex justify-between pt-6 border-t border-purple-200">
                    {/* <Button variant="outline">
                      Save as Draft
                    </Button> */}

                    <> <p>  </p></>
                    <div className="flex gap-3">
                      <Button variant="outline">
                        Cancel
                      </Button>
                      {currentView === 'user' ? (
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
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
                  <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-medium text-slate-600 mb-2">No Fields</h3>
                  <p className="text-slate-500">This template has no fields configured yet.</p>
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
