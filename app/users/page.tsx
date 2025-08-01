"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, FolderOpen, Tags, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { SessionWrapper } from '@/components/session-wrapper';

// Import the individual tab components
import MyRequestsTab from './requests/MyRequestsTab';
import ServiceCatalogTab from './service-catalog';
import IncidentCatalogTab from './incident-catalog';
import ApprovalsTab from './approvals/ApprovalsTab';

interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  component?: React.ComponentType;
  description: string;
  requiresApproval?: boolean;
}

const allTabs: TabItem[] = [
  { 
    id: 'requests', 
    label: 'My Requests', 
    icon: Clock, 
    component: MyRequestsTab,
    description: 'View and track your submitted requests'
  },
  { 
    id: 'approvals', 
    label: 'Approvals', 
    icon: Tags, 
    component: ApprovalsTab,
    description: 'Review and approve pending requests',
    requiresApproval: true
  },
  { 
    id: 'service', 
    label: 'Service Catalog', 
    icon: FolderOpen, 
    component: ServiceCatalogTab,
    description: 'Browse and request services'
  },
  { 
    id: 'incident', 
    label: 'Incident Catalog', 
    icon: AlertTriangle, 
    component: IncidentCatalogTab,
    description: 'Report incidents and issues'
  },
];

export default function UserPortalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('requests');
  const [userTabs, setUserTabs] = useState<TabItem[]>(allTabs.filter(tab => !tab.requiresApproval));
  const [userPermissions, setUserPermissions] = useState<{ isServiceApprover: boolean } | null>(null);
  const [approvalCount, setApprovalCount] = useState(0);

  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab && userTabs.find(t => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams, userTabs]);

  useEffect(() => {
    if (session?.user?.email) {
      fetchUserPermissions();
    }
  }, [session]);

  const fetchUserPermissions = async () => {
    try {
      // Check if user has any approval assignments instead of isServiceApprover flag
      const approvalCountResponse = await fetch('/api/approvals/count');
      if (approvalCountResponse.ok) {
        const approvalData = await approvalCountResponse.json();
        const hasApprovalAssignments = approvalData.count > 0;
        
        // Update available tabs based on actual approval assignments
        let availableTabs = allTabs.filter(tab => !tab.requiresApproval);
        if (hasApprovalAssignments) {
          availableTabs = allTabs; // Show all tabs including approvals
          setApprovalCount(approvalData.count); // Set the actual count
        }
        setUserTabs(availableTabs);
        
        // Set dummy permissions object for compatibility
        setUserPermissions({ isServiceApprover: hasApprovalAssignments });
      }
    } catch (error) {
      console.error('Error fetching user permissions:', error);
    }
  };

  const fetchApprovalCount = async () => {
    // This function is now integrated into fetchUserPermissions
    // Keeping it for compatibility but it's no longer used
    try {
      const response = await fetch('/api/approvals/count');
      if (response.ok) {
        const data = await response.json();
        setApprovalCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error fetching approval count:', error);
    }
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/users?tab=${tabId}`);
  };

  const activeTabData = userTabs.find(tab => tab.id === activeTab);
  const ActiveComponent = activeTabData?.component;

  return (
    <SessionWrapper>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-16 z-40">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </Link>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    Service Portal
                  </h1>
                  <p className="text-sm text-slate-600">Access services, report incidents, and track your requests</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-8">
          <div className="flex gap-6 min-h-screen">
            {/* Side Panel */}
            <div className="w-80 flex-shrink-0">
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg sticky top-40 z-30 max-h-[calc(100vh-12rem)] overflow-y-auto">
                <CardContent className="p-0">
                  <div className="p-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                        <FolderOpen className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">Service Portal</h3>
                        <p className="text-xs text-slate-600">User Dashboard</p>
                      </div>
                    </div>
                  </div>
                  
                  <nav className="p-2">
                    {userTabs.map((tab) => {
                      const IconComponent = tab.icon;
                      const isActive = activeTab === tab.id;
                      
                      return (
                        <button
                          key={tab.id}
                          onClick={() => handleTabChange(tab.id)}
                          className={`w-full flex items-start gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                            isActive
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                          }`}
                        >
                          <IconComponent className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                          <div className="text-left flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{tab.label}</span>
                              {tab.id === 'approvals' && approvalCount > 0 && (
                                <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-medium text-white bg-red-500 rounded-full">
                                  {approvalCount}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">{tab.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </nav>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-w-0">
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-0">
                  {ActiveComponent ? (
                    <ActiveComponent />
                  ) : (
                    <div className="p-8 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                        {activeTabData && (
                          <activeTabData.icon className="w-8 h-8 text-slate-400" />
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-slate-800 mb-2">
                        {activeTabData?.label}
                      </h3>
                      <p className="text-slate-600 mb-4">
                        {activeTabData?.description}
                      </p>
                      <Button variant="outline" onClick={() => handleTabChange('requests')}>
                        Go to My Requests
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </SessionWrapper>
  );
}
