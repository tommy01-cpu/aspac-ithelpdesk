"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, FolderOpen, Tags, AlertTriangle, Clock, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { SessionWrapper } from '@/components/session-wrapper';

// Import the individual tab components
import ServiceCatalogTab from '../service-catalog';
import IncidentCatalogTab from '../incident-catalog';
// import ApprovalsTab from './approvals/ApprovalsTab';
// Update the path below if the file exists elsewhere, for example:
// If the file does not exist, create 'ApprovalsTab.tsx' in the 'approvals' folder with a default export.

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
    description: 'Browse and request available incidents'
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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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
    setIsMobileSidebarOpen(false); // Close mobile sidebar when tab changes
    router.push(`/requests/template?tab=${tabId}`);
  };

  const activeTabData = userTabs.find(tab => tab.id === activeTab);
  const ActiveComponent = activeTabData?.component;

  return (
    <SessionWrapper>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-16 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                onClick={() => {
                  if (window.history.length > 1) {
                    router.back();
                  } else {
                    if (session?.user?.isTechnician) {
                      router.push('/technician/requests');
                    } else {
                      router.push('/requests/view');
                    }
                  }
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <h1 className="text-lg font-semibold text-slate-800">
                {activeTabData?.label || 'Templates'}
              </h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              {isMobileSidebarOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        {isMobileSidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setIsMobileSidebarOpen(false)} />
        )}

        <div className="w-full">
          <div className="flex min-h-screen">
            {/* Desktop Side Panel */}
            <div className="hidden lg:block w-80 flex-shrink-0 bg-white/90 backdrop-blur-sm border-r border-slate-200/60">
              <div className="sticky top-16 z-30 h-[calc(100vh-4rem)] overflow-y-auto">
                <div className="flex items-center gap-4 mt-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    onClick={() => {
                      if (window.history.length > 1) {
                        router.back();
                      } else {
                        if (session?.user?.isTechnician) {
                          router.push('/technician/requests');
                        } else {
                          router.push('/requests/view');
                        }
                      }
                    }}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
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
              </div>
            </div>

            {/* Mobile Side Panel */}
            <div className={`lg:hidden fixed inset-y-0 left-0 z-50 w-80 bg-white transform transition-transform duration-300 ease-in-out ${
              isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>
              <div className="h-full overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-800">Templates</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsMobileSidebarOpen(false)}
                      className="text-slate-600 hover:text-slate-900"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <nav className="p-4">
                  {userTabs.map((tab) => {
                    const IconComponent = tab.icon;
                    const isActive = activeTab === tab.id;
                    
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`w-full flex items-start gap-3 px-3 py-4 rounded-lg text-sm font-medium transition-all duration-200 mb-2 ${
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
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-w-0 bg-white/90 backdrop-blur-sm">
              {ActiveComponent ? (
                <div className="h-full">
                  <ActiveComponent />
                </div>
              ) : (
                <div className="p-4 sm:p-8 text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                    {activeTabData && (
                      <activeTabData.icon className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400" />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">
                    {activeTabData?.label}
                  </h3>
                  <p className="text-slate-600 mb-4 text-sm sm:text-base">
                    {activeTabData?.description}
                  </p>
                  <Button variant="outline" onClick={() => handleTabChange('requests')}>
                    Go to My Requests
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </SessionWrapper>
  );
}
