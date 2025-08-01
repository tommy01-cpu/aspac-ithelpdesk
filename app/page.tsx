"use client";

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Search, AlertCircle, Plus, Lightbulb, Bell, Settings, User, Megaphone, ChevronRight, TrendingUp, Clock, CheckCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SessionWrapper } from '@/components/session-wrapper';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [imgError, setImgError] = useState(false);
  const [requestStats, setRequestStats] = useState([
    { 
      title: 'Need Clarification', 
      count: 0, 
      color: 'bg-slate-50 text-slate-700 border-slate-200',
      textColor: 'text-slate-600',
      icon: Clock,
      trend: '+0%'
    },
    { 
      title: 'In Progress', 
      count: 0, 
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      textColor: 'text-blue-600',
      icon: TrendingUp,
      trend: '+0%'
    },
    { 
      title: 'Awaiting Approval', 
      count: 0, 
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      textColor: 'text-amber-600',
      icon: Clock,
      trend: '+0%'
    },
    { 
      title: 'Completed', 
      count: 0, 
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      textColor: 'text-emerald-600',
      icon: CheckCircle,
      trend: '+0%'
    }
  ]);

  // Fetch real request stats when user is logged in
  useEffect(() => {
    if (session?.user) {
      fetchRequestStats();
    }
  }, [session]);

  const fetchRequestStats = async () => {
    try {
      const response = await fetch('/api/requests');
      if (response.ok) {
        const data = await response.json();
        const requests = data.requests || [];
        
        // Count requests by status
        const statusCounts = {
          'need_clarification': 0,
          'in_progress': 0,
          'pending_approval': 0,
          'for_approval': 0,
          'awaiting_approval': 0,
          'completed': 0
        };
        
        requests.forEach((request: any) => {
          const status = request.status.toLowerCase();
          if (statusCounts.hasOwnProperty(status)) {
            statusCounts[status as keyof typeof statusCounts]++;
          }
        });
        
        setRequestStats([
          { 
            title: 'Need Clarification', 
            count: statusCounts.need_clarification, 
            color: 'bg-slate-50 text-slate-700 border-slate-200',
            textColor: 'text-slate-600',
            icon: Clock,
            trend: '+0%'
          },
          { 
            title: 'In Progress', 
            count: statusCounts.in_progress, 
            color: 'bg-blue-50 text-blue-700 border-blue-200',
            textColor: 'text-blue-600',
            icon: TrendingUp,
            trend: '+0%'
          },
          { 
            title: 'Awaiting Approval', 
            count: statusCounts.pending_approval + statusCounts.for_approval + statusCounts.awaiting_approval, 
            color: 'bg-amber-50 text-amber-700 border-amber-200',
            textColor: 'text-amber-600',
            icon: Clock,
            trend: '+0%'
          },
          { 
            title: 'Completed', 
            count: statusCounts.completed, 
            color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            textColor: 'text-emerald-600',
            icon: CheckCircle,
            trend: '+0%'
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching request stats:', error);
    }
  };

  const quickActions = [
    {
      title: 'Request Incident',
      description: 'Submit a technical problem or bug report',
      icon: AlertCircle,
      color: 'from-red-500 to-rose-600',
      bgColor: 'bg-red-500/10 hover:bg-red-500/20',
      iconColor: 'text-red-600',
      action: () => router.push('/users?tab=incident')
    },
    {
      title: 'Request a Service',
      description: 'Request new software, hardware, or access',
      icon: Plus,
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'bg-blue-500/10 hover:bg-blue-500/20',
      iconColor: 'text-blue-600',
      action: () => router.push('/users?tab=service')
    },
   
  ];

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <SessionWrapper>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        {/* Modern Header */}
      

        {/* Modern Hero Section */}
        <section className="relative overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: "url('https://images.pexels.com/photos/416320/pexels-photo-416320.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')"
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-indigo-900/60" />
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center mb-12">
              <h2 className="text-5xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
                How can we
                <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent"> help </span>
                you?
              </h2>
              <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
                Welcome back, {session?.user?.name}! Get instant support, submit requests, and find solutions in our comprehensive help center
              </p>
              
              {/* Modern Search Bar */}
              <div className="max-w-2xl mx-auto relative mb-12">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search for solutions, templates, or submit a request..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-16 pl-6 pr-16 text-lg bg-white/95 backdrop-blur-sm border-0 shadow-2xl focus:shadow-3xl transition-all duration-300 rounded-2xl placeholder:text-slate-400"
                  />
                  <Button 
                    size="icon" 
                    className="absolute right-2 top-2 h-12 w-12 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-xl shadow-lg"
                  >
                    <Search className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex justify-center">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                  {quickActions.map((action, index) => (
                    <Card 
                      key={index} 
                      className="bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/20 transition-all duration-300 cursor-pointer group"
                      onClick={action.action}
                    >
                    <CardContent className="p-6">
                      <div className={`w-12 h-12 ${action.bgColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                        <action.icon className={`h-6 w-6 ${action.iconColor}`} />
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">{action.title}</h3>
                      <p className="text-slate-300 text-sm mb-4">{action.description}</p>
                      <div className="flex items-center text-indigo-300 text-sm font-medium">
                        Get started
                        <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform duration-300" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Modern Dashboard */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Request Summary */}
            <div className="lg:col-span-2">
              <Card className="bg-white/60 backdrop-blur-xl border-slate-200/60 shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold text-slate-900 flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                      <TrendingUp className="h-4 w-4 text-white" />
                    </div>
                    Request Overview
                  </CardTitle>
                  <p className="text-slate-600">Track your support requests and their current status</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {requestStats.map((stat, index) => (
                      <div key={index} className={`p-6 rounded-2xl border ${stat.color} hover:scale-105 transition-all duration-300 cursor-pointer group`}>
                        <div className="flex items-center justify-between mb-3">
                          <stat.icon className={`h-5 w-5 ${stat.textColor}`} />
                          <Badge variant="secondary" className="text-xs">
                            {stat.trend}
                          </Badge>
                        </div>
                        <div className="text-3xl font-bold mb-2" style={{ color: stat.textColor }}>
                          {stat.count}
                        </div>
                        <div className="text-sm font-medium text-slate-600 leading-tight">
                          {stat.title}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* Announcements */}
              <Card className="bg-white/60 backdrop-blur-xl border-slate-200/60 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl font-bold text-slate-900">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                      <Bell className="h-4 w-4 text-white" />
                    </div>
                    Announcements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Megaphone className="h-8 w-8 text-slate-400" />
                    </div>
                    <p className="text-slate-600 font-medium">All caught up!</p>
                    <p className="text-sm text-slate-500 mt-1">No new announcements today</p>
                  </div>
                </CardContent>
              </Card>

              {/* Daily Inspiration */}
              <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200/60 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-slate-900 flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                      <Lightbulb className="h-4 w-4 text-white" />
                    </div>
                    Daily Inspiration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <blockquote className="text-slate-700 italic mb-4 leading-relaxed font-medium">
                    "The heart is deceitful above all things, and desperately sick; who can understand it? I the LORD search the heart and test the mind, to give every man according to his ways, according to the fruit of his deeds."
                  </blockquote>
                  <cite className="text-sm font-semibold">
                    <a href="#" className="text-indigo-600 hover:text-indigo-700 transition-colors">
                      Jeremiah 17:9-10
                    </a>
                  </cite>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </SessionWrapper>
  );
}