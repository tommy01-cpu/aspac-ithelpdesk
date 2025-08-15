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
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

  useEffect(() => {
    if (session) {
      fetchRequests();
    }
  }, [session, currentPage]);

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
      request.id.toString().includes(searchTerm) ||
      (request.requesterName && request.requesterName.toLowerCase().includes(searchTerm.toLowerCase()));
    
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => router.push('/technician?tab=requests')} 
                  className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    All Requests
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">View and manage all service requests</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchRequests}
                  className="border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button
                  onClick={() => router.push('/technician/requests/new')}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Request
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto p-6 space-y-6">
          {/* Filters */}
          <Card className="bg-white/70 backdrop-blur-sm border-slate-200/60">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search by request ID, template name, or requester..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white/70 border-slate-200 focus:border-slate-400"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32 bg-white/70 border-slate-200">
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
                    <SelectTrigger className="w-32 bg-white/70 border-slate-200">
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

          {/* Requests List */}
          {filteredRequests.length === 0 ? (
            <Card className="bg-white/70 backdrop-blur-sm border-slate-200/60">
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                <p className="text-slate-600 mb-2">No requests found</p>
                <p className="text-sm text-slate-500">
                  {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' 
                    ? 'Try adjusting your filters or search terms'
                    : 'No requests available at the moment'
                  }
                </p>
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Debug Info:</strong> Total requests from API: {pagination.total}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <Card 
                  key={request.id} 
                  className="bg-white/70 backdrop-blur-sm border-slate-200/60 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  onClick={() => router.push(`/technician/requests/${request.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="outline" className="bg-slate-100 text-slate-700">
                            #{request.id}
                          </Badge>
                          <Badge className={`${getStatusColor(request.status)}`} variant="outline">
                            <div className="flex items-center gap-1">
                              {getStatusIcon(request.status)}
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1).replace('-', ' ')}
                            </div>
                          </Badge>
                          <Badge className={`${getPriorityColor(request.priority)}`} variant="outline">
                            {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)}
                          </Badge>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            <Tag className="h-3 w-3 mr-1" />
                            {request.type}
                          </Badge>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">
                          {request.templateName}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-slate-500 mb-2">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            Requester: {request.requesterName || request.formData?.requesterName || 'Unknown'}
                          </div>
                          {request.assignedTechnicianName && (
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              Assigned: {request.assignedTechnicianName}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Created: {new Date(request.createdAt).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Updated: {new Date(request.updatedAt).toLocaleDateString()}
                          </div>
                          {request.dueBy && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-red-500" />
                              <span className="text-red-600 font-medium">
                                Due: {new Date(request.dueBy).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {request.attachments && request.attachments.length > 0 && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              {request.attachments.length} attachment{request.attachments.length !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/technician/requests/${request.id}`);
                          }}
                          className="border-slate-300 text-slate-700 hover:bg-slate-50"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <Card className="bg-white/70 backdrop-blur-sm border-slate-200/60">
              <CardContent className="p-4">
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
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </SessionWrapper>
  );
}
