"use client";

import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  Info
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
    return false;
  }
  
  // Show for requests that are in approval process or have completed approval
  return requestStatus === 'for_approval' || approvals.some(approval => approval.status === 'approved');
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
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
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
  
  // Add template name
  details.push(`Template: ${request.templateName}`);
  
  return details.join('\n');
};

export default function MyRequestsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({ total: 0, pages: 0, current: 1 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [approvalStatusFilter, setApprovalStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (session) {
      fetchRequests();
    }
  }, [session, currentPage]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      // Always filter by current user's requests only
      const response = await fetch(`/api/requests?page=${currentPage}&limit=10&userId=${session?.user?.id}&myRequests=true`);
      
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

  const filteredRequests = requests.filter(request => {
    const matchesSearch = searchTerm === '' || 
      (request.templateName && request.templateName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      request.id.toString().includes(searchTerm) ||
      (request.subject && request.subject.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesType = typeFilter === 'all' || request.type === typeFilter;
    
    // Check approval status filter
    const { status: currentApprovalStatus } = getCurrentApprovalStatus(request.approvals);
    const matchesApprovalStatus = approvalStatusFilter === 'ALL' || currentApprovalStatus === approvalStatusFilter;

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
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    My Requests
                  </h1>
                  <p className="text-sm text-slate-600">View and manage your service requests</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => router.push('/requests/template?tab=service')}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Request
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <div style={{ zoom: '0.8' }}>
              <div className="space-y-6 p-6">
                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search requests..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-white/50"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-32 bg-white/50">
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
                      <SelectTrigger className="w-32 bg-white/50">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="service">Service</SelectItem>
                        <SelectItem value="incident">Incident</SelectItem>
                      </SelectContent>
                    </Select>
                    

                    <Select value={approvalStatusFilter} onValueChange={setApprovalStatusFilter}>
                      <SelectTrigger className="w-40 bg-white/50">
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

                {/* Requests Table with Fixed Header */}
                <div className="bg-white/70 backdrop-blur-sm border border-slate-200/60 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto min-w-full">
                    {filteredRequests.length === 0 ? (
                    <div className="p-12 text-center">
                      <FileText className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                      <p className="text-slate-600 mb-2">No requests found</p>
                      <p className="text-sm text-slate-500">
                        {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || approvalStatusFilter !== 'ALL'
                          ? 'Try adjusting your filters or search terms'
                          : 'Create your first request to get started'
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Table Container with Fixed Header */}
                      <div className="overflow-hidden">
                        {/* Fixed Header */}
                        <div className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
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
                            <div>Created</div>
                            <div>Assigned To</div>
                          </div>
                        </div>

                        {/* Scrollable Content */}
                        <div className="max-h-[500px] overflow-y-auto">
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
                                    {/* ID */}
                                    <div className="flex items-center">
                                      <span className="text-sm font-mono font-medium">
                                        #{request.id}
                                      </span>
                                    </div>

                                    {/* Subject */}
                                    <div className="flex items-center">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <p className="font-medium text-sm truncate cursor-help">
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
                                      <p className="font-medium text-sm truncate">
                                        {request.user ? 
                                          `${request.user.emp_fname} ${request.user.emp_lname}` :
                                          request.formData?.["1"] ||
                                          "-"}
                                      </p>
                                      <p className="text-xs text-gray-500 truncate">
                                        {request.user?.department || "-"}
                                      </p>
                                    </div>

                                    {/* Approval Status */}
                                    <div className="flex items-center">
                                      {showApprovalStatus ? (
                                        <Badge
                                          className={`${getApprovalStatusColor(
                                            currentApprovalStatus
                                          )} border-0 text-xs`}
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
                                        )} border-0 text-xs`}
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
                                        )} border-0 text-xs`}
                                      >
                                        {capitalizeWords(
                                          request.formData?.["2"] ||
                                            request.priority ||
                                            "-"
                                        )}
                                      </Badge>
                                    </div>

                                    {/* DueBy Date */}
                                    <div className="flex items-center gap-1 text-xs text-gray-600">
                                      <Calendar className="h-3 w-3" />
                                      <span>
                                        {request.formData?.slaDueDate
                                          ? formatDate(request.formData.slaDueDate)
                                          : "-"}
                                      </span>
                                    </div>

                                    {/* Created Date */}
                                    <div className="flex items-center gap-1 text-xs text-gray-600">
                                      <Calendar className="h-3 w-3" />
                                      <span>{formatDate(request.createdAt)}</span>
                                    </div>

                                    {/* Assigned To */}
                                    <div className="flex items-center gap-1">
                                      <User className="h-3 w-3 text-gray-500" />
                                      <span className="text-xs truncate">
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
                    </div>

                  )}
                  </div>
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="bg-white/70 backdrop-blur-sm border border-slate-200/60 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-600">
                        Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, pagination.total)} of {pagination.total} requests
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
                        <span className="text-sm text-slate-600">
                          Page {currentPage} of {pagination.pages}
                        </span>
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