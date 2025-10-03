'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
  FolderPlus
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

const FolderTemplatesContent: React.FC<{
  selectedFolder: string | null;
  folders: FolderData[];
  reportTemplates: ReportTemplate[];
  handleNewReport: (folderId: string) => void;
  loadTemplate: (template: ReportTemplate) => void;
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
          <Button 
            onClick={() => selectedFolder && handleNewReport(selectedFolder)}
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Report
          </Button>
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
                            loadTemplate(fullTemplate);
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
          This folder doesn't contain any report templates yet. Create your first template to get started.
        </p>
        <div className="flex justify-center gap-4">
          <Button onClick={() => selectedFolder && handleNewReport(selectedFolder)}>
            <Plus className="h-4 w-4 mr-2" />
            New Report
          </Button>
        </div>
      </div>
    );
  }
};

export default function TechnicianReportsPage() {
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
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [filters, setFilters] = useState<any[]>([]);
  const [groupBy, setGroupBy] = useState<string[]>([]);
  const [summaryType, setSummaryType] = useState('');
  const [chartType, setChartType] = useState('');
  
  // Folder management states
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Available fields mapping
  const availableFields: FieldMapping[] = [
    { label: 'Request ID', value: 'id', type: 'number' },
    { label: 'Subject', value: 'subject', type: 'text' },
    { label: 'Description', value: 'description', type: 'text' },
    { label: 'Priority', value: 'priority', type: 'text' },
    { label: 'Status', value: 'status', type: 'text' },
    { label: 'Reported By', value: 'reportedBy', type: 'text' },
    { label: 'Reported To', value: 'reportedTo', type: 'text' },
    { label: 'Assigned To', value: 'assignedTo', type: 'text' },
    { label: 'Department', value: 'department', type: 'text' },
    { label: 'Category', value: 'category', type: 'text' },
    { label: 'Sub Category', value: 'subCategory', type: 'text' },
    { label: 'Location', value: 'location', type: 'text' },
    { label: 'Created At', value: 'createdAt', type: 'date' },
    { label: 'Updated At', value: 'updatedAt', type: 'date' },
    { label: 'Closed At', value: 'closedAt', type: 'date' },
    { label: 'Resolution', value: 'resolution', type: 'text' },
    { label: 'Approval Status', value: 'approvalStatus', type: 'text' },
    { label: 'Asset Number', value: 'assetNumber', type: 'text' },
    { label: 'Asset Name', value: 'assetName', type: 'text' }
  ];

  // Column widths for Excel-like table
  const columnWidths: { [key: string]: number } = {
    'id': 80,
    'subject': 200,
    'description': 300,
    'priority': 100,
    'status': 120,
    'reportedBy': 150,
    'reportedTo': 150,
    'assignedTo': 150,
    'department': 150,
    'category': 150,
    'subCategory': 150,
    'location': 150,
    'createdAt': 120,
    'updatedAt': 120,
    'closedAt': 120,
    'resolution': 250,
    'approvalStatus': 130,
    'assetNumber': 120,
    'assetName': 150
  };

  // Load folders and templates on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Mock folders data - replace with actual API call
        const mockFolders: FolderData[] = [
          {
            id: '1',
            name: 'General Reports',
            reports: [
              {
                id: '1',
                name: 'All Open Tickets',
                createdAt: '2024-01-15',
                status: 'Active',
                isOwner: true
              },
              {
                id: '2',
                name: 'Monthly Summary',
                createdAt: '2024-01-10',
                status: 'Active',
                isOwner: true
              }
            ]
          },
          {
            id: '2',
            name: 'Priority Reports',
            reports: [
              {
                id: '3',
                name: 'High Priority Issues',
                createdAt: '2024-01-20',
                status: 'Active',
                isOwner: true
              }
            ]
          }
        ];
        
        // Mock templates data - replace with actual API call
        const mockTemplates: ReportTemplate[] = [
          {
            id: 1,
            name: 'All Open Tickets',
            description: 'Shows all currently open tickets',
            selectedFields: ['id', 'subject', 'priority', 'status', 'reportedBy', 'createdAt'],
            filters: {
              filters: [{ column: 'status', criteria: 'not_equal', value: 'Closed' }],
              groupBy: [],
              summaryType: '',
              chartType: ''
            },
            createdAt: '2024-01-15',
            isOwner: true,
            status: 'Active'
          },
          {
            id: 2,
            name: 'Monthly Summary',
            description: 'Monthly ticket summary report',
            selectedFields: ['id', 'subject', 'status', 'assignedTo', 'createdAt', 'closedAt'],
            createdAt: '2024-01-10',
            isOwner: true,
            status: 'Active'
          },
          {
            id: 3,
            name: 'High Priority Issues',
            description: 'All high priority tickets',
            selectedFields: ['id', 'subject', 'priority', 'status', 'reportedBy', 'assignedTo', 'createdAt'],
            filters: {
              filters: [{ column: 'priority', criteria: 'equal', value: 'High' }],
              groupBy: [],
              summaryType: '',
              chartType: ''
            },
            createdAt: '2024-01-20',
            isOwner: true,
            status: 'Active'
          }
        ];
        
        setFolders(mockFolders);
        setReportTemplates(mockTemplates);
        setSelectedFolder(mockFolders[0]?.id || null);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoadingTemplates(false);
      }
    };

    loadData();
  }, []);

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
      filters.forEach(filter => {
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

      const response = await fetch(`/api/technician/reports?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        setReportData(data.records || []);
        setCurrentReportConfig({
          columns: selectedFields,
          filters,
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

  const loadTemplate = (template: ReportTemplate) => {
    setSelectedFields(template.selectedFields);
    if (template.filters) {
      setFilters(template.filters.filters || []);
      setGroupBy(template.filters.groupBy || []);
      setSummaryType(template.filters.summaryType || '');
      setChartType(template.filters.chartType || '');
    } else {
      setFilters([]);
      setGroupBy([]);
      setSummaryType('');
      setChartType('');
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !selectedFolderForTemplate) {
      return;
    }

    const newTemplate: ReportTemplate = {
      id: Date.now(),
      name: templateName.trim(),
      description: templateDescription.trim() || undefined,
      selectedFields: [...selectedFields],
      filters: {
        filters: [...filters],
        groupBy: [...groupBy],
        summaryType,
        chartType
      },
      createdAt: new Date().toISOString(),
      isOwner: true,
      status: 'Active'
    };

    setReportTemplates(prev => [...prev, newTemplate]);
    
    // Add to folder
    setFolders(prevFolders => prevFolders.map(folder => {
      if (folder.id === selectedFolderForTemplate) {
        return {
          ...folder,
          reports: [
            ...(folder.reports || []),
            {
              id: newTemplate.id.toString(),
              name: newTemplate.name,
              createdAt: newTemplate.createdAt,
              status: newTemplate.status,
              isOwner: true
            }
          ]
        };
      }
      return folder;
    }));

    setTemplateName('');
    setTemplateDescription('');
    setSelectedFolderForTemplate('');
    setSaveDialogOpen(false);
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;

    const newFolder: FolderData = {
      id: Date.now().toString(),
      name: newFolderName.trim(),
      reports: []
    };

    setFolders(prev => [...prev, newFolder]);
    setNewFolderName('');
    setFolderDialogOpen(false);
    setSelectedFolder(newFolder.id);
  };

  const handleNewReport = (folderId: string) => {
    setSelectedFolder(folderId);
    setSelectedFolderForTemplate(folderId);
    // Reset form to create new report
    setSelectedFields([]);
    setFilters([]);
    setGroupBy([]);
    setSummaryType('');
    setChartType('');
  };

  const handleExport = async (format: 'excel' | 'csv') => {
    if (!currentReportConfig || reportData.length === 0) {
      alert('No data to export');
      return;
    }

    try {
      const response = await fetch('/api/technician/reports/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: reportData,
          columns: currentReportConfig.columns,
          format
        })
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const filename = `technician_report_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data');
    }
  };

  return (
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
            <Label className="text-base font-medium mb-3 block">Select Fields</Label>
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

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button 
              onClick={executeReport}
              disabled={loading || selectedFields.length === 0}
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Run Report
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => setSaveDialogOpen(true)}
              disabled={selectedFields.length === 0}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Template
            </Button>
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
                <Badge variant="secondary" className="ml-auto text-xs">
                  {folder.reports?.length || 0}
                </Badge>
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
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Report Results
              {currentReportConfig && (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleExport('excel')}
                    size="sm"
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel
                  </Button>
                  <Button
                    onClick={() => handleExport('csv')}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    CSV
                  </Button>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {/* Reports Table with Scroll */}
          <div 
            className="border rounded-md overflow-auto shadow-sm bg-white"
            style={{ 
              maxHeight: '70vh',
              width: '100%',
              position: 'relative'
            }}
          >
            <div style={{ minWidth: 'max-content' }}>
              {/* Header */}
              <div className="sticky top-0 bg-gray-50 border-b z-10">
                <div className="flex">
                  {currentReportConfig?.columns.map((column, index) => (
                    <div
                      key={column}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200 last:border-r-0"
                      style={{
                        minWidth: columnWidths[column] || 120,
                        maxWidth: columnWidths[column] || 120,
                        backgroundColor: '#f9fafb',
                        fontWeight: '600'
                      }}
                    >
                      {column.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Body */}
              <div>
                {reportData.map((record, index) => (
                  <div 
                    key={index} 
                    className={`flex ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}
                  >
                    {currentReportConfig?.columns.map((column) => (
                      <div
                        key={`${index}-${column}`}
                        className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 last:border-r-0 truncate"
                        style={{
                          minWidth: columnWidths[column] || 120,
                          maxWidth: columnWidths[column] || 120
                        }}
                        title={String(record[column] || '-')}
                      >
                        {(() => {
                          const value = record[column];
                          if (value === null || value === undefined || value === '') {
                            return '-';
                          }
                          
                          // Format dates
                          if ((column.toLowerCase().includes('date') || column === 'createdAt' || column === 'updatedAt') && 
                              typeof value === 'string' && !isNaN(Date.parse(value))) {
                            return new Date(value).toLocaleDateString();
                          }
                          
                          // Format other values
                          return String(value);
                        })()}
                      </div>
                    ))}
                  </div>
                ))}
                
                {reportData.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No data found
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="text-sm text-gray-600 mt-2">
            Showing {reportData.length} record{reportData.length !== 1 ? 's' : ''}
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Template Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Report Template</DialogTitle>
            <DialogDescription>
              Save your current report configuration as a reusable template
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
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate} disabled={!templateName.trim() || !selectedFolderForTemplate}>
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}