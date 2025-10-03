'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { SessionWrapper } from '@/components/session-wrapper';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { 
  BarChart3, 
  Plus, 
  Eye,
  FileText,
  FileSpreadsheet,
  Play,
  Save,
  Folder,
  MoreVertical,
  Edit,
  Trash2,
  Loader2,
  FolderPlus,
  Filter
} from 'lucide-react';

interface ReportTemplate {
  id: number;
  name: string;
  description?: string;
  selectedFields: string[];
  filters?: {
    filters: any[];
    groupBy: string[];
    summaryType: string;
    chartType: string;
  };
  createdAt: string;
  isOwner?: boolean;
  status: string;
}

interface FolderData {
  id: string;
  name: string;
  reports?: Array<{
    id: string;
    name: string;
    createdAt: string;
    status: string;
    isOwner: boolean;
  }>;
}

interface FieldMapping {
  label: string;
  value: string;
  type?: string;
}

interface ReportData {
  [key: string]: any;
}

interface ReportConfig {
  columns: string[];
  filters: any[];
  groupBy: string[];
  summaryType: string;
  chartType: string;
}

interface FilterData {
  requestTypes: string[];
  requestStatuses: string[];
  approvalStatuses: string[];
  modes: string[];
  priorities: string[];
  departments: { id: number; name: string }[];
  users: { id: number; name: string; email: string; employeeId: string }[];
  templates: { id: number; name: string; type: string }[];
  serviceCategories: { id: number; name: string }[];
  technicians: { 
    id: number; 
    name: string; 
    email: string; 
    employeeId: string; 
    position: string; 
    department: string; 
    isAdmin: boolean; 
  }[];
}

const capitalizeWords = (str: string) => {
  return str.replace(/\b\w/g, l => l.toUpperCase());
};

const FolderTemplatesContent: React.FC<{
  selectedFolder: string | null;
  folders: FolderData[];
  reportTemplates: ReportTemplate[];
  handleNewReport: (folderId: string) => void;
  loadTemplate: (template: ReportTemplate, forEditing?: boolean) => void;
  setReportTemplates: React.Dispatch<React.SetStateAction<ReportTemplate[]>>;
  setFolders: React.Dispatch<React.SetStateAction<FolderData[]>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setReportData: React.Dispatch<React.SetStateAction<ReportData[]>>;
  setCurrentReportConfig: React.Dispatch<React.SetStateAction<ReportConfig | null>>;
  setShowReportResults: React.Dispatch<React.SetStateAction<boolean>>;
}> = ({
  selectedFolder,
  folders,
  reportTemplates,
  handleNewReport,
  loadTemplate,
  setReportTemplates,
  setFolders,
  setLoading,
  setReportData,
  setCurrentReportConfig,
  setShowReportResults
}) => {
  const selectedFolderData = folders.find(f => f.id === selectedFolder);
  const folderTemplates = selectedFolderData?.reports || [];
  
  const executeReport = async (template: any) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('fields', template.selectedFields.join(','));
      
      if (template.filters?.filters) {
        template.filters.filters.forEach((filter: any) => {
          if (filter.column && filter.criteria && filter.value) {
            if (filter.column.includes('Date') || filter.column === 'createdAt' || filter.column === 'updatedAt') {
              if (filter.criteria === 'greater_than') {
                params.append('startDate', filter.value);
              } else if (filter.criteria === 'less_than') {
                params.append('endDate', filter.value);
              }
            } else if (filter.column === 'status') {
              params.append('status', filter.value);
            } else if (filter.column === 'approvalStatus') {
              params.append('approvalStatus', filter.value);
            } else if (filter.criteria === 'contains') {
              params.append('search', filter.value);
            }
          }
        });
      }

      const response = await fetch(`/api/technician/reports?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        setReportData(data.records || []);
        setCurrentReportConfig({
          columns: template.selectedFields,
          filters: template.filters?.filters || [],
          groupBy: template.filters?.groupBy || [],
          summaryType: template.filters?.summaryType || '',
          chartType: template.filters?.chartType || ''
        });
        setShowReportResults(true);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to execute report');
      }
    } catch (error) {
      console.error('Error executing report:', error);
      alert('Failed to execute report');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = (template: any, fullTemplate: ReportTemplate | undefined) => {
    if (confirm('Are you sure you want to delete this template?')) {
      // Remove from localStorage mapping
      if (fullTemplate) {
        const templateFolderMap = JSON.parse(localStorage.getItem('templateFolderMap') || '{}');
        delete templateFolderMap[fullTemplate.id];
        localStorage.setItem('templateFolderMap', JSON.stringify(templateFolderMap));
      }
      
      setReportTemplates(prev => prev.filter(t => t.id !== fullTemplate?.id));
      setFolders(prevFolders => prevFolders.map(folder => {
        if (folder.id === selectedFolder) {
          return {
            ...folder,
            reports: folder.reports?.filter(r => r.id !== template.id) || []
          };
        }
        return folder;
      }));
    }
  };

  if (folderTemplates.length > 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {folderTemplates.length} template{folderTemplates.length !== 1 ? 's' : ''} in this folder
          </p>
          {folderTemplates.length > 0 && (
            <Button 
              onClick={() => selectedFolder && handleNewReport(selectedFolder)}
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Report
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {folderTemplates.map((template) => {
            const fullTemplate = reportTemplates.find(t => t.id.toString() === template.id);
            return (
              <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm">{template.name}</h4>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          if (fullTemplate) {
                            loadTemplate(fullTemplate, true);
                          }
                        }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          if (fullTemplate) {
                            loadTemplate(fullTemplate);
                            setTimeout(() => executeReport(fullTemplate), 100);
                          }
                        }}>
                          <Eye className="h-4 w-4 mr-2" />
                          Run Report
                        </DropdownMenuItem>
                        {template.isOwner && (
                          <DropdownMenuItem 
                            className="text-red-600" 
                            onClick={() => handleDeleteTemplate(template, fullTemplate)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {fullTemplate?.description || `Custom report with ${fullTemplate?.selectedFields?.length || 0} columns`}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{fullTemplate?.selectedFields?.length || 0} columns</span>
                    <span>{new Date(template.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">Private</Badge>
                    <Badge variant="outline" className="text-xs">{template.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  } else {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Templates in This Folder</h3>
        <p className="text-gray-600 mb-6">
          This folder doesn't contain any report templates yet.
        </p>
      </div>
    );
  }
};

export default function TechnicianReportsPage() {
  const { data: session, status } = useSession();
  
  // Helper function to preserve description formatting including indentation and bullets
  const preserveDescriptionFormatting = (description: string) => {
    if (!description) return 'N/A';
    
    // Convert HTML to text while preserving structure and formatting
    let formatted = description
      // Convert HTML breaks to newlines
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<\/div>/gi, '\n')
      .replace(/<div[^>]*>/gi, '')
      
      // Convert HTML lists to text bullets
      .replace(/<ul[^>]*>/gi, '')
      .replace(/<\/ul>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<\/li>/gi, '\n')
      
      // Convert ordered lists to numbered bullets  
      .replace(/<ol[^>]*>/gi, '')
      .replace(/<\/ol>/gi, '\n')
      
      // Preserve headings with formatting
      .replace(/<h[1-6][^>]*>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, ':\n')
      
      // Remove strong/bold formatting markers
      .replace(/<strong[^>]*>/gi, '')
      .replace(/<\/strong>/gi, '')
      .replace(/<b[^>]*>/gi, '')
      .replace(/<\/b>/gi, '')
      
      // Remove emphasis/italic formatting markers
      .replace(/<em[^>]*>/gi, '')
      .replace(/<\/em>/gi, '')
      .replace(/<i[^>]*>/gi, '')
      .replace(/<\/i>/gi, '')
      
      // Convert indentation (HTML spaces and tabs)
      .replace(/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/gi, '        ') // 8 spaces
      .replace(/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/gi, '      ') // 6 spaces  
      .replace(/&nbsp;&nbsp;&nbsp;&nbsp;/gi, '    ') // 4 spaces for tab-like indentation
      .replace(/&nbsp;&nbsp;/gi, '  ') // 2 spaces for smaller indentation
      .replace(/&nbsp;/gi, ' ')
      
      // Convert common HTML entities
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&apos;/gi, "'")
      
      // Remove remaining HTML tags but preserve the content
      .replace(/<[^>]*>/g, '')
      
      // Clean up excessive whitespace while preserving intentional formatting
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Convert multiple newlines to double newlines
      .replace(/^[\s\n]+|[\s\n]+$/g, '') // Trim leading/trailing whitespace
      .replace(/[ \t]+$/gm, '') // Remove trailing spaces from each line
      .replace(/^[ \t]+/gm, (match) => match) // Preserve leading spaces (indentation)
      
      // Ensure bullets are properly spaced and formatted
      .replace(/\n•/g, '\n• ')
      .replace(/• {2,}/g, '• ')
      // Handle different bullet types
      .replace(/\n\*\s/g, '\n• ')
      .replace(/\n-\s/g, '\n• ')
      .replace(/\n\+\s/g, '\n• ')
      // Handle numbered lists
      .replace(/\n(\d+)\.\s/g, '\n$1. ');
    
    return formatted || 'N/A';
  };

  // Helper function to capitalize words (matching main reports)
  const capitalizeWords = (str: string) => {
    if (!str) return str;
    return str.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.toLowerCase().slice(1)
    ).join(' ');
  };

  // Helper function to format status/approval text (matching main reports)
  const formatStatusText = (text: string) => {
    if (!text) return text;
    return capitalizeWords(text.replace(/_/g, ' '));
  };

  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showReportResults, setShowReportResults] = useState(false);
  const [currentReportConfig, setCurrentReportConfig] = useState<ReportConfig | null>(null);
  const [reportTemplates, setReportTemplates] = useState<ReportTemplate[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [selectedFolderForTemplate, setSelectedFolderForTemplate] = useState<string>('');
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [advancedFilters, setAdvancedFilters] = useState<any[]>([]);
  const [groupBy, setGroupBy] = useState<string[]>([]);
  const [summaryType, setSummaryType] = useState('');
  const [chartType, setChartType] = useState('');
  
  // Folder management states
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  // Filter system states
  const [filterData, setFilterData] = useState<FilterData | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Main filters state (matching main reports page)
  const [filters, setFilters] = useState({
    requestType: '',
    requestStatus: '',
    approvalStatus: '',
    mode: '',
    requesterId: '',
    departmentId: '',
    createdTimeFrom: '',
    createdTimeTo: '',
    dueByTimeFrom: '',
    dueByTimeTo: '',
    resolvedTimeFrom: '',
    resolvedTimeTo: '',
    priority: '',
    technicianId: '',
    serviceCategoryId: '',
    templateId: '',
    searchRequestId: '',
    searchSubject: ''
  });
  
  const [basicFilters, setBasicFilters] = useState({
    requestId: '',
    subject: '',
    requestType: '',
    status: '',
    approvalStatus: '',
    mode: '',
    requester: '',
    department: '',
    priority: '',
    technician: '',
    serviceCategory: '',
    template: '',
    sla: '',
    createdFrom: '',
    createdTo: '',
    dueByFrom: '',
    dueByTo: '',
    resolvedFrom: '',
    resolvedTo: ''
  });
  
  const [omniSearch, setOmniSearch] = useState('');

  // Available fields mapping (matching API field names)
  const availableFields: FieldMapping[] = [
    { label: 'Request ID', value: 'requestId', type: 'number' },
    { label: 'Subject', value: 'requestSubject', type: 'text' },
    { label: 'Description', value: 'requestDescription', type: 'text' },
    { label: 'Request Type', value: 'requestType', type: 'text' },
    { label: 'Status', value: 'requestStatus', type: 'text' },
    { label: 'Approval Status', value: 'approvalStatus', type: 'text' },
    { label: 'Mode', value: 'mode', type: 'text' },
    { label: 'Requester', value: 'requester', type: 'text' },
    { label: 'Department', value: 'department', type: 'text' },
    { label: 'Priority', value: 'priority', type: 'text' },
    { label: 'Technician', value: 'technician', type: 'text' },
    { label: 'Service Category', value: 'serviceCategory', type: 'text' },
    { label: 'Template', value: 'requestTemplate', type: 'text' },
    { label: 'SLA', value: 'sla', type: 'text' },
    { label: 'Created Time', value: 'createdTime', type: 'date' },
    { label: 'Due By Time', value: 'dueByTime', type: 'date' },
    { label: 'Resolved Time', value: 'resolvedTime', type: 'date' }
  ];

  // Column widths for Excel-like table
  const columnWidths: { [key: string]: number } = {
    'requestId': 100,
    'requestSubject': 250,
    'requestDescription': 400,
    'requestType': 120,
    'requestStatus': 130,
    'approvalStatus': 150,
    'mode': 100,
    'requester': 150,
    'department': 150,
    'priority': 100,
    'technician': 150,
    'serviceCategory': 150,
    'requestTemplate': 150,
    'sla': 120,
    'createdTime': 120,
    'dueByTime': 120,
    'resolvedTime': 150
  };

  // Load folders and templates on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        try {
          let folders: FolderData[] = [];
          let templates: ReportTemplate[] = [];
          
          // Load shared folders for all technicians (API requires userId but returns shared folders)
          try {
            const userId = session?.user?.id || 1;
            const foldersResponse = await fetch(`/api/technician/report-folders?userId=${userId}&includeTemplates=true`);
            if (foldersResponse.ok) {
              const foldersResult = await foldersResponse.json();
              console.log('Folders API response:', foldersResult);
              // Transform API response to match our interface
              folders = (foldersResult.folders || []).map((folder: any) => ({
                id: folder.id.toString(),
                name: folder.name,
                reports: (folder.report_templates || []).map((template: any) => ({
                  id: template.id.toString(),
                  name: template.name,
                  createdAt: template.createdAt || template.created_at,
                  status: 'Active',
                  isOwner: template.created_by === userId || template.createdBy === userId
                }))
              }));
            }
          } catch (error) {
            console.error('Error loading folders:', error);
          }
          
          // Load templates  
          try {
            const templatesResponse = await fetch('/api/technician/report-templates');
            if (templatesResponse.ok) {
              const templatesResult = await templatesResponse.json();
              console.log('Templates API response:', templatesResult);
              // Transform API response to match our interface
              templates = (templatesResult.templates || []).map((template: any) => ({
                id: template.id,
                name: template.name,
                description: template.description,
                selectedFields: template.selectedFields,
                filters: template.filters,
                createdAt: template.createdAt,
                isOwner: template.isOwner,
                status: 'Active'
              }));
              console.log('Transformed templates:', templates);
              
              // Temporary solution: Get template-folder associations from localStorage
              const templateFolderMap = JSON.parse(localStorage.getItem('templateFolderMap') || '{}');
              console.log('Template-folder map:', templateFolderMap);
              
              // Associate templates with folders based on the mapping
              folders = folders.map(folder => ({
                ...folder,
                reports: templates.filter(template => templateFolderMap[template.id] === folder.id).map(template => ({
                  id: template.id.toString(),
                  name: template.name,
                  createdAt: template.createdAt,
                  status: 'Active',
                  isOwner: template.isOwner || false
                }))
              }));
              
            } else {
              console.error('Templates API error:', templatesResponse.status, templatesResponse.statusText);
            }
          } catch (error) {
            console.error('Error loading templates:', error);
          }
          
          console.log('Final folders with templates:', folders);
          console.log('Final templates:', templates);
          setFolders(folders);
          setReportTemplates(templates);
          setSelectedFolder(folders[0]?.id || null);
        } catch (error) {
          console.error('Error loading data:', error);
          // Fallback to empty arrays if API calls fail
          setFolders([]);
          setReportTemplates([]);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoadingTemplates(false);
      }
    };

    loadData();
    loadFilterData();
  }, []);
  
  // Load filter data
  const loadFilterData = async () => {
    try {
      console.log('Loading filter data...');
      const response = await fetch('/api/reports/filters');
      console.log('Filter API response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Filter data loaded:', data);
        console.log('Request types:', data?.requestTypes);
        console.log('Request statuses:', data?.requestStatuses);
        setFilterData(data);
      } else {
        const errorText = await response.text();
        console.error('Failed to load filter data:', response.status, response.statusText, errorText);
      }
    } catch (error) {
      console.error('Error loading filter data:', error);
    }
  };

  // Debug filterData state changes
  useEffect(() => {
    console.log('FilterData state updated:', filterData);
  }, [filterData]);

  // Refresh folders after creation
  const refreshFolders = async () => {
    try {
      const userId = session?.user?.id || 1;
      const foldersResponse = await fetch(`/api/technician/report-folders?userId=${userId}`);
      if (foldersResponse.ok) {
        const foldersResult = await foldersResponse.json();
        const updatedFolders = (foldersResult.folders || []).map((folder: any) => ({
          id: folder.id.toString(),
          name: folder.name,
          reports: [] // Will be populated from templates
        }));
        setFolders(updatedFolders);
      }
    } catch (error) {
      console.error('Error refreshing folders:', error);
    }
  };

  // Delete folder function
  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    if (!confirm(`Are you sure you want to delete the folder "${folderName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      console.log('Deleting folder:', folderId);
      const userId = session?.user?.id || 1;
      const response = await fetch(`/api/technician/report-folders?id=${folderId}&userId=${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        console.log('Folder deleted successfully');
        // Refresh the folder list
        await refreshFolders();
        
        // If the deleted folder was selected, select the first available folder
        if (selectedFolder === folderId) {
          const remainingFolders = folders.filter(f => f.id !== folderId);
          setSelectedFolder(remainingFolders.length > 0 ? remainingFolders[0].id : null);
        }
        
        alert(`Folder "${folderName}" deleted successfully.`);
      } else {
        const errorData = await response.json();
        console.error('Failed to delete folder:', errorData);
        alert('Failed to delete folder: ' + (errorData.error || 'Please try again.'));
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
      alert('Error deleting folder. Please try again.');
    }
  };

  const executeReport = async () => {
    if (selectedFields.length === 0) {
      alert('Please select at least one field for the report.');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('fields', selectedFields.join(','));
      
      // Add filter parameters
      advancedFilters.forEach(filter => {
        if (filter.column && filter.criteria && filter.value) {
          if (filter.column.includes('Date') || filter.column.includes('Time') || filter.column === 'createdTime') {
            if (filter.criteria === 'greater_than') {
              params.append('startDate', filter.value);
            } else if (filter.criteria === 'less_than') {
              params.append('endDate', filter.value);
            }
          } else if (filter.column === 'requestStatus' || filter.column === 'status') {
            params.append('status', filter.value);
          } else if (filter.column === 'approvalStatus') {
            params.append('approvalStatus', filter.value);
          } else if (filter.column === 'priority') {
            // Add priority as a search parameter since API doesn't have direct priority filter
            params.append('search', filter.value);
          } else if (filter.criteria === 'contains' || filter.column === 'search') {
            params.append('search', filter.value);
          }
        }
      });

      const response = await fetch(`/api/technician/reports?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        setReportData(data.records || []);
        setCurrentReportConfig({
          columns: selectedFields,
          filters: advancedFilters,
          groupBy,
          summaryType,
          chartType
        });
        setShowReportResults(true);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to execute report');
      }
    } catch (error) {
      console.error('Error executing report:', error);
      alert('Failed to execute report');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplate = (template: ReportTemplate, forEditing?: boolean) => {
    setSelectedFields(template.selectedFields);
    if (template.filters) {
      setAdvancedFilters(template.filters.filters || []);
      setGroupBy(template.filters.groupBy || []);
      setSummaryType(template.filters.summaryType || '');
      setChartType(template.filters.chartType || '');
    } else {
      setAdvancedFilters([]);
      setGroupBy([]);
      setSummaryType('');
      setChartType('');
    }
    
    if (forEditing === true) {
      setEditingTemplate(template);
      setIsEditMode(true);
      setTemplateName(template.name);
      setTemplateDescription(template.description || '');
      // Find the folder this template belongs to
      const templateFolder = folders.find(folder => 
        folder.reports?.some(report => report.id === template.id.toString())
      );
      if (templateFolder) {
        setSelectedFolderForTemplate(templateFolder.id);
      }
      // Don't open dialog automatically - wait for user to click Update Template
    }
  };

  const handleCloseSaveDialog = () => {
    setSaveDialogOpen(false);
    // Reset editing state when dialog is closed
    if (isEditMode) {
      setTemplateName('');
      setTemplateDescription('');
      setSelectedFolderForTemplate('');
      setEditingTemplate(null);
      setIsEditMode(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !selectedFolderForTemplate) {
      return;
    }

    try {
      const templateData = {
        name: templateName.trim(),
        description: templateDescription.trim() || '',
        selectedFields: [...selectedFields],
        filters: {
          filters: [...advancedFilters],
          groupBy: [...groupBy],
          summaryType,
          chartType
        },
        folderId: selectedFolderForTemplate,
        isShared: true // Make templates shared among all technicians
      };

      const isUpdating = isEditMode && editingTemplate;
      const url = isUpdating 
        ? `/api/technician/report-templates/${editingTemplate.id}` 
        : '/api/technician/report-templates';
      const method = isUpdating ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData)
      });

      if (response.ok) {
        const result = await response.json();
        const savedTemplate = result.template;
        
        // Transform API response to match our ReportTemplate interface
        const templateData: ReportTemplate = {
          id: savedTemplate.id,
          name: savedTemplate.name,
          description: savedTemplate.description,
          selectedFields: savedTemplate.selectedFields,
          filters: savedTemplate.filters,
          createdAt: savedTemplate.createdAt,
          isOwner: savedTemplate.isOwner,
          status: 'Active'
        };
        
        if (isUpdating) {
          // Update existing template in templates list
          setReportTemplates(prev => prev.map(template => 
            template.id === editingTemplate.id ? templateData : template
          ));
          
          // Update template in folders
          setFolders(prevFolders => prevFolders.map(folder => ({
            ...folder,
            reports: folder.reports?.map(report => 
              report.id === editingTemplate.id.toString() 
                ? {
                    ...report,
                    name: savedTemplate.name,
                    status: 'Active'
                  }
                : report
            ) || []
          })));
        } else {
          // Add new template to templates list
          setReportTemplates(prev => [...prev, templateData]);
          
          // Store template-folder association in localStorage (temporary solution)
          const templateFolderMap = JSON.parse(localStorage.getItem('templateFolderMap') || '{}');
          templateFolderMap[savedTemplate.id] = selectedFolderForTemplate;
          localStorage.setItem('templateFolderMap', JSON.stringify(templateFolderMap));
          
          // Add to folder
          setFolders(prevFolders => prevFolders.map(folder => {
            if (folder.id === selectedFolderForTemplate) {
              return {
                ...folder,
                reports: [
                  ...(folder.reports || []),
                  {
                    id: savedTemplate.id.toString(),
                    name: savedTemplate.name,
                    createdAt: savedTemplate.createdAt,
                    status: 'Active',
                    isOwner: true
                  }
                ]
              };
            }
            return folder;
          }));
        }

        // Reset form
        setTemplateName('');
        setTemplateDescription('');
        setSelectedFolderForTemplate('');
        setEditingTemplate(null);
        setIsEditMode(false);
        setSaveDialogOpen(false);
        
        alert(`Report template ${isUpdating ? 'updated' : 'saved'} successfully!`);
      } else {
        const errorData = await response.json();
        console.error('Failed to save template:', errorData.error);
        alert('Failed to save report template: ' + (errorData.error || 'Please try again.'));
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving report template. Please try again.');
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      console.log('Creating shared folder:', newFolderName.trim());
      // Note: API expects session-based authentication, creating shared folder
      const response = await fetch('/api/technician/report-folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newFolderName.trim(),
          description: 'Technician shared folder - visible to all technicians',
          createdBy: session?.user?.id ? parseInt(session.user.id.toString()) : 1,
          isShared: true, // Make folders shared among all technicians
          parentId: null // Top-level folder
        })
      });

      if (response.ok) {
        const result = await response.json();
        const savedFolder = result.folder;
        console.log('Folder created successfully:', savedFolder);
        
        // Refresh the entire folder list to ensure all shared folders are loaded
        await refreshFolders();
        
        setNewFolderName('');
        setFolderDialogOpen(false);
        
        // Find the newly created folder and select it
        if (savedFolder) {
          setSelectedFolder(savedFolder.id.toString());
          console.log('Selected new folder:', savedFolder.id);
        }
        
        alert(`Shared folder "${savedFolder?.name}" created successfully! All technicians can now see this folder.`);
      } else {
        const errorData = await response.json();
        console.error('Failed to create folder:', errorData.error);
        alert('Failed to create folder: ' + (errorData.error || 'Please try again.'));
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      alert('Error creating folder. Please try again.');
    }
  };

  const handleNewReport = (folderId: string) => {
    setSelectedFolder(folderId);
    setSelectedFolderForTemplate(folderId);
    // Reset form to create new report
    setSelectedFields([]);
    setAdvancedFilters([]);
    setGroupBy([]);
    setSummaryType('');
    setChartType('');
  };

  const applyFilters = () => {
    try {
      console.log('Applying filters:', basicFilters);
      
      // Update main filters state (matching main reports page)
      setFilters({
        requestType: basicFilters.requestType,
        requestStatus: basicFilters.status,
        approvalStatus: basicFilters.approvalStatus,
        mode: basicFilters.mode,
        requesterId: basicFilters.requester,
        departmentId: basicFilters.department,
        createdTimeFrom: basicFilters.createdFrom,
        createdTimeTo: basicFilters.createdTo,
        dueByTimeFrom: basicFilters.dueByFrom,
        dueByTimeTo: basicFilters.dueByTo,
        resolvedTimeFrom: basicFilters.resolvedFrom,
        resolvedTimeTo: basicFilters.resolvedTo,
        priority: basicFilters.priority,
        technicianId: basicFilters.technician,
        serviceCategoryId: basicFilters.serviceCategory,
        templateId: basicFilters.template,
        searchRequestId: basicFilters.requestId,
        searchSubject: basicFilters.subject
      });
      
      // Convert basic filters to the filter array format for backward compatibility
      const newFilters: any[] = [];
    
      if (basicFilters.requestId) {
        newFilters.push({ column: 'requestId', criteria: 'contains', value: basicFilters.requestId, operator: 'AND' });
      }
      if (basicFilters.subject) {
        newFilters.push({ column: 'requestSubject', criteria: 'contains', value: basicFilters.subject, operator: 'AND' });
      }
      if (basicFilters.status) {
        newFilters.push({ column: 'requestStatus', criteria: 'equals', value: basicFilters.status, operator: 'AND' });
      }
      if (basicFilters.priority) {
        newFilters.push({ column: 'priority', criteria: 'equals', value: basicFilters.priority, operator: 'AND' });
      }
      if (basicFilters.requester) {
        newFilters.push({ column: 'requester', criteria: 'equals', value: basicFilters.requester, operator: 'AND' });
      }
      if (basicFilters.department) {
        newFilters.push({ column: 'department', criteria: 'equals', value: basicFilters.department, operator: 'AND' });
      }
      if (basicFilters.technician) {
        newFilters.push({ column: 'technician', criteria: 'equals', value: basicFilters.technician, operator: 'AND' });
      }
      if (basicFilters.approvalStatus) {
        newFilters.push({ column: 'approvalStatus', criteria: 'equals', value: basicFilters.approvalStatus, operator: 'AND' });
      }
      if (basicFilters.mode) {
        newFilters.push({ column: 'mode', criteria: 'equals', value: basicFilters.mode, operator: 'AND' });
      }
      if (basicFilters.serviceCategory) {
        newFilters.push({ column: 'serviceCategory', criteria: 'equals', value: basicFilters.serviceCategory, operator: 'AND' });
      }
      if (basicFilters.template) {
        newFilters.push({ column: 'template', criteria: 'equals', value: basicFilters.template, operator: 'AND' });
      }
      if (basicFilters.createdFrom) {
        newFilters.push({ column: 'createdTime', criteria: 'after', value: basicFilters.createdFrom, operator: 'AND' });
      }
      if (basicFilters.createdTo) {
        newFilters.push({ column: 'createdTime', criteria: 'before', value: basicFilters.createdTo, operator: 'AND' });
      }
      if (basicFilters.dueByFrom) {
        newFilters.push({ column: 'dueByTime', criteria: 'after', value: basicFilters.dueByFrom, operator: 'AND' });
      }
      if (basicFilters.dueByTo) {
        newFilters.push({ column: 'dueByTime', criteria: 'before', value: basicFilters.dueByTo, operator: 'AND' });
      }
      if (basicFilters.resolvedFrom) {
        newFilters.push({ column: 'resolvedTime', criteria: 'after', value: basicFilters.resolvedFrom, operator: 'AND' });
      }
      if (basicFilters.resolvedTo) {
        newFilters.push({ column: 'resolvedTime', criteria: 'before', value: basicFilters.resolvedTo, operator: 'AND' });
      }
    
      // Keep the array format for existing functionality
      setAdvancedFilters(newFilters);
      setIsFilterModalOpen(false);
      console.log('Filters applied successfully:', newFilters);
    } catch (error) {
      console.error('Error applying filters:', error);
      alert('Error applying filters. Please try again.');
    }
  };
  
  const clearFilters = () => {
    try {
      console.log('Clearing filters...');
      
      // Clear main filters state
      setFilters({
        requestType: '',
        requestStatus: '',
        approvalStatus: '',
        mode: '',
        requesterId: '',
        departmentId: '',
        createdTimeFrom: '',
        createdTimeTo: '',
        dueByTimeFrom: '',
        dueByTimeTo: '',
        resolvedTimeFrom: '',
        resolvedTimeTo: '',
        priority: '',
        technicianId: '',
        serviceCategoryId: '',
        templateId: '',
        searchRequestId: '',
        searchSubject: ''
      });
      
      setBasicFilters({
        requestId: '',
        subject: '',
        requestType: '',
        status: '',
        approvalStatus: '',
        mode: '',
        requester: '',
        department: '',
        priority: '',
        technician: '',
        serviceCategory: '',
        template: '',
        sla: '',
        createdFrom: '',
        createdTo: '',
        dueByFrom: '',
        dueByTo: '',
        resolvedFrom: '',
        resolvedTo: ''
      });
      
      setOmniSearch('');
      console.log('Filters cleared successfully');
    } catch (error) {
      console.error('Error clearing filters:', error);
    }
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      
      // Create search params with all current filters (matching main reports page format)
      const searchParams = new URLSearchParams();
      
      // Add current report fields if available
      if (currentReportConfig?.columns) {
        searchParams.append('fields', currentReportConfig.columns.join(','));
      }
      
      // Add all basic filters with proper parameter mapping
      if (basicFilters.requestId) searchParams.append('searchRequestId', basicFilters.requestId);
      if (basicFilters.subject) searchParams.append('searchSubject', basicFilters.subject);
      if (basicFilters.requestType) searchParams.append('requestType', basicFilters.requestType);
      if (basicFilters.status) searchParams.append('requestStatus', basicFilters.status);
      if (basicFilters.approvalStatus) searchParams.append('approvalStatus', basicFilters.approvalStatus);
      if (basicFilters.mode) searchParams.append('mode', basicFilters.mode);
      if (basicFilters.requester) searchParams.append('requesterId', basicFilters.requester);
      if (basicFilters.department) searchParams.append('departmentId', basicFilters.department);
      if (basicFilters.priority) searchParams.append('priority', basicFilters.priority);
      if (basicFilters.technician) searchParams.append('technicianId', basicFilters.technician);
      if (basicFilters.createdFrom) searchParams.append('createdTimeFrom', basicFilters.createdFrom);
      if (basicFilters.createdTo) searchParams.append('createdTimeTo', basicFilters.createdTo);
      
      // Add applied advanced filters
      advancedFilters.forEach(filter => {
        if (filter.column && filter.criteria && filter.value) {
          if (filter.column === 'requestStatus') {
            searchParams.append('requestStatus', filter.value);
          } else if (filter.column === 'approvalStatus') {
            searchParams.append('approvalStatus', filter.value);
          } else if (filter.column === 'priority') {
            searchParams.append('priority', filter.value);
          } else if (filter.column === 'createdTime') {
            if (filter.criteria === 'after' || filter.criteria === 'equals') {
              searchParams.append('createdTimeFrom', filter.value);
            } else if (filter.criteria === 'before') {
              searchParams.append('createdTimeTo', filter.value);
            }
          } else if (filter.criteria === 'contains') {
            searchParams.append('searchSubject', filter.value);
          }
        }
      });

      searchParams.append('export', 'excel');
      
      const response = await fetch(`/api/technician/reports/export?${searchParams.toString()}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ASPAC_IT_Helpdesk_Technician_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to export Excel file');
      }
    } catch (error) {
      console.error('Error exporting Excel:', error);
      alert('Error exporting Excel file');
    } finally {
      setExporting(false);
    }
  };

  return (
    <SessionWrapper>
      <style dangerouslySetInnerHTML={{
        __html: `
          .reports-table-scroll::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          
          .reports-table-scroll::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 4px;
          }
          
          .reports-table-scroll::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 4px;
          }
          
          .reports-table-scroll::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
          }
          
          .reports-table-scroll {
            max-height: 75vh;
          }
        `
      }} />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
            <p className="text-gray-600 mt-2">Create and manage your custom reports</p>
          </div>
        </div>

      {/* Report Builder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Report Builder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Field Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-medium">Select Fields</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedFields([])}
                className="text-xs px-3 py-1"
              >
                Uncheck All
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {availableFields.map((field) => (
                <label key={field.value} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedFields.includes(field.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedFields(prev => [...prev, field.value]);
                      } else {
                        setSelectedFields(prev => prev.filter(f => f !== field.value));
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{field.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Filter Button */}
          <div className="flex items-center gap-3 mt-4 p-3 bg-gray-50 rounded-lg border">
            <Button
              onClick={() => {
                console.log('Opening filter modal...');
                try {
                  setIsFilterModalOpen(true);
                } catch (error) {
                  console.error('Error opening filter modal:', error);
                }
              }}
              variant="outline"
              className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 border-blue-300"
            >
              <Filter className="h-4 w-4" />
              Advanced Filters
            </Button>
            {(Object.values(basicFilters).some(val => val) || advancedFilters.length > 0) && (
              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                {Object.values(basicFilters).filter(val => val).length + advancedFilters.length} filter(s) applied
              </Badge>
            )}
            <div className="text-xs text-gray-500">Click "Advanced Filters" to set up report criteria</div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t mt-4 bg-gray-50 p-4 rounded-lg">
            <Button 
              onClick={executeReport}
              disabled={loading || selectedFields.length === 0}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
              size="lg"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {loading ? 'Running Report...' : 'Run Report'}
            </Button>
            <div className="text-sm text-gray-600">
              Select fields above and optionally apply filters, then run your report
            </div>
            
            {isEditMode && editingTemplate ? (
              <Button 
                variant="outline"
                onClick={() => setSaveDialogOpen(true)}
                disabled={selectedFields.length === 0}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Update Template
              </Button>
            ) : (
              <Button 
                variant="outline"
                onClick={() => setSaveDialogOpen(true)}
                disabled={selectedFields.length === 0}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save Template
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Folders and Templates */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Folders Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Folders</CardTitle>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => setFolderDialogOpen(true)}
              >
                <FolderPlus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {folders.map((folder) => (
              <div
                key={folder.id}
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                  selectedFolder === folder.id 
                    ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => setSelectedFolder(folder.id)}
              >
                <Folder className="h-4 w-4" />
                <span className="text-sm font-medium">{folder.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {folder.reports?.length || 0}
                </Badge>
                
                {/* Delete folder button */}
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFolder(folder.id, folder.name);
                  }}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-red-600 hover:bg-red-100 ml-auto"
                  title="Delete Folder"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Templates Content */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>
              {selectedFolder ? folders.find(f => f.id === selectedFolder)?.name : 'Templates'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTemplates ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-gray-600 mt-2">Loading report templates...</p>
              </div>
            ) : (
              <FolderTemplatesContent 
                selectedFolder={selectedFolder}
                folders={folders}
                reportTemplates={reportTemplates}
                handleNewReport={handleNewReport}
                loadTemplate={loadTemplate}
                setReportTemplates={setReportTemplates}
                setFolders={setFolders}
                setLoading={setLoading}
                setReportData={setReportData}
                setCurrentReportConfig={setCurrentReportConfig}
                setShowReportResults={setShowReportResults}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Folder Dialog */}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Folder</DialogTitle>
            <DialogDescription>
              Create a new folder to organize your reports
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Global Report Results Display */}
      <Dialog open={showReportResults} onOpenChange={setShowReportResults}>
        <DialogContent className="max-w-[98vw] max-h-[95vh] overflow-hidden">
          <DialogHeader>
            <div className="flex items-center justify-between w-full pr-10">
              <DialogTitle className="text-lg font-semibold">
                Report Results
              </DialogTitle>
              {currentReportConfig && (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleExportExcel}
                    variant="default"
                    size="sm"
                    disabled={exporting}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white mr-2 disabled:bg-green-400"
                  >
                    {exporting ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <FileSpreadsheet className="h-4 w-4" />
                    )}
                    Export Excel
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>
          
          {/* Excel-Style Report Header */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">ASPAC IT Helpdesk Technician Report</h3>
                <p className="text-sm text-gray-600">Total Records: {reportData.length} | Fields: {currentReportConfig?.columns.length || 0}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Generated: {new Date().toLocaleDateString()}</p>
                <p className="text-sm text-gray-600">Time: {new Date().toLocaleTimeString()}</p>
              </div>
            </div>
          </div>

          {/* Reports Table with Excel-style formatting */}
          <div className="w-full overflow-auto reports-table-scroll">
            <table className="w-full border-collapse bg-white" style={{fontSize: '12px'}}>
              <thead className="bg-blue-50 border-b-2 border-blue-200 sticky top-0 z-10">
                <tr>
                  {currentReportConfig?.columns.map((column) => {
                    const fieldDef = availableFields.find(f => f.value === column);
                    const columnWidth = {
                      'requestId': 'w-[100px]',
                      'requestSubject': 'w-[250px]', 
                      'requestDescription': 'w-[400px]',
                      'requestType': 'w-[120px]',
                      'requestStatus': 'w-[130px]',
                      'approvalStatus': 'w-[150px]',
                      'mode': 'w-[100px]',
                      'requester': 'w-[150px]',
                      'department': 'w-[150px]',
                      'priority': 'w-[100px]',
                      'technician': 'w-[150px]',
                      'serviceCategory': 'w-[150px]',
                      'requestTemplate': 'w-[150px]',
                      'sla': 'w-[120px]',
                      'createdTime': 'w-[120px]',
                      'dueByTime': 'w-[120px]',
                      'resolvedTime': 'w-[150px]'
                    }[column] || 'w-[120px]';
                    
                    return (
                      <th 
                        key={column}
                        className={`px-3 py-3 text-left text-xs font-bold text-blue-800 uppercase tracking-wider border-r border-blue-200 align-middle ${columnWidth}`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{fieldDef?.label || column}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="bg-white">
                {reportData.length === 0 ? (
                  <tr>
                    <td colSpan={currentReportConfig?.columns.length || 1} className="px-6 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <svg className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-lg font-medium">No reports found</p>
                        <p className="text-sm">Try adjusting your filters or search criteria</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  reportData.map((record, index) => {
                    // Alternating row colors like Excel
                    const isEvenRow = index % 2 === 0;
                    const rowClass = isEvenRow ? 'bg-white' : 'bg-gray-50';
                    
                    return (
                      <tr key={index} className={`${rowClass} border-b border-gray-200`}>
                        {currentReportConfig?.columns.map((column) => {
                          const value = record[column];
                          let cellContent;
                          let cellClass = "px-3 py-2 border-r border-gray-200";
                          
                          // Handle different data types and formatting (matching main reports page)
                          if (column === 'requestId') {
                            cellContent = <span className="text-blue-600 font-medium">{value || 'N/A'}</span>;
                          } else if (column === 'requestSubject') {
                            cellContent = <span className="text-blue-600 underline cursor-pointer">{value || 'N/A'}</span>;
                          } else if (column === 'requestDescription') {
                            cellContent = (
                              <div className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed max-w-lg">
                                {preserveDescriptionFormatting(value || 'N/A')}
                              </div>
                            );
                            cellClass += " text-gray-700";
                          } else if (column === 'requestType' || column === 'priority' || column === 'mode') {
                            cellContent = <span className="text-gray-900">{capitalizeWords(value || 'N/A')}</span>;
                          } else if (column === 'requestStatus' || column === 'approvalStatus') {
                            cellContent = <span className="text-gray-900">{formatStatusText(value || 'N/A')}</span>;
                          } else if (column === 'requester') {
                            // Handle requester as object or string
                            if (typeof value === 'object' && value?.name) {
                              cellContent = (
                                <div className="text-gray-900">
                                  <div className="font-medium">{value.name}</div>
                                  <div className="text-xs text-gray-500">{value.employeeId || value.email}</div>
                                </div>
                              );
                            } else {
                              cellContent = <span className="text-gray-900">{capitalizeWords(String(value || 'N/A'))}</span>;
                            }
                          } else if (column === 'department' || column === 'serviceCategory' || column === 'requestTemplate') {
                            cellContent = <span className="text-gray-900">{capitalizeWords(String(value || 'N/A'))}</span>;
                          } else if (column === 'technician') {
                            cellContent = <span className="text-gray-900">{capitalizeWords(String(value || 'Unassigned'))}</span>;
                          } else if (column.includes('Time') || column === 'createdAt' || column === 'updatedAt') {
                            let formattedDate = 'N/A';
                            if (value) {
                              try {
                                formattedDate = new Date(value).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long', 
                                  day: 'numeric'
                                });
                              } catch {
                                formattedDate = 'N/A';
                              }
                            }
                            cellContent = <span className="text-gray-900">{formattedDate}</span>;
                          } else {
                            cellContent = <span className="text-gray-900">{capitalizeWords(String(value || 'N/A'))}</span>;
                          }
                          
                          return (
                            <td key={`${index}-${column}`} className={cellClass}>
                              {cellContent}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          <div className="text-sm text-gray-600 mt-2">
            Showing {reportData.length} record{reportData.length !== 1 ? 's' : ''}
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Template Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={(open) => {
        if (!open) handleCloseSaveDialog();
        else setSaveDialogOpen(true);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Report Template' : 'Save Report Template'}</DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Update your report template configuration' : 'Save your current report configuration as a reusable template'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Enter template name..."
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="template-description">Description (Optional)</Label>
              <Input
                id="template-description"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Enter template description..."
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="template-folder">Save to Folder</Label>
              <Select value={selectedFolderForTemplate} onValueChange={setSelectedFolderForTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a folder" />
                </SelectTrigger>
                <SelectContent>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseSaveDialog}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate} disabled={!templateName.trim() || !selectedFolderForTemplate}>
              {isEditMode ? 'Update Template' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advanced Filter Modal */}
      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Filter Reports</DialogTitle>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* Request ID */}
                <div>
                  <Label htmlFor="requestId" className="text-sm font-medium">Request ID</Label>
                  <input
                    id="requestId"
                    type="text"
                    placeholder="Search by request ID"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    value={basicFilters.requestId}
                    onChange={(e) => setBasicFilters(prev => ({...prev, requestId: e.target.value}))}
                  />
                </div>

                {/* Subject */}
                <div>
                  <Label htmlFor="subject" className="text-sm font-medium">Subject</Label>
                  <input
                    id="subject"
                    type="text"
                    placeholder="Search in subject"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    value={basicFilters.subject}
                    onChange={(e) => setBasicFilters(prev => ({...prev, subject: e.target.value}))}
                  />
                </div>

                {/* Request Type */}
                <div>
                  <Label htmlFor="requestType" className="text-sm font-medium">Request Type</Label>
                  <Select value={basicFilters.requestType || "__all__"} onValueChange={(value) => {
                    console.log('Request type changed:', value);
                    setBasicFilters(prev => ({...prev, requestType: value === "__all__" ? "" : value}));
                  }}>
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent className="z-[100000]">
                      <SelectItem value="__all__">All Types</SelectItem>
                      {(filterData?.requestTypes && filterData.requestTypes.length > 0) ? (
                        filterData.requestTypes.map(type => (
                          <SelectItem key={type} value={type}>{capitalizeWords(type)}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__loading__" disabled>Loading...</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div>
                  <Label htmlFor="status" className="text-sm font-medium">Status</Label>
                  <Select value={basicFilters.status || "__all__"} onValueChange={(value) => {
                    console.log('Status changed:', value);
                    setBasicFilters(prev => ({...prev, status: value === "__all__" ? "" : value}));
                  }}>
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent className="z-[100000]">
                      <SelectItem value="__all__">All Statuses</SelectItem>
                      {(filterData?.requestStatuses && filterData.requestStatuses.length > 0) ? (
                        filterData.requestStatuses.map(status => (
                          <SelectItem key={status} value={status}>{formatStatusText(status)}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__loading__" disabled>Loading...</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Approval Status */}
                <div>
                  <Label htmlFor="approvalStatus" className="text-sm font-medium">Approval Status</Label>
                  <Select value={basicFilters.approvalStatus || "__all__"} onValueChange={(value) => setBasicFilters(prev => ({...prev, approvalStatus: value === "__all__" ? "" : value}))}>
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder="All Approval Status" />
                    </SelectTrigger>
                    <SelectContent className="z-[100000]">
                      <SelectItem value="__all__">All Approval Status</SelectItem>
                      {(filterData?.approvalStatuses && filterData.approvalStatuses.length > 0) ? (
                        filterData.approvalStatuses.map(status => (
                          <SelectItem key={status} value={status}>{formatStatusText(status)}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__loading__" disabled>Loading...</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Mode */}
                <div>
                  <Label htmlFor="mode" className="text-sm font-medium">Mode</Label>
                  <Select value={basicFilters.mode || "__all__"} onValueChange={(value) => setBasicFilters(prev => ({...prev, mode: value === "__all__" ? "" : value}))}>
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder="All Modes" />
                    </SelectTrigger>
                    <SelectContent className="z-[100000]">
                      <SelectItem value="__all__">All Modes</SelectItem>
                      {(filterData?.modes && filterData.modes.length > 0) ? (
                        filterData.modes.map(mode => (
                          <SelectItem key={mode} value={mode}>{capitalizeWords(mode)}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__loading__" disabled>Loading...</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority */}
                <div>
                  <Label htmlFor="priority" className="text-sm font-medium">Priority</Label>
                  <Select value={basicFilters.priority || "__all__"} onValueChange={(value) => setBasicFilters(prev => ({...prev, priority: value === "__all__" ? "" : value}))}>
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder="All Priorities" />
                    </SelectTrigger>
                    <SelectContent className="z-[100000]">
                      <SelectItem value="__all__">All Priorities</SelectItem>
                      {(filterData?.priorities && filterData.priorities.length > 0) ? (
                        filterData.priorities.map(priority => (
                          <SelectItem key={priority} value={priority}>{capitalizeWords(priority)}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__loading__" disabled>Loading...</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Requester */}
                <div>
                  <Label htmlFor="requester" className="text-sm font-medium">Requester</Label>
                  <Select value={basicFilters.requester || "__all__"} onValueChange={(value) => setBasicFilters(prev => ({...prev, requester: value === "__all__" ? "" : value}))}>
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder="All Requesters" />
                    </SelectTrigger>
                    <SelectContent className="z-[100000]">
                      <SelectItem value="__all__">All Requesters</SelectItem>
                      {(filterData?.users && filterData.users.length > 0) ? (
                        filterData.users.map(user => (
                          <SelectItem key={user.id} value={user.name}>
                            {user.name} ({user.email})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__loading__" disabled>Loading...</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Department */}
                <div>
                  <Label htmlFor="department" className="text-sm font-medium">Department</Label>
                  <Select value={basicFilters.department || "__all__"} onValueChange={(value) => setBasicFilters(prev => ({...prev, department: value === "__all__" ? "" : value}))}>
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent className="z-[100000]">
                      <SelectItem value="__all__">All Departments</SelectItem>
                      {(filterData?.departments && filterData.departments.length > 0) ? (
                        filterData.departments.map(dept => (
                          <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__loading__" disabled>Loading...</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Technician */}
                <div>
                  <Label htmlFor="technician" className="text-sm font-medium">Technician</Label>
                  <Select value={basicFilters.technician || "__all__"} onValueChange={(value) => setBasicFilters(prev => ({...prev, technician: value === "__all__" ? "" : value}))}>
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder="All Technicians" />
                    </SelectTrigger>
                    <SelectContent className="z-[100000]">
                      <SelectItem value="__all__">All Technicians</SelectItem>
                      {(filterData?.technicians && filterData.technicians.length > 0) ? (
                        filterData.technicians.map(tech => (
                          <SelectItem key={tech.id} value={tech.name}>
                            {tech.name} ({tech.department})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__loading__" disabled>Loading...</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Created Date From */}
                <div>
                  <Label htmlFor="createdFrom" className="text-sm font-medium">Created From</Label>
                  <input
                    id="createdFrom"
                    type="date"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    value={basicFilters.createdFrom}
                    onChange={(e) => setBasicFilters(prev => ({...prev, createdFrom: e.target.value}))}
                  />
                </div>

                {/* Created Date To */}
                <div>
                  <Label htmlFor="createdTo" className="text-sm font-medium">Created To</Label>
                  <input
                    id="createdTo"
                    type="date"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    value={basicFilters.createdTo}
                    onChange={(e) => setBasicFilters(prev => ({...prev, createdTo: e.target.value}))}
                  />
                </div>

                {/* Service Category */}
                <div>
                  <Label htmlFor="serviceCategory" className="text-sm font-medium">Service Category</Label>
                  <Select value={basicFilters.serviceCategory || "__all__"} onValueChange={(value) => setBasicFilters(prev => ({...prev, serviceCategory: value === "__all__" ? "" : value}))}>
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder="All Service Categories" />
                    </SelectTrigger>
                    <SelectContent className="z-[100000]">
                      <SelectItem value="__all__">All Service Categories</SelectItem>
                      {(filterData?.serviceCategories && filterData.serviceCategories.length > 0) ? (
                        filterData.serviceCategories.map(category => (
                          <SelectItem key={category.id} value={category.id.toString()}>{capitalizeWords(category.name)}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__loading__" disabled>Loading...</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Request Template */}
                <div>
                  <Label htmlFor="template" className="text-sm font-medium">Request Template</Label>
                  <Select value={basicFilters.template || "__all__"} onValueChange={(value) => setBasicFilters(prev => ({...prev, template: value === "__all__" ? "" : value}))}>
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder="All Templates" />
                    </SelectTrigger>
                    <SelectContent className="z-[100000]">
                      <SelectItem value="__all__">All Templates</SelectItem>
                      {(filterData?.templates && filterData.templates.length > 0) ? (
                        filterData.templates.map(template => (
                          <SelectItem key={template.id} value={template.id.toString()}>{capitalizeWords(template.name)} ({capitalizeWords(template.type)})</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__loading__" disabled>Loading...</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Due By Date From */}
                <div>
                  <Label htmlFor="dueByFrom" className="text-sm font-medium">Due By From</Label>
                  <input
                    id="dueByFrom"
                    type="date"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    value={basicFilters.dueByFrom}
                    onChange={(e) => setBasicFilters(prev => ({...prev, dueByFrom: e.target.value}))}
                  />
                </div>

                {/* Due By Date To */}
                <div>
                  <Label htmlFor="dueByTo" className="text-sm font-medium">Due By To</Label>
                  <input
                    id="dueByTo"
                    type="date"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    value={basicFilters.dueByTo}
                    onChange={(e) => setBasicFilters(prev => ({...prev, dueByTo: e.target.value}))}
                  />
                </div>

                {/* Resolved Date From */}
                <div>
                  <Label htmlFor="resolvedFrom" className="text-sm font-medium">Resolved From</Label>
                  <input
                    id="resolvedFrom"
                    type="date"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    value={basicFilters.resolvedFrom}
                    onChange={(e) => setBasicFilters(prev => ({...prev, resolvedFrom: e.target.value}))}
                  />
                </div>

                {/* Resolved Date To */}
                <div>
                  <Label htmlFor="resolvedTo" className="text-sm font-medium">Resolved To</Label>
                  <input
                    id="resolvedTo"
                    type="date"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    value={basicFilters.resolvedTo}
                    onChange={(e) => setBasicFilters(prev => ({...prev, resolvedTo: e.target.value}))}
                  />
                </div>

              </div>
          </div>
          
          <DialogFooter className="flex items-center justify-between">
            <Button
              onClick={clearFilters}
              variant="outline"
            >
              Clear All Filters
            </Button>
            
            <div className="flex gap-3">
              <Button
                onClick={() => setIsFilterModalOpen(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={applyFilters}
              >
                Apply Filters
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      </div>
    </SessionWrapper>
  );
}