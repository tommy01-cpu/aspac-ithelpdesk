'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Search, Filter, Eye, Edit, Trash2, FileText, Clock, CheckCircle, XCircle, AlertCircle, MoreHorizontal, Calendar, User, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { SessionWrapper } from '@/components/session-wrapper';
import { getStatusColor, getPriorityColor } from '@/lib/status-colors';

interface RequestData {
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
  requesterName?: string;
  requesterEmail?: string;
  assignedTechnicianName?: string;
  assignedTechnicianEmail?: string;
  dueBy?: string;
}

interface PaginationData {
  total: number;
  pages: number;
  current: number;
}

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'open': return <Clock className="h-4 w-4" />;
    case 'in-progress': return <AlertCircle className="h-4 w-4" />;
    case 'resolved': return <CheckCircle className="h-4 w-4" />;
    case 'closed': return <CheckCircle className="h-4 w-4" />;
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

export default function RequestsPage() {
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({ total: 0, pages: 0, current: 1 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchRequests();
  }, [currentPage]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/requests?page=${currentPage}&limit=10`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }

      const data = await response.json();
      setRequests(data.requests || []);
      setPagination(data.pagination || { total: 0, pages: 0, current: 1 });
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = searchTerm === '' || 
      request.templateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.id.toString().includes(searchTerm) ||
      (request.requesterName && request.requesterName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesType = typeFilter === 'all' || request.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getRequestStats = () => {
    const total = requests.length;
    const open = requests.filter(r => r.status.toLowerCase() === 'open').length;
    const inProgress = requests.filter(r => r.status.toLowerCase() === 'in-progress').length;
    const resolved = requests.filter(r => r.status.toLowerCase() === 'resolved').length;

    return { total, open, inProgress, resolved };
  };

  const stats = getRequestStats();

  if (loading) {
    return (
      <SessionWrapper>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
          <div className="container mx-auto p-6">
            <div className="space-y-6">
              <Skeleton className="h-8 w-64" />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </div>
      </SessionWrapper>
    );
  }

  return (
    <SessionWrapper>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
        <div className="container mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link href="/technician">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  All Requests
                </h1>
                <p className="text-gray-600 mt-1">View and manage all service requests</p>
              </div>
            </div>
            <Link href="/technician/requests/new">
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                <FileText className="h-4 w-4 mr-2" />
                New Request
              </Button>
            </Link>
          </div>


          {/* Filters */}
          <Card className="mb-6 bg-white/70 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-4">
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
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
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
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Requests Table */}
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Requests ({filteredRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Requester</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request) => (
                      <TableRow key={request.id} className="hover:bg-white/50">
                        <TableCell className="font-medium">
                          #{request.id}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.templateName}</p>
                            <p className="text-sm text-gray-500">
                              {request.templateId}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {request.requesterName || request.formData?.requesterName || 'Unknown'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {request.assignedTechnicianName ? (
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {request.assignedTechnicianName}
                            </div>
                          ) : (
                            <span className="text-gray-400">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`${getStatusColor(request.status)} border-0`}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(request.status)}
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1).replace('-', ' ')}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`${getPriorityColor(request.priority)} border-0`}>
                            {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            <Tag className="h-3 w-3 mr-1" />
                            {request.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Calendar className="h-3 w-3" />
                            {formatDate(request.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {request.dueBy ? (
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Clock className="h-3 w-3" />
                              {formatDate(request.dueBy)}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => window.open(`/technician/requests/${request.id}`, '_blank')}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {filteredRequests.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                      ? 'Try adjusting your search or filters'
                      : 'No requests available at the moment'}
                  </p>
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Debug Info:</strong> Total requests from API: {pagination.total}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, pagination.total)} of {pagination.total} requests
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage <= 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {pagination.pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage >= pagination.pages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </SessionWrapper>
  );
}
