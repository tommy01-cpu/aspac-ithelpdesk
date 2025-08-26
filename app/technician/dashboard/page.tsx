"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  FileText, 
  Clock, 
  AlertCircle, 
  CheckCircle,
  Users,
  Calendar,
  Plus,
  BarChart3,
  RefreshCw,
  Search,
  Filter,
  UserCheck,
  Settings,
  ArrowRight,
  MoreHorizontal,
  Timer,
  TrendingUp,
  Eye,
  Edit,
  UserPlus
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalRequests: number;
  pendingRequests: number;
  overdueRequests: number;
  resolvedToday: number;
  myAssignedRequests: number;
  needClarification: number;
  avgResolutionTime?: number;
  slaCompliance?: number;
}

interface TechnicianStats {
  name: string;
  id?: number;
  onHold: number;
  open: number;
  overdue: number;
  totalAssigned?: number;
}

interface RecentRequest {
  id: number;
  title: string;
  subject: string;
  requester: string;
  status: string;
  priority: string;
  createdAt: string;
  assignedTo?: string;
  category?: string;
  dueDate?: string;
  slaStatus?: 'on-time' | 'at-risk' | 'overdue';
}

interface QuickAssignRequest {
  id: number;
  title: string;
  priority: string;
  category: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [technicianStats, setTechnicianStats] = useState<TechnicianStats[]>([]);
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);
  const [unassignedRequests, setUnassignedRequests] = useState<QuickAssignRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showQuickAssign, setShowQuickAssign] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh functionality
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchDashboardData(true);
      }, 30000); // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setRefreshing(silent);
      
      // Fetch dashboard statistics
      const [statsRes, techStatsRes, recentRes, unassignedRes] = await Promise.all([
        fetch('/api/technician/dashboard/stats'),
        fetch('/api/technician/dashboard/technician-stats'),
        fetch('/api/technician/dashboard/recent-requests'),
        fetch('/api/technician/dashboard/unassigned-requests')
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (techStatsRes.ok) {
        const techData = await techStatsRes.json();
        setTechnicianStats(Array.isArray(techData) ? techData : []);
      } else {
        setTechnicianStats([]);
      }

      if (recentRes.ok) {
        const recentData = await recentRes.json();
        setRecentRequests(recentData);
      }

      if (unassignedRes.ok) {
        const unassignedData = await unassignedRes.json();
        setUnassignedRequests(unassignedData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Quick assignment function
  const quickAssignRequest = async (requestId: number, technicianId: number) => {
    try {
      const response = await fetch(`/api/requests/${requestId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ technicianId }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Request assigned successfully",
        });
        fetchDashboardData(true);
      } else {
        throw new Error('Failed to assign request');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign request",
        variant: "destructive",
      });
    }
  };

  // Bulk action functions
  const handleBulkStatusUpdate = async (status: string) => {
    if (selectedRequests.length === 0) return;

    try {
      const response = await fetch('/api/requests/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestIds: selectedRequests,
          updates: { status },
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `${selectedRequests.length} requests updated`,
        });
        setSelectedRequests([]);
        fetchDashboardData(true);
      } else {
        throw new Error('Failed to update requests');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update requests",
        variant: "destructive",
      });
    }
  };

  const handleBulkAssignment = async (technicianId: number) => {
    if (selectedRequests.length === 0) return;

    try {
      const response = await fetch('/api/requests/bulk-assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestIds: selectedRequests,
          technicianId,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `${selectedRequests.length} requests assigned`,
        });
        setSelectedRequests([]);
        fetchDashboardData(true);
      } else {
        throw new Error('Failed to assign requests');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign requests",
        variant: "destructive",
      });
    }
  };

  // Filter functions
  const filteredRequests = recentRequests.filter(request => {
    const matchesSearch = request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.requester.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || request.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Navigation functions for My Summary and Technician stats
  const navigateToRequests = (filter: string) => {
    const params = new URLSearchParams();
    
    switch (filter) {
      case 'clarification':
        params.set('status', 'on_hold');
        params.set('assignedToCurrentUser', 'true');
        break;
      case 'overdue':
        params.set('filter', 'overdue');
        params.set('assignedToCurrentUser', 'true');
        break;
      case 'due-today':
        params.set('filter', 'due-today');
        params.set('assignedToCurrentUser', 'true');
        break;
      case 'pending':
        params.set('status', 'open');
        params.set('assignedToCurrentUser', 'true');
        break;
      case 'my-assigned':
        params.set('assignedToCurrentUser', 'true');
        params.set('status', 'on_hold,open'); // Show both on_hold and open requests
        break;
    }
    
    window.location.href = `/technician/requests?${params.toString()}`;
  };

  const navigateToTechnicianRequests = (technicianId: number | string, technicianName: string, status?: string) => {
    const params = new URLSearchParams();
    
    if (technicianName === 'View All') {
      // Just go to technician requests page without filters
      window.location.href = '/technician/requests';
      return;
    }
    
    if (technicianName !== 'Total' && technicianName !== 'Unassigned') {
      if (technicianName === 'Others') {
        params.set('assignedTechnicianId', 'others');
        params.set('technicianName', 'Others');
      } else {
        params.set('assignedTechnicianId', technicianId.toString());
        params.set('technicianName', technicianName);
      }
    } else if (technicianName === 'Unassigned') {
      params.set('assignedTechnicianId', 'unassigned');
      params.set('technicianName', 'Unassigned');
    }
    
    if (status) {
      params.set('status', status);
    }
    
    window.location.href = `/technician/requests?${params.toString()}`;
  };

  // Navigate to current user's assigned requests (on_hold + open)
  const navigateToMyAssignedRequests = () => {
    const params = new URLSearchParams();
    params.set('assignedToCurrentUser', 'true'); // Use a flag for current user
    params.set('status', 'on_hold,open'); // Multiple statuses
    window.location.href = `/technician/requests?${params.toString()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'top': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!session) {
    return <div>Please log in to view the dashboard.</div>;
  }

  return (
    <div className="p-4 space-y-4">
      {/* Enhanced Header with Quick Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-600">Welcome back, {session.user.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Auto-refresh toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`h-7 text-xs ${autoRefresh ? 'bg-green-50 text-green-700' : ''}`}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>

          {/* Manual refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="h-7 text-xs"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {/* Quick assign unassigned requests */}
          {unassignedRequests.length > 0 && (
            <Dialog open={showQuickAssign} onOpenChange={setShowQuickAssign}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs text-orange-600">
                  <UserPlus className="h-3 w-3 mr-1" />
                  Assign ({unassignedRequests.length})
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Quick Assign Unassigned Requests</DialogTitle>
                  <DialogDescription>
                    There are {unassignedRequests.length} unassigned requests that need attention.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {unassignedRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{request.title}</p>
                        <p className="text-xs text-gray-500">
                          {request.category} • {request.priority} • {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Select onValueChange={(value) => quickAssignRequest(request.id, parseInt(value))}>
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue placeholder="Assign" />
                        </SelectTrigger>
                        <SelectContent>
                          {technicianStats.map((tech) => (
                            <SelectItem key={tech.name} value={tech.id?.toString() || '0'} className="text-xs">
                              {tech.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          )}

          <Link href="/requests/new">
            <Button className="bg-blue-600 hover:bg-blue-700 text-xs px-3 py-1 h-7">
              <Plus className="h-3 w-3 mr-1" />
              New Request
            </Button>
          </Link>
        </div>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">Need Clarification</CardTitle>
            <AlertCircle className="h-3 w-3 text-blue-600" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-lg font-bold text-blue-600">
              {stats?.needClarification || 1}
            </div>
            <p className="text-xs text-gray-500">Waiting for response</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">Requests Overdue</CardTitle>
            <Clock className="h-3 w-3 text-red-600" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-lg font-bold text-red-600">
              {stats?.overdueRequests || 0}
            </div>
            <p className="text-xs text-gray-500">Past SLA deadline</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">Due Today</CardTitle>
            <Calendar className="h-3 w-3 text-orange-600" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-lg font-bold text-orange-600">
              {stats?.resolvedToday || 0}
            </div>
            <p className="text-xs text-gray-500">Need attention today</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateToRequests('my-assigned')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">My Assigned</CardTitle>
            <UserCheck className="h-3 w-3 text-blue-600" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-lg font-bold text-blue-600">
              {stats?.myAssignedRequests || 0}
            </div>
            <p className="text-xs text-gray-500">Assigned to me (on-hold + open)</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">Avg Resolution</CardTitle>
            <Timer className="h-3 w-3 text-green-600" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-lg font-bold text-green-600">
              {stats?.avgResolutionTime ? `${stats.avgResolutionTime}h` : '-'}
            </div>
            <p className="text-xs text-gray-500">Average time</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">SLA Compliance</CardTitle>
            <TrendingUp className="h-3 w-3 text-green-600" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-lg font-bold text-green-600">
              {stats?.slaCompliance ? `${stats.slaCompliance}%` : '-'}
            </div>
            <p className="text-xs text-gray-500">On-time completion</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-3">
        <TabsList className="grid w-full grid-cols-4 h-8">
          <TabsTrigger value="overview" className="text-xs px-2">My View</TabsTrigger>
          <TabsTrigger value="scheduler" className="text-xs px-2">Scheduler</TabsTrigger>
          <TabsTrigger value="backup" className="text-xs px-2">Backup Approver</TabsTrigger>
          <TabsTrigger value="resource" className="text-xs px-2">Resource Management</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* My Summary */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">My Summary</CardTitle>
                  <BarChart3 className="h-4 w-4 text-gray-500" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div 
                    className="flex items-center justify-between p-2 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer transition-colors"
                    onClick={() => navigateToRequests('clarification')}
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-3 w-3 text-blue-600" />
                      <span className="text-xs">Need Clarification</span>
                    </div>
                    <span className="font-semibold text-blue-600 text-xs">
                      {stats?.needClarification || 0}
                    </span>
                  </div>
                  
                  <div 
                    className="flex items-center justify-between p-2 bg-red-50 rounded-lg hover:bg-red-100 cursor-pointer transition-colors"
                    onClick={() => navigateToRequests('overdue')}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-red-600" />
                      <span className="text-xs">Requests Overdue</span>
                    </div>
                    <span className="font-semibold text-red-600 text-xs">
                      {stats?.overdueRequests || 0}
                    </span>
                  </div>
                  
                  <div 
                    className="flex items-center justify-between p-2 bg-orange-50 rounded-lg hover:bg-orange-100 cursor-pointer transition-colors"
                    onClick={() => navigateToRequests('due-today')}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-orange-600" />
                      <span className="text-xs">Requests Due Today</span>
                    </div>
                    <span className="font-semibold text-orange-600 text-xs">
                      {stats?.resolvedToday || 0}
                    </span>
                  </div>
                  
                  <div 
                    className="flex items-center justify-between p-2 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer transition-colors"
                    onClick={() => navigateToRequests('my-assigned')}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-3 w-3 text-blue-600" />
                      <span className="text-xs">My Assigned Requests</span>
                    </div>
                    <span className="font-semibold text-blue-600 text-xs">
                      {stats?.myAssignedRequests || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            

             {/* Requests by Technician */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Requests by Technician</CardTitle>
                <Select defaultValue="all">
                  <SelectTrigger className="w-36 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Technicians</SelectItem>
                    <SelectItem value="assigned" className="text-xs">Assigned Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1 text-xs">Technician</th>
                      <th className="text-center py-1 text-xs">On-Hold</th>
                      <th className="text-center py-1 text-xs">Open</th>
                      <th className="text-center py-1 text-xs">OverDue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {technicianStats.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-4 text-xs text-gray-500">
                          No technician data available
                        </td>
                      </tr>
                    ) : (
                      technicianStats.map((tech, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="py-1 text-xs">{tech.name}</td>
                          <td 
                            className="text-center py-1 text-orange-600 font-medium text-xs cursor-pointer hover:underline"
                            onClick={() => navigateToTechnicianRequests(tech.id || 0, tech.name, 'on_hold')}
                          >
                            {tech.onHold}
                          </td>
                          <td 
                            className="text-center py-1 text-blue-600 font-medium text-xs cursor-pointer hover:underline"
                            onClick={() => navigateToTechnicianRequests(tech.id || 0, tech.name, 'open')}
                          >
                            {tech.open}
                          </td>
                          <td 
                            className="text-center py-1 text-red-600 font-medium text-xs cursor-pointer hover:underline"
                            onClick={() => navigateToTechnicianRequests(tech.id || 0, tech.name, 'overdue')}
                          >
                            {tech.overdue}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 flex justify-between items-center">
                <button
                  onClick={() => navigateToTechnicianRequests(0, 'View All')}
                  className="text-blue-600 hover:underline text-xs cursor-pointer"
                >
                  View All
                </button>
                <span className="text-xs text-gray-500">
                  {technicianStats.length > 0 ? `${technicianStats.length} technicians` : 'No data'}
                </span>
              </div>
            </CardContent>
          </Card>
          </div>

         {/* Enhanced My Tasks with Recent Requests */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Recent Requests ({filteredRequests.length})</CardTitle>
                  <div className="flex items-center gap-2">
                    {/* Search and Filter */}
                    <div className="relative">
                      <Search className="absolute left-2 top-1.5 h-3 w-3 text-gray-400" />
                      <Input
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-7 w-32 pl-7 text-xs"
                      />
                    </div>
                    
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-7 w-20 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-xs">All Status</SelectItem>
                        <SelectItem value="open" className="text-xs">Open</SelectItem>
                        <SelectItem value="in-progress" className="text-xs">In Progress</SelectItem>
                        <SelectItem value="on_hold" className="text-xs">On Hold</SelectItem>
                        <SelectItem value="resolved" className="text-xs">Resolved</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger className="h-7 w-20 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-xs">All Priority</SelectItem>
                        <SelectItem value="high" className="text-xs">High</SelectItem>
                        <SelectItem value="medium" className="text-xs">Medium</SelectItem>
                        <SelectItem value="low" className="text-xs">Low</SelectItem>
                        <SelectItem value="top" className="text-xs">Top</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Bulk Actions */}
                {selectedRequests.length > 0 && (
                  <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 rounded-lg">
                    <span className="text-xs text-blue-700">
                      {selectedRequests.length} selected
                    </span>
                    <div className="flex items-center gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-6 text-xs">
                            Bulk Status
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleBulkStatusUpdate('in-progress')}>
                            Mark In Progress
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBulkStatusUpdate('on_hold')}>
                            Mark On Hold
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBulkStatusUpdate('resolved')}>
                            Mark Resolved
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-6 text-xs">
                            Bulk Assign
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {technicianStats.map((tech) => (
                            <DropdownMenuItem
                              key={tech.name}
                              onClick={() => handleBulkAssignment(tech.id || 0)}
                            >
                              {tech.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedRequests([])}
                        className="h-6 text-xs"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                {filteredRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-4 text-gray-500">
                    <FileText className="h-8 w-8 mb-2 text-gray-300" />
                    <p className="text-xs">No requests found</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {filteredRequests.map((request) => (
                      <div key={request.id} className="flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50">
                        <Checkbox
                          checked={selectedRequests.includes(request.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedRequests([...selectedRequests, request.id]);
                            } else {
                              setSelectedRequests(selectedRequests.filter(id => id !== request.id));
                            }
                          }}
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Link href={`/requests/view/${request.id}`} className="text-xs font-medium text-blue-600 hover:underline truncate">
                              #{request.id} - {request.title}
                            </Link>
                            <Badge className={`text-xs px-1 py-0 ${getStatusColor(request.status)}`}>
                              {request.status}
                            </Badge>
                            <Badge className={`text-xs px-1 py-0 ${getPriorityColor(request.priority)}`}>
                              {request.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500">
                            {request.requester} • {request.category} • {new Date(request.createdAt).toLocaleDateString()}
                          </p>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/requests/view/${request.id}`} className="flex items-center">
                                <Eye className="h-3 w-3 mr-2" />
                                View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/requests/edit/${request.id}`} className="flex items-center">
                                <Edit className="h-3 w-3 mr-2" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleBulkStatusUpdate('in-progress')}>
                              Mark In Progress
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBulkStatusUpdate('resolved')}>
                              Mark Resolved
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="mt-2 flex justify-between items-center">
                  <Link href="/requests" className="text-blue-600 hover:underline text-xs">
                    View All Requests
                  </Link>
                  <Link href="/requests/assigned-to-me" className="text-blue-600 hover:underline text-xs">
                    My Assigned Requests
                  </Link>
                </div>
              </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="scheduler">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Scheduler</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-gray-500 text-xs">Scheduler view content will be implemented here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Backup Approver</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-gray-500 text-xs">Backup approver view content will be implemented here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resource">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Resource Management</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-gray-500 text-xs">Resource management view content will be implemented here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
