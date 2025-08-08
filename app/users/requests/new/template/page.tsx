'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeft, Paperclip, Upload, X, Plus, AlertCircle, User, FileText, Mail, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

// Dynamically import ReactQuill
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

// Quill styles
const quillStyles = `
  .ql-editor {
    min-height: 200px;
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

interface Template {
  id: number;
  name: string;
  description: string;
  icon: string;
  type: 'SERVICE' | 'INCIDENT';
  category: {
    name: string;
  };
  sla?: {
    name: string;
    responseTime: number;
    resolutionTime: number;
  };
  requiresApproval: boolean;
  userViewConfig: {
    [key: string]: {
      visible: boolean;
      editable: boolean;
      required: boolean;
      defaultValue?: string;
    };
  };
  supportGroups: string[];
}

export default function RequestForm() {
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    requesterName: 'John Doe',
    priority: 'MEDIUM',
    mode: 'SELF_SERVICE_PORTAL',
    requestType: 'SERVICE', // Will be set based on template type
    status: 'OPEN',
    category: '',
    technician: '',
    subject: '',
    description: '',
    emailNotifications: [] as string[],
    approvers: []
  });

  const [dragActive, setDragActive] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [emailError, setEmailError] = useState('');

  const searchParams = useSearchParams();
  const router = useRouter();
  const templateId = searchParams?.get('template');

  // Load template configuration
  useEffect(() => {
    if (templateId) {
      setLoading(true);
      
      // Mock template data - This would typically fetch from an API
      const getTemplateById = (id: string): Template => {
        const templates = {
          // Service Templates
          '1': {
            id: 1,
            name: 'New User Account Request',
            description: 'Request a new user account with system access',
            icon: '/serviceicons/account-creation-in-ad.svg',
            type: 'SERVICE' as const,
            category: { name: 'User Management' },
            sla: { name: 'Standard', responseTime: 60, resolutionTime: 480 },
            requiresApproval: true,
            userViewConfig: {
              requesterName: { visible: true, editable: false, required: true, defaultValue: 'John Doe' },
              priority: { visible: false, editable: false, required: true, defaultValue: 'MEDIUM' },
              mode: { visible: false, editable: false, required: true, defaultValue: 'SELF_SERVICE_PORTAL' },
              requestType: { visible: false, editable: false, required: true, defaultValue: 'SERVICE' },
              status: { visible: false, editable: false, required: true, defaultValue: 'OPEN' },
              category: { visible: false, editable: false, required: true },
              technician: { visible: false, editable: false, required: false },
              subject: { visible: true, editable: true, required: true },
              description: { visible: true, editable: true, required: true },
              emailNotifications: { visible: true, editable: true, required: false },
              approvers: { visible: true, editable: true, required: false }
            },
            supportGroups: ['IT Helpdesk', 'User Management']
          },
          '6': {
            id: 6,
            name: 'Software Installation Request',
            description: 'Install new software applications on user devices',
            icon: '/serviceicons/software-installation.svg',
            type: 'SERVICE' as const,
            category: { name: 'Software & Licensing' },
            sla: { name: 'Standard', responseTime: 120, resolutionTime: 720 },
            requiresApproval: true,
            userViewConfig: {
              requesterName: { visible: true, editable: false, required: true, defaultValue: 'John Doe' },
              priority: { visible: true, editable: true, required: true, defaultValue: 'MEDIUM' },
              mode: { visible: false, editable: false, required: true, defaultValue: 'SELF_SERVICE_PORTAL' },
              requestType: { visible: false, editable: false, required: true, defaultValue: 'SERVICE' },
              status: { visible: false, editable: false, required: true, defaultValue: 'OPEN' },
              category: { visible: false, editable: false, required: true },
              technician: { visible: false, editable: false, required: false },
              subject: { visible: true, editable: true, required: true },
              description: { visible: true, editable: true, required: true },
              emailNotifications: { visible: true, editable: true, required: false },
              approvers: { visible: true, editable: true, required: false }
            },
            supportGroups: ['IT Helpdesk', 'Software Team']
          },
          // Incident Templates
          '24': {
            id: 24,
            name: 'Computer Not Starting',
            description: 'Desktop or laptop computer fails to boot or start',
            icon: '/serviceicons/desktop.png',
            type: 'INCIDENT' as const,
            category: { name: 'Hardware Issues' },
            sla: { name: 'High Priority', responseTime: 30, resolutionTime: 240 },
            requiresApproval: false,
            userViewConfig: {
              requesterName: { visible: true, editable: false, required: true, defaultValue: 'John Doe' },
              priority: { visible: true, editable: true, required: true, defaultValue: 'HIGH' },
              mode: { visible: false, editable: false, required: true, defaultValue: 'SELF_SERVICE_PORTAL' },
              requestType: { visible: false, editable: false, required: true, defaultValue: 'INCIDENT' },
              status: { visible: false, editable: false, required: true, defaultValue: 'OPEN' },
              category: { visible: false, editable: false, required: true },
              technician: { visible: false, editable: false, required: false },
              subject: { visible: true, editable: true, required: true },
              description: { visible: true, editable: true, required: true },
              emailNotifications: { visible: true, editable: true, required: false },
              approvers: { visible: false, editable: false, required: false }
            },
            supportGroups: ['Hardware Team', 'IT Support']
          },
          '25': {
            id: 25,
            name: 'Monitor Display Issues',
            description: 'Monitor showing no display, flickering, or distorted image',
            icon: '/serviceicons/monitor.png',
            type: 'INCIDENT' as const,
            category: { name: 'Hardware Issues' },
            sla: { name: 'Standard', responseTime: 60, resolutionTime: 480 },
            requiresApproval: false,
            userViewConfig: {
              requesterName: { visible: true, editable: false, required: true, defaultValue: 'John Doe' },
              priority: { visible: true, editable: true, required: true, defaultValue: 'MEDIUM' },
              mode: { visible: false, editable: false, required: true, defaultValue: 'SELF_SERVICE_PORTAL' },
              requestType: { visible: false, editable: false, required: true, defaultValue: 'INCIDENT' },
              status: { visible: false, editable: false, required: true, defaultValue: 'OPEN' },
              category: { visible: false, editable: false, required: true },
              technician: { visible: false, editable: false, required: false },
              subject: { visible: true, editable: true, required: true },
              description: { visible: true, editable: true, required: true },
              emailNotifications: { visible: true, editable: true, required: false },
              approvers: { visible: false, editable: false, required: false }
            },
            supportGroups: ['Hardware Team', 'IT Support']
          }
        };

        return templates[id as keyof typeof templates] || templates['1'];
      };

      const mockTemplate = getTemplateById(templateId);

      setTimeout(() => {
        setTemplate(mockTemplate);
        setFormData(prev => ({
          ...prev,
          category: mockTemplate.category.name,
          requestType: mockTemplate.type,
          status: 'OPEN',
          ...Object.keys(mockTemplate.userViewConfig).reduce((acc, key) => {
            const config = mockTemplate.userViewConfig[key];
            if (config.defaultValue) {
              acc[key as keyof typeof acc] = config.defaultValue as any;
            }
            return acc;
          }, {} as any)
        }));
        setLoading(false);
      }, 1000);
    }
  }, [templateId]);

  // Check if field should be visible/editable based on template config
  const getFieldConfig = (fieldName: string) => {
    if (!template) return { visible: true, editable: true, required: false };
    return template.userViewConfig[fieldName] || { visible: true, editable: true, required: false };
  };

  // Email validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    return emailRegex.test(email);
  };

  const addEmail = useCallback(() => {
    if (!emailInput.trim()) return;
    
    if (!validateEmail(emailInput)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    if (formData.emailNotifications.includes(emailInput)) {
      setEmailError('Email already added');
      return;
    }

    setFormData(prev => ({
      ...prev,
      emailNotifications: [...prev.emailNotifications, emailInput]
    }));
    setEmailInput('');
    setEmailError('');
  }, [emailInput, formData.emailNotifications]);

  const removeEmail = useCallback((emailToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      emailNotifications: prev.emailNotifications.filter(email => email !== emailToRemove)
    }));
  }, []);

  const handleEmailKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail();
    }
  }, [addEmail]);

  // File upload handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });

    setUploadedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = useCallback((index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // ReactQuill configuration
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image'],
      [{ 'align': [] }],
      [{ 'color': [] }, { 'background': [] }],
      ['clean']
    ],
  }), []);

  const formats = [
    'header', 'font', 'size', 'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'link', 'image', 'align', 'color', 'background'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!template) {
      alert('Template not found');
      return;
    }
    
    try {
      setLoading(true);
      
      // Prepare the request data
      const requestData = {
        templateId: template.id,
        templateName: template.name,
        type: template.type.toLowerCase(),
        formData: formData,
        attachments: uploadedFiles.map(file => file.name), // Include attachment file names for now
      };
      
      console.log('Submitting request:', requestData);
      
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit request');
      }
      
      const result = await response.json();
      console.log('Request submitted successfully:', result);
      
      // Show success message
      alert(`${template.type === 'SERVICE' ? 'Request' : 'Incident'} submitted successfully!`);
      
      // Redirect to the requests tab
      router.push('/users?tab=requests');
      
    } catch (error) {
      console.error('Error submitting request:', error);
      alert("Failed to submit request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
        <div className="container mx-auto p-6">
          <Skeleton className="h-8 w-64 mb-6" />
          <Card className="max-w-4xl mx-auto bg-white/70 backdrop-blur-sm shadow-lg border border-white/20">
            <CardContent className="p-6">
              <div className="space-y-6">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
      <style dangerouslySetInnerHTML={{ __html: quillStyles }} />
      
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/requests/new">
                <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Templates
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  {template ? template.name : 'Create Request'}
                </h1>
                {template && (
                  <p className="text-xs text-slate-500 mt-1">{template.description}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto p-6">

        {/* Template Info */}
        {template && (
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="flex items-center justify-between text-amber-900">
              <div>
                <strong>{template.type === 'SERVICE' ? 'Service' : 'Incident'} Template:</strong> {template.name} | 
                <strong> Category:</strong> {template.category.name} |
                {template.sla && (
                  <>
                    <strong> SLA:</strong> {template.sla.name} 
                    (Response: {Math.floor(template.sla.responseTime / 60)}h, 
                    Resolution: {Math.floor(template.sla.resolutionTime / 60)}h)
                  </>
                )}
                {template.requiresApproval && (
                  <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-700 border-amber-300 status-badge">Requires Approval</Badge>
                )}
                <Badge variant="outline" className="ml-2 bg-amber-200 text-amber-800 border-amber-400">
                  {template.type}
                </Badge>
              </div>
              <Link href={`/admin/service-catalog/template/${template.id}`}>
                <Button size="sm" variant="ghost">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Card className="bg-white/70 backdrop-blur-sm shadow-lg border border-white/20">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {template?.type === 'SERVICE' ? 'Service Request Details' : 'Incident Report Details'}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="p-6 space-y-6">
              {/* Requester Name */}
              {getFieldConfig('requesterName').visible && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-600" />
                    Requester Name
                    {getFieldConfig('requesterName').required && <span className="text-red-500">*</span>}
                  </label>
                  <Input
                    value={formData.requesterName}
                    onChange={(e) => setFormData(prev => ({ ...prev, requesterName: e.target.value }))}
                    disabled={!getFieldConfig('requesterName').editable}
                    required={getFieldConfig('requesterName').required}
                    className="bg-white/70 border-slate-200 focus:border-slate-400"
                  />
                </div>
              )}

              {/* Priority */}
              {getFieldConfig('priority').visible && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Priority
                    {getFieldConfig('priority').required && <span className="text-red-500">*</span>}
                  </label>
                  <Select 
                    value={formData.priority} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                    disabled={!getFieldConfig('priority').editable}
                  >
                    <SelectTrigger className="bg-white/70 border-slate-200 focus:border-slate-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Subject */}
              {getFieldConfig('subject').visible && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Subject
                    {getFieldConfig('subject').required && <span className="text-red-500">*</span>}
                  </label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    disabled={!getFieldConfig('subject').editable}
                    required={getFieldConfig('subject').required}
                    className="bg-white/70 border-slate-200 focus:border-slate-400"
                    placeholder="Brief description of your request"
                  />
                </div>
              )}

              {/* Description */}
              {getFieldConfig('description').visible && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Description
                    {getFieldConfig('description').required && <span className="text-red-500">*</span>}
                  </label>
                  <div className="border border-slate-200 rounded-lg bg-white/70 overflow-hidden">
                    <ReactQuill
                      theme="snow"
                      value={formData.description}
                      onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
                      modules={modules}
                      formats={formats}
                      readOnly={!getFieldConfig('description').editable}
                      placeholder="Provide detailed information about your request..."
                    />
                  </div>
                </div>
              )}

              {/* Email Notifications */}
              {getFieldConfig('emailNotifications').visible && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-600" />
                    Email Notifications
                    {getFieldConfig('emailNotifications').required && <span className="text-red-500">*</span>}
                  </label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          type="email"
                          placeholder="Enter email address"
                          value={emailInput}
                          onChange={(e) => {
                            setEmailInput(e.target.value);
                            setEmailError('');
                          }}
                          onKeyPress={handleEmailKeyPress}
                          disabled={!getFieldConfig('emailNotifications').editable}
                          className="bg-white/70 border-slate-200 focus:border-slate-400"
                        />
                        {emailError && (
                          <p className="text-red-500 text-xs mt-1">{emailError}</p>
                        )}
                      </div>
                      <Button 
                        type="button" 
                        onClick={addEmail}
                        disabled={!getFieldConfig('emailNotifications').editable}
                        className="bg-slate-600 hover:bg-slate-700 text-white"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {formData.emailNotifications.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.emailNotifications.map((email, index) => (
                          <Badge 
                            key={index} 
                            variant="secondary" 
                            className="flex items-center gap-1 bg-slate-100 text-slate-700"
                          >
                            {email}
                            {getFieldConfig('emailNotifications').editable && (
                              <button
                                type="button"
                                onClick={() => removeEmail(email)}
                                className="ml-1 hover:text-red-500"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* File Attachments */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-slate-600" />
                  Attachments
                </label>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    dragActive 
                      ? 'border-slate-400 bg-slate-50' 
                      : 'border-slate-300 bg-white/50'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                  <p className="text-sm text-slate-600 mb-2">
                    Drag and drop files here, or click to browse
                  </p>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button type="button" variant="outline" size="sm" asChild className="border-slate-300 text-slate-700 hover:bg-slate-50">
                      <span className="cursor-pointer">Browse Files</span>
                    </Button>
                  </label>
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

              {/* Support Groups Info */}
              {template && template.supportGroups.length > 0 && (
                <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-4">
                  <h4 className="font-medium text-slate-900 mb-2">Support Groups</h4>
                  <div className="flex flex-wrap gap-2">
                    {template.supportGroups.map((group, index) => (
                      <Badge key={index} variant="outline" className="bg-slate-100 text-slate-700">
                        {group}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-6">
                <Button
                  type="submit"
                  className="flex-1 bg-slate-600 hover:bg-slate-700 text-white"
                >
                  {template?.type === 'SERVICE' ? 'Submit Request' : 'Report Incident'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
