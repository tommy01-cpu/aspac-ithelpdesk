"use client";

import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  // Requester details
  requesterDetails?: {
    id: number;
    fullName: string;
    email?: string;
    department?: string;
    employeeCode?: string;
  };
  // User information for requester display
  user?: {
    emp_fname: string;
    emp_lname: string;
    department?: string;
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
    console.log('shouldShowApprovalStatus: No approvals array', { requestStatus, approvalsLength: 0 });
    return false;
  }
  
  // Show for requests that are in approval process or have completed approval (approved or rejected)
  const result = requestStatus === 'for_approval' || 
         approvals.some(approval => approval.status === 'approved' || approval.status === 'rejected');
  
  console.log('shouldShowApprovalStatus:', { 
    requestStatus, 
    approvalsLength: approvals.length,
    approvalStatuses: approvals.map(a => a.status),
    result 
  });
  
  return result;
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
    // Remove HTML tags from rich text
    const cleanDescription = description.replace(/<[^>]*>/g, '').trim();
    if (cleanDescription) {
      details.push(`Description: ${cleanDescription}`);
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
  
  // Add template name if available (try multiple sources)
  const templateName =  request.template?.name;
  if (templateName) {
    details.push(`Template: ${templateName}`);
  } else if (request.templateId) {
    details.push(`Template ID: ${request.templateId}`);
  }
  
  return details.join('\n');
};

export default function MyRequestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({ total: 0, pages: 0, current: 1 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
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
  
  // New filter states for department head functionality
  const [viewMode, setViewMode] = useState<'own' | 'department'>('own'); // own requests or department requests
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);
  const [isDepartmentHead, setIsDepartmentHead] = useState(false);

  useEffect(() => {
    if (session) {
      console.log('Session user:', session.user); // Debug log
      console.log('Current statusFilter:', statusFilter); // Debug log
      console.log('Current URL params:', Object.fromEntries(searchParams?.entries() || [])); // Debug log
      fetchUserInfo(); // This will now also fetch and set departments for department heads
      if (!isDepartmentHead) {
        fetchDepartments(); // Only fetch all departments if not a department head
      }
      fetchRequests();
    }
  }, [session, currentPage, viewMode, departmentFilter, statusFilter, typeFilter, approvalStatusFilter]);

  const fetchUserInfo = async () => {
    try {
      const response = await fetch(`/api/users/${session?.user?.id}`);
      if (response.ok) {
        const data = await response.json();
        console.log('User data fetched:', data); // Debug log
        // Check if user is a department head (has departmentsManaged)
        const isDepHead = data.user?.departmentsManaged && data.user.departmentsManaged.length > 0;
        console.log('Is department head:', isDepHead, 'Departments managed:', data.user?.departmentsManaged); // Debug log
        setIsDepartmentHead(isDepHead);
        
        // Set only the departments this user manages
        if (isDepHead) {
          setDepartments(data.user.departmentsManaged || []);
        }
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      if (response.ok) {
        const data = await response.json();
        console.log('Departments fetched:', data); // Debug log
        setDepartments(data.departments || []);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      
      // Build query parameters based on filter mode
      let queryParams = `page=${currentPage}&limit=100`; // 100 per page as requested
      
      if (viewMode === 'own') {
        // Always filter by current user's requests only for own view
        queryParams += `&userId=${session?.user?.id}&myRequests=true`;
      } else if (viewMode === 'department' && departmentFilter !== 'all') {
        // Filter by department requests when department head views department requests
        queryParams += `&departmentId=${departmentFilter}`;
      } else if (viewMode === 'department') {
        // Show all departments if user is department head and no specific department selected
        queryParams += `&departmentHead=${session?.user?.id}`;
      }
      
      // Add status filter if specified
      if (statusFilter && statusFilter !== 'all') {
        queryParams += `&status=${statusFilter}`;
      }
      
      // Add approval status filter if specified
      if (approvalStatusFilter && approvalStatusFilter !== 'ALL') {
        queryParams += `&approvals=${approvalStatusFilter}`;
      }
      
      console.log('🔍 Final query params:', queryParams);
      
      const response = await fetch(`/api/requests?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }

      const data = await response.json();
      setRequests(data.requests || []);
      setPagination(data.pagination || { total: 0, pages: 0, current: 1 });
      
      // Debug: Check request types and timestamps
      const requestTypes = Array.from(new Set((data.requests || []).map((r: any) => r.type)));
      console.log('Request types found:', requestTypes);
      console.log('Sample request:', data.requests?.[0]);
      
      // Debug timestamp
      if (data.requests?.[0]) {
        console.log('Raw createdAt timestamp:', data.requests[0].createdAt);
        console.log('Parsed Date object:', new Date(data.requests[0].createdAt));
        console.log('Date toString():', new Date(data.requests[0].createdAt).toString());
        console.log('Date toISOString():', new Date(data.requests[0].createdAt).toISOString());
        console.log('Date with Manila timezone:', new Date(data.requests[0].createdAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }));
      }
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

  const filteredRequests = requests.filter(request => {
    const matchesSearch = searchTerm === '' || 
      (request.templateName && request.templateName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      request.id.toString().includes(searchTerm) ||
      (request.subject && request.subject.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    
    // Debug logging for status filtering
    if (statusFilter !== 'all' && requests.indexOf(request) < 3) {
      console.log(`Request ${request.id}: status="${request.status}", filter="${statusFilter}", matches=${matchesStatus}`);
    }
    
    // Fix type filter - get type from formData[4] first, then fallback to request.type
    const requestType = (request.formData?.['4']?.toLowerCase() || request.type?.toLowerCase() || 'service');
    const filterType = typeFilter.toLowerCase();
    const matchesType = typeFilter === 'all' || requestType === filterType;
    
    // Check approval status filter
    const { status: currentApprovalStatus } = getCurrentApprovalStatus(request.approvals);
    const showApprovalStatus = shouldShowApprovalStatus(request.status, request.approvals);
    
    let matchesApprovalStatus = true;
    if (approvalStatusFilter === 'N/A') {
      // Filter for requests that don't have approval workflows (show N/A)
      matchesApprovalStatus = !showApprovalStatus;
    } else if (approvalStatusFilter !== 'ALL') {
      // Filter for specific approval status
      matchesApprovalStatus = showApprovalStatus && currentApprovalStatus === approvalStatusFilter;
    }

    // Debug: Log filtering for first few requests
    if (requests.indexOf(request) < 3) {
      console.log(`Request ${request.id}: formData[4]="${request.formData?.['4']}", type="${request.type}", requestType="${requestType}", filterType="${filterType}", matchesType=${matchesType}`);
    }

    return matchesSearch && matchesStatus && matchesType && matchesApprovalStatus;
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

  if (loading) {
    return (
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="lg:zoom-90">
          <div className="flex flex-col gap-4 sm:gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <Skeleton className="h-6 sm:h-8 w-32 sm:w-48" />
              <Skeleton className="h-8 sm:h-10 w-20 sm:w-32" />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <Skeleton className="h-10 flex-1" />
              <div className="grid grid-cols-2 sm:flex gap-2">
                <Skeleton className="h-10 w-full sm:w-32" />
                <Skeleton className="h-10 w-full sm:w-32" />
                <Skeleton className="h-10 col-span-2 sm:col-span-1 sm:w-40" />
              </div>
            </div>
            <div className="space-y-2 sm:space-y-1" style={{ height: 'calc(100vh - 250px)' }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 sm:h-16 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SessionWrapper>
      <div className="p-2 sm:p-4 lg:p-6">
        <div className="lg:zoom-90">
          <div className="flex flex-col gap-3 sm:gap-6">
            {/* Page Title and Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
              <div>
                <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  My Requests
                </h1>
                <p className="text-xs sm:text-sm text-slate-600">View and manage your requests</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => router.push('/requests/template?tab=service')}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">New Request</span>
                  <span className="sm:hidden">New</span>
                </Button>
              </div>
            </div>
              {/* Filters - Fixed height */}
              <div className="flex-shrink-0">
                {/* Standard Filters */}
                <div className="flex flex-col gap-2">
                  {/* Department Head Filters + Search Row */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    {/* Department Head Filters - Responsive */}
                    {isDepartmentHead && (
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                        <div className="flex items-center gap-2">
                          <Filter className="h-4 w-4 text-gray-500" />
                          <Select value={viewMode} onValueChange={(value: 'own' | 'department') => setViewMode(value)}>
                            <SelectTrigger className="w-full sm:w-48 bg-white/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="own">My Requests</SelectItem>
                              <SelectItem value="department">My Department Requests</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {viewMode === 'department' && (
                          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                            <SelectTrigger className="w-full sm:w-48 bg-white/50">
                              <SelectValue placeholder="Department" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All My Departments</SelectItem>
                              {departments.map(dept => (
                                <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        
                        <div className="hidden sm:block w-px h-6 bg-gray-300 mx-1"></div>
                      </div>
                    )}
                    
                    {/* Search Input */}
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search requests..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-white/40"
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
                        <SelectItem value="N/A">N/A</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Requests Table - Fixed height to ensure scrolling */}
              <div className="bg-white/70 backdrop-blur-sm border border-slate-200/60 rounded-lg overflow-hidden" 
                   style={{ height: '500px', minHeight: '400px', maxHeight: '500px' }}>
                <div className="h-full flex flex-col">
                  {filteredRequests.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
                      <div className="text-center">
                        <FileText className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-slate-400 mb-4" />
                        <p className="text-slate-600 mb-2 text-sm sm:text-base">No requests found</p>
                        <p className="text-xs sm:text-sm text-slate-500">
                          {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || approvalStatusFilter !== 'ALL'
                            ? 'Try adjusting your filters or search terms'
                            : 'Create your first request to get started'
                          }
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Desktop Table View - Hidden on mobile */}
                      <div className="hidden lg:flex lg:flex-col h-full">
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
                                  <div
                                    className={`grid gap-2 px-3 py-3 transition-all duration-200 cursor-pointer border-l-4 border-transparent hover:border-blue-400 ${getRowBackgroundColor(
                                      request.status
                                    )}`}
                                    style={{
                                      gridTemplateColumns:
                                        "60px 2fr 1.5fr 1fr 1fr 1fr 1.5fr 1.5fr 1.5fr",
                                    }}
                                    onClick={() =>
                                      router.push(`/requests/view/${request.id}`)
                                    }
                                    title="Click to view request details"
                                  >
                                    {/* Desktop table content remains the same */}
                                    {/* ID */}
                                    <div className="flex items-center gap-2">
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
                                        <TooltipContent className="max-w-md p-3">
                                          <div className="text-sm whitespace-pre-line">
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
                                        {request.assignedTechnician?.displayName ||
                                          request.assignedTechnician?.fullName ||
                                          request.formData?.assignedTechnician ||
                                          "-"}
                                      </span>
                                    </div>
                                  </div>
                                </TooltipProvider>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Mobile Card View - Visible on mobile and tablet */}
                      <div className="lg:hidden flex-1 overflow-y-auto reports-table-scroll p-2 space-y-2">
                        <div className="p-2 space-y-3">
                          {filteredRequests.map((request) => {
                            const { status: currentApprovalStatus } =
                              getCurrentApprovalStatus(request.approvals);
                            const showApprovalStatus = shouldShowApprovalStatus(
                              request.status,
                              request.approvals
                            );

                            return (
                              <div
                                key={request.id}
                                className={`bg-white rounded-lg border border-slate-200 p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${getRowBackgroundColor(
                                  request.status
                                ).replace('hover:bg-', 'hover:shadow-lg ')}`}
                                onClick={() => router.push(`/requests/view/${request.id}`)}
                              >
                                {/* Mobile Card Header */}
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-2">
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
                                    <span className="text-sm font-mono font-bold text-slate-700">
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
                                <div className="mb-3">
                                  <h3 className="font-medium text-sm text-slate-900 line-clamp-2 leading-relaxed">
                                    {request.formData?.["8"] ||
                                      request.subject ||
                                      request.templateName ||
                                      "No subject"}
                                  </h3>
                                </div>

                                {/* Mobile Card Details Grid */}
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                  {/* Requester */}
                                  <div>
                                    <p className="text-gray-500 mb-1">Requester</p>
                                    <p className="font-medium text-slate-700 truncate">
                                      {request.user ? 
                                        `${request.user.emp_fname} ${request.user.emp_lname}` :
                                        request.formData?.["1"] || "-"}
                                    </p>
                                  </div>

                                  {/* Priority */}
                                  <div>
                                    <p className="text-gray-500 mb-1">Priority</p>
                                    <Badge
                                      className={`${getPriorityColor(
                                        request.formData?.["2"] ||
                                          request.priority ||
                                          "Medium"
                                      )} border-0 text-xs px-2 py-0.5`}
                                    >
                                      {capitalizeWords(
                                        request.formData?.["2"] ||
                                          request.priority ||
                                          "Medium"
                                      )}
                                    </Badge>
                                  </div>

                                  {/* Created Date */}
                                  <div>
                                    <p className="text-gray-500 mb-1">Created</p>
                                    <p className="text-slate-600 text-xs">
                                      {formatDate(new Date(new Date(request.createdAt).getTime() - 8 * 60 * 60 * 1000).toISOString())}
                                    </p>
                                  </div>

                                  {/* Approval Status */}
                                  <div>
                                    <p className="text-gray-500 mb-1">Approval</p>
                                    {showApprovalStatus ? (
                                      <Badge
                                        className={`${getApprovalStatusColor(
                                          currentApprovalStatus
                                        )} border-0 text-xs px-2 py-0.5`}
                                      >
                                        {capitalizeWords(currentApprovalStatus)}
                                      </Badge>
                                    ) : (
                                      <span className="text-gray-400 text-xs">N/A</span>
                                    )}
                                  </div>
                                </div>

                                {/* Due Date and Assigned To - Full width on mobile */}
                                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 gap-2 text-xs">
                                  {request.formData?.slaDueDate && (
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-3 w-3 text-gray-500" />
                                      <span className="text-gray-500">Due:</span>
                                      <span className="text-slate-600">
                                        {formatDate(request.formData.slaDueDate)}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {(request.assignedTechnician?.displayName || 
                                    request.assignedTechnician?.fullName || 
                                    request.formData?.assignedTechnician) && (
                                    <div className="flex items-center gap-2">
                                      <User className="h-3 w-3 text-gray-500" />
                                      <span className="text-gray-500">Assigned:</span>
                                      <span className="text-slate-600 truncate">
                                        {request.assignedTechnician?.displayName ||
                                          request.assignedTechnician?.fullName ||
                                          request.formData?.assignedTechnician}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Pagination - Fixed at bottom, mobile responsive */}
              {pagination.pages > 1 && (
                <div className="flex-shrink-0 bg-white/70 backdrop-blur-sm border border-slate-200/60 rounded-lg p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-xs sm:text-sm text-slate-600 text-center sm:text-left">
                      Showing {((currentPage - 1) * 100) + 1} to {Math.min(currentPage * 100, pagination.total)} of {pagination.total} requests
                    </p>
                    <div className="flex items-center justify-center sm:justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm px-2 sm:px-3"
                      >
                        <span className="hidden sm:inline">Previous</span>
                        <span className="sm:hidden">Prev</span>
                      </Button>
                      <span className="text-xs sm:text-sm text-slate-600 px-2">
                        {currentPage} of {pagination.pages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= pagination.pages}
                        className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm px-2 sm:px-3"
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
    </SessionWrapper>
  );
}