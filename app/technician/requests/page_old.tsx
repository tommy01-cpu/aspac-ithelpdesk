"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  ArrowLeft, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Plus,
  Eye,
  RefreshCw,
  Search,
  Filter,
  FileText,
  Tag,
  Calendar,
  User,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { SessionWrapper } from '@/components/session-wrapper';
import { toast } from '@/hooks/use-toast';
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
  dueBy?: string;
  requesterName?: string;
  requesterEmail?: string;
  assignedTechnicianName?: string;
  assignedTechnicianEmail?: string;
}

interface PaginationData {
  total: number;
  pages: number;
  current: number;
}

export default function TechnicianRequestsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({ total: 0, pages: 0, current: 1 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRequests, setSelectedRequests] = useState<number[]>([]);

  useEffect(() => {
    if (session) {
      fetchRequests();
    }
  }, [session, currentPage]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      // Fetch requests assigned to technician
      const response = await fetch(`/api/technician/requests?page=${currentPage}&limit=10`);
      
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
      request.templateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.id.toString().includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesType = typeFilter === 'all' || request.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
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

  const toggleSelectAll = () => {
    if (selectedRequests.length === filteredRequests.length) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(filteredRequests.map(r => r.id));
    }
  };

  const toggleSelectRequest = (requestId: number) => {
    setSelectedRequests(prev => 
      prev.includes(requestId) 
        ? prev.filter(id => id !== requestId)
        : [...prev, requestId]
    );
  };

  const formatDueDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const isOverdue = date < now;
    
    return (
      <span className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-900'}>
        {date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'open': { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: AlertCircle },
      'in-progress': { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Clock },
      'resolved': { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
      'closed': { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: CheckCircle },
      'on-hold': { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertCircle }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['open'];
    const IconComponent = config.icon;
    
    return (
      <Badge className={`${config.color} border text-xs font-medium`}>
        <IconComponent className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
      </Badge>
    );
  };

  if (loading) {
    return (
      <SessionWrapper>
        <div className="container mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </SessionWrapper>
    );
  }

  return (
    <SessionWrapper>
      <div className="min-h-screen bg-white">
        <div className="bg-white">
          {/* Header */}
          <div className="border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  📋 All Requests 
                  <span className="bg-gray-100 text-gray-600 text-sm px-2 py-1 rounded">
                    {pagination.total}
                  </span>
                </h1>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={fetchRequests}>
                    🔄
                  </Button>
                  <Button variant="ghost" size="sm">
                    ❓
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">My All Tasks</span>
                <span className="bg-gray-100 text-gray-600 text-sm px-2 py-1 rounded">0</span>
                <Button variant="ghost" size="sm">
                  📊
                </Button>
                <Button variant="ghost" size="sm">
                  ⋯
                </Button>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="border-b px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  🔍
                </Button>
                <Button variant="ghost" size="sm">
                  📋
                </Button>
                <Button variant="ghost" size="sm">
                  🔄
                </Button>
                <div className="text-sm text-gray-600">
                  1 - {Math.min(10, pagination.total)} of {pagination.total}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  ‹
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= pagination.pages}
                >
                  ›
                </Button>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Table */}
          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-12 px-4 py-3 text-left">
                      <Checkbox
                        checked={selectedRequests.length === filteredRequests.length && filteredRequests.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Subject</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Requester</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Assigned To</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">DueBy Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        No requests found
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((request) => (
                      <tr 
                        key={request.id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/technician/requests/${request.id}`)}
                      >
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={selectedRequests.includes(request.id)}
                            onCheckedChange={() => toggleSelectRequest(request.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-blue-600">
                          {request.id}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div className="max-w-xs truncate" title={request.templateName}>
                            {request.templateName}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {request.requesterName || request.formData?.requesterName || 'Unknown'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {request.assignedTechnicianName || session?.user?.name || 'You'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {request.dueBy 
                            ? new Date(request.dueBy).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : '-'
                          }
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span 
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              request.status === 'resolved' 
                                ? 'bg-green-100 text-green-800'
                                : request.status === 'open'
                                ? 'bg-blue-100 text-blue-800' 
                                : request.status === 'on-hold'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {request.status === 'on-hold' ? 'On-hold' : 
                             request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(request.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
          {/* Header Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Requests</p>
                    <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Open</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {requests.filter(r => r.status === 'open').length}
                    </p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">In Progress</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {requests.filter(r => r.status === 'in-progress').length}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Resolved</p>
                    <p className="text-2xl font-bold text-green-600">
                      {requests.filter(r => r.status === 'resolved').length}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="bg-white border border-gray-200">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by request ID, subject, or requester..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white border-gray-300 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40 bg-white border-gray-300">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="on-hold">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-40 bg-white border-gray-300">
                      <SelectValue placeholder="All Types" />
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
          <Card className="bg-white border border-gray-200">
            <CardHeader className="border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  All Requests
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({filteredRequests.length} of {pagination.total})
                  </span>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="text-gray-600 border-gray-300">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                  <Button variant="outline" size="sm" className="text-gray-600 border-gray-300">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredRequests.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-2">No requests found</p>
                  <p className="text-sm text-gray-500">
                    {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' 
                      ? 'Try adjusting your filters or search terms'
                      : 'No requests are assigned to you at the moment'
                    }
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow className="border-b border-gray-200">
                      <TableHead className="w-12 pl-6">
                        <Checkbox
                          checked={selectedRequests.length === filteredRequests.length && filteredRequests.length > 0}
                          onCheckedChange={toggleSelectAll}
                          className="border-gray-300"
                        />
                      </TableHead>
                      <TableHead className="text-gray-700 font-medium">ID</TableHead>
                      <TableHead className="text-gray-700 font-medium">Subject</TableHead>
                      <TableHead className="text-gray-700 font-medium">Requester</TableHead>
                      <TableHead className="text-gray-700 font-medium">Assigned To</TableHead>
                      <TableHead className="text-gray-700 font-medium">Due By Date</TableHead>
                      <TableHead className="text-gray-700 font-medium">Status</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request) => (
                      <TableRow 
                        key={request.id} 
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/technician/requests/${request.id}`)}
                      >
                        <TableCell className="pl-6">
                          <Checkbox
                            checked={selectedRequests.includes(request.id)}
                            onCheckedChange={() => toggleSelectRequest(request.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="border-gray-300"
                          />
                        </TableCell>
                        <TableCell className="font-medium text-blue-600">
                          {request.id}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div>
                              <p className="font-medium text-gray-900">{request.templateName}</p>
                              <p className="text-sm text-gray-500">{request.type}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">
                              {request.requesterName || request.formData?.requesterName || 'Unknown'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {request.requesterEmail || request.formData?.requesterEmail || 'No email'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">
                              {request.assignedTechnicianName || session?.user?.name || 'You'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {request.assignedTechnicianEmail || session?.user?.email || ''}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatDueDate(request.dueBy)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(request.status)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/technician/requests/${request.id}`);
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <Card className="bg-white border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, pagination.total)} of {pagination.total} requests
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {pagination.pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= pagination.pages}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
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
