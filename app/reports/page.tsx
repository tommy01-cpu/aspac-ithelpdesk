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
  const [hasUserClosedModal, setHasUserClosedModal] = useState(false); // Track if user manually closed the modal
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

  // Sorting state
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Handle sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort requests and apply client-side pagination
  const sortedRequests = useMemo(() => {
    if (!requests || requests.length === 0) return [];

    // First, sort the requests
    let sorted = [...requests];
    if (sortField) {
      sorted = sorted.sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];

        // Handle special cases for nested objects
        if (sortField === 'requester') {
          aValue = a.requester?.name || '';
          bValue = b.requester?.name || '';
        } else if (sortField === 'description') {
          // For description, remove HTML tags and use first 100 characters for comparison
          aValue = (a.description || '').replace(/<[^>]*>/g, '').substring(0, 100).toLowerCase();
          bValue = (b.description || '').replace(/<[^>]*>/g, '').substring(0, 100).toLowerCase();
        } else if (sortField === 'createdAt' || sortField === 'dueByTime' || sortField === 'resolvedTime') {
          aValue = aValue ? new Date(aValue).getTime() : 0;
          bValue = bValue ? new Date(bValue).getTime() : 0;
        }

        // Convert to string for comparison if not already a number
        if (typeof aValue !== 'number') {
          aValue = String(aValue || '').toLowerCase();
          bValue = String(bValue || '').toLowerCase();
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Then, apply client-side pagination
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    const paginatedResults = sorted.slice(startIndex, endIndex);

    return paginatedResults;
  }, [requests, sortField, sortDirection, pagination.page, pagination.limit]);

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

  // Load requests when filters change (not pagination - that's handled client-side)
  useEffect(() => {
    if (filterData) {
      fetchRequests();
    }
  }, [filters, filterData]);

  // Recalculate pagination when limit changes (client-side)
  useEffect(() => {
    if (allRequests.length > 0) {
      const totalCount = allRequests.length;
      const totalPages = Math.ceil(totalCount / pagination.limit);
      
      setPagination(prev => ({
        ...prev,
        totalCount: totalCount,
        totalPages: totalPages,
        // Reset to page 1 if current page is beyond new total pages
        page: prev.page > totalPages ? 1 : prev.page
      }));

      console.log('🔄 Recalculated pagination for limit change:', {
        totalCount,
        totalPages,
        newLimit: pagination.limit
      });
    }
  }, [pagination.limit, allRequests.length]);

  // Set initial department filter for non-technicians (department heads) and show filter dialog
  useEffect(() => {
    if (filterData && session?.user && !session.user.isTechnician) {
      // Check if user is a department head and set the first department as default
      if (filterData.departments && filterData.departments.length > 0) {
        // Only set the default department if no department filter is already set
        if (!filters.departmentId && !basicFilters.department) {
          const firstDepartment = filterData.departments[0];
          
          console.log('🏢 Setting default department for non-technician:', firstDepartment);
          
          // Set the department in both filters and basicFilters
          setFilters(prev => ({
            ...prev,
            departmentId: firstDepartment.id.toString()
          }));
          
          setBasicFilters(prev => ({
            ...prev,
            department: firstDepartment.id.toString()
          }));
          
          // Automatically open the filter dialog for non-technicians
          setTimeout(() => {
            console.log('🔧 Opening filter modal for non-technician user');
            setIsFilterModalOpen(true);
          }, 800); // Slightly longer delay to ensure all state updates are complete
        }
      }
    }
  }, [filterData, session?.user, filters.departmentId, basicFilters.department]);

  // Additional effect to ensure filter modal opens for non-technicians
  useEffect(() => {
    if (session?.user && !session.user.isTechnician && filterData && !loading && !hasUserClosedModal) {
      // Open filter dialog for non-technician users after a short delay
      const timer = setTimeout(() => {
        if (!isFilterModalOpen) {
          console.log('🎯 Auto-opening filter modal for non-technician user');
          setIsFilterModalOpen(true);
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [session?.user, filterData, loading, isFilterModalOpen, hasUserClosedModal]);

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

      // Fetch ALL data without pagination limits - let client handle pagination
      searchParams.append('page', '1');
      searchParams.append('limit', '9999'); // Fetch all records

      console.log('🔍 Fetching ALL requests for client-side pagination');

      const response = await fetch(`/api/reports?${searchParams.toString()}`);
      if (response.ok) {
        const data = await response.json();
        
        setAllRequests(data.requests); // Store all requests
        setRequests(data.requests); // Initially show all requests
        
        // Calculate client-side pagination based on ALL data
        const totalCount = data.requests.length;
        const totalPages = Math.ceil(totalCount / pagination.limit);
        
        setPagination(prev => ({
          ...prev,
          totalCount: totalCount,
          totalPages: totalPages
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

  const handleCloseFilterModal = (open: boolean) => {
    setIsFilterModalOpen(open);
    if (!open) {
      // User manually closed the modal
      setHasUserClosedModal(true);
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
      requestType: basicFilters.requestType || '',
      requestStatus: basicFilters.status,
      approvalStatus: basicFilters.approvalStatus || '',
      mode: basicFilters.mode || '',
      requesterId: basicFilters.requester,
      departmentId: basicFilters.department,
      createdTimeFrom: basicFilters.createdFrom || '',
      createdTimeTo: basicFilters.createdTo || '',
      dueByTimeFrom: basicFilters.dueByFrom || '',
      dueByTimeTo: basicFilters.dueByTo || '',
      resolvedTimeFrom: basicFilters.resolvedFrom || '',
      resolvedTimeTo: basicFilters.resolvedTo || '',
      priority: basicFilters.priority,
      technicianId: basicFilters.technician, // Fixed: Map technician to technicianId
      serviceCategoryId: basicFilters.serviceCategory || '',
      templateId: basicFilters.template || '',
      searchRequestId: basicFilters.requestId,
      searchSubject: basicFilters.subject
    };

    console.log('Applying basic filters:', basicFilters);
    console.log('Mapped to API filters:', newFilters);

    setFilters(newFilters);
    
    // Trigger data fetch with new filters
    setPagination(prev => ({ ...prev, page: 1 }));
    setIsFilterModalOpen(false); // This is OK - user applied filters, not manually closed
    setHasUserClosedModal(true); // Prevent modal from auto-reopening after applying filters
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
    setIsFilterModalOpen(false); // This is OK - user applied filters, not manually closed
    setHasUserClosedModal(true); // Prevent modal from auto-reopening after applying filters
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
      basicFilters.subject.trim() !== '' ||
      basicFilters.requestType !== '' ||
      basicFilters.status !== '' ||
      basicFilters.approvalStatus !== '' ||
      basicFilters.mode !== '' ||
      basicFilters.requester !== '' ||
      basicFilters.department !== '' ||
      basicFilters.priority !== '' ||
      basicFilters.technician !== '' ||
      basicFilters.serviceCategory !== '' ||
      basicFilters.template !== '' ||
      basicFilters.sla !== '' ||
      basicFilters.createdFrom !== '' ||
      basicFilters.createdTo !== '' ||
      basicFilters.dueByFrom !== '' ||
      basicFilters.dueByTo !== '' ||
      basicFilters.resolvedFrom !== '' ||
      basicFilters.resolvedTo !== ''
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

  // Apply omni search whenever it changes (only for client-side search)
  useEffect(() => {
    if (allRequests.length > 0 && omniSearch.trim() !== '') {
      // Only apply omni search if no API filters are active
      const hasApiFilters = Object.values(filters).some(value => 
        value && value !== '' && value !== '0'
      );
      
      if (!hasApiFilters) {
        const searchLower = omniSearch.toLowerCase();
        const filtered = allRequests.filter(request => {
          return (
            request.id.toString().includes(searchLower) ||
            request.subject?.toLowerCase().includes(searchLower) ||
            request.description?.toLowerCase().includes(searchLower) ||
            request.requester?.name?.toLowerCase().includes(searchLower) ||
            request.requester?.email?.toLowerCase().includes(searchLower) ||
            request.requester?.employeeId?.toLowerCase().includes(searchLower) ||
            request.department?.toLowerCase().includes(searchLower) ||
            request.technician?.toLowerCase().includes(searchLower) ||
            request.requestType?.toLowerCase().includes(searchLower) ||
            request.status?.toLowerCase().includes(searchLower) ||
            request.priority?.toLowerCase().includes(searchLower) ||
            request.template?.toLowerCase().includes(searchLower)
          );
        });
        
        setRequests(filtered);
        
        // Recalculate pagination for filtered results
        const totalCount = filtered.length;
        const totalPages = Math.ceil(totalCount / pagination.limit);
        setPagination(prev => ({
          ...prev,
          totalCount,
          totalPages,
          page: 1 // Reset to first page when searching
        }));
        
        console.log('🔍 Applied search and recalculated pagination:', {
          searchTerm: omniSearch,
          filteredCount: filtered.length,
          totalPages
        });
      }
    } else if (omniSearch.trim() === '') {
      // If omni search is cleared, restore all requests
      const hasApiFilters = Object.values(filters).some(value => 
        value && value !== '' && value !== '0'
      );
      if (!hasApiFilters) {
        setRequests(allRequests);
        
        // Recalculate pagination for all results
        const totalCount = allRequests.length;
        const totalPages = Math.ceil(totalCount / pagination.limit);
        setPagination(prev => ({
          ...prev,
          totalCount,
          totalPages,
          page: 1 // Reset to first page
        }));
        
        console.log('🧹 Cleared search and restored pagination:', {
          totalCount,
          totalPages
        });
      }
    }
  }, [omniSearch, allRequests, filters, pagination.limit]);

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      
      // Create search params with all current filters
      const searchParams = new URLSearchParams();
      
      // Add current filter state to export
      if (filters.requestType) searchParams.append('requestType', filters.requestType);
      if (filters.requestStatus) searchParams.append('requestStatus', filters.requestStatus);
      if (filters.approvalStatus) searchParams.append('approvalStatus', filters.approvalStatus);
      if (filters.mode) searchParams.append('mode', filters.mode);
      if (filters.requesterId) searchParams.append('requesterId', filters.requesterId);
      if (filters.departmentId) searchParams.append('departmentId', filters.departmentId);
      if (filters.createdTimeFrom) searchParams.append('createdTimeFrom', filters.createdTimeFrom);
      if (filters.createdTimeTo) searchParams.append('createdTimeTo', filters.createdTimeTo);
      if (filters.dueByTimeFrom) searchParams.append('dueByTimeFrom', filters.dueByTimeFrom);
      if (filters.dueByTimeTo) searchParams.append('dueByTimeTo', filters.dueByTimeTo);
      if (filters.resolvedTimeFrom) searchParams.append('resolvedTimeFrom', filters.resolvedTimeFrom);
      if (filters.resolvedTimeTo) searchParams.append('resolvedTimeTo', filters.resolvedTimeTo);
      if (filters.priority) searchParams.append('priority', filters.priority);
      if (filters.technicianId) searchParams.append('technicianId', filters.technicianId);
      if (filters.serviceCategoryId) searchParams.append('serviceCategoryId', filters.serviceCategoryId);
      if (filters.templateId) searchParams.append('templateId', filters.templateId);
      if (filters.searchRequestId) searchParams.append('searchRequestId', filters.searchRequestId);
      if (filters.searchSubject) searchParams.append('searchSubject', filters.searchSubject);
      
      // Add omni search if present
      if (omniSearch.trim() !== '') {
        searchParams.append('searchSubject', omniSearch);
      }
      
      searchParams.append('export', 'excel');
      
      const response = await fetch(`/api/reports/export?${searchParams.toString()}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ASPAC_IT_Helpdesk_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
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
                
                {/* <Button
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
                </Button> */}
              </div>
              
              {/* Filter Button */}
              <Button
                onClick={() => {
                  setHasUserClosedModal(false); // Reset the flag when user manually opens
                  setIsFilterModalOpen(true);
                }}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filter
                
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
          {(() => {
            // Check if any filters are active
            const hasActiveBasicFilters = Object.entries(basicFilters).some(([key, value]) => 
              value && value !== '' && value !== 'ALL'
            );
            const hasActiveApiFilters = Object.entries(filters).some(([key, value]) => 
              value && value !== '' && value !== '0'
            );
            const hasAdvancedFilters = filterConditions.length > 0;
            const hasSearch = omniSearch && omniSearch.trim() !== '';
            
            return (hasActiveBasicFilters || hasActiveApiFilters || hasAdvancedFilters || hasSearch);
          })() && (
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
                  // Show applied API filters instead of basicFilters for better accuracy
                  Object.entries(filters).map(([key, value]) => {
                    if (!value || value === '' || value === '0') return null;
                    
                    let displayValue = value;
                    let displayKey = key;
                    
                    // Map API filter keys to user-friendly labels
                    const keyMappings: { [key: string]: string } = {
                      requestType: 'Request Type',
                      requestStatus: 'Request Status', 
                      approvalStatus: 'Approval Status',
                      mode: 'Mode',
                      requesterId: 'Requester',
                      departmentId: 'Department',
                      priority: 'Priority',
                      technicianId: 'Technician',
                      serviceCategoryId: 'Service Category',
                      templateId: 'Template',
                      createdTimeFrom: 'Created From',
                      createdTimeTo: 'Created To',
                      dueByTimeFrom: 'Due By From',
                      dueByTimeTo: 'Due By To',
                      resolvedTimeFrom: 'Resolved From',
                      resolvedTimeTo: 'Resolved To',
                      searchRequestId: 'Request ID',
                      searchSubject: 'Subject'
                    };
                    
                    displayKey = keyMappings[key] || capitalizeWords(key.replace(/([A-Z])/g, ' $1').trim());
                    
                    // Convert IDs to names using filterData
                    if (key === 'requesterId' && filterData?.users) {
                      const user = filterData.users.find(u => u.id.toString() === value);
                      displayValue = user ? `${user.name} (${user.employeeId})` : value;
                    } else if (key === 'departmentId' && filterData?.departments) {
                      const dept = filterData.departments.find(d => d.id.toString() === value);
                      displayValue = dept ? dept.name : value;
                    } else if (key === 'technicianId' && filterData?.technicians) {
                      const tech = filterData.technicians.find(t => t.id.toString() === value);
                      displayValue = tech ? `${tech.name} (${tech.employeeId})` : value;
                    } else if (key === 'serviceCategoryId' && filterData?.serviceCategories) {
                      const cat = filterData.serviceCategories.find(c => c.id.toString() === value);
                      displayValue = cat ? cat.name : value;
                    } else if (key === 'templateId' && filterData?.templates) {
                      const template = filterData.templates.find(t => t.id.toString() === value);
                      displayValue = template ? template.name : value;
                    } else if (key.includes('Time')) {
                      // Format date values without time for date-only filters
                      try {
                        displayValue = format(new Date(value), 'MMMM dd, yyyy');
                      } catch {
                        displayValue = value; // fallback if date parsing fails
                      }
                    } else if (typeof displayValue === 'string') {
                      displayValue = capitalizeWords(displayValue.replace('_', ' '));
                    }
                    
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

        {/* Pagination - Enhanced with page size selection */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages} 
              <span className="ml-2">({pagination.totalCount} total records)</span>
            </div>
            
            {/* Records per page selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show:</span>
              <select
                value={pagination.limit}
                onChange={(e) => {
                  const newLimit = parseInt(e.target.value);
                  setPagination(prev => ({ 
                    ...prev, 
                    limit: newLimit, 
                    page: 1 // Reset to first page when changing page size
                    // Remove local totalPages calculation - let the server handle it
                  }));
                }}
                className="px-2 py-1 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-muted-foreground">per page</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Jump to page input */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Go to:</span>
              <input
                type="number"
                min="1"
                max={pagination.totalPages}
                value={pagination.page}
                onChange={(e) => {
                  const newPage = Math.max(1, Math.min(pagination.totalPages, parseInt(e.target.value) || 1));
                  setPagination(prev => ({ ...prev, page: newPage }));
                }}
                className="w-16 px-2 py-1 text-sm text-center border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            
            {/* Navigation buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}
                disabled={pagination.page === 1}
                className="px-2 py-1 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                title="First page"
              >
                ««
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={pagination.page === 1}
                className="px-3 py-1 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {(() => {
                  const pages = [];
                  const totalPages = pagination.totalPages;
                  const currentPage = pagination.page;
                  
                  // If 5 or fewer pages, show all pages
                  if (totalPages <= 5) {
                    for (let i = 1; i <= totalPages; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => setPagination(prev => ({ ...prev, page: i }))}
                          className={`px-2 py-1 text-sm font-medium border border-border rounded-md ${
                            currentPage === i 
                              ? 'bg-primary text-primary-foreground' 
                              : 'text-foreground bg-card hover:bg-muted'
                          }`}
                        >
                          {i}
                        </button>
                      );
                    }
                  } else {
                    // More than 5 pages - use ellipsis logic
                    
                    // Always show first page
                    pages.push(
                      <button
                        key={1}
                        onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}
                        className={`px-2 py-1 text-sm font-medium border border-border rounded-md ${
                          currentPage === 1 
                            ? 'bg-primary text-primary-foreground' 
                            : 'text-foreground bg-card hover:bg-muted'
                        }`}
                      >
                        1
                      </button>
                    );
                    
                    // Show ellipsis if needed
                    if (currentPage > 4) {
                      pages.push(<span key="ellipsis1" className="px-1 text-sm text-muted-foreground">...</span>);
                    }
                    
                    // Show pages around current page
                    const start = Math.max(2, currentPage - 1);
                    const end = Math.min(totalPages - 1, currentPage + 1);
                    
                    for (let i = start; i <= end; i++) {
                      if (i !== 1 && i !== totalPages) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => setPagination(prev => ({ ...prev, page: i }))}
                            className={`px-2 py-1 text-sm font-medium border border-border rounded-md ${
                              currentPage === i 
                                ? 'bg-primary text-primary-foreground' 
                                : 'text-foreground bg-card hover:bg-muted'
                            }`}
                          >
                            {i}
                          </button>
                        );
                      }
                    }
                    
                    // Show ellipsis if needed
                    if (currentPage < totalPages - 3) {
                      pages.push(<span key="ellipsis2" className="px-1 text-sm text-muted-foreground">...</span>);
                    }
                    
                    // Always show last page
                    pages.push(
                      <button
                        key={totalPages}
                        onClick={() => setPagination(prev => ({ ...prev, page: totalPages }))}
                        className={`px-2 py-1 text-sm font-medium border border-border rounded-md ${
                          currentPage === totalPages 
                            ? 'bg-primary text-primary-foreground' 
                            : 'text-foreground bg-card hover:bg-muted'
                        }`}
                      >
                        {totalPages}
                      </button>
                    );
                  }
                  
                  return pages;
                })()}
              </div>
              
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: pagination.totalPages }))}
                disabled={pagination.page === pagination.totalPages}
                className="px-2 py-1 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                title="Last page"
              >
                »»
              </button>
            </div>
          </div>
        </div>
        
        <div className="w-full overflow-auto reports-table-scroll">
          <table className="w-full border-collapse bg-white" style={{fontSize: '12px'}}>
            <thead className="bg-blue-50 border-b-2 border-blue-200 sticky top-0 z-10">
              <tr>
                <th onClick={() => handleSort('id')} className="px-3 py-3 text-left text-xs font-bold text-blue-800 uppercase tracking-wider border-r border-blue-200 cursor-pointer hover:bg-blue-100 align-middle">
                  <div className="flex items-center justify-between">
                    <span>Request ID</span>
                    <div className="flex flex-col">
                      <span className={`text-xs ${sortField === 'id' && sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-400'}`}>▲</span>
                      <span className={`text-xs ${sortField === 'id' && sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-400'}`}>▼</span>
                    </div>
                  </div>
                </th>
                <th onClick={() => handleSort('subject')} className="px-3 py-3 text-left text-xs font-bold text-blue-800 uppercase tracking-wider border-r border-blue-200 cursor-pointer hover:bg-blue-100 align-middle">
                  <div className="flex items-center justify-between">
                    <span>Subject</span>
                    <div className="flex flex-col">
                      <span className={`text-xs ${sortField === 'subject' && sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-400'}`}>▲</span>
                      <span className={`text-xs ${sortField === 'subject' && sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-400'}`}>▼</span>
                    </div>
                  </div>
                </th>
                <th onClick={() => handleSort('description')} className="px-3 py-3 text-left text-xs font-bold text-blue-800 uppercase tracking-wider border-r border-blue-200 cursor-pointer hover:bg-blue-100 align-middle">
                  <div className="flex items-center justify-between">
                    <span>Description</span>
                    <div className="flex flex-col">
                      <span className={`text-xs ${sortField === 'description' && sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-400'}`}>▲</span>
                      <span className={`text-xs ${sortField === 'description' && sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-400'}`}>▼</span>
                    </div>
                  </div>
                </th>
                <th onClick={() => handleSort('requestType')} className="px-3 py-3 text-left text-xs font-bold text-blue-800 uppercase tracking-wider border-r border-blue-200 cursor-pointer hover:bg-blue-100 align-middle">
                  <div className="flex items-center justify-between">
                    <span>Request Type</span>
                    <div className="flex flex-col">
                      <span className={`text-xs ${sortField === 'requestType' && sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-400'}`}>▲</span>
                      <span className={`text-xs ${sortField === 'requestType' && sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-400'}`}>▼</span>
                    </div>
                  </div>
                </th>
                <th onClick={() => handleSort('status')} className="px-3 py-3 text-left text-xs font-bold text-blue-800 uppercase tracking-wider border-r border-blue-200 cursor-pointer hover:bg-blue-100 align-middle">
                  <div className="flex items-center justify-between">
                    <span>Request Status</span>
                    <div className="flex flex-col">
                      <span className={`text-xs ${sortField === 'status' && sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-400'}`}>▲</span>
                      <span className={`text-xs ${sortField === 'status' && sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-400'}`}>▼</span>
                    </div>
                  </div>
                </th>
                <th onClick={() => handleSort('approvalStatus')} className="px-3 py-3 text-left text-xs font-bold text-blue-800 uppercase tracking-wider border-r border-blue-200 cursor-pointer hover:bg-blue-100 align-middle">
                  <div className="flex items-center justify-between">
                    <span>Approval Status</span>
                    <div className="flex flex-col">
                      <span className={`text-xs ${sortField === 'approvalStatus' && sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-400'}`}>▲</span>
                      <span className={`text-xs ${sortField === 'approvalStatus' && sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-400'}`}>▼</span>
                    </div>
                  </div>
                </th>
                <th onClick={() => handleSort('mode')} className="px-3 py-3 text-left text-xs font-bold text-blue-800 uppercase tracking-wider border-r border-blue-200 cursor-pointer hover:bg-blue-100 align-middle">
                  <div className="flex items-center justify-between">
                    <span>Mode</span>
                    <div className="flex flex-col">
                      <span className={`text-xs ${sortField === 'mode' && sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-400'}`}>▲</span>
                      <span className={`text-xs ${sortField === 'mode' && sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-400'}`}>▼</span>
                    </div>
                  </div>
                </th>
                <th onClick={() => handleSort('requester')} className="px-3 py-3 text-left text-xs font-bold text-blue-800 uppercase tracking-wider border-r border-blue-200 cursor-pointer hover:bg-blue-100 align-middle">
                  <div className="flex items-center justify-between">
                    <span>Requester</span>
                    <div className="flex flex-col">
                      <span className={`text-xs ${sortField === 'requester' && sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-400'}`}>▲</span>
                      <span className={`text-xs ${sortField === 'requester' && sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-400'}`}>▼</span>
                    </div>
                  </div>
                </th>
                <th onClick={() => handleSort('department')} className="px-3 py-3 text-left text-xs font-bold text-blue-800 uppercase tracking-wider border-r border-blue-200 cursor-pointer hover:bg-blue-100 align-middle">
                  <div className="flex items-center justify-between">
                    <span>Department</span>
                    <div className="flex flex-col">
                      <span className={`text-xs ${sortField === 'department' && sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-400'}`}>▲</span>
                      <span className={`text-xs ${sortField === 'department' && sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-400'}`}>▼</span>
                    </div>
                  </div>
                </th>
                <th onClick={() => handleSort('createdAt')} className="px-3 py-3 text-left text-xs font-bold text-blue-800 uppercase tracking-wider border-r border-blue-200 cursor-pointer hover:bg-blue-100 align-middle">
                  <div className="flex items-center justify-between">
                    <span>Date Created</span>
                    <div className="flex flex-col">
                      <span className={`text-xs ${sortField === 'createdAt' && sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-400'}`}>▲</span>
                      <span className={`text-xs ${sortField === 'createdAt' && sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-400'}`}>▼</span>
                    </div>
                  </div>
                </th>
                <th onClick={() => handleSort('dueByTime')} className="px-3 py-3 text-left text-xs font-bold text-blue-800 uppercase tracking-wider border-r border-blue-200 cursor-pointer hover:bg-blue-100 align-middle">
                  <div className="flex items-center justify-between">
                    <span>Due Date</span>
                    <div className="flex flex-col">
                      <span className={`text-xs ${sortField === 'dueByTime' && sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-400'}`}>▲</span>
                      <span className={`text-xs ${sortField === 'dueByTime' && sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-400'}`}>▼</span>
                    </div>
                  </div>
                </th>
                <th onClick={() => handleSort('resolvedTime')} className="px-3 py-3 text-left text-xs font-bold text-blue-800 uppercase tracking-wider border-r border-blue-200 cursor-pointer hover:bg-blue-100 align-middle">
                  <div className="flex items-center justify-between">
                    <span>Resolved Time</span>
                    <div className="flex flex-col">
                      <span className={`text-xs ${sortField === 'resolvedTime' && sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-400'}`}>▲</span>
                      <span className={`text-xs ${sortField === 'resolvedTime' && sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-400'}`}>▼</span>
                    </div>
                  </div>
                </th>
                <th onClick={() => handleSort('priority')} className="px-3 py-3 text-left text-xs font-bold text-blue-800 uppercase tracking-wider border-r border-blue-200 cursor-pointer hover:bg-blue-100 align-middle">
                  <div className="flex items-center justify-between">
                    <span>Priority</span>
                    <div className="flex flex-col">
                      <span className={`text-xs ${sortField === 'priority' && sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-400'}`}>▲</span>
                      <span className={`text-xs ${sortField === 'priority' && sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-400'}`}>▼</span>
                    </div>
                  </div>
                </th>
                <th onClick={() => handleSort('technician')} className="px-3 py-3 text-left text-xs font-bold text-blue-800 uppercase tracking-wider border-r border-blue-200 cursor-pointer hover:bg-blue-100 align-middle">
                  <div className="flex items-center justify-between">
                    <span>Technician</span>
                    <div className="flex flex-col">
                      <span className={`text-xs ${sortField === 'technician' && sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-400'}`}>▲</span>
                      <span className={`text-xs ${sortField === 'technician' && sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-400'}`}>▼</span>
                    </div>
                  </div>
                </th>
                <th onClick={() => handleSort('serviceCategory')} className="px-3 py-3 text-left text-xs font-bold text-blue-800 uppercase tracking-wider border-r border-blue-200 cursor-pointer hover:bg-blue-100 align-middle">
                  <div className="flex items-center justify-between">
                    <span>Service Category</span>
                    <div className="flex flex-col">
                      <span className={`text-xs ${sortField === 'serviceCategory' && sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-400'}`}>▲</span>
                      <span className={`text-xs ${sortField === 'serviceCategory' && sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-400'}`}>▼</span>
                    </div>
                  </div>
                </th>
                <th onClick={() => handleSort('template')} className="px-3 py-3 text-left text-xs font-bold text-blue-800 uppercase tracking-wider cursor-pointer hover:bg-blue-100 align-middle">
                  <div className="flex items-center justify-between">
                    <span>Template</span>
                    <div className="flex flex-col">
                      <span className={`text-xs ${sortField === 'template' && sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-400'}`}>▲</span>
                      <span className={`text-xs ${sortField === 'template' && sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-400'}`}>▼</span>
                    </div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {sortedRequests.length === 0 ? (
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
                sortedRequests.map((request, index) => {
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
                      <td className="px-3 py-2 border-r border-gray-200 text-gray-700 leading-relaxed max-w-lg">
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
                        {format(new Date(request.createdAt), 'MMMM dd, yyyy')}
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200 text-gray-900">
                        {request.dueByTime ? format(new Date(request.dueByTime), 'MMMM dd, yyyy') : 'N/A'}
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200 text-gray-900">
                        {request.resolvedTime ? format(new Date(request.resolvedTime), 'MMMM dd, yyyy') : 'N/A'}
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
      <Dialog open={isFilterModalOpen} onOpenChange={handleCloseFilterModal}>
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
                  {/* <button
                    onClick={() => setIsAdvancedFilter(true)}
                    className={`px-3 py-1 text-sm font-medium rounded-md ${
                      isAdvancedFilter
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Advanced
                  </button> */}
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
                      {/* Only show "All Departments" option for technicians */}
                      {session?.user?.isTechnician && <option value="">All Departments</option>}
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
                      <option value="unassigned">Unassigned</option>
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
                      <label className="block text-sm font-medium text-gray-700">Created Date - From</label>
                      <input
                        type="date"
                        value={basicFilters.createdFrom || ''}
                        onChange={(e) => setBasicFilters(prev => ({ ...prev, createdFrom: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Created Date - To</label>
                      <input
                        type="date"
                        value={basicFilters.createdTo || ''}
                        onChange={(e) => setBasicFilters(prev => ({ ...prev, createdTo: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      {/* <label className="block text-sm font-medium text-gray-700 mb-1">SLA</label> */}
                      {/* <input
                        type="text"
                        placeholder="Enter SLA name"
                        value={basicFilters.sla || ''}
                        onChange={(e) => setBasicFilters(prev => ({ ...prev, sla: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      /> */}
                    </div>
                    
                    {/* Due By Date Range */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Due By Date - From</label>
                      <input
                        type="date"
                        value={basicFilters.dueByFrom || ''}
                        onChange={(e) => setBasicFilters(prev => ({ ...prev, dueByFrom: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Due By Date - To</label>
                      <input
                        type="date"
                        value={basicFilters.dueByTo || ''}
                        onChange={(e) => setBasicFilters(prev => ({ ...prev, dueByTo: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div></div>
                    
                    {/* Resolved Date Range */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Resolved Date - From</label>
                      <input
                        type="date"
                        value={basicFilters.resolvedFrom || ''}
                        onChange={(e) => setBasicFilters(prev => ({ ...prev, resolvedFrom: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Resolved Date - To</label>
                      <input
                        type="date"
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
                onClick={() => handleCloseFilterModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={applyFilters}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Generate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
