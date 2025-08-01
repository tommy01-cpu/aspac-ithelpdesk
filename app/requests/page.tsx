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

interface Request {
  id: string;
  requestNumber: string;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'REJECTED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requestType: 'SERVICE' | 'INCIDENT' | 'CHANGE';
  category: string;
  subCategory?: string;
  requester: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  resolutionDate?: string;
  template?: {
    name: string;
    icon: string;
  };
  sla?: {
    name: string;
    responseTime: number;
    resolutionTime: number;
  };
}

const mockRequests: Request[] = [
  {
    id: '1',
    requestNumber: 'REQ-2024-001',
    subject: 'New User Account Request',
    description: 'Request for new user account for John Smith in Marketing department',
    status: 'OPEN',
    priority: 'MEDIUM',
    requestType: 'SERVICE',
    category: 'IT Services',
    subCategory: 'User Management',
    requester: 'John Doe',
    assignedTo: 'IT Support',
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-01-15T09:30:00Z',
    dueDate: '2024-01-17T17:00:00Z',
    template: {
      name: 'New User Account Request',
      icon: '👤'
    },
    sla: {
      name: 'Standard',
      responseTime: 60,
      resolutionTime: 480
    }
  },
  {
    id: '2',
    requestNumber: 'REQ-2024-002',
    subject: 'Laptop Hardware Issue',
    description: 'Laptop screen flickering and performance issues',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    requestType: 'INCIDENT',
    category: 'Hardware',
    subCategory: 'Laptop',
    requester: 'John Doe',
    assignedTo: 'Hardware Team',
    createdAt: '2024-01-14T14:30:00Z',
    updatedAt: '2024-01-15T11:00:00Z',
    dueDate: '2024-01-16T14:30:00Z'
  },
  {
    id: '3',
    requestNumber: 'REQ-2024-003',
    subject: 'Software Installation Request',
    description: 'Install Adobe Creative Suite for design work',
    status: 'RESOLVED',
    priority: 'LOW',
    requestType: 'SERVICE',
    category: 'Software',
    subCategory: 'Installation',
    requester: 'John Doe',
    assignedTo: 'Software Team',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-12T16:00:00Z',
    dueDate: '2024-01-12T10:00:00Z',
    resolutionDate: '2024-01-12T15:45:00Z'
  },
  {
    id: '4',
    requestNumber: 'REQ-2024-004',
    subject: 'Email Access Issue',
    description: 'Cannot access email account, receiving authentication errors',
    status: 'CLOSED',
    priority: 'MEDIUM',
    requestType: 'INCIDENT',
    category: 'Email',
    requester: 'John Doe',
    assignedTo: 'Email Team',
    createdAt: '2024-01-08T08:15:00Z',
    updatedAt: '2024-01-09T17:30:00Z',
    resolutionDate: '2024-01-09T17:00:00Z'
  },

];

const getStatusIcon = (status: string) => {
  switch (status) {
   
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

export default function RequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setRequests(mockRequests);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.requestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || request.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || request.priority === priorityFilter;
    const matchesType = typeFilter === 'ALL' || request.requestType === typeFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesType;
  });

  const getRequestStats = () => {
    const total = requests.length;
    const open = requests.filter(r => r.status === 'OPEN').length;
    const inProgress = requests.filter(r => r.status === 'IN_PROGRESS').length;
    const resolved = requests.filter(r => r.status === 'RESOLVED').length;

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
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  My Requests
                </h1>
                <p className="text-gray-600 mt-1">Track and manage all your service requests</p>
              </div>
            </div>
            <Link href="/requests/new">
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                <FileText className="h-4 w-4 mr-2" />
                New Request
              </Button>
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Requests</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <FileText className="h-8 w-8 text-gray-500" />
                </div>
              </CardContent>
            </Card>


            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Open</p>
                    <p className="text-2xl font-bold text-blue-700">{stats.open}</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-600">In Progress</p>
                    <p className="text-2xl font-bold text-yellow-700">{stats.inProgress}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Resolved</p>
                    <p className="text-2xl font-bold text-green-700">{stats.resolved}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
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
                      <SelectItem value="ALL">All Status</SelectItem>
                      <SelectItem value="OPEN">Open</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="RESOLVED">Resolved</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-32 bg-white/50">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Priority</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-32 bg-white/50">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Types</SelectItem>
                      <SelectItem value="SERVICE">Service</SelectItem>
                      <SelectItem value="INCIDENT">Incident</SelectItem>
                      <SelectItem value="CHANGE">Change</SelectItem>
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
                      <TableHead>Request #</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request) => (
                      <TableRow key={request.id} className="hover:bg-white/50">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {request.template?.icon && (
                              <span className="text-lg">{request.template.icon}</span>
                            )}
                            {request.requestNumber}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.subject}</p>
                            <p className="text-sm text-gray-500 truncate max-w-xs">
                              {request.description}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`${getStatusColor(request.status)} border-0`}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(request.status)}
                              {request.status.replace('_', ' ')}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`${getPriorityColor(request.priority)} border-0`}>
                            {request.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {request.requestType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{request.category}</p>
                            {request.subCategory && (
                              <p className="text-xs text-gray-500">{request.subCategory}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Calendar className="h-3 w-3" />
                            {formatDate(request.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {request.dueDate ? (
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Clock className="h-3 w-3" />
                              {formatDate(request.dueDate)}
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
                              <DropdownMenuItem>
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
                    {searchTerm || statusFilter !== 'ALL' || priorityFilter !== 'ALL' || typeFilter !== 'ALL'
                      ? 'Try adjusting your search or filters'
                      : 'You haven\'t created any requests yet'}
                  </p>
                  <Link href="/requests/new">
                    <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                      Create Your First Request
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </SessionWrapper>
  );
}
