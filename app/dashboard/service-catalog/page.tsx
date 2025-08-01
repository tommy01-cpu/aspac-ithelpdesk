'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Users, 
  FileText, 
  Calendar,
  ArrowRight,
  Activity
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalRequests: number;
  activeRequests: number;
  resolvedRequests: number;
  overdueRequests: number;
  avgResolutionTime: number;
  satisfaction: number;
  requestsChange: number;
  resolutionChange: number;
}

interface RequestsByCategory {
  category: string;
  count: number;
  color: string;
}

interface RequestsByStatus {
  status: string;
  count: number;
  color: string;
}

interface RequestTrend {
  date: string;
  requests: number;
  resolved: number;
}

export default function ServiceCatalogDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock data
  useEffect(() => {
    const mockStats: DashboardStats = {
      totalRequests: 1247,
      activeRequests: 89,
      resolvedRequests: 1158,
      overdueRequests: 12,
      avgResolutionTime: 4.2,
      satisfaction: 4.6,
      requestsChange: 12.5,
      resolutionChange: -8.3
    };

    setTimeout(() => {
      setStats(mockStats);
      setLoading(false);
    }, 1000);
  }, []);

  const requestsByCategory: RequestsByCategory[] = [
    { category: 'IT Services', count: 542, color: '#8B5CF6' },
    { category: 'HR Services', count: 389, color: '#06B6D4' },
    { category: 'Facilities', count: 234, color: '#10B981' },
    { category: 'Finance', count: 82, color: '#F59E0B' }
  ];

  const requestsByStatus: RequestsByStatus[] = [
    { status: 'Open', count: 45, color: '#3B82F6' },
    { status: 'In Progress', count: 32, color: '#F59E0B' },
    { status: 'On Hold', count: 12, color: '#EF4444' },
    { status: 'Resolved', count: 156, color: '#10B981' },
    { status: 'Closed', count: 289, color: '#6B7280' }
  ];

  const requestTrend: RequestTrend[] = [
    { date: '2024-01-01', requests: 45, resolved: 42 },
    { date: '2024-01-02', requests: 52, resolved: 48 },
    { date: '2024-01-03', requests: 38, resolved: 45 },
    { date: '2024-01-04', requests: 61, resolved: 52 },
    { date: '2024-01-05', requests: 49, resolved: 58 },
    { date: '2024-01-06', requests: 55, resolved: 51 },
    { date: '2024-01-07', requests: 47, resolved: 49 }
  ];

  const recentActivity = [
    { id: 1, type: 'request', message: 'New user account request submitted', time: '2 minutes ago', status: 'new' },
    { id: 2, type: 'approval', message: 'Software installation request approved', time: '15 minutes ago', status: 'approved' },
    { id: 3, type: 'assignment', message: 'Hardware request assigned to John Doe', time: '1 hour ago', status: 'assigned' },
    { id: 4, type: 'resolution', message: 'Email access issue resolved', time: '2 hours ago', status: 'resolved' },
    { id: 5, type: 'escalation', message: 'Server downtime escalated to Level 2', time: '3 hours ago', status: 'escalated' }
  ];

  if (loading || !stats) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2].map(i => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const StatCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    color = "blue",
    suffix = "" 
  }: { 
    title: string; 
    value: number | string; 
    change?: number; 
    icon: any; 
    color?: string;
    suffix?: string;
  }) => (
    <Card className="border-0 bg-white/70 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900">
              {value}{suffix}
            </p>
            {change !== undefined && (
              <div className={`flex items-center text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {change >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                {Math.abs(change)}% from last month
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full bg-${color}-100`}>
            <Icon className={`h-6 w-6 text-${color}-600`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
            Service Catalog Dashboard
          </h1>
          <p className="text-gray-600 mb-6">Monitor and manage your service requests and catalog performance</p>
          
          <div className="flex gap-4">
            <Link href="/service-catalog">
              <Button variant="outline">
                Browse Catalog
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link href="/admin/service-catalog">
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600">
                Manage Catalog
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard
            title="Total Requests"
            value={stats.totalRequests.toLocaleString()}
            change={stats.requestsChange}
            icon={FileText}
            color="blue"
          />
          <StatCard
            title="Active Requests"
            value={stats.activeRequests}
            icon={Clock}
            color="orange"
          />
          <StatCard
            title="Avg Resolution"
            value={stats.avgResolutionTime}
            change={stats.resolutionChange}
            icon={CheckCircle}
            color="green"
            suffix=" hours"
          />
          <StatCard
            title="Satisfaction"
            value={stats.satisfaction}
            icon={Users}
            color="purple"
            suffix="/5.0"
          />
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          {/* Request Trends */}
          <Card className="border-0 bg-white/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Request Trends</CardTitle>
              <CardDescription>Daily request submissions and resolutions</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={requestTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="requests" stroke="#8B5CF6" strokeWidth={2} />
                  <Line type="monotone" dataKey="resolved" stroke="#10B981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Requests by Category */}
          <Card className="border-0 bg-white/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Requests by Category</CardTitle>
              <CardDescription>Distribution of requests across service categories</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={requestsByCategory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Status Distribution */}
          <Card className="border-0 bg-white/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Request Status</CardTitle>
              <CardDescription>Current status distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {requestsByStatus.map((item) => (
                  <div key={item.status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm font-medium">{item.status}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">{item.count}</span>
                      <div className="w-16">
                        <Progress 
                          value={(item.count / requestsByStatus.reduce((sum, s) => sum + s.count, 0)) * 100}
                          className="h-2"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Overdue Requests */}
          <Card className="border-0 bg-white/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Overdue Requests
              </CardTitle>
              <CardDescription>Requests exceeding SLA deadlines</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <div className="text-3xl font-bold text-red-600 mb-2">{stats.overdueRequests}</div>
                <p className="text-sm text-gray-600">Require immediate attention</p>
                <Button size="sm" variant="outline" className="mt-4">
                  View Overdue
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-0 bg-white/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest system activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.slice(0, 4).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{activity.message}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {activity.status}
                    </Badge>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full mt-4">
                  View All Activity
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
