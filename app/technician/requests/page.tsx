"use client";

import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { 
  ArrowLeft, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Plus,
  RefreshCw,
  Search,
  Filter,
  FileText,
  Tag,
  Calendar,
  User,
  Info,
  ShoppingCart,
  Ticket
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SessionWrapper } from '@/components/session-wrapper';
import { toast } from '@/hooks/use-toast';
import { getStatusColor, getPriorityColor, getApprovalStatusColor } from '@/lib/status-colors';
import TechnicianName from '@/components/TechnicianName';

interface RequestData {
  id: number;
  templateId: string;
  templateName: string;
  type: string;
  status: 'for_approval' | 'cancelled' | 'open' | 'on_hold' | 'resolved' | 'closed';
  priority?: 'Low' | 'Medium' | 'High' | 'Top';
  formData: any;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
  approvals?: RequestApproval[];
  // Additional fields from API
  requestNumber?: string;
  subject?: string;
  description?: string;
  requester?: string;
  requesterName?: string;
  dueDate?: string;
  category?: string;
  subCategory?: string;
  // Template details for tooltip
  template?: {
    id: number;
    name: string;
    description?: string;
    fields?: any[];
  };
  // Assigned technician details
  assignedTechnician?: {
    id: number;
    userId: number;
    displayName: string;
    fullName: string;
    email?: string;
    department?: string;
  };
  // User details from API (includes requester info)
  user?: {
    id: number;
    emp_fname: string;
    emp_lname: string;
    emp_email: string;
    department: string;
    emp_code?: string;
    post_des?: string;
  };
}

interface RequestApproval {
  id: number;
  level: number;
  name: string;
  status: 'pending_approval' | 'for_clarification' | 'rejected' | 'approved';
  approverId?: number;
  approverName?: string;
  approverEmail?: string;
  sentOn?: string;
  actedOn?: string;
  comments?: string;
  isAutoApproval: boolean;
}

interface PaginationData {
  total: number;
  pages: number;
  current: number;
  limit?: number;
}

// Utility function to capitalize each word
const capitalizeWords = (str: string) => {
  return str
    .split(/[_\s-]+/) // Split by underscore, space, or dash
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Function to get row background color based on status
const getRowBackgroundColor = (status: string) => {
  switch (status) {
    case 'for_approval': return 'bg-orange-50/70 hover:bg-orange-100/70';
    case 'open': return 'bg-blue-50/70 hover:bg-blue-100/70';
    case 'on_hold': return 'bg-yellow-50/70 hover:bg-yellow-100/70';
    case 'resolved': return 'bg-green-50/70 hover:bg-green-100/70';
    case 'closed': return 'bg-gray-50/70 hover:bg-gray-100/70';
    case 'cancelled': return 'bg-red-50/70 hover:bg-red-100/70';
    default: return 'bg-white/50 hover:bg-white/70';
  }
};

// Function to determine the current approval status based on approvals array
const getCurrentApprovalStatus = (approvals?: RequestApproval[]): { status: string; level: string } => {
  if (!approvals || approvals.length === 0) {
    return { status: 'pending_approval', level: 'Level 1' };
  }

  // Sort approvals by level
  const sortedApprovals = [...approvals].sort((a, b) => a.level - b.level);
  
  // Check if any approval is rejected
  const rejectedApproval = sortedApprovals.find(approval => approval.status === 'rejected');
  if (rejectedApproval) {
    return { 
      status: 'rejected', 
      level: `${rejectedApproval.name || `Level ${rejectedApproval.level}`}` 
    };
  }

  // Check if any approval needs clarification
  const clarificationApproval = sortedApprovals.find(approval => approval.status === 'for_clarification');
  if (clarificationApproval) {
    return { 
      status: 'for_clarification', 
      level: `${clarificationApproval.name || `Level ${clarificationApproval.level}`}` 
    };
  }

  // Find the first pending approval (current active level)
  const pendingApproval = sortedApprovals.find(approval => approval.status === 'pending_approval');
  if (pendingApproval) {
    return { 
      status: 'pending_approval', 
      level: `${pendingApproval.name || `Level ${pendingApproval.level}`}` 
    };
  }

  // If all approvals are approved, return approved status
  const allApproved = sortedApprovals.every(approval => approval.status === 'approved');
  if (allApproved) {
    return { 
      status: 'approved', 
      level: 'All Levels' 
    };
  }

  // Default fallback
  return { status: 'pending_approval', level: 'Level 1' };
};

// Function to determine if approval status should be shown
const shouldShowApprovalStatus = (requestStatus: string, approvals?: RequestApproval[]): boolean => {
  // Show approval status when request has approval workflow
  if (!approvals || approvals.length === 0) {
    return false;
  }
  
  // Show for requests that are in approval process or have completed approval (approved or rejected)
  return requestStatus === 'for_approval' || 
         approvals.some(approval => approval.status === 'approved' || approval.status === 'rejected');
};

// Get status icon based on request status enum values
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'for_approval': return <Clock className="h-4 w-4" />;
    case 'open': return <AlertCircle className="h-4 w-4" />;
    case 'on_hold': return <AlertCircle className="h-4 w-4" />;
    case 'resolved': return <CheckCircle className="h-4 w-4" />;
    case 'closed': return <CheckCircle className="h-4 w-4" />;
    case 'cancelled': return <XCircle className="h-4 w-4" />;
    // Legacy support for older status values
    case 'OPEN': return <Clock className="h-4 w-4" />;
    case 'IN_PROGRESS': return <AlertCircle className="h-4 w-4" />;
    case 'RESOLVED': return <CheckCircle className="h-4 w-4" />;
    case 'CLOSED': return <CheckCircle className="h-4 w-4" />;
    case 'REJECTED': return <XCircle className="h-4 w-4" />;
    default: return <FileText className="h-4 w-4" />;
  }
};

const formatDate = (dateString: string) => {
  // The database timestamp is already in Philippine time (+8 hours)
  // So we need to parse it without timezone conversion
  const date = new Date(dateString);
  
  // Format directly without timezone conversion since it's already Philippine time
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

// Function to get template description for tooltip
const getTemplateTooltip = (request: RequestData) => {
  const details = [];
  
  // Add description from formData field 9 (Description field)
  const description = request.formData?.['9'];
  if (description) {
    // Remove HTML tags from rich text and decode HTML entities
    const cleanDescription = description
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
    
    if (cleanDescription && cleanDescription.length > 0) {
      // Limit description length for tooltip
      const truncatedDescription = cleanDescription.length > 200 
        ? cleanDescription.substring(0, 200) + '...' 
        : cleanDescription;
      details.push(`Description: ${truncatedDescription}`);
    }
  }
  
  // Add template description if available
  if (request.template?.description) {
    details.push(`Template Info: ${request.template.description}`);
  }
  
  // Add category if available
  const category = request.formData?.['6'] || request.category || request.formData?.category;
  if (category) {
    details.push(`Category: ${capitalizeWords(category)}`);
  }
  
  // Add priority
  const priority = request.formData?.['2'] || request.priority;
  if (priority) {
    details.push(`Priority: ${capitalizeWords(priority)}`);
  }
  
  // Add template type
  details.push(`Type: ${capitalizeWords(request.type || 'Service')}`);
  
  // Add template name - use the same fallback logic as the main display
  const templateName = request.formData?.['8'] || request.templateName || request.template?.name;
  if (templateName && templateName.trim() && templateName !== 'undefined') {
    details.push(`Template: ${templateName}`);
  }
  
  // Debug: Log the request data to see what's available
  if (process.env.NODE_ENV === 'development') {
    console.log('Request data for tooltip:', {
      id: request.id,
      templateName: request.templateName,
      template: request.template,
      formData: request.formData
    });
  }
  
  return details.length > 0 ? details.join('\n') : 'No additional information available';
};

export default function MyRequestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({ total: 0, pages: 0, current: 1 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  // Initialize filters from URL parameters
  const [statusFilter, setStatusFilter] = useState(() => {
    const statusParam = searchParams?.get('status');
    console.log('URL status parameter:', statusParam); // Debug log
    if (statusParam) {
      // Direct mapping since URL params now match the filter values
      const result = statusParam === 'for_approval' || statusParam === 'open' || 
             statusParam === 'on_hold' || statusParam === 'resolved' || 
             statusParam === 'closed' || statusParam === 'cancelled' 
             ? statusParam : 'all';
      console.log('Setting status filter to:', result); // Debug log
      return result;
    }
    return 'all';
  });
  
  const [typeFilter, setTypeFilter] = useState('all');
  
  const [approvalStatusFilter, setApprovalStatusFilter] = useState(() => {
    const approvalParam = searchParams?.get('approvals');
    if (approvalParam) {
      // Direct mapping since URL params now match the filter values
      return approvalParam === 'for_clarification' || approvalParam === 'pending_approval' ||
             approvalParam === 'approved' || approvalParam === 'rejected'
             ? approvalParam : 'ALL';
    }
    return 'ALL';
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  
  // Check if user came from dashboard with specific filters (hide filter controls)
  const isDashboardFilter = searchParams?.get('assignedToCurrentUser') === 'true' ||
                           searchParams?.get('assignedTechnicianId') ||
                           searchParams?.get('filter') === 'overdue' ||
                           searchParams?.get('filter') === 'due-today';
  
  // Simple view mode: my assigned requests vs all requests
  const [viewMode, setViewMode] = useState<'assigned' | 'all'>('assigned');

  // Process URL parameters for filtering
  useEffect(() => {
    const urlStatus = searchParams?.get('status');
    const urlAssignedTechnicianId = searchParams?.get('assignedTechnicianId');
    const urlAssignedToCurrentUser = searchParams?.get('assignedToCurrentUser');
    const urlFilter = searchParams?.get('filter');
    
    // Set status filter from URL
    if (urlStatus) {
      if (urlStatus.includes(',')) {
        // Multiple statuses - show "all" in dropdown to indicate multiple
        setStatusFilter('all');
      } else {
        setStatusFilter(urlStatus);
      }
    }

    // Handle special filters (overdue, due-today)
    if (urlFilter) {
      if (urlFilter === 'overdue' || urlFilter === 'due-today') {
        // These filters should show open requests, so set status accordingly
        setStatusFilter('open');
      }
    }
  }, [searchParams]);

  // Debounce search term with faster response
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // Reduced from 500ms to 300ms for faster response

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (session) {
      console.log('Session user:', session.user); // Debug log
      console.log('Current statusFilter:', statusFilter); // Debug log
      console.log('Current URL params:', Object.fromEntries(searchParams?.entries() || [])); // Debug log
      fetchRequests();
    }
  }, [session, currentPage, viewMode, statusFilter, typeFilter, searchParams]); // Removed debouncedSearchTerm and approvalStatusFilter since we're doing client-side filtering

  const fetchRequests = async () => {
    try {
      setLoading(true);
      
      // Build query parameters based on filter mode
      let queryParams = `page=${currentPage}&limit=100`;
      
      if (viewMode === 'assigned') {
        // Get URL filtering parameters for technician-specific filtering
        const urlStatus = searchParams?.get('status');
        const urlFilter = searchParams?.get('filter');
        const urlAssignedTechnicianId = searchParams?.get('assignedTechnicianId');
        const urlAssignedToCurrentUser = searchParams?.get('assignedToCurrentUser');
        
        if (urlStatus) {
          queryParams += `&status=${urlStatus}`;
        }
        if (urlFilter) {
          queryParams += `&filter=${urlFilter}`;
        }
        if (urlAssignedTechnicianId) {
          queryParams += `&assignedTechnicianId=${urlAssignedTechnicianId}`;
        }
        if (urlAssignedToCurrentUser) {
          queryParams += `&assignedToCurrentUser=${urlAssignedToCurrentUser}`;
        } else if (!urlAssignedTechnicianId) {
          // Only default to current user's assigned requests when no specific technician is requested
          queryParams += `&assignedToCurrentUser=true`;
        }
      }
      
      // Add status filter if specified and not using URL filtering for assigned view
      if (statusFilter && statusFilter !== 'all' && viewMode !== 'assigned') {
        queryParams += `&status=${statusFilter}`;
      }
      
      // Add approval status filter if specified
      // Remove approval status filter from API call since we're doing client-side filtering
      // if (approvalStatusFilter && approvalStatusFilter !== 'ALL') {
      //   queryParams += `&approvals=${approvalStatusFilter}`;
      // }
      
      // Remove search term from API call since we're doing client-side filtering
      // if (debouncedSearchTerm.trim()) {
      //   queryParams += `&search=${encodeURIComponent(debouncedSearchTerm.trim())}`;
      // }
      
      console.log('🔍 Final query params:', queryParams);
      
      // Choose the API endpoint based on view mode
      const apiEndpoint = viewMode === 'all' ? '/api/requests' : '/api/technician/requests';
      const response = await fetch(`${apiEndpoint}?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }

      const data = await response.json();
      setRequests(data.requests || []);
      setPagination(data.pagination || { total: 0, pages: 0, current: 1 });
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: "Error",
        description: "Failed to load requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Apply client-side filtering similar to requests/view page
  const filteredRequests = requests.filter(request => {
    const matchesSearch = debouncedSearchTerm === '' || 
      (request.templateName && request.templateName.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
      request.id.toString().includes(debouncedSearchTerm) ||
      (request.formData?.['8'] && request.formData['8'].toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
      (request.formData?.['9'] && request.formData['9'].toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
      (request.user && `${request.user.emp_fname} ${request.user.emp_lname}`.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
    
    // Skip status filtering when we have special filters like 'overdue' from URL
    const urlFilter = searchParams?.get('filter');
    const matchesStatus = statusFilter === 'all' || urlFilter || request.status === statusFilter;
    
    // Check type filter - get type from formData[4] first, then fallback to request.type
    const requestType = (request.formData?.['4']?.toLowerCase() || request.type?.toLowerCase() || 'service');
    const filterType = typeFilter.toLowerCase();
    const matchesType = typeFilter === 'all' || requestType === filterType;
    
    // Check approval status filter
    const { status: currentApprovalStatus } = getCurrentApprovalStatus(request.approvals);
    const matchesApprovalStatus = approvalStatusFilter === 'ALL' || currentApprovalStatus === approvalStatusFilter;

    // Check special filters (overdue, due-today)
    let matchesSpecialFilter = true;
    
    if (urlFilter && (urlFilter === 'overdue' || urlFilter === 'due-today')) {
      // Only check for open/on_hold requests for these filters
      if (request.status !== 'open' && request.status !== 'on_hold') {
        matchesSpecialFilter = false;
      } else if (request.formData?.slaDueDate) {
        const dueDate = new Date(request.formData.slaDueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (urlFilter === 'overdue') {
          // Overdue: due date is before today
          matchesSpecialFilter = dueDate < today;
        } else if (urlFilter === 'due-today') {
          // Due today: due date is today
          matchesSpecialFilter = dueDate >= today && dueDate < tomorrow;
        }
      } else {
        // If no due date, don't match these filters
        matchesSpecialFilter = false;
      }
    }

    return matchesSearch && matchesStatus && matchesType && matchesApprovalStatus && matchesSpecialFilter;
  });

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open': return <AlertCircle className="h-4 w-4" />;
      case 'in-progress': return <Clock className="h-4 w-4" />;
      case 'resolved': return <CheckCircle className="h-4 w-4" />;
      case 'closed': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [viewMode, statusFilter, typeFilter, approvalStatusFilter, debouncedSearchTerm]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="w-full">
          <div className="p-0 w-full">
            <div style={{ zoom: '0.8' }}>
              <div className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-10 w-32" />
                </div>
                <div className="flex gap-4">
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-10 w-40" />
                </div>
                <div className="space-y-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SessionWrapper>
      <div className="h-screen flex flex-col overflow-hidden">
        {/* Header - integrated into main layout */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 z-40 flex-shrink-0">
          <div className="w-full px-2 sm:px-4 lg:px-8">
            <div className="flex items-center justify-between h-14 sm:h-16">
              <div className="flex items-center gap-2 sm:gap-4">
                <div>
                  <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    {viewMode === 'assigned' ? 'My Assigned' : 'All Requests'}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-600 hidden sm:block">
                    {viewMode === 'assigned' 
                      ? 'View and manage requests assigned to you' 
                      : 'View and manage all service requests'
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => router.push('/requests/template?tab=service')}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">New Request</span>
                  <span className="sm:hidden">New</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area - No scroll here, scroll is in table */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full">
            <div className="lg:zoom-90">
              <div className="space-y-3 sm:space-y-6 p-2 sm:p-4 lg:p-6 h-full flex flex-col">
                {/* URL Filter Indicators */}
                {searchParams?.get('assignedToCurrentUser') === 'true' && (
                  <div className="bg-blue-100 border border-blue-400 text-blue-700 px-3 sm:px-4 py-2 sm:py-3 rounded text-sm">
                    <strong>Showing: My Assigned Requests</strong>
                    <span className="ml-2 text-xs sm:text-sm"></span>
                    {searchParams.get('status') && (
                      <span className="ml-2 text-xs sm:text-sm">({searchParams.get('status')!.replace(',', ', ')})</span>
                    )}
                  </div>
                )}
                {searchParams?.get('assignedTechnicianId') && searchParams?.get('technicianName') && (
                  <div className="bg-green-100 border border-green-400 text-green-700 px-3 sm:px-4 py-2 sm:py-3 rounded text-sm">
                    <strong>Showing: Requests assigned to {searchParams.get('technicianName')}</strong>
                    {searchParams.get('status') && (
                      <span className="ml-2 text-xs sm:text-sm">({searchParams.get('status')!.replace(',', ', ')})</span>
                    )}
                    {searchParams.get('filter') === 'overdue' && (
                      <span className="ml-2 text-xs sm:text-sm">(overdue requests)</span>
                    )}
                  </div>
                )}
                {searchParams?.get('filter') === 'overdue' && !searchParams?.get('assignedTechnicianId') && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded text-sm">
                    <strong>🚨 Showing: All Overdue Requests</strong>
                    <span className="ml-2 text-xs sm:text-sm">(requests past their due date)</span>
                  </div>
                )}
                {searchParams?.get('filter') === 'due-today' && (
                  <div className="bg-orange-100 border border-orange-400 text-orange-700 px-3 sm:px-4 py-2 sm:py-3 rounded text-sm">
                    <strong>📅 Showing: Requests Due Today</strong>
                    <span className="ml-2 text-xs sm:text-sm">(Open requests due today)</span>
                  </div>
                )}

                {/* Filters - Hidden when coming from dashboard */}
                {!isDashboardFilter && (
                  <div className="flex-shrink-0">
                    {/* Enhanced Filters */}
                    <div className="flex flex-col gap-3">
                      {/* View Mode Filters + Search Row */}
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                        {/* View Mode Filters - Responsive */}
                        <div className="flex items-center gap-2">
                          <Filter className="h-4 w-4 text-gray-500" />
                          <Select value={viewMode} onValueChange={(value: 'assigned' | 'all') => setViewMode(value)}>
                            <SelectTrigger className="w-full sm:w-60 bg-white/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="assigned">My Assigned Requests</SelectItem>
                              <SelectItem value="all">All Requests</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="hidden sm:block w-px h-6 bg-gray-300 mx-1"></div>
                        
                        {/* Search Input */}
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            placeholder="Search by ID, subject, description, or requester..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onBlur={() => {
                              // Trigger immediate search on blur if there's a difference
                              if (searchTerm !== debouncedSearchTerm) {
                                setDebouncedSearchTerm(searchTerm);
                              }
                            }}
                            className="pl-10 bg-white/50"
                          />
                        </div>
                      </div>
                      
                      {/* Other Filters - Mobile Responsive */}
                      <div className="grid grid-cols-2 sm:flex gap-2">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="bg-white/50 text-sm">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="for_approval">For Approval</SelectItem>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="on_hold">On Hold</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>

                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                          <SelectTrigger className="bg-white/50 text-sm">
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="service">Service</SelectItem>
                            <SelectItem value="incident">Incident</SelectItem>
                          </SelectContent>
                        </Select>

                        <Select value={approvalStatusFilter} onValueChange={setApprovalStatusFilter}>
                          <SelectTrigger className="col-span-2 sm:col-span-1 bg-white/50 text-sm">
                            <SelectValue placeholder="Approval Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">All Approvals</SelectItem>
                            <SelectItem value="pending_approval">Pending Approval</SelectItem>
                            <SelectItem value="for_clarification">For Clarification</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Show search only when filters are hidden */}
                {isDashboardFilter && (
                  <div className="flex-shrink-0">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search by ID, subject, description, or requester..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onBlur={() => {
                          // Trigger immediate search on blur if there's a difference
                          if (searchTerm !== debouncedSearchTerm) {
                            setDebouncedSearchTerm(searchTerm);
                          }
                        }}
                        className="pl-10 bg-white/50"
                      />
                    </div>
                  </div>
                )}

                {/* Requests Table - Fixed height to ensure scrolling */}
                <div className="bg-white/70 backdrop-blur-sm border border-slate-200/60 rounded-lg overflow-hidden" 
                     style={{ height: '500px', minHeight: '400px', maxHeight: '500px' }}>
                  <div className="h-full flex flex-col">
                    {filteredRequests.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center p-12">
                        <div className="text-center">
                          <FileText className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                          <p className="text-slate-600 mb-2">No requests found</p>
                          <p className="text-sm text-slate-500">
                            {debouncedSearchTerm || statusFilter !== 'all' || typeFilter !== 'all' || approvalStatusFilter !== 'ALL'
                              ? 'Try adjusting your filters or search terms'
                              : 'Create your first request to get started'
                            }
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Desktop Table View - Hidden on mobile */}
                        <div className="hidden sm:flex sm:flex-col h-full">
                          {/* Fixed Header */}
                          <div className="bg-slate-50 border-b border-slate-200 flex-shrink-0">
                            <div
                              className="grid gap-2 px-3 py-3 text-sm font-medium text-slate-700"
                              style={{
                                gridTemplateColumns:
                                  "60px 2fr 1.5fr 1fr 1fr 1fr 1.5fr 1.5fr 1.5fr",
                              }}
                            >
                              <div>ID</div>
                              <div>Subject</div>
                              <div>Requester</div>
                              <div>Approval Status</div>
                              <div>Request Status</div>
                              <div>Priority</div>
                              <div>DueBy Date</div>
                              <div>Created Date</div>
                              <div>Assigned To</div>
                            </div>
                          </div>

                          {/* Scrollable Content */}
                          <div className="flex-1 overflow-y-auto reports-table-scroll">
                            <div className="divide-y divide-slate-200">
                            {filteredRequests.map((request) => {
                              const { status: currentApprovalStatus } =
                                getCurrentApprovalStatus(request.approvals);
                              const showApprovalStatus = shouldShowApprovalStatus(
                                request.status,
                                request.approvals
                              );

                              return (
                                <TooltipProvider key={request.id}>
                                  <Link
                                    href={`/requests/view/${request.id}?from=/technician/requests`}
                                    className={`grid gap-2 px-3 py-3 transition-all duration-200 cursor-pointer border-l-4 border-transparent hover:border-blue-400 ${getRowBackgroundColor(
                                      request.status
                                    )}`}
                                    style={{
                                      gridTemplateColumns:
                                        "60px 2fr 1.5fr 1fr 1fr 1fr 1.5fr 1.5fr 1.5fr",
                                    }}
                                    title="Click to view request details"
                                  >
                                    {/* ID */}
                                    <div className="flex items-center gap-2">
                                      {/* Type Icon - Get type from formData[4] */}
                                      {(() => {
                                        const requestType = request.formData?.['4']?.toLowerCase() || request.type?.toLowerCase() || 'unknown';
                                        
                                        // Debug logging for first few requests
                                        if (requests.indexOf(request) < 3) {
                                          console.log(`Request ${request.id}: formData[4]="${request.formData?.['4']}", type="${request.type}", using="${requestType}"`);
                                        }
                                        
                                        if (requestType === 'service') {
                                          return <ShoppingCart className="h-4 w-4 text-blue-600" />;
                                        } else if (requestType === 'incident') {
                                          return <Ticket className="h-4 w-4 text-red-600" />;
                                        } else {
                                          return <FileText className="h-4 w-4 text-gray-500" />;
                                        }
                                      })()}
                                      <span className="text-sm font-mono font-medium">
                                        #{request.id}
                                      </span>
                                    </div>

                                    {/* Subject */}
                                    <div className="flex items-center">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <p className="font-medium text-sm break-words cursor-help">
                                            {request.formData?.["8"] ||
                                              request.subject ||
                                              request.templateName ||
                                              "-"}
                                          </p>
                                        </TooltipTrigger>
                                        <TooltipContent 
                                          className="max-w-sm p-3 bg-white border border-gray-200 shadow-lg z-[9999]" 
                                          side="bottom" 
                                          align="start"
                                          sideOffset={5}
                                        >
                                          <div className="text-sm whitespace-pre-line leading-relaxed">
                                            {getTemplateTooltip(request)}
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    </div>

                                    {/* Requester */}
                                    <div>
                                      <p className="font-medium text-sm break-words">
                                        {request.user ? 
                                          `${request.user.emp_fname} ${request.user.emp_lname}` :
                                          request.requesterName ||
                                          request.formData?.["1"] ||
                                          "-"}
                                      </p>
                                      <p className="text-xs text-gray-500 break-words">
                                        {request.user?.department || "-"}
                                      </p>
                                    </div>

                                    {/* Approval Status */}
                                    <div className="flex items-center">
                                      {showApprovalStatus ? (
                                        <Badge
                                          className={`${getApprovalStatusColor(
                                            currentApprovalStatus
                                          )} border-0 text-xs px-1.5 py-0.5`}
                                        >
                                          {capitalizeWords(currentApprovalStatus)}
                                        </Badge>
                                      ) : (
                                        <span className="text-gray-400 text-xs">N/A</span>
                                      )}
                                    </div>

                                    {/* Request Status */}
                                    <div className="flex items-center">
                                      <Badge
                                        className={`${getStatusColor(
                                          request.status
                                        )} border-0 text-xs px-1.5 py-0.5`}
                                      >
                                        <span className="flex items-center gap-1">
                                          {getStatusIcon(request.status)}
                                          {capitalizeWords(request.status)}
                                        </span>
                                      </Badge>
                                    </div>

                                    {/* Priority */}
                                    <div className="flex items-center">
                                      <Badge
                                        className={`${getPriorityColor(
                                          request.formData?.["2"] ||
                                            request.priority ||
                                            "Medium"
                                        )} border-0 text-xs px-1.5 py-0.5`}
                                      >
                                        {capitalizeWords(
                                          request.formData?.["2"] ||
                                            request.priority ||
                                            "-"
                                        )}
                                      </Badge>
                                    </div>

                                    {/* DueBy Date */}
                                    <div className="flex items-center gap-1 text-gray-600 break-words leading-tight">
                                      <Calendar className="h-3 w-3 flex-shrink-0" />
                                      <span className="text-sm break-words">
                                        {request.formData?.slaDueDate
                                          ? formatDate(request.formData.slaDueDate)
                                          : "-"}
                                      </span>
                                    </div>

                                    {/* Created Date */}
                                    <div className="flex items-center gap-1 text-gray-600 break-words leading-tight">
                                      <Calendar className="h-3 w-3 flex-shrink-0" />
                                      <span className="text-sm break-words">
                                        {formatDate(new Date(new Date(request.createdAt).getTime() - 8 * 60 * 60 * 1000).toISOString())}
                                      </span>
                                    </div>

                                    {/* Assigned To */}
                                    <div className="flex items-center gap-1 leading-tight">
                                      <User className="h-3 w-3 text-gray-500 flex-shrink-0" />
                                      <span className="text-sm break-words">
                                        <TechnicianName 
                                          technicianId={request.formData?.assignedTechnicianId} 
                                          fallback="-" 
                                        />
                                      </span>
                                    </div>
                                  </Link>
                                </TooltipProvider>
                              );
                            })}
                          </div>
                        </div>
                        </div>

                        {/* Mobile Card View - Visible only on mobile */}
                        <div className="sm:hidden flex-1 overflow-y-auto reports-table-scroll p-2 space-y-2">
                          {filteredRequests.map((request) => {
                            const { status: currentApprovalStatus } =
                              getCurrentApprovalStatus(request.approvals);
                            const showApprovalStatus = shouldShowApprovalStatus(
                              request.status,
                              request.approvals
                            );

                            return (
                              <Link
                                key={request.id}
                                href={`/requests/view/${request.id}?from=/technician/requests`}
                                className={`block bg-white border border-slate-200 rounded-lg p-3 cursor-pointer transition-all duration-200 hover:shadow-md ${getRowBackgroundColor(
                                  request.status
                                )}`}
                              >
                                {/* Header Row */}
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    {/* Type Icon */}
                                    {(() => {
                                      const requestType = request.formData?.['4']?.toLowerCase() || request.type?.toLowerCase() || 'unknown';
                                      
                                      if (requestType === 'service') {
                                        return <ShoppingCart className="h-4 w-4 text-blue-600" />;
                                      } else if (requestType === 'incident') {
                                        return <Ticket className="h-4 w-4 text-red-600" />;
                                      } else {
                                        return <FileText className="h-4 w-4 text-gray-500" />;
                                      }
                                    })()}
                                    <span className="text-sm font-mono font-bold text-blue-600">
                                      #{request.id}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      className={`${getStatusColor(
                                        request.status
                                      )} border-0 text-xs px-2 py-1`}
                                    >
                                      <span className="flex items-center gap-1">
                                        {getStatusIcon(request.status)}
                                        {capitalizeWords(request.status)}
                                      </span>
                                    </Badge>
                                  </div>
                                </div>

                                {/* Subject */}
                                <div className="mb-2">
                                  <p className="font-medium text-sm text-gray-900 leading-tight">
                                    {request.formData?.["8"] ||
                                      request.subject ||
                                      request.templateName ||
                                      "-"}
                                  </p>
                                </div>

                                {/* Key Information Grid */}
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <span className="text-gray-500">Requester:</span>
                                    <p className="font-medium text-gray-900 truncate">
                                      {request.user ? 
                                        `${request.user.emp_fname} ${request.user.emp_lname}` :
                                        request.requesterName ||
                                        request.formData?.["1"] ||
                                        "-"}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Priority:</span>
                                    <Badge
                                      className={`${getPriorityColor(
                                        request.formData?.["2"] ||
                                          request.priority ||
                                          "Medium"
                                      )} border-0 text-xs px-1.5 py-0.5 ml-1`}
                                    >
                                      {capitalizeWords(
                                        request.formData?.["2"] ||
                                          request.priority ||
                                          "-"
                                      )}
                                    </Badge>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Due Date:</span>
                                    <p className="font-medium text-gray-900">
                                      {request.formData?.slaDueDate
                                        ? formatDate(request.formData.slaDueDate)
                                        : "-"}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Created:</span>
                                    <p className="font-medium text-gray-900">
                                      {formatDate(new Date(new Date(request.createdAt).getTime() - 8 * 60 * 60 * 1000).toISOString())}
                                    </p>
                                  </div>
                                  {showApprovalStatus && (
                                    <>
                                      <div>
                                        <span className="text-gray-500">Approval:</span>
                                        <Badge
                                          className={`${getApprovalStatusColor(
                                            currentApprovalStatus
                                          )} border-0 text-xs px-1.5 py-0.5 ml-1`}
                                        >
                                          {capitalizeWords(currentApprovalStatus)}
                                        </Badge>
                                      </div>
                                    </>
                                  )}
                                  <div>
                                    <span className="text-gray-500">Assigned To:</span>
                                    <p className="font-medium text-gray-900 truncate">
                                      <TechnicianName 
                                        technicianId={request.formData?.assignedTechnicianId} 
                                        fallback="-" 
                                      />
                                    </p>
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Pagination - Fixed at bottom */}
                {pagination.pages > 1 && (
                  <div className="flex-shrink-0 bg-white/70 backdrop-blur-sm border border-slate-200/60 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-600">
                        Showing {((currentPage - 1) * 100) + 1} to {Math.min(currentPage * 100, pagination.total)} of {pagination.total} requests
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage <= 1}
                          className="border-slate-300 text-slate-700 hover:bg-slate-50"
                        >
                          Previous
                        </Button>
                        
                        {/* Page Numbers */}
                        {pagination.pages <= 7 ? (
                          // Show all pages if 7 or fewer
                          Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(page)}
                              className={currentPage === page 
                                ? "bg-blue-600 text-white" 
                                : "border-slate-300 text-slate-700 hover:bg-slate-50"
                              }
                            >
                              {page}
                            </Button>
                          ))
                        ) : (
                          // Show condensed pagination for many pages
                          <>
                            {currentPage > 3 && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePageChange(1)}
                                  className="border-slate-300 text-slate-700 hover:bg-slate-50"
                                >
                                  1
                                </Button>
                                {currentPage > 4 && <span className="text-slate-500">...</span>}
                              </>
                            )}
                            
                            {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                              const page = Math.max(1, Math.min(pagination.pages - 4, currentPage - 2)) + i;
                              if (page <= pagination.pages) {
                                return (
                                  <Button
                                    key={page}
                                    variant={currentPage === page ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handlePageChange(page)}
                                    className={currentPage === page 
                                      ? "bg-blue-600 text-white" 
                                      : "border-slate-300 text-slate-700 hover:bg-slate-50"
                                    }
                                  >
                                    {page}
                                  </Button>
                                );
                              }
                              return null;
                            })}
                            
                            {currentPage < pagination.pages - 2 && (
                              <>
                                {currentPage < pagination.pages - 3 && <span className="text-slate-500">...</span>}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePageChange(pagination.pages)}
                                  className="border-slate-300 text-slate-700 hover:bg-slate-50"
                                >
                                  {pagination.pages}
                                </Button>
                              </>
                            )}
                          </>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage >= pagination.pages}
                          className="border-slate-300 text-slate-700 hover:bg-slate-50"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SessionWrapper>
  );
}