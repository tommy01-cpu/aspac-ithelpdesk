"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Folder, 
  FolderPlus, 
  FileText, 
  Plus, 
  MoreVertical,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  BarChart3,
  Calendar,
  Settings,
  Search,
  Filter,
  Eye,
  Download,
  Clock
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Report structure types
interface ReportFolder {
  id: string;
  name: string;
  parentId?: string;
  children?: ReportFolder[];
  reports?: ReportItem[];
  expanded?: boolean;
}

interface ReportItem {
  id: string;
  name: string;
  type: 'custom' | 'scheduled';
  folderId: string;
  createdAt: string;
  lastRun?: string;
  status: 'draft' | 'active' | 'inactive';
}

// Step types for report creation
type ReportStep = 'type' | 'columns' | 'filters' | 'grouping' | 'summary' | 'charts';

interface ColumnDefinition {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  category: string;
}

export default function TechnicianReportsPage() {
  const { data: session, status } = useSession();
  const [folders, setFolders] = useState<ReportFolder[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);

  // Dialog states
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [reportTypeDialogOpen, setReportTypeDialogOpen] = useState(false);
  const [reportCreationOpen, setReportCreationOpen] = useState(false);
  const [showFolderManagement, setShowFolderManagement] = useState(false);
  
  // Report creation states
  const [currentStep, setCurrentStep] = useState<ReportStep>('type');
  const [reportType, setReportType] = useState<'custom' | 'scheduled'>('custom');
  const [reportName, setReportName] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<any[]>([]);
  const [groupBy, setGroupBy] = useState<string[]>([]);
  const [summaryType, setSummaryType] = useState<string>('');
  const [chartType, setChartType] = useState<string>('');

  // Data states
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [reportTemplates, setReportTemplates] = useState<any[]>([]);
  const [showReportResults, setShowReportResults] = useState(false);
  const [currentReportConfig, setCurrentReportConfig] = useState<any>(null);

  // Available columns (based on your request structure)
  const availableColumns: ColumnDefinition[] = [
    { id: 'requestId', name: 'Request ID', type: 'text', category: 'Basic' },
    { id: 'requestSubject', name: 'Request Subject', type: 'text', category: 'Basic' },
    { id: 'requestDescription', name: 'Request Description', type: 'text', category: 'Basic' },
    { id: 'requestType', name: 'Request Type', type: 'text', category: 'Basic' },
    { id: 'requestStatus', name: 'Request Status', type: 'text', category: 'Status' },
    { id: 'approvalStatus', name: 'Approval Status', type: 'text', category: 'Status' },
    { id: 'mode', name: 'Mode', type: 'text', category: 'Details' },
    { id: 'requester', name: 'Requester', type: 'text', category: 'User Info' },
    { id: 'department', name: 'Department', type: 'text', category: 'User Info' },
    { id: 'createdTime', name: 'Created Time', type: 'date', category: 'Timestamps' },
    { id: 'dueByTime', name: 'Due By Time', type: 'date', category: 'Timestamps' },
    { id: 'resolvedTime', name: 'Resolved Time', type: 'date', category: 'Timestamps' },
    { id: 'priority', name: 'Priority', type: 'text', category: 'Details' },
    { id: 'technician', name: 'Technician', type: 'text', category: 'Assignment' },
    { id: 'serviceCategory', name: 'Service Category', type: 'text', category: 'Classification' },
    { id: 'requestTemplate', name: 'Request Template', type: 'text', category: 'Classification' },
    { id: 'sla', name: 'SLA', type: 'text', category: 'SLA' }
  ];

  // Check authentication
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      redirect("/login");
    }
    if (!session.user?.isTechnician) {
      redirect("/");
    }
  }, [session, status]);

  // Load report templates
  useEffect(() => {
    if (session?.user?.isTechnician) {
      loadFolders();
      loadReportTemplates();
    }
  }, [session]);

  // Load report templates function
  const loadReportTemplates = async () => {
    try {
      const response = await fetch('/api/technician/report-templates');
      if (response.ok) {
        const data = await response.json();
        setReportTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading report templates:', error);
    }
  };

  // Load folders function
  const loadFolders = async () => {
    setIsLoadingFolders(true);
    try {
      if (!session?.user?.id) {
        console.error('No user session found');
        return;
      }

      const response = await fetch(`/api/technician/report-folders?userId=${session.user.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to load folders');
      }

      const { folders: dbFolders } = await response.json();
      
      // Convert database folders to UI format
      const convertToUIFormat = (dbFolder: any): ReportFolder => ({
        id: dbFolder.id.toString(),
        name: dbFolder.name,
        parentId: dbFolder.parent_id?.toString(),
        children: dbFolder.children ? dbFolder.children.map(convertToUIFormat) : [],
        reports: [], // We'll load reports separately
        expanded: true
      });

      // Only show actual database folders
      if (dbFolders.length === 0) {
        setFolders([]);
      } else {
        // Convert database folders to UI format
        const uiFolders = dbFolders.map(convertToUIFormat);
        setFolders(uiFolders);
      }
    } catch (error) {
      console.error('Error loading folders:', error);
      // Show empty state on error
      setFolders([]);
    } finally {
      setIsLoadingFolders(false);
    }
  };

  // Folder management functions
  const handleAddFolder = (parentId: string) => {
    setSelectedFolderId(parentId);
    setFolderDialogOpen(true);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      alert('Please enter a folder name');
      return;
    }

    if (!session?.user?.id) {
      alert('User session not found');
      return;
    }

    try {
      const response = await fetch('/api/technician/report-folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newFolderName,
          description: '',
          parentId: selectedFolderId ? parseInt(selectedFolderId) : null,
          createdBy: parseInt(session.user.id.toString()),
          isShared: false
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create folder');
      }

      const { folder } = await response.json();
      
      // Reload folders to get the updated structure
      await loadFolders();
      
      setFolderDialogOpen(false);
      setNewFolderName('');
      
      // Show success message
      alert('Folder created successfully!');
    } catch (error) {
      console.error('Error creating folder:', error);
      alert(`Failed to create folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const addFolderToTree = (folders: ReportFolder[], parentId: string, newFolder: ReportFolder): ReportFolder[] => {
    return folders.map(folder => {
      if (folder.id === parentId) {
        return {
          ...folder,
          children: [...(folder.children || []), newFolder],
          expanded: true
        };
      }
      if (folder.children) {
        return {
          ...folder,
          children: addFolderToTree(folder.children, parentId, newFolder)
        };
      }
      return folder;
    });
  };

  // Toggle folder expansion
  const toggleFolderExpansion = (folderId: string) => {
    setFolders(prev => toggleFolderInTree(prev, folderId));
  };

  const toggleFolderInTree = (folders: ReportFolder[], targetId: string): ReportFolder[] => {
    return folders.map(folder => {
      if (folder.id === targetId) {
        return {
          ...folder,
          expanded: !folder.expanded
        };
      }
      if (folder.children) {
        return {
          ...folder,
          children: toggleFolderInTree(folder.children, targetId)
        };
      }
      return folder;
    });
  };

  // Delete folder
  const deleteFolder = async (folderId: string) => {
    // Only allow deletion of user-created folders (database folders should have numeric IDs)
    if (!folderId || folderId === 'my-reports' || folderId === 'shared-reports' || folderId === 'root') {
      alert('Cannot delete system folders');
      return;
    }
    
    if (!session?.user?.id) {
      alert('User session not found');
      return;
    }

    if (confirm('Are you sure you want to delete this folder? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/technician/report-folders?id=${folderId}&userId=${session.user.id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to delete folder');
        }

        // Reload folders to reflect the changes
        await loadFolders();
        alert('Folder deleted successfully!');
      } catch (error) {
        console.error('Error deleting folder:', error);
        alert(`Failed to delete folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const deleteFolderFromTree = (folders: ReportFolder[], targetId: string): ReportFolder[] => {
    return folders.map(folder => {
      if (folder.children) {
        return {
          ...folder,
          children: folder.children.filter(child => child.id !== targetId)
        };
      }
      return folder;
    }).filter(folder => folder.id !== targetId);
  };

  // Report creation functions
  const handleNewReport = (folderId: string) => {
    setSelectedFolderId(folderId);
    setReportTypeDialogOpen(true);
  };

  const handleReportTypeSelect = (type: 'custom' | 'scheduled') => {
    setReportType(type);
    setReportTypeDialogOpen(false);
    if (type === 'custom') {
      resetReportCreation();
      setReportCreationOpen(true);
      setCurrentStep('columns');
    }
  };

  const handleStepNext = () => {
    const steps: ReportStep[] = ['columns', 'filters', 'grouping', 'summary', 'charts'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handleStepPrev = () => {
    const steps: ReportStep[] = ['columns', 'filters', 'grouping', 'summary', 'charts'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const toggleColumnSelection = (columnId: string) => {
    setSelectedColumns(prev => 
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  const addFilter = () => {
    setFilters(prev => [...prev, { column: '', criteria: '', value: '', match: 'AND' }]);
  };

  const removeFilter = (index: number) => {
    setFilters(prev => prev.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, field: string, value: string) => {
    setFilters(prev => prev.map((filter, i) => 
      i === index ? { ...filter, [field]: value } : filter
    ));
  };

  // Execute report function
  const executeReport = async () => {
    if (selectedColumns.length === 0) {
      alert('Please select at least one column');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('fields', selectedColumns.join(','));
      
      // Add filters to params
      filters.forEach((filter, index) => {
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
          columns: selectedColumns,
          filters: filters,
          groupBy: groupBy,
          summaryType: summaryType,
          chartType: chartType
        });
        setShowReportResults(true);
        setReportCreationOpen(false);
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

  // Save report as template and add to folder
  const saveReportTemplate = async () => {
    if (!reportName.trim()) {
      alert('Please enter a report name');
      return;
    }

    if (selectedColumns.length === 0) {
      alert('Please select at least one column');
      return;
    }

    try {
      const response = await fetch('/api/technician/report-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: reportName,
          description: `Custom report with ${selectedColumns.length} columns`,
          selectedFields: selectedColumns,
          filters: {
            filters: filters,
            groupBy: groupBy,
            summaryType: summaryType,
            chartType: chartType
          },
          isShared: false
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Add the new report to the selected folder
        const newReport: ReportItem = {
          id: data.template.id.toString(),
          name: reportName,
          type: 'custom',
          folderId: selectedFolderId,
          createdAt: new Date().toISOString(),
          status: 'active'
        };

        // Add report to folder
        setFolders(prev => addReportToFolder(prev, selectedFolderId, newReport));
        
        alert('Report template saved successfully!');
        loadReportTemplates(); // Reload templates
        setReportName('');
        setReportCreationOpen(false);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to save template');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    }
  };

  // Add report to folder structure
  const addReportToFolder = (folders: ReportFolder[], folderId: string, report: ReportItem): ReportFolder[] => {
    return folders.map(folder => {
      if (folder.id === folderId) {
        return {
          ...folder,
          reports: [...(folder.reports || []), report]
        };
      }
      if (folder.children) {
        return {
          ...folder,
          children: addReportToFolder(folder.children, folderId, report)
        };
      }
      return folder;
    });
  };

  // Load template
  const loadTemplate = async (template: any) => {
    setSelectedColumns(template.selectedFields || []);
    if (template.filters) {
      setFilters(template.filters.filters || []);
      setGroupBy(template.filters.groupBy || []);
      setSummaryType(template.filters.summaryType || '');
      setChartType(template.filters.chartType || '');
    }
    setReportName(template.name);
    setReportCreationOpen(true);
    setCurrentStep('columns');
  };

  // Reset report creation
  const resetReportCreation = () => {
    setSelectedColumns([]);
    setFilters([]);
    setGroupBy([]);
    setSummaryType('');
    setChartType('');
    setReportName('');
    setCurrentStep('columns');
  };

  // Export report function
  const exportReport = async (format: 'csv' | 'json') => {
    if (!currentReportConfig) {
      alert('No report data to export');
      return;
    }

    try {
      const params = new URLSearchParams();
      params.append('format', format);
      params.append('fields', currentReportConfig.columns.join(','));
      
      // Add filters to params
      currentReportConfig.filters.forEach((filter: any) => {
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

      const response = await fetch(`/api/technician/reports/export?${params.toString()}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to export report');
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Failed to export report');
    }
  };

  // Process data for charts
  const processChartData = (data: any[], groupBy: string, chartType: string) => {
    if (!data || data.length === 0) return [];

    const grouped = data.reduce((acc, item) => {
      const key = item[groupBy] || 'Unassigned';
      if (!acc[key]) {
        acc[key] = { name: key, total: 0, closed: 0, resolved: 0, open: 0, cancelled: 0, on_hold: 0, for_approval: 0 };
      }
      acc[key].total++;
      const status = item.requestStatus || item.status;
      if (status) {
        acc[key][status] = (acc[key][status] || 0) + 1;
      }
      return acc;
    }, {});

    return Object.values(grouped);
  };

  // Colors for different statuses
  const statusColors = {
    closed: '#10B981',        // Green
    resolved: '#059669',      // Dark Green  
    open: '#EF4444',          // Red
    cancelled: '#6B7280',     // Gray
    on_hold: '#F59E0B',       // Orange
    for_approval: '#3B82F6'   // Blue
  };

  // Render folder tree
  const renderFolderTree = (folders: ReportFolder[], level: number = 0) => {
    return folders.map(folder => (
      <div key={folder.id} className={`ml-${level * 4}`}>
        <div className="flex items-center justify-between group hover:bg-gray-50 p-2 rounded">
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleFolderExpansion(folder.id)}
              className="p-1 hover:bg-gray-200 rounded"
            >
              {folder.children && folder.children.length > 0 ? (
                folder.expanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )
              ) : (
                <div className="h-4 w-4" />
              )}
            </button>
            <Folder className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">{folder.name}</span>
            {folder.reports && folder.reports.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {folder.reports.length}
              </Badge>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleAddFolder(folder.id)}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Add Subfolder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleNewReport(folder.id)}>
                <Plus className="h-4 w-4 mr-2" />
                New Report
              </DropdownMenuItem>
              {folder.id !== 'root' && folder.id !== 'my-reports' && folder.id !== 'shared-reports' && (
                <>
                  <DropdownMenuItem>
                    <Edit className="h-4 w-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-red-600"
                    onClick={() => deleteFolder(folder.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Reports in folder */}
        {folder.expanded && folder.reports && folder.reports.map(report => (
          <div key={report.id} className={`ml-${(level + 1) * 4} flex items-center justify-between group hover:bg-gray-50 p-2 rounded`}>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-green-600" />
              <span className="text-sm">{report.name}</span>
              <Badge variant={report.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                {report.status}
              </Badge>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => {
                  // Find and load the template
                  const template = reportTemplates.find(t => t.id.toString() === report.id);
                  if (template) {
                    loadTemplate(template);
                  }
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  // Find and run the template
                  const template = reportTemplates.find(t => t.id.toString() === report.id);
                  if (template) {
                    loadTemplate(template);
                    setTimeout(() => executeReport(), 100);
                  }
                }}>
                  <Eye className="h-4 w-4 mr-2" />
                  Run Report
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
        
        {/* Nested folders */}
        {folder.expanded && folder.children && renderFolderTree(folder.children, level + 1)}
      </div>
    ));
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'columns':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-4">Step 1: Select Columns</h3>
              <p className="text-sm text-gray-600 mb-4">Choose the columns you want to include in your report</p>
            </div>
            
            {/* Available columns by category */}
            {Object.entries(
              availableColumns.reduce((acc, col) => {
                if (!acc[col.category]) acc[col.category] = [];
                acc[col.category].push(col);
                return acc;
              }, {} as Record<string, ColumnDefinition[]>)
            ).map(([category, columns]) => (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {columns.map(column => (
                      <div key={column.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={column.id}
                          checked={selectedColumns.includes(column.id)}
                          onChange={() => toggleColumnSelection(column.id)}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor={column.id} className="text-sm cursor-pointer">
                          {column.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <div className="mt-4 p-3 bg-blue-50 rounded">
              <p className="text-sm text-blue-700">
                Selected: {selectedColumns.length} columns
              </p>
            </div>
          </div>
        );

      case 'filters':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-4">Step 2: Filter Options</h3>
              <p className="text-sm text-gray-600 mb-4">Add filters to narrow down your data</p>
            </div>
            
            {filters.map((filter, index) => (
              <Card key={index}>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-4 gap-4 items-end">
                    <div>
                      <Label>Column</Label>
                      <Select value={filter.column} onValueChange={(value) => updateFilter(index, 'column', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Filter fields based on your requirements */}
                          <SelectItem value="requestType">Request Type</SelectItem>
                          <SelectItem value="requestStatus">Request Status</SelectItem>
                          <SelectItem value="approvalStatus">Approval Status</SelectItem>
                          <SelectItem value="mode">Mode</SelectItem>
                          <SelectItem value="requester">Requester</SelectItem>
                          <SelectItem value="department">Department</SelectItem>
                          <SelectItem value="createdTime">Created Time</SelectItem>
                          <SelectItem value="dueByTime">Due By Time</SelectItem>
                          <SelectItem value="resolvedTime">Resolved Time</SelectItem>
                          <SelectItem value="priority">Priority</SelectItem>
                          <SelectItem value="technician">Technician</SelectItem>
                          <SelectItem value="serviceCategory">Service Category</SelectItem>
                          <SelectItem value="requestTemplate">Request Template</SelectItem>
                          <SelectItem value="sla">SLA</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Criteria</Label>
                      <Select value={filter.criteria} onValueChange={(value) => updateFilter(index, 'criteria', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select criteria" />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Date fields */}
                          {(['createdTime', 'dueByTime', 'resolvedTime'].includes(filter.column)) && (
                            <>
                              <SelectItem value="from">From Date</SelectItem>
                              <SelectItem value="to">To Date</SelectItem>
                              <SelectItem value="between">Between Dates</SelectItem>
                              <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                              <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                              <SelectItem value="last_90_days">Last 90 Days</SelectItem>
                            </>
                          )}
                          {/* Text fields */}
                          {(!['createdTime', 'dueByTime', 'resolvedTime'].includes(filter.column)) && (
                            <>
                              <SelectItem value="equals">Equals</SelectItem>
                              <SelectItem value="contains">Contains</SelectItem>
                              <SelectItem value="starts_with">Starts with</SelectItem>
                              <SelectItem value="not_equals">Not equals</SelectItem>
                              <SelectItem value="is_empty">Is empty</SelectItem>
                              <SelectItem value="is_not_empty">Is not empty</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Value</Label>
                      {/* Date input for time fields */}
                      {(['createdTime', 'dueByTime', 'resolvedTime'].includes(filter.column)) ? (
                        <Input
                          type="date"
                          value={filter.value}
                          onChange={(e) => updateFilter(index, 'value', e.target.value)}
                        />
                      ) : 
                      /* Dropdown for predefined values */
                      (['requestStatus'].includes(filter.column)) ? (
                        <Select value={filter.value} onValueChange={(value) => updateFilter(index, 'value', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="for_approval">For Approval</SelectItem>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="on_hold">On Hold</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : 
                      (['approvalStatus'].includes(filter.column)) ? (
                        <Select value={filter.value} onValueChange={(value) => updateFilter(index, 'value', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select approval status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending_approval">Pending Approval</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                            <SelectItem value="for_clarification">For Clarification</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : 
                      (['priority'].includes(filter.column)) ? (
                        <Select value={filter.value} onValueChange={(value) => updateFilter(index, 'value', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Low">Low</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Top">Top</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : 
                      (['mode'].includes(filter.column)) ? (
                        <Select value={filter.value} onValueChange={(value) => updateFilter(index, 'value', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select mode" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="online">Online</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="phone">Phone</SelectItem>
                            <SelectItem value="walk_in">Walk-in</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={filter.value}
                          onChange={(e) => updateFilter(index, 'value', e.target.value)}
                          placeholder="Enter value"
                        />
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Select value={filter.match} onValueChange={(value) => updateFilter(index, 'match', value)}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AND">AND</SelectItem>
                          <SelectItem value="OR">OR</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" onClick={() => removeFilter(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <Button onClick={addFilter} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Filter
            </Button>
          </div>
        );

      case 'grouping':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-4">Step 3: Select Column to Group</h3>
              <p className="text-sm text-gray-600 mb-4">Group your data by columns for better organization</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Group by</Label>
                <Select value={groupBy[0] || ''} onValueChange={(value) => setGroupBy([value])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column to group by" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedColumns.map(colId => {
                      const column = availableColumns.find(c => c.id === colId);
                      return (
                        <SelectItem key={colId} value={colId}>
                          {column?.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Order by</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column to order by" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedColumns.map(colId => {
                      const column = availableColumns.find(c => c.id === colId);
                      return (
                        <SelectItem key={colId} value={colId}>
                          {column?.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input type="radio" id="asc" name="order" value="asc" />
                  <Label htmlFor="asc">Sort by ascending order</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="radio" id="desc" name="order" value="desc" />
                  <Label htmlFor="desc">Sort by descending order</Label>
                </div>
              </div>
            </div>
          </div>
        );

      case 'summary':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-4">Step 4: Select Summary Type</h3>
              <p className="text-sm text-gray-600 mb-4">Choose how to summarize your data</p>
            </div>
            
            <div className="grid grid-cols-5 gap-4">
              <Card className="cursor-pointer hover:bg-gray-50">
                <CardContent className="pt-4 text-center">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <p className="text-sm font-medium">Columns</p>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:bg-gray-50">
                <CardContent className="pt-4 text-center">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <p className="text-sm font-medium">Count</p>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:bg-gray-50">
                <CardContent className="pt-4 text-center">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                  <p className="text-sm font-medium">Sum</p>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:bg-gray-50">
                <CardContent className="pt-4 text-center">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                  <p className="text-sm font-medium">Average</p>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:bg-gray-50">
                <CardContent className="pt-4 text-center">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 text-red-600" />
                  <p className="text-sm font-medium">Maximum</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="mt-6 p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">No numeric column(s) to summarize.</p>
            </div>
          </div>
        );

      case 'charts':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-4">Step 5: Charts</h3>
              <p className="text-sm text-gray-600 mb-4">Choose chart type and configuration</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Chart Type</Label>
                <Select value={chartType} onValueChange={setChartType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select chart type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pie">Pie Chart</SelectItem>
                    <SelectItem value="bar">Bar Chart</SelectItem>
                    <SelectItem value="line">Line Chart</SelectItem>
                    <SelectItem value="donut">Donut Chart</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Axis Column</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select axis column" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedColumns.map(colId => {
                      const column = availableColumns.find(c => c.id === colId);
                      return (
                        <SelectItem key={colId} value={colId}>
                          {column?.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Display Format</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select display format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="currency">Currency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Chart preview would go here */}
            <div className="mt-6 p-8 bg-gray-50 rounded text-center">
              <p className="text-gray-500">Chart preview will appear here</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (!session?.user?.isTechnician) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            <p className="text-gray-600">Generate and manage your reports</p>
          </div>
        </div>
      </div>

      <div className="flex max-w-full mx-auto">
        {/* Left Sidebar - Report Categories */}
        <div className="w-64 bg-white border-r border-gray-200 min-h-screen">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Folder
              </h2>
              <button
                onClick={() => setFolderDialogOpen(true)}
                className="text-blue-600 hover:text-blue-800 p-1 rounded"
                title="Create New Folder"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            
            {/* Manage Button */}
            <button 
              onClick={() => setShowFolderManagement(!showFolderManagement)}
              className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded mb-4 border border-blue-200"
            >
              Manage
            </button>
            
            {/* Folder Categories */}
            <div className="space-y-1">
              {/* Dynamic Folders from Database */}
              <div className="py-2">
               
                <div className="space-y-1">
                  {isLoadingFolders ? (
                    <div className="text-center py-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
                    </div>
                  ) : folders.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      <Folder className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No folders found</p>
                      <p className="text-xs">Create your first folder to organize reports</p>
                    </div>
                  ) : (
                    renderFolderTree(folders)
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-white">
          {showReportResults ? (
            <div className="space-y-6">
              {/* Report Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Summary Report by Technician</CardTitle>
                      <CardDescription>
                        Generated by IT Helpdesk Administrator on Aug 27, 2025 07:05 AM<br/>
                        Total records: {reportData.length}<br/>
                        Created Time: From Jan 1, 2025 12:00 AM To Dec 31, 2025 11:59 PM
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowReportResults(false)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Back to Reports
                      </Button>
                      <Button variant="outline" onClick={() => exportReport('csv')}>
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                      </Button>
                      <Button variant="outline" onClick={() => exportReport('json')}>
                        <Download className="h-4 w-4 mr-2" />
                        Export JSON
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Chart Section */}
              {currentReportConfig?.chartType && reportData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Summary Chart</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500"></div>
                        <span className="text-sm">Closed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-emerald-600"></div>
                        <span className="text-sm">Resolved</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500"></div>
                        <span className="text-sm">On-hold</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500"></div>
                        <span className="text-sm">Open</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500"></div>
                        <span className="text-sm">For Approval</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gray-500"></div>
                        <span className="text-sm">Cancelled</span>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={processChartData(reportData, 'technician', currentReportConfig.chartType)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          interval={0}
                        />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="closed" stackId="a" fill={statusColors.closed} name="Closed" />
                        <Bar dataKey="resolved" stackId="a" fill={statusColors.resolved} name="Resolved" />
                        <Bar dataKey="on_hold" stackId="a" fill={statusColors.on_hold} name="On-hold" />
                        <Bar dataKey="open" stackId="a" fill={statusColors.open} name="Open" />
                        <Bar dataKey="for_approval" stackId="a" fill={statusColors.for_approval} name="For Approval" />
                        <Bar dataKey="cancelled" stackId="a" fill={statusColors.cancelled} name="Cancelled" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Data Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Request Details</CardTitle>
                </CardHeader>
                <CardContent>
                  {reportData.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="px-4 py-3 text-left font-medium">Request ID</th>
                            <th className="px-4 py-3 text-left font-medium">Request Subject</th>
                            <th className="px-4 py-3 text-left font-medium">Request Type</th>
                            <th className="px-4 py-3 text-left font-medium">Approval Status</th>
                            <th className="px-4 py-3 text-left font-medium">Request Status</th>
                            <th className="px-4 py-3 text-left font-medium">Priority</th>
                            <th className="px-4 py-3 text-left font-medium">Service Category</th>
                            <th className="px-4 py-3 text-left font-medium">Technician</th>
                            <th className="px-4 py-3 text-left font-medium">Requester</th>
                            <th className="px-4 py-3 text-left font-medium">Department</th>
                            <th className="px-4 py-3 text-left font-medium">Created Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.map((row, index) => (
                            <tr key={index} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-3 text-blue-600 font-medium">
                                {row.requestId || `${index + 1}`}
                              </td>
                              <td className="px-4 py-3 max-w-xs truncate">
                                {row.requestSubject || 'No Subject'}
                              </td>
                              <td className="px-4 py-3">{row.requestType || 'Service'}</td>
                              <td className="px-4 py-3">
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                  {row.approvalStatus || 'Approved'}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <Badge 
                                  variant="secondary" 
                                  className={
                                    row.requestStatus === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                                    row.requestStatus === 'closed' ? 'bg-green-100 text-green-800' :
                                    row.requestStatus === 'resolved' ? 'bg-emerald-100 text-emerald-800' :
                                    row.requestStatus === 'open' ? 'bg-red-100 text-red-800' :
                                    row.requestStatus === 'on_hold' ? 'bg-yellow-100 text-yellow-800' :
                                    row.requestStatus === 'for_approval' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  }
                                >
                                  {row.requestStatus?.charAt(0).toUpperCase() + row.requestStatus?.slice(1).replace('_', ' ') || 'Unknown'}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <Badge 
                                  variant="outline"
                                  className={
                                    row.priority === 'Top' ? 'border-red-500 text-red-600' :
                                    row.priority === 'High' ? 'border-orange-500 text-orange-600' :
                                    row.priority === 'Medium' ? 'border-yellow-500 text-yellow-600' :
                                    'border-green-500 text-green-600'
                                  }
                                >
                                  {row.priority || 'Medium'}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">{row.serviceCategory || '-'}</td>
                              <td className="px-4 py-3">{row.technician || 'Unassigned'}</td>
                              <td className="px-4 py-3">{row.requester || '-'}</td>
                              <td className="px-4 py-3">{row.department || '-'}</td>
                              <td className="px-4 py-3 text-xs">
                                {row.createdTime ? new Date(row.createdTime).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-600">No data found for the selected criteria.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Report Templates</CardTitle>
                <CardDescription>
                  Manage your saved report templates and create new ones.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 mt-2">Loading report templates...</p>
                  </div>
                ) : reportTemplates.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {reportTemplates.map((template) => (
                      <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-medium text-lg">{template.name}</h3>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => loadTemplate(template)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  loadTemplate(template);
                                  setTimeout(async () => {
                                    // Execute the report with the loaded template
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
                                  }, 100);
                                }}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Run Report
                                </DropdownMenuItem>
                                {template.isOwner && (
                                  <DropdownMenuItem 
                                    className="text-red-600"
                                    onClick={async () => {
                                      if (confirm(`Are you sure you want to delete "${template.name}"? This action cannot be undone.`)) {
                                        try {
                                          const response = await fetch(`/api/technician/report-templates/${template.id}`, {
                                            method: 'DELETE'
                                          });

                                          if (response.ok) {
                                            alert('Template deleted successfully!');
                                            loadReportTemplates(); // Reload templates
                                          } else {
                                            const errorData = await response.json();
                                            alert(errorData.error || 'Failed to delete template');
                                          }
                                        } catch (error) {
                                          console.error('Error deleting template:', error);
                                          alert('Failed to delete template');
                                        }
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">
                            {template.description || 'No description'}
                          </p>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{template.selectedFields?.length || 0} columns</span>
                            <span>{template.isShared ? 'Shared' : 'Private'}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {template.creator?.name}
                            </Badge>
                            <span className="text-xs text-gray-400">
                              {new Date(template.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Report Templates</h3>
                    <p className="text-gray-600 mb-6">
                      You haven't created any report templates yet. Create your first template to get started.
                    </p>
                    <div className="flex justify-center gap-4">
                      <Button onClick={() => handleAddFolder('my-reports')}>
                        <FolderPlus className="h-4 w-4 mr-2" />
                        Add Folder
                      </Button>
                      <Button onClick={() => handleNewReport('my-reports')} variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        New Report
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
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
              <Label htmlFor="folderName">Folder Name</Label>
              <Input
                id="folderName"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder}>
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Type Selection Dialog */}
      <Dialog open={reportTypeDialogOpen} onOpenChange={setReportTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Report</DialogTitle>
            <DialogDescription>
              Choose the type of report you want to create
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <Card 
              className="cursor-pointer hover:bg-gray-50 border-2 hover:border-blue-300"
              onClick={() => handleReportTypeSelect('custom')}
            >
              <CardContent className="pt-6 text-center">
                <BarChart3 className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                <h3 className="font-medium mb-2">Custom Report</h3>
                <p className="text-sm text-gray-600">
                  Create a custom report with your own queries and filters
                </p>
              </CardContent>
            </Card>
            
            <Card 
              className="cursor-pointer hover:bg-gray-50 border-2 hover:border-green-300"
              onClick={() => handleReportTypeSelect('scheduled')}
            >
              <CardContent className="pt-6 text-center">
                <Calendar className="h-12 w-12 text-green-600 mx-auto mb-3" />
                <h3 className="font-medium mb-2">Scheduled Report</h3>
                <p className="text-sm text-gray-600">
                  Set up automated reports that run on a schedule
                </p>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportTypeDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Creation Dialog */}
      <Dialog open={reportCreationOpen} onOpenChange={setReportCreationOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Custom Report</DialogTitle>
            <DialogDescription>
              Configure your custom report step by step
            </DialogDescription>
          </DialogHeader>
          
          {/* Step Navigation */}
          <div className="flex items-center justify-between py-4 border-b">
            <div className="flex items-center space-x-4">
              {['columns', 'filters', 'grouping', 'summary', 'charts'].map((step, index) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep === step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  <span className={`ml-2 text-sm ${
                    currentStep === step ? 'text-blue-600 font-medium' : 'text-gray-600'
                  }`}>
                    {step.charAt(0).toUpperCase() + step.slice(1)}
                  </span>
                  {index < 4 && <ChevronRight className="h-4 w-4 text-gray-400 ml-2" />}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="py-6">
            {renderStepContent()}
          </div>

          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setReportCreationOpen(false)}>
              Cancel
            </Button>
            <div className="flex gap-2">
              {currentStep !== 'columns' && (
                <Button variant="outline" onClick={handleStepPrev}>
                  Previous
                </Button>
              )}
              {currentStep !== 'charts' ? (
                <Button onClick={handleStepNext} disabled={currentStep === 'columns' && selectedColumns.length === 0}>
                  Next
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Report name"
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                    className="w-48"
                  />
                  <Button variant="outline" onClick={saveReportTemplate}>
                    Save Template
                  </Button>
                  <Button onClick={executeReport} disabled={loading}>
                    {loading ? 'Running...' : 'Run Report'}
                  </Button>
                </div>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
