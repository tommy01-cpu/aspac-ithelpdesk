"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  FileText, 
  Clock, 
  AlertCircle, 
  CheckCircle,
  Users,
  Calendar,
  Plus,
  BarChart3
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalRequests: number;
  pendingRequests: number;
  overdueRequests: number;
  resolvedToday: number;
  myAssignedRequests: number;
  needClarification: number;
}

interface TechnicianStats {
  name: string;
  onHold: number;
  open: number;
  overdue: number;
}

interface RecentRequest {
  id: number;
  subject: string;
  requester: string;
  status: string;
  priority: string;
  createdAt: string;
  assignedTo?: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [technicianStats, setTechnicianStats] = useState<TechnicianStats[]>([]);
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard statistics
      const [statsRes, techStatsRes, recentRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/dashboard/technician-stats'),
        fetch('/api/dashboard/recent-requests')
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (techStatsRes.ok) {
        const techData = await techStatsRes.json();
        setTechnicianStats(techData);
      }

      if (recentRes.ok) {
        const recentData = await recentRes.json();
        setRecentRequests(recentData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'on-hold': return 'bg-yellow-100 text-yellow-800';
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-600">Welcome back, {session.user.name}</p>
        </div>
        <Link href="/requests/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-xs px-3 py-1 h-7">
            <Plus className="h-3 w-3 mr-1" />
            New Request
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">Need Clarification</CardTitle>
            <AlertCircle className="h-3 w-3 text-blue-600" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-lg font-bold text-blue-600">
              {stats?.needClarification || 1}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">Requests Overdue</CardTitle>
            <Clock className="h-3 w-3 text-red-600" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-lg font-bold text-red-600">
              {stats?.overdueRequests || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">Requests Due Today</CardTitle>
            <Calendar className="h-3 w-3 text-orange-600" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-lg font-bold text-orange-600">
              {stats?.resolvedToday || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">Pending Requests</CardTitle>
            <FileText className="h-3 w-3 text-blue-600" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-lg font-bold text-blue-600">
              {stats?.pendingRequests || 5}
            </div>
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
                  <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-3 w-3 text-blue-600" />
                      <span className="text-xs">Need Clarification</span>
                    </div>
                    <span className="font-semibold text-blue-600 text-xs">1</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-gray-600" />
                      <span className="text-xs">Requests Overdue</span>
                    </div>
                    <span className="font-semibold text-gray-600 text-xs">0</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-gray-600" />
                      <span className="text-xs">Requests Due Today</span>
                    </div>
                    <span className="font-semibold text-gray-600 text-xs">0</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3 w-3 text-blue-600" />
                      <span className="text-xs">Pending Requests</span>
                    </div>
                    <span className="font-semibold text-blue-600 text-xs">5</span>
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
                      <th className="text-center py-1 text-xs">On-hold</th>
                      <th className="text-center py-1 text-xs">Open</th>
                      <th className="text-center py-1 text-xs">OverDue</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-1 text-xs">Olle L. Del Rosario</td>
                      <td className="text-center py-1 text-red-600 font-medium text-xs">26</td>
                      <td className="text-center py-1 text-blue-600 font-medium text-xs">1</td>
                      <td className="text-center py-1 text-red-600 font-medium text-xs">2</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-1 text-xs">Jhon Noel B. Sanchez</td>
                      <td className="text-center py-1 text-red-600 font-medium text-xs">5</td>
                      <td className="text-center py-1 text-xs">0</td>
                      <td className="text-center py-1 text-red-600 font-medium text-xs">0</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-1 text-xs">Others</td>
                      <td className="text-center py-1 text-red-600 font-medium text-xs">5</td>
                      <td className="text-center py-1 text-blue-600 font-medium text-xs">3</td>
                      <td className="text-center py-1 text-xs">0</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-1 text-xs">Unassigned</td>
                      <td className="text-center py-1 text-red-600 font-medium text-xs">44</td>
                      <td className="text-center py-1 text-xs">0</td>
                      <td className="text-center py-1 text-xs">0</td>
                    </tr>
                    <tr className="border-b font-bold">
                      <td className="py-1 text-xs">Total</td>
                      <td className="text-center py-1 text-red-600 text-xs">80</td>
                      <td className="text-center py-1 text-blue-600 text-xs">4</td>
                      <td className="text-center py-1 text-red-600 text-xs">2</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-2">
                <Link href="/requests" className="text-blue-600 hover:underline text-xs">
                  View All
                </Link>
              </div>
            </CardContent>
          </Card>
          </div>

         {/* My Tasks */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">My Tasks(0)</CardTitle>
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    Show All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-col items-center justify-center py-4 text-gray-500">
                  <FileText className="h-8 w-8 mb-2 text-gray-300" />
                  <p className="text-xs">There are no tasks in this view</p>
                  <Button variant="ghost" size="sm" className="mt-1 h-7 text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    New Task
                  </Button>
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
