"use client";

import React from 'react';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Search,
  ShoppingCart,
  Calendar,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  ArrowLeft, 
  XCircle,
  Plus,
  FileText,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SessionWrapper } from '@/components/session-wrapper';
import { toast } from '@/hooks/use-toast';
import { getPriorityColor, getApprovalStatusColor } from '@/lib/status-colors';

interface ApprovalRequest {
  id: string;
  requestId: number;
  requestTitle: string;
  requestType: string;
  requesterName: string;
  requesterEmail: string;
  department: string;
  createdDate: string;
  dueBy: string | null;
  priority: string;
  status: string;
  originalStatus?: string; // Keep track of original status
  level: number;
  levelName: string;
  description?: string;
  comments?: string;
  hasRejectedApproval?: boolean; // Flag to indicate if any approval was rejected
  requestStatus?: string; // Status from the request table
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
const getRowBackgroundColor = (status: string, hasRejectedApproval?: boolean, requestStatus?: string) => {
  // If request is cancelled, show red background (cancelled)
  if (requestStatus === 'cancelled') {
    return 'bg-red-50/70 hover:bg-red-100/70';
  }
  
  // If request is closed, show red background (rejected)
  if (requestStatus === 'closed') {
    return 'bg-red-50/70 hover:bg-red-100/70';
  }
  
  // If any approval has been rejected, show red background regardless of individual status
  if (hasRejectedApproval || status === 'rejected') {
    return 'bg-red-50/70 hover:bg-red-100/70';
  }
  
  switch (status) {
    case 'pending_approval': return 'bg-orange-50/70 hover:bg-orange-100/70';
    case 'for_clarification': return 'bg-yellow-50/70 hover:bg-yellow-100/70';
    case 'approved': return 'bg-green-50/70 hover:bg-green-100/70';
    default: return 'bg-white/50 hover:bg-white/70';
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

export default function ApprovalsTab() {
  const { data: session } = useSession();
  const router = useRouter();
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({ total: 0, pages: 0, current: 1 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (session) {
      fetchApprovals();
    }
  }, [session, currentPage]);

  // Refresh data when window gains focus (user returns from detail page)
  useEffect(() => {
    const handleFocus = () => {
      if (session) {
        fetchApprovals();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [session]);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching approvals for page:', currentPage);
      const response = await fetch(`/api/approvals/pending?page=${currentPage}&limit=10&t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch approvals');
      }

      const data = await response.json();
      console.log('✅ Fetched approvals data:', data.approvals?.length || 0, 'approvals');
      console.log('Approval IDs and statuses:', data.approvals?.map((a: any) => ({ id: a.id, status: a.status })) || []);
      setApprovals(data.approvals || []);
      setPagination(data.pagination || { total: 0, pages: 0, current: 1 });
    } catch (error) {
      console.error('❌ Error fetching approvals:', error);
      toast({
        title: "Error",
        description: "Failed to load approvals",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalClick = (approvalId: string, requestId: number) => {
    console.log('Clicking approval:', { approvalId, requestId });
    console.log('Navigating to:', `/requests/approvals/${requestId}`);
    router.push(`/requests/approvals/${requestId}`);
  };

  const filteredApprovals = approvals.filter(approval => {
    const matchesSearch = searchTerm === '' || 
      approval.requestTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      approval.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      approval.requestId.toString().includes(searchTerm);

    return matchesSearch;
  });

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
                    My Approvals
                  </h1>
                  <p className="text-sm text-slate-600">Review and process pending approval requests</p>
                </div>
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
                        placeholder="Search approvals by title, requester, or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-white/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Approvals Table with Fixed Header */}
                <div className="bg-white/70 backdrop-blur-sm border border-slate-200/60 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto min-w-full">
                    {filteredApprovals.length === 0 ? (
                      <div className="p-12 text-center">
                        {approvals.length === 0 ? (
                          <>
                            <CheckCircle className="h-12 w-12 mx-auto text-green-400 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">No Pending Approvals</h3>
                            <p className="text-gray-500">All caught up! No approval requests at this time.</p>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                            <p className="text-slate-600 mb-2">No approvals found</p>
                            <p className="text-sm text-slate-500">
                              Try adjusting your filters or search terms
                            </p>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="relative">
                        {/* Table Container with Fixed Header */}
                        <div className="overflow-hidden">
                          {/* Fixed Header */}
                          <div className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                            <div className="grid grid-cols-12 gap-2 px-3 py-3 text-sm font-medium text-slate-700">
                              <div className="col-span-1">Request #</div>
                              <div className="col-span-2 flex items-center">Subject</div>
                              <div className="col-span-2">Requester</div>
                              <div className="col-span-1">Approval Level</div>
                              <div className="col-span-1">Approval Status</div>
                              <div className="col-span-1">Priority</div>
                              <div className="col-span-1">Type</div>
                              <div className="col-span-2">Submitted</div>
                            </div>
                          </div>
                          
                          {/* Scrollable Content */}
                          <div className="max-h-[500px] overflow-y-auto">
                            <div className="divide-y divide-slate-200">
                              {filteredApprovals.map((approval) => {
                                return (
                                  <div 
                                    key={approval.id} 
                                    className={`grid grid-cols-12 gap-2 px-3 py-3 transition-all duration-200 cursor-pointer border-l-4 border-transparent hover:border-amber-400 ${getRowBackgroundColor(approval.status, approval.hasRejectedApproval, approval.requestStatus)}`}
                                    onClick={() => handleApprovalClick(approval.id, approval.requestId)}
                                    title={
                                      approval.requestStatus === 'cancelled' 
                                        ? "This request has been cancelled - click to acknowledge"
                                        : approval.requestStatus === 'closed' 
                                          ? "This request has been closed - click to acknowledge"
                                          : approval.hasRejectedApproval 
                                            ? "This request has been rejected by another approver - click to acknowledge" 
                                            : "Click to review approval request"
                                    }
                                  >
                                    {/* Request # */}
                                    <div className="col-span-1 flex items-center">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-mono font-medium">#{approval.requestId}</span>
                                       
                                      </div>
                                    </div>
                                    
                                    {/* Subject */}
                                    <div className="col-span-2 flex items-center">
                                      <div>
                                        <p className="font-medium text-sm">{approval.requestTitle || 'No Title'}</p>
                                     
                                      </div>
                                    </div>
                                    
                                    {/* Requester */}
                                    <div className="col-span-2">
                                      <div>
                                        <p className="font-medium text-sm">{approval.requesterName}</p>
                                        <p className="text-xs text-gray-500">{approval.department}</p>
                                        <p className="text-xs text-gray-400">{approval.requesterEmail}</p>
                                      </div>
                                    </div>
                                    
                                    {/* Approval Level */}
                                    <div className="col-span-1 flex items-center">
                                      <Badge variant="outline" className="text-xs">
                                        {approval.levelName || `Level ${approval.level}`}
                                      </Badge>
                                    </div>
                                    
                                    {/* Status */}
                                    <div className="col-span-1 flex items-center">
                                      <div className="flex flex-col gap-1">
                                        <Badge className={`${getApprovalStatusColor(
                                          approval.requestStatus === 'cancelled' 
                                            ? 'cancelled' 
                                            : approval.requestStatus === 'closed' 
                                              ? 'rejected' 
                                              : (approval.hasRejectedApproval ? 'rejected' : approval.status)
                                        )} border-0 text-xs`}>
                                          {approval.requestStatus === 'cancelled' 
                                            ? 'Cancelled' 
                                            : approval.requestStatus === 'closed' 
                                              ? 'Rejected' 
                                              : (approval.hasRejectedApproval ? 'Rejected' : capitalizeWords(approval.status))}
                                        </Badge>
                                        
                                       
                                      </div>
                                    </div>
                                    
                                    {/* Priority */}
                                    <div className="col-span-1 flex items-center">
                                      <Badge className={`${getPriorityColor(approval.priority)} border-0 text-xs`}>
                                        {capitalizeWords(approval.priority)}
                                      </Badge>
                                    </div>
                                    
                                    {/* Type */}
                                    <div className="col-span-1 flex items-center">
                                      <Badge variant="outline" className="text-xs">
                                        {approval.requestType || 'Service'}
                                      </Badge>
                                    </div>
                                    
                                    {/* Submitted - Now Wider */}
                                    <div className="col-span-2 flex items-center">
                                      <div className="flex items-center gap-1 text-xs text-gray-600">
                                        <Calendar className="h-3 w-3" />
                                        <span>{formatDate(approval.createdDate)}</span>
                                      </div>
                                    </div>
                                    
                                  
                                  </div>
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
                        Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, pagination.total)} of {pagination.total} approvals
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
