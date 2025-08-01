'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Clock, Eye, Filter, Search, ChevronLeft, ChevronRight, RefreshCw, AlertTriangle, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { getStatusColor, getPriorityColor } from '@/lib/status-colors';

interface UserRequest {
  id: number;
  templateId: string;
  templateName: string;
  type: string;
  status: string;
  priority: string;
  formData: any;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
  serviceStatus?: 'active' | 'inactive' | 'deleted' | 'unknown';
  templateExists?: boolean;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function MyRequestsTab() {
  const router = useRouter();
  const { data: session } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<UserRequest[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 25,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    if (session?.user) {
      fetchRequests();
    }
  }, [session, searchTerm, statusFilter, typeFilter, currentPage, pageSize]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/requests?page=${currentPage}&limit=${pageSize}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }

      const data = await response.json();
      setRequests(data.requests || []);
      setPagination(data.pagination || {
        page: currentPage,
        limit: pageSize,
        total: 0,
        pages: 0
      });
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleViewRequest = (requestId: number) => {
    router.push(`/users/requests/${requestId}`);
  };

  const getServiceStatusDisplay = (request: UserRequest) => {
    if (request.serviceStatus === 'deleted' || !request.templateExists) {
      return {
        text: 'Service Deleted',
        color: 'bg-red-100 text-red-700 border-red-200',
        icon: Archive
      };
    } else if (request.serviceStatus === 'inactive') {
      return {
        text: 'Service Inactive',
        color: 'bg-amber-100 text-amber-700 border-amber-200',
        icon: AlertTriangle
      };
    }
    return null;
  };

  const getDisplayTemplateName = (request: UserRequest) => {
    if (request.serviceStatus === 'deleted' || !request.templateExists) {
      return `${request.templateName} (Deleted)`;
    } else if (request.serviceStatus === 'inactive') {
      return `${request.templateName} (Inactive)`;
    }
    return request.templateName;
  };

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">My Requests</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRequests}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        {/* Search and Filters */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending_approval">Pending Approval</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="service">Service Requests</SelectItem>
              <SelectItem value="incident">Incident Reports</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Pagination Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-slate-600">
            {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, pagination.total)} of {pagination.total} requests
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-slate-600">
                Page {currentPage} of {pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === pagination.pages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Show</span>
              <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger className="w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-slate-600">per page</span>
            </div>
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No requests found</h3>
            <p className="text-slate-500 mb-4">You haven't submitted any requests yet.</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => router.push('/users?tab=service')}>
                Request Service
              </Button>
              <Button variant="outline" onClick={() => router.push('/users?tab=incident')}>
                Report Incident
              </Button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {requests.map((request) => (
              <div key={request.id} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-slate-900">
                            #{request.id} {getDisplayTemplateName(request)}
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            REQ-{String(request.id).padStart(4, '0')}
                          </Badge>
                          {(() => {
                            const statusDisplay = getServiceStatusDisplay(request);
                            if (!statusDisplay) return null;
                            const StatusIcon = statusDisplay.icon;
                            return (
                              <Badge className={`text-xs ${statusDisplay.color}`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusDisplay.text}
                              </Badge>
                            );
                          })()}
                        </div>
                        <p className="text-sm text-slate-600 mb-2">
                          {request.formData?.description || 'No description provided'}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>Category: {request.formData?.category || 'General'}</span>
                          <span>Template: {getDisplayTemplateName(request)}</span>
                          <span>Submitted: {formatDate(request.createdAt)}</span>
                          <span>Updated: {formatDate(request.updatedAt)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-3">
                      <Badge className={`text-xs ${getStatusColor(request.status)}`}>
                        {request.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge className={`text-xs ${getPriorityColor(request.priority)}`}>
                        {request.priority.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {request.type.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewRequest(request.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
