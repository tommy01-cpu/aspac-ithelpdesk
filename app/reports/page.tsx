'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Filter, Plus, Trash2, Search, FileSpreadsheet, FileText, Download } from "lucide-react";
import { getStatusBadgeColor, getApprovalStatusBadgeColor, getPriorityBadgeColor } from "@/lib/utils";

// Using actual API response structure instead of rigid interface

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

interface FilterCondition {
  id: string;
  column: string;
  criteria: string;
  value: string;
  operator: 'AND' | 'OR';
}

interface Filters {
  requestType: string;
  requestStatus: string;
  approvalStatus: string;
  mode: string;
  requesterId: string;
  departmentId: string;
  createdTimeFrom: string;
  createdTimeTo: string;
  dueByTimeFrom: string;
  dueByTimeTo: string;
  resolvedTimeFrom: string;
  resolvedTimeTo: string;
  priority: string;
  technicianId: string;
  serviceCategoryId: string;
  templateId: string;
  searchRequestId: string;
  searchSubject: string;
}

const FILTER_COLUMNS = [
  { value: 'requestId', label: 'Request ID' },
  { value: 'subject', label: 'Subject' },
  { value: 'description', label: 'Description' },
  { value: 'requestType', label: 'Request Type' },
  { value: 'requestStatus', label: 'Request Status' },
  { value: 'approvalStatus', label: 'Approval Status' },
  { value: 'mode', label: 'Mode' },
  { value: 'requesterId', label: 'Requester' },
  { value: 'departmentId', label: 'Department' },
  { value: 'createdAt', label: 'Created Time' },
  { value: 'dueByTime', label: 'Due By Time' },
  { value: 'resolvedTime', label: 'Resolved Time' },
  { value: 'priority', label: 'Priority' },
  { value: 'technicianId', label: 'Technician' },
  { value: 'serviceCategoryId', label: 'Service Category' },
  { value: 'templateId', label: 'Request Template' }
];

const FILTER_CRITERIA = {
  text: [
    { value: 'equals', label: 'Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'startsWith', label: 'Starts with' },
    { value: 'endsWith', label: 'Ends with' },
    { value: 'notEquals', label: 'Not equals' }
  ],
  select: [
    { value: 'equals', label: 'Is' },
    { value: 'notEquals', label: 'Is not' },
    { value: 'in', label: 'Is one of' }
  ],
  date: [
    { value: 'equals', label: 'On' },
    { value: 'before', label: 'Before' },
    { value: 'after', label: 'After' },
    { value: 'between', label: 'Between' }
  ]
};

interface Filters {
  requestType: string;
  requestStatus: string;
  approvalStatus: string;
  mode: string;
  requesterId: string;
  departmentId: string;
  createdTimeFrom: string;
  createdTimeTo: string;
  dueByTimeFrom: string;
  dueByTimeTo: string;
  resolvedTimeFrom: string;
  resolvedTimeTo: string;
  priority: string;
  technicianId: string;
  serviceCategoryId: string;
  templateId: string;
}

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const [requests, setRequests] = useState<any[]>([]);
  const [filterData, setFilterData] = useState<FilterData | null>(null);
  const [loading, setLoading] = useState(true); // Start as true since we'll be loading data immediately
  const [exporting, setExporting] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
  const [isAdvancedFilter, setIsAdvancedFilter] = useState(false);
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
  const [allRequests, setAllRequests] = useState<any[]>([]); // Store all fetched requests
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [filters, setFilters] = useState<Filters>({
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
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    totalCount: 0,
    totalPages: 0
  });

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
      
      // Preserve headings with formatting (remove bold markers since we're not rendering markdown)
      .replace(/<h[1-6][^>]*>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, ':\n')
      
      // Remove strong/bold formatting markers (don't add ** since we're not rendering markdown)
      .replace(/<strong[^>]*>/gi, '')
      .replace(/<\/strong>/gi, '')
      .replace(/<b[^>]*>/gi, '')
      .replace(/<\/b>/gi, '')
      
      // Remove emphasis/italic formatting markers
      .replace(/<em[^>]*>/gi, '')
      .replace(/<\/em>/gi, '')
      .replace(/<i[^>]*>/gi, '')
      .replace(/<\/i>/gi, '')
      
      // Convert indentation (HTML spaces and tabs) - Enhanced for better structure
      .replace(/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/gi, '        ') // 8 spaces
      .replace(/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/gi, '      ') // 6 spaces  
      .replace(/&nbsp;&nbsp;&nbsp;&nbsp;/gi, '    ') // 4 spaces for tab-like indentation
      .replace(/&nbsp;&nbsp;/gi, '  ') // 2 spaces for smaller indentation
      .replace(/&nbsp;/gi, ' ')
      
      // Convert common HTML entities - Enhanced
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&apos;/gi, "'")
      .replace(/&rarr;/gi, '→') // Right arrow
      .replace(/&larr;/gi, '←') // Left arrow
      .replace(/&uarr;/gi, '↑') // Up arrow
      .replace(/&darr;/gi, '↓') // Down arrow
      
      // Remove remaining HTML tags but preserve the content
      .replace(/<[^>]*>/g, '')
      
      // Clean up excessive whitespace while preserving intentional formatting
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Convert multiple newlines to double newlines
      .replace(/^[\s\n]+|[\s\n]+$/g, '') // Trim leading/trailing whitespace
      .replace(/[ \t]+$/gm, '') // Remove trailing spaces from each line
      .replace(/^[ \t]+/gm, (match) => match) // Preserve leading spaces (indentation)
      
      // Ensure bullets are properly spaced and formatted - Enhanced
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

  // Helper function to capitalize each word
  const capitalizeWords = (str: string) => {
    if (!str) return str;
    return str.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.toLowerCase().slice(1)
    ).join(' ');
  };

  // Helper function to format status/approval text
  const formatStatusText = (text: string) => {
    if (!text) return text;
    return capitalizeWords(text.replace(/_/g, ' '));
  };

  // Helper function to get technician name from ID or text
  const getTechnicianName = (technicianData: any) => {
    if (!technicianData) return 'Unassigned';
    
    // If it's already a name (string), return it capitalized
    if (typeof technicianData === 'string') {
      // Don't capitalize if it's already a proper name or "Unassigned"
      if (technicianData === 'Unassigned' || technicianData === 'null' || technicianData === '') {
        return 'Unassigned';
      }
      // If it looks like a position/title, return as-is with proper capitalization
      return capitalizeWords(technicianData);
    }
    
    // If it's an ID (number), try to find the technician name from filterData
    if (typeof technicianData === 'number' && filterData?.technicians) {
      const technician = filterData.technicians.find(tech => tech.id === technicianData);
      return technician ? capitalizeWords(technician.name) : 'Unassigned';
    }
    
    // If it's a string that could be an ID
    if (typeof technicianData === 'string' && !isNaN(Number(technicianData)) && filterData?.technicians) {
      const technician = filterData.technicians.find(tech => tech.id === Number(technicianData));
      return technician ? capitalizeWords(technician.name) : capitalizeWords(technicianData);
    }
    
    return 'Unassigned';
  };

  // Load filter data on component mount
  useEffect(() => {
    fetchFilterData();
  }, []);

  // Load requests when filters change
  useEffect(() => {
    if (filterData) {
      fetchRequests();
    }
  }, [filters, pagination.page, filterData]);

  const fetchFilterData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reports/filters');
      if (response.ok) {
        const data = await response.json();
        setFilterData(data);
      }
    } catch (error) {
      console.error('Error fetching filter data:', error);
      setLoading(false); // Stop loading on error
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const searchParams = new URLSearchParams();
      
      // Add filters to search params (excluding search-related filters)
      Object.entries(filters).forEach(([key, value]) => {
        if (value && key !== 'searchRequestId' && key !== 'searchSubject') {
          searchParams.append(key, value);
        }
      });

      // Note: No search parameters - we'll fetch all data and filter client-side
      
      // Add pagination
      searchParams.append('page', pagination.page.toString());
      searchParams.append('limit', pagination.limit.toString());

      console.log('Fetching requests with filters:', Object.fromEntries(searchParams));

      const response = await fetch(`/api/reports?${searchParams.toString()}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Received data:', data);
        setAllRequests(data.requests); // Store all requests for client-side filtering
        setRequests(data.requests); // Initially show all requests
        setPagination(prev => ({
          ...prev,
          totalCount: data.pagination.totalCount,
          totalPages: data.pagination.totalPages
        }));
      } else {
        console.error('Failed to fetch requests:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
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
    setFilterConditions([]);
    setOmniSearch('');
    // Reset to show all requests when clearing filters
    setRequests(allRequests);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const addFilterCondition = () => {
    const newCondition: FilterCondition = {
      id: Date.now().toString(),
      column: '',
      criteria: '',
      value: '',
      operator: 'AND'
    };
    setFilterConditions([...filterConditions, newCondition]);
  };

  const updateFilterCondition = (id: string, field: keyof FilterCondition, value: string) => {
    setFilterConditions(conditions => 
      conditions.map(condition => 
        condition.id === id ? { ...condition, [field]: value } : condition
      )
    );
  };

  const removeFilterCondition = (id: string) => {
    setFilterConditions(conditions => conditions.filter(condition => condition.id !== id));
  };

  const validateFilters = () => {
    if (isAdvancedFilter) {
      // Validate advanced filters
      const incompleteFilters = filterConditions.filter(condition => 
        !condition.column || !condition.criteria || !condition.value
      );
      return incompleteFilters.length === 0;
    } else {
      // Basic filters don't require validation as empty values are allowed
      return true;
    }
  };

  const applyBasicFilters = () => {
    const newFilters: Filters = {
      requestType: '',
      requestStatus: basicFilters.status,
      approvalStatus: '',
      mode: '',
      requesterId: '',
      departmentId: basicFilters.department,
      createdTimeFrom: '',
      createdTimeTo: '',
      dueByTimeFrom: '',
      dueByTimeTo: '',
      resolvedTimeFrom: '',
      resolvedTimeTo: '',
      priority: basicFilters.priority,
      technicianId: basicFilters.requester, // Map requester to technicianId for filtering
      serviceCategoryId: '',
      templateId: '',
      searchRequestId: basicFilters.requestId,
      searchSubject: basicFilters.subject
    };

    console.log('Applying basic filters:', basicFilters);
    console.log('Mapped to API filters:', newFilters);

    setFilters(newFilters);
    
    // Trigger data fetch with new filters
    setPagination(prev => ({ ...prev, page: 1 }));
    setIsFilterModalOpen(false);
  };

  const applyFilters = () => {
    if (!isAdvancedFilter) {
      applyBasicFilters();
      return;
    }

    if (!validateFilters()) {
      alert('Please complete all filter conditions before applying.');
      return;
    }
    // Convert filter conditions to the filters object
    const newFilters: Filters = {
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
    };
    
    filterConditions.forEach(condition => {
      if (condition.column && condition.value && condition.criteria) {
        // Map condition to filter field based on column type
        switch (condition.column) {
          case 'requestType':
            newFilters.requestType = condition.value;
            break;
          case 'requestStatus':
            newFilters.requestStatus = condition.value;
            break;
          case 'approvalStatus':
            newFilters.approvalStatus = condition.value;
            break;
          case 'mode':
            newFilters.mode = condition.value;
            break;
          case 'requesterId':
            newFilters.requesterId = condition.value;
            break;
          case 'departmentId':
            newFilters.departmentId = condition.value;
            break;
          case 'priority':
            newFilters.priority = condition.value;
            break;
          case 'technicianId':
            newFilters.technicianId = condition.value;
            break;
          case 'serviceCategoryId':
            newFilters.serviceCategoryId = condition.value;
            break;
          case 'templateId':
            newFilters.templateId = condition.value;
            break;
          case 'createdAt':
            if (condition.criteria === 'after' || condition.criteria === 'equals') {
              newFilters.createdTimeFrom = condition.value;
            } else if (condition.criteria === 'before') {
              newFilters.createdTimeTo = condition.value;
            }
            break;
          case 'dueByTime':
            if (condition.criteria === 'after' || condition.criteria === 'equals') {
              newFilters.dueByTimeFrom = condition.value;
            } else if (condition.criteria === 'before') {
              newFilters.dueByTimeTo = condition.value;
            }
            break;
          case 'resolvedTime':
            if (condition.criteria === 'after' || condition.criteria === 'equals') {
              newFilters.resolvedTimeFrom = condition.value;
            } else if (condition.criteria === 'before') {
              newFilters.resolvedTimeTo = condition.value;
            }
            break;
        }
      }
    });
    
    console.log('Filter conditions:', filterConditions);
    console.log('Applied filters:', newFilters);
    
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
    setIsFilterModalOpen(false);
  };

  const getColumnType = (column: string) => {
    const dateColumns = ['createdAt', 'dueByTime', 'resolvedTime'];
    const selectColumns = ['requestType', 'requestStatus', 'approvalStatus', 'mode', 'priority', 'requesterId', 'departmentId', 'technicianId', 'serviceCategoryId', 'templateId'];
    
    if (dateColumns.includes(column)) return 'date';
    if (selectColumns.includes(column)) return 'select';
    return 'text';
  };

  const getOptionsForColumn = (column: string) => {
    if (!filterData) return [];
    
    switch (column) {
      case 'requestType': return filterData.requestTypes.map(t => ({ value: t, label: t }));
      case 'requestStatus': return filterData.requestStatuses.map(s => ({ value: s, label: s.replace('_', ' ') }));
      case 'approvalStatus': return filterData.approvalStatuses.map(s => ({ value: s, label: s.replace('_', ' ') }));
      case 'mode': return filterData.modes.map(m => ({ value: m, label: m }));
      case 'priority': return filterData.priorities.map(p => ({ value: p, label: p }));
      case 'requesterId': return filterData.users.map(u => ({ value: u.id.toString(), label: `${u.name} (${u.employeeId})` }));
      case 'departmentId': return filterData.departments.map(d => ({ value: d.id.toString(), label: d.name }));
      case 'technicianId': return filterData.technicians.map(t => ({ 
        value: t.id.toString(), 
        label: `${t.name} (${t.employeeId}) - ${t.department}${t.isAdmin ? ' [Admin]' : ''}` 
      }));
      case 'serviceCategoryId': return filterData.serviceCategories.map(s => ({ value: s.id.toString(), label: s.name }));
      case 'templateId': return filterData.templates.map(t => ({ value: t.id.toString(), label: t.name }));
      default: return [];
    }
  };

  const applyAllFilters = () => {
    let filtered = [...allRequests];
    
    // Check if any basic filters have values
    const hasActiveFilters = (
      basicFilters.requestId.trim() !== '' ||
      basicFilters.status !== '' ||
      basicFilters.requester.trim() !== ''
    );
    
    // If there are active filters, apply AND logic with omni search
    if (hasActiveFilters) {
      // First apply omni search filter if it exists
      if (omniSearch.trim() !== '') {
        const searchLower = omniSearch.toLowerCase();
        filtered = filtered.filter(request => {
          return (
            // Request ID
            request.id.toString().includes(searchLower) ||
            
            // Subject
            (request.subject || '').toLowerCase().includes(searchLower) ||
            
            // Request Type
            (request.requestType || '').toLowerCase().includes(searchLower) ||
            
            // Status (search both raw and formatted)
            (request.status || '').toLowerCase().includes(searchLower) ||
            (request.status || '').replace('_', ' ').toLowerCase().includes(searchLower) ||
            
            // Approval Status (search both raw and formatted)
            (request.approvalStatus || '').toLowerCase().includes(searchLower) ||
            (request.approvalStatus || '').replace('_', ' ').toLowerCase().includes(searchLower) ||
            
            // Priority
            (request.priority || '').toLowerCase().includes(searchLower) ||
            
            // Requester name and email
            (request.requester?.name || '').toLowerCase().includes(searchLower) ||
            (request.requester?.email || '').toLowerCase().includes(searchLower) ||
            (request.requester?.employeeId || '').toLowerCase().includes(searchLower) ||
            
            // Department
            (request.department || '').toLowerCase().includes(searchLower) ||
            
            // Template
            (request.template || '').toLowerCase().includes(searchLower) ||
            
            // Service Category
            (request.serviceCategory || '').toLowerCase().includes(searchLower) ||
            
            // Technician
            (request.technician || '').toLowerCase().includes(searchLower)
          );
        });
      }
      
      // Then apply basic filters (AND logic with omni search results)
      if (basicFilters.requestId.trim() !== '') {
        const requestIdLower = basicFilters.requestId.toLowerCase();
        filtered = filtered.filter(request => 
          request.id.toString().includes(requestIdLower)
        );
      }
      
      if (basicFilters.status !== '' && basicFilters.status !== 'ALL') {
        filtered = filtered.filter(request => request.status === basicFilters.status);
      }
      
      if (basicFilters.requester.trim() !== '') {
        // Now filter by technician name instead of ID
        const technicianFilter = basicFilters.requester;
        if (technicianFilter !== '' && technicianFilter !== 'All Technicians') {
          // Find the technician name from filterData
          const selectedTechnician = filterData?.technicians.find(tech => tech.id.toString() === technicianFilter);
          if (selectedTechnician) {
            filtered = filtered.filter(request => {
              const technicianName = request.technician || '';
              return technicianName.toLowerCase().includes(selectedTechnician.name.toLowerCase());
            });
          }
        }
      }
    } else {
      // If no active filters, just apply omni search
      if (omniSearch.trim() !== '') {
        const searchLower = omniSearch.toLowerCase();
        filtered = filtered.filter(request => {
          return (
            // Request ID
            request.id.toString().includes(searchLower) ||
            
            // Subject
            (request.subject || '').toLowerCase().includes(searchLower) ||
            
            // Request Type
            (request.requestType || '').toLowerCase().includes(searchLower) ||
            
            // Status (search both raw and formatted)
            (request.status || '').toLowerCase().includes(searchLower) ||
            (request.status || '').replace('_', ' ').toLowerCase().includes(searchLower) ||
            
            // Approval Status (search both raw and formatted)
            (request.approvalStatus || '').toLowerCase().includes(searchLower) ||
            (request.approvalStatus || '').replace('_', ' ').toLowerCase().includes(searchLower) ||
            
            // Priority
            (request.priority || '').toLowerCase().includes(searchLower) ||
            
            // Requester name and email
            (request.requester?.name || '').toLowerCase().includes(searchLower) ||
            (request.requester?.email || '').toLowerCase().includes(searchLower) ||
            (request.requester?.employeeId || '').toLowerCase().includes(searchLower) ||
            
            // Department
            (request.department || '').toLowerCase().includes(searchLower) ||
            
            // Template
            (request.template || '').toLowerCase().includes(searchLower) ||
            
            // Service Category
            (request.serviceCategory || '').toLowerCase().includes(searchLower) ||
            
            // Technician
            (request.technician || '').toLowerCase().includes(searchLower)
          );
        });
      }
      // If no omni search and no filters, show all requests (filtered = allRequests)
    }
    
    setRequests(filtered);
  };

  const handleOmniSearch = (searchTerm: string) => {
    setOmniSearch(searchTerm);
    
    // Reset pagination when searching
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Apply filters whenever omniSearch or basicFilters change
  useEffect(() => {
    if (allRequests.length > 0) {
      applyAllFilters();
    }
  }, [omniSearch, basicFilters, allRequests]);

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      // Create search params for current client-side filters
      const searchParams = new URLSearchParams();
      
      // Add omni search if present
      if (omniSearch.trim() !== '') {
        searchParams.append('searchSubject', omniSearch);
      }
      
      // Add basic filters if present
      if (basicFilters.requestId.trim() !== '') {
        searchParams.append('searchRequestId', basicFilters.requestId);
      }
      
      if (basicFilters.status !== 'ALL' && basicFilters.status !== '') {
        searchParams.append('statusFilter', basicFilters.status);
      }
      
      if (basicFilters.requester.trim() !== '') {
        // Use searchSubject for requester since the API searches across multiple fields
        const existingSearch = searchParams.get('searchSubject') || '';
        const combinedSearch = existingSearch ? `${existingSearch} ${basicFilters.requester}` : basicFilters.requester;
        searchParams.set('searchSubject', combinedSearch);
      }
      
      searchParams.append('export', 'excel');
      
      const response = await fetch(`/api/reports/export?${searchParams.toString()}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reports-${new Date().toISOString().split('T')[0]}.xlsx`;
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

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      // Create search params for current client-side filters
      const searchParams = new URLSearchParams();
      
      // Add omni search if present
      if (omniSearch.trim() !== '') {
        searchParams.append('searchSubject', omniSearch);
      }
      
      // Add basic filters if present
      if (basicFilters.requestId.trim() !== '') {
        searchParams.append('searchRequestId', basicFilters.requestId);
      }
      
      if (basicFilters.status !== 'ALL' && basicFilters.status !== '') {
        searchParams.append('statusFilter', basicFilters.status);
      }
      
      if (basicFilters.requester.trim() !== '') {
        // Use searchSubject for requester since the API searches across multiple fields
        const existingSearch = searchParams.get('searchSubject') || '';
        const combinedSearch = existingSearch ? `${existingSearch} ${basicFilters.requester}` : basicFilters.requester;
        searchParams.set('searchSubject', combinedSearch);
      }
      
      searchParams.append('export', 'pdf');
      
      const response = await fetch(`/api/reports/export?${searchParams.toString()}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reports-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to export PDF file');
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error exporting PDF file');
    } finally {
      setExporting(false);
    }
  };

  // Show loading while session is being checked OR data is being fetched
  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">
            {status === "loading" ? "Authenticating..." : "Loading reports..."}
          </p>
        </div>
      </div>
    );
  }

  // Redirect to sign in if not authenticated
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please sign in to access reports.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background px-6">{/* Subtract header height and add horizontal padding */}
      {/* Header Banner - Fixed Height */}
      <div className="bg-card border-b border-border flex-shrink-0 -mx-6 mb-6">
        <div className="w-full px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Reports</h1>
              <p className="text-sm text-muted-foreground mt-1">View and filter all requests</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Export Buttons */}
              <div className="flex items-center gap-2 border-r border-border pr-3">
                <Button
                  onClick={handleExportExcel}
                  variant="outline"
                  size="sm"
                  disabled={exporting}
                  className="flex items-center gap-2"
                >
                  {exporting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-foreground"></div>
                  ) : (
                    <FileSpreadsheet className="h-4 w-4" />
                  )}
                  Excel
                </Button>
                
                <Button
                  onClick={handleExportPDF}
                  variant="outline"
                  size="sm"
                  disabled={exporting}
                  className="flex items-center gap-2"
                >
                  {exporting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-foreground"></div>
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  PDF
                </Button>
              </div>
              
              {/* Filter Button */}
              <Button
                onClick={() => setIsFilterModalOpen(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Custom Filter
                
              </Button>
              
              <div className="text-sm text-gray-600">
                {pagination.totalCount} total requests
              </div>
            </div>
          </div>

          {/* Omni Search Bar - Client-side filtering */}
          <div className="mb-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search requests (ID, subject, requester, etc.)"
                value={omniSearch}
                onChange={(e) => handleOmniSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
              />
            </div>
          </div>
          
          {/* Active Filters Display */}
          {(filterConditions.length > 0 || 
            basicFilters.requestId.trim() !== '' ||
            basicFilters.requester.trim() !== '' ||
            (basicFilters.status !== 'ALL' && basicFilters.status !== '') ||
            omniSearch) && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium text-foreground mb-2">Active Filters:</div>
              <div className="flex flex-wrap gap-2">
                {omniSearch && (
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                    Search: {omniSearch}
                  </span>
                )}
                {isAdvancedFilter ? (
                  filterConditions.map((condition, index) => (
                    <div key={condition.id} className="flex items-center">
                      {index > 0 && (
                        <span className="text-primary font-medium mr-2">{condition.operator}</span>
                      )}
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                        {FILTER_COLUMNS.find(col => col.value === condition.column)?.label} {condition.criteria} {capitalizeWords(String(condition.value).replace('_', ' '))}
                      </span>
                    </div>
                  ))
                ) : (
                  Object.entries(basicFilters).map(([key, value]) => {
                    if (!value || value === 'ALL') return null;
                    
                    let displayValue = value;
                    let displayKey = key;
                    
                    // Convert technician ID to name and change key label
                    if (key === 'requester' && value && filterData?.technicians) {
                      const technician = filterData.technicians.find(tech => tech.id.toString() === value);
                      displayValue = technician ? technician.name : value;
                      displayKey = 'technician';
                    }
                    
                    // Capitalize the display value
                    if (typeof displayValue === 'string') {
                      displayValue = capitalizeWords(displayValue.replace('_', ' '));
                    }
                    
                    // Capitalize the display key
                    displayKey = capitalizeWords(displayKey.replace(/([A-Z])/g, ' $1').trim());
                    
                    return (
                      <span key={key} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                        {displayKey}: {displayValue}
                      </span>
                    );
                  }).filter(Boolean)
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Excel-Style Report Container */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mx-2 mb-6">
        {/* Report Header */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">IT Helpdesk Export Report</h3>
              <p className="text-sm text-gray-600">Page {pagination.page} of {pagination.totalPages} | Total Records: {pagination.totalCount}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Generated: {new Date().toLocaleDateString()}</p>
              <p className="text-sm text-gray-600">Time: {new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        </div>

        {/* Pagination - Fixed at top */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card flex-shrink-0">
            <div className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages} 
              <span className="ml-2">({pagination.totalCount} total)</span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={pagination.page === 1}
                className="px-3 py-1 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
        
        <div className="w-full overflow-auto reports-table-scroll">
          <table className="w-full border-collapse bg-white" style={{fontSize: '12px'}}>
            <thead className="bg-blue-50 border-b-2 border-blue-200 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-bold text-blue-800 uppercase tracking-wider border-r border-blue-200">Request ID</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-blue-800 uppercase tracking-wider border-r border-blue-200">Subject</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-blue-800 uppercase tracking-wider border-r border-blue-200">Description</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-blue-800 uppercase tracking-wider border-r border-blue-200">Request Type</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-blue-800 uppercase tracking-wider border-r border-blue-200">Request Status</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-blue-800 uppercase tracking-wider border-r border-blue-200">Approval Status</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-blue-800 uppercase tracking-wider border-r border-blue-200">Mode</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-blue-800 uppercase tracking-wider border-r border-blue-200">Requester</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-blue-800 uppercase tracking-wider border-r border-blue-200">Department</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-blue-800 uppercase tracking-wider border-r border-blue-200">Created At</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-blue-800 uppercase tracking-wider border-r border-blue-200">Due By</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-blue-800 uppercase tracking-wider border-r border-blue-200">Resolved Time</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-blue-800 uppercase tracking-wider border-r border-blue-200">Priority</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-blue-800 uppercase tracking-wider border-r border-blue-200">Technician</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-blue-800 uppercase tracking-wider border-r border-blue-200">Service Category</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-blue-800 uppercase tracking-wider">Template</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={16} className="px-6 py-8 text-center text-gray-500">
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
                requests.map((request, index) => {
                  // Alternating row colors like Excel
                  const isEvenRow = index % 2 === 0;
                  const rowClass = isEvenRow ? 'bg-white' : 'bg-gray-50';
                  
                  return (
                    <tr key={request.id} className={`${rowClass} border-b border-gray-200`}>
                      <td className="px-3 py-2 border-r border-gray-200 text-blue-600 font-medium">
                        {request.id}
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200 text-blue-600 underline cursor-pointer">
                        {request.subject}
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200 text-gray-700 leading-relaxed max-w-md">
                        <div className="whitespace-pre-wrap break-words font-mono text-sm">
                          {preserveDescriptionFormatting(request.description)}
                        </div>
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200 text-gray-900">
                        {capitalizeWords(request.requestType || '')}
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200 text-gray-900">
                        {formatStatusText(request.status || 'Unknown')}
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200 text-gray-900">
                        {formatStatusText(request.approvalStatus || '')}
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200 text-gray-900">
                        {capitalizeWords(request.mode || 'Standard')}
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200 text-gray-900">
                        <div>
                          <div className="font-medium">{request.requester.name}</div>
                          <div className="text-xs text-gray-500">{request.requester.employeeId}</div>
                        </div>
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200 text-gray-900">
                        {capitalizeWords(request.department || '')}
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200 text-gray-900">
                        {format(new Date(request.createdAt), 'MMM dd, HH:mm')}
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200 text-gray-900">
                        {request.dueByTime ? format(new Date(request.dueByTime), 'MMM dd, HH:mm') : 'N/A'}
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200 text-gray-900">
                        {request.resolvedTime ? format(new Date(request.resolvedTime), 'MMM dd, HH:mm') : 'N/A'}
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200 text-gray-900">
                        {capitalizeWords(request.priority || '')}
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200 text-gray-900">
                        {getTechnicianName(request.technician)}
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200 text-gray-900">
                        {request.serviceCategory || 'N/A'}
                      </td>
                      <td className="px-3 py-2 text-gray-900">
                        {request.template}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            </table>
        </div>
      </div>

      {/* Filter Modal */}
      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Add filters to narrow down your data
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            {/* Filter Mode Switcher */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Filter Mode:</label>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsAdvancedFilter(false)}
                    className={`px-3 py-1 text-sm font-medium rounded-md ${
                      !isAdvancedFilter
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Basic
                  </button>
                  <button
                    onClick={() => setIsAdvancedFilter(true)}
                    className={`px-3 py-1 text-sm font-medium rounded-md ${
                      isAdvancedFilter
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Advanced
                  </button>
                </div>
              </div>
            </div>

            {/* Basic Filters */}
            {!isAdvancedFilter && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  {/* Row 1 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Request ID</label>
                    <input
                      type="text"
                      placeholder="Enter request ID"
                      value={basicFilters.requestId}
                      onChange={(e) => setBasicFilters(prev => ({ ...prev, requestId: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <input
                      type="text"
                      placeholder="Enter subject"
                      value={basicFilters.subject}
                      onChange={(e) => setBasicFilters(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Request Type</label>
                    <select
                      value={basicFilters.requestType || ''}
                      onChange={(e) => setBasicFilters(prev => ({ ...prev, requestType: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Request Types</option>
                      {filterData?.requestTypes.map(type => (
                        <option key={type} value={type}>{capitalizeWords(type)}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Row 2 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Request Status</label>
                    <select
                      value={basicFilters.status}
                      onChange={(e) => setBasicFilters(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Status</option>
                      {filterData?.requestStatuses.map(status => (
                        <option key={status} value={status}>{capitalizeWords(status.replace('_', ' '))}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Approval Status</label>
                    <select
                      value={basicFilters.approvalStatus || ''}
                      onChange={(e) => setBasicFilters(prev => ({ ...prev, approvalStatus: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Approval Status</option>
                      {filterData?.approvalStatuses.map(status => (
                        <option key={status} value={status}>{capitalizeWords(status.replace('_', ' '))}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
                    <select
                      value={basicFilters.mode || ''}
                      onChange={(e) => setBasicFilters(prev => ({ ...prev, mode: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Modes</option>
                      {filterData?.modes.map(mode => (
                        <option key={mode} value={mode}>{capitalizeWords(mode)}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Row 3 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Requester</label>
                    <select
                      value={basicFilters.requester}
                      onChange={(e) => setBasicFilters(prev => ({ ...prev, requester: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Requesters</option>
                      {filterData?.users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.employeeId}) - {user.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <select
                      value={basicFilters.department}
                      onChange={(e) => setBasicFilters(prev => ({ ...prev, department: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Departments</option>
                      {filterData?.departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{capitalizeWords(dept.name)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={basicFilters.priority}
                      onChange={(e) => setBasicFilters(prev => ({ ...prev, priority: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Priorities</option>
                      {filterData?.priorities.map(priority => (
                        <option key={priority} value={priority}>{capitalizeWords(priority)}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Row 4 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Technician</label>
                    <select
                      value={basicFilters.technician || ''}
                      onChange={(e) => setBasicFilters(prev => ({ ...prev, technician: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Technicians</option>
                      {filterData?.technicians.map(tech => (
                        <option key={tech.id} value={tech.id}>
                          {tech.name} ({tech.employeeId}) - {tech.department}
                          {tech.isAdmin && ' [Admin]'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Service Category</label>
                    <select
                      value={basicFilters.serviceCategory || ''}
                      onChange={(e) => setBasicFilters(prev => ({ ...prev, serviceCategory: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Service Categories</option>
                      {filterData?.serviceCategories.map(category => (
                        <option key={category.id} value={category.id}>{capitalizeWords(category.name)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Request Template</label>
                    <select
                      value={basicFilters.template || ''}
                      onChange={(e) => setBasicFilters(prev => ({ ...prev, template: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Templates</option>
                      {filterData?.templates.map(template => (
                        <option key={template.id} value={template.id}>{capitalizeWords(template.name)} ({capitalizeWords(template.type)})</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Date Range Filters */}
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="text-sm font-medium text-gray-900">Date Filters</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {/* Created Time Range */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Created Time - From</label>
                      <input
                        type="datetime-local"
                        value={basicFilters.createdFrom || ''}
                        onChange={(e) => setBasicFilters(prev => ({ ...prev, createdFrom: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Created Time - To</label>
                      <input
                        type="datetime-local"
                        value={basicFilters.createdTo || ''}
                        onChange={(e) => setBasicFilters(prev => ({ ...prev, createdTo: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">SLA</label>
                      <input
                        type="text"
                        placeholder="Enter SLA name"
                        value={basicFilters.sla || ''}
                        onChange={(e) => setBasicFilters(prev => ({ ...prev, sla: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    {/* Due By Time Range */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Due By Time - From</label>
                      <input
                        type="datetime-local"
                        value={basicFilters.dueByFrom || ''}
                        onChange={(e) => setBasicFilters(prev => ({ ...prev, dueByFrom: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Due By Time - To</label>
                      <input
                        type="datetime-local"
                        value={basicFilters.dueByTo || ''}
                        onChange={(e) => setBasicFilters(prev => ({ ...prev, dueByTo: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div></div>
                    
                    {/* Resolved Time Range */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Resolved Time - From</label>
                      <input
                        type="datetime-local"
                        value={basicFilters.resolvedFrom || ''}
                        onChange={(e) => setBasicFilters(prev => ({ ...prev, resolvedFrom: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Resolved Time - To</label>
                      <input
                        type="datetime-local"
                        value={basicFilters.resolvedTo || ''}
                        onChange={(e) => setBasicFilters(prev => ({ ...prev, resolvedTo: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Filter Conditions */}
            {isAdvancedFilter && (
              <>
                {filterConditions.map((condition, index) => (
              <div key={condition.id} className="grid grid-cols-12 gap-4 items-end p-4 border border-gray-200 rounded-lg">
                {/* AND/OR Operator (except for first condition) */}
                {index > 0 ? (
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Operator</label>
                    <select
                      value={condition.operator}
                      onChange={(e) => updateFilterCondition(condition.id, 'operator', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                    </select>
                  </div>
                ) : (
                  <div className="col-span-1 flex items-end">
                    <div className="h-[34px]"></div>
                  </div>
                )}
                
                {/* Column Selection */}
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Column</label>
                  <select
                    value={condition.column}
                    onChange={(e) => updateFilterCondition(condition.id, 'column', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select column</option>
                    {FILTER_COLUMNS.map(column => (
                      <option key={column.value} value={column.value}>{column.label}</option>
                    ))}
                  </select>
                </div>

                {/* Criteria Selection */}
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Criteria</label>
                  <select
                    value={condition.criteria}
                    onChange={(e) => updateFilterCondition(condition.id, 'criteria', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!condition.column}
                  >
                    <option value="">Select criteria</option>
                    {condition.column && FILTER_CRITERIA[getColumnType(condition.column)]?.map(criteria => (
                      <option key={criteria.value} value={criteria.value}>{criteria.label}</option>
                    ))}
                  </select>
                </div>

                {/* Value Input */}
                <div className="col-span-4">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Value</label>
                  {getColumnType(condition.column) === 'select' ? (
                    <select
                      value={condition.value}
                      onChange={(e) => updateFilterCondition(condition.id, 'value', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={!condition.column}
                    >
                      <option value="">Enter value</option>
                      {getOptionsForColumn(condition.column).map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  ) : getColumnType(condition.column) === 'date' ? (
                    <input
                      type="date"
                      value={condition.value}
                      onChange={(e) => updateFilterCondition(condition.id, 'value', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={!condition.column}
                    />
                  ) : (
                    <input
                      type="text"
                      value={condition.value}
                      onChange={(e) => updateFilterCondition(condition.id, 'value', e.target.value)}
                      placeholder="Enter value"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={!condition.column}
                    />
                  )}
                </div>

                {/* Delete Button */}
                <div className="col-span-1 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFilterCondition(condition.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Add Filter Button - Only show in advanced mode */}
            {isAdvancedFilter && (
              <Button
                variant="outline"
                onClick={addFilterCondition}
                className="flex items-center gap-2 w-fit"
              >
                <Plus className="h-4 w-4" />
                Add Filter
              </Button>
            )}
            </>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setFilterConditions([]);
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
                  clearFilters();
                }}
              >
                Clear All
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsFilterModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={applyFilters}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
