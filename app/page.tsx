"use client";

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Search, AlertCircle, Plus, Lightbulb, Bell, Settings, User, Megaphone, ChevronRight, TrendingUp, Clock, CheckCircle, LogOut, CheckSquare } from 'lucide-react';
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
  const [approvalCount, setApprovalCount] = useState(0);
  const [verseOfTheDay, setVerseOfTheDay] = useState({
    text: "The heart is deceitful above all things, and desperately sick; who can understand it? I the LORD search the heart and test the mind, to give every man according to his ways, according to the fruit of his deeds.",
    reference: "Jeremiah 17:9-10",
    loading: true
  });
  const [requestStats, setRequestStats] = useState([
    { 
      title: 'For Approval', 
      count: 0, 
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      textColor: 'text-blue-600',
      icon: TrendingUp,
      trend: '+0%'
    },
    { 
      title: 'For Clarification', 
      count: 0, 
      color: 'bg-slate-50 text-slate-700 border-slate-200',
      textColor: 'text-slate-600',
      icon: Clock,
      trend: '+0%'
    },
    { 
      title: 'Open', 
      count: 0, 
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      textColor: 'text-amber-600',
      icon: Clock,
      trend: '+0%'
    },
    { 
      title: 'On Hold', 
      count: 0, 
      color: 'bg-orange-50 text-orange-700 border-orange-200',
      textColor: 'text-orange-600',
      icon: CheckCircle,
      trend: '+0%'
    },
    { 
      title: 'Resolved', 
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
      fetchApprovalCount();
    }
    fetchVerseOfTheDay();
  }, [session]);

  const fetchVerseOfTheDay = async () => {
    try {
      // Using Bible API to get verse of the day
      const response = await fetch('https://beta.ourmanna.com/api/v1/get/?format=json');
      if (response.ok) {
        const data = await response.json();
        setVerseOfTheDay({
          text: data.verse.details.text,
          reference: data.verse.details.reference,
          loading: false
        });
      } else {
        // Fallback to another API if first one fails
        const fallbackResponse = await fetch('https://labs.bible.org/api/?passage=votd&type=json');
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          setVerseOfTheDay({
            text: fallbackData[0].text.replace(/<[^>]*>/g, ''), // Remove HTML tags
            reference: `${fallbackData[0].bookname} ${fallbackData[0].chapter}:${fallbackData[0].verse}`,
            loading: false
          });
        }
      }
    } catch (error) {
      console.error('Error fetching verse of the day:', error);
      // Keep the default verse if API fails
      setVerseOfTheDay(prev => ({ ...prev, loading: false }));
    }
  };

  const fetchRequestStats = async () => {
    try {
      console.log('🚀 Fetching request counts...');
      const response = await fetch('/api/requests/count');
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Full API response:', data);
        const counts = data.counts || {};
        
        console.log('📊 Dashboard counts from count API:', counts);
        
        // Update stats using the counts from the count API
        setRequestStats([
          { 
            title: 'For Approval', 
            count: counts.forApproval || 0, 
            color: 'bg-blue-50 text-blue-700 border-blue-200',
            textColor: 'text-blue-600',
            icon: TrendingUp,
            trend: '+0%'
          },
          { 
            title: 'For Clarification', 
            count: counts.forClarification || 0, 
            color: 'bg-slate-50 text-slate-700 border-slate-200',
            textColor: 'text-slate-600',
            icon: Clock,
            trend: '+0%'
          },
          { 
            title: 'Open', 
            count: counts.open || 0, 
            color: 'bg-amber-50 text-amber-700 border-amber-200',
            textColor: 'text-amber-600',
            icon: Clock,
            trend: '+0%'
          },
          { 
            title: 'On Hold', 
            count: counts.onHold || 0, 
            color: 'bg-orange-50 text-orange-700 border-orange-200',
            textColor: 'text-orange-600',
            icon: CheckCircle,
            trend: '+0%'
          },
          { 
            title: 'Resolved', 
            count: counts.resolved || 0, 
            color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            textColor: 'text-emerald-600',
            icon: CheckCircle,
            trend: '+0%'
          }
        ]);
      } else {
        console.error('❌ Failed to fetch request counts - Status:', response.status);
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        // Keep current stats as fallback
      }
    } catch (error) {
      console.error('❌ Error fetching request stats:', error);
      // Keep current stats as fallback
    }
  };

  const fetchApprovalCount = async () => {
    try {
      const response = await fetch('/api/approvals/count');
      if (response.ok) {
        const data = await response.json();
        setApprovalCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error fetching approval count:', error);
      setApprovalCount(0);
    }
  };

  const baseQuickActions = [
    {
      title: 'Request Incident',
      description: 'Submit a technical problem or bug report',
      icon: AlertCircle,
      color: 'from-red-500 to-rose-600',
      bgColor: 'bg-red-500/10 hover:bg-red-500/20',
      iconColor: 'text-red-600',
      action: () => router.push('/requests/template?tab=incident')
    },
    {
      title: 'Request a Service',
      description: 'Request new software, hardware, or access',
      icon: Plus,
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'bg-blue-500/10 hover:bg-blue-500/20',
      iconColor: 'text-blue-600',
      action: () => router.push('/requests/template?tab=service')
    }
  ];

  // Conditionally add the "For Approvals" action if user has pending approvals
  const quickActions = approvalCount > 0 
    ? [
        ...baseQuickActions,
        {
          title: 'For Approvals',
          description: `Manage and review ${approvalCount} approval request${approvalCount !== 1 ? 's' : ''}`,
          icon: CheckSquare,
          color: 'from-amber-500 to-amber-600',
          bgColor: 'bg-amber-500/10 hover:bg-amber-500/20',
          iconColor: 'text-amber-600',
          action: () => router.push('/requests/approvals'),
          badge: approvalCount
        }
      ]
    : baseQuickActions;

  const handleStatClick = (statTitle: string) => {
    let filterParam = '';
    
    switch (statTitle) {
      case 'For Approval':
        filterParam = '?status=for_approval&approvals=pending_approval';
        break;
      case 'For Clarification':
        filterParam = '?status=for_approval&approvals=for_clarification';
        break;
      case 'Open':
        filterParam = '?status=open';
        break;
      case 'Onhold':
        filterParam = '?status=on_hold';
        break;
      case 'Resolved':
        filterParam = '?status=resolved';
        break;
      default:
        filterParam = '';
    }
    
    const baseUrl = process.env.NEXTAUTH_URL || 'http://192.168.1.85:3000';
    router.push(`${baseUrl}/requests/view${filterParam}`);
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <SessionWrapper>
      <div className="bg-white w-full">
        {/* Hero Section */}
        <section className="relative h-[60vh] overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: "url('/ssp-aspac.png')",
              backgroundSize: 'contain',
              backgroundPosition: 'top',
              backgroundRepeat: 'no-repeat'
            }}
          />
      
          
          <div className="relative h-full flex flex-col">
            {/* Title and Search - Moved upward for better centering */}
            <div className="flex-1 flex flex-col mt-20 items-center px-6 ">
              <h1 className="text-2xl lg:text-3xl font-bold text-white mb-4 text-center tracking-tight">
                How can we
                <span className="text-orange-400"> help </span>
                you?
              </h1>
              
              {/* Search Bar */}
              <div className="w-full max-w-xl relative mb-8">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search templates ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-12 pl-6 pr-14 text-sm bg-white/95 backdrop-blur-sm border-0 shadow-lg rounded-lg placeholder:text-slate-500"
                  />
                  <Button 
                    size="icon" 
                    className="absolute right-2 top-2 h-8 w-8 bg-blue-600 hover:bg-blue-700 rounded-md"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Left Side Action Cards */}
            <div className="absolute left-8 top-1/3 transform -translate-y-1/2 space-y-3 w-64">
              {/* Report an Issue */}
              <Card 
                className="bg-slate-800/80 backdrop-blur-lg border-slate-700 hover:bg-slate-800/90 transition-all duration-200 cursor-pointer group"
                onClick={() => router.push('/requests/template?tab=incident')}
              >
                <CardContent className="p-4 flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">Report an Issue</h3>
                  </div>
                </CardContent>
              </Card>

              {/* Request a Service */}
              <Card 
                className="bg-slate-800/80 backdrop-blur-lg border-slate-700 hover:bg-slate-800/90 transition-all duration-200 cursor-pointer group"
                onClick={() => router.push('/requests/template?tab=service')}
              >
                <CardContent className="p-4 flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Plus className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">Request a Service</h3>
                  </div>
                </CardContent>
              </Card>

              {/* For Approvals - only shown when there are pending approvals */}
              {approvalCount > 0 && (
                <Card 
                  className="bg-slate-800/80 backdrop-blur-lg border-slate-700 hover:bg-slate-800/90 transition-all duration-200 cursor-pointer group relative"
                  onClick={() => router.push('/requests/approvals')}
                >
                  <CardContent className="p-4 flex items-center space-x-3">
                    <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                      <CheckSquare className="h-5 w-5 text-orange-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm">For Approvals</h3>
                      <p className="text-slate-300 text-xs">Review {approvalCount} request{approvalCount !== 1 ? 's' : ''}</p>
                    </div>
                    <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs">
                      {approvalCount}
                    </Badge>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </section>

        {/* Dashboard Section - Now in its own white background section */}
        <section className="bg-white pt-4 pb-12">
          <div className="w-full px-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* My Request Summary */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold text-slate-900 mb-1">My Request Summary</h2>
                  <p className="text-slate-600 text-xs">Overview of your current requests</p>
                </div>
                
                <div className="grid grid-cols-5 gap-4">
                  {requestStats.map((stat, index) => {
                    return (
                      <div 
                        key={index} 
                        className="text-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200"
                        onClick={() => handleStatClick(stat.title)}
                      >
                        <div className="text-2xl font-bold text-slate-900 mb-1">
                          {stat.count}
                        </div>
                        <div className="text-xs text-slate-600 leading-tight">
                          {stat.title}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Announcements */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold text-slate-900 mb-1">
                    Announcements
                  </h2>
                </div>
                <div className="text-center py-4">
                  <p className="text-slate-600 text-sm">There are no new announcements today.</p>
                </div>
              </div>

              {/* Bible Verse of the Day */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold text-slate-900 mb-1">Bible Verse of the Day</h2>
                </div>
                <div className="text-center">
                  {verseOfTheDay.loading ? (
                    <div className="py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-slate-600 text-sm">Loading verse...</p>
                    </div>
                  ) : (
                    <>
                      <blockquote className="text-slate-700 text-sm mb-4 leading-relaxed italic">
                        "{verseOfTheDay.text}"
                      </blockquote>
                      <cite className="text-xs font-semibold text-slate-600 mb-4 block">
                        {verseOfTheDay.reference}
                      </cite>
                     
                    </>
                  )}
                </div>
              </div>
              
            </div>
          </div>
        </section>
      </div>
    </SessionWrapper>
  );
}