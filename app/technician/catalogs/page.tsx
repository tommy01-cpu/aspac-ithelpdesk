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
import ServiceCatalogTab from '../service-catalog';
import IncidentCatalogTab from '../incident-catalog';

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

export default function TechnicianTemplatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('service');

  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab && allTabs.find(t => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/technician/catalogs?tab=${tabId}`);
  };

  const activeTabData = allTabs.find(tab => tab.id === activeTab);
  const ActiveComponent = activeTabData?.component;

  return (
    <SessionWrapper>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
    
       

        <div className="w-full">
          <div className="flex min-h-screen">
            {/* Side Panel */}
            <div className="w-80 flex-shrink-0 bg-white/90 backdrop-blur-sm border-r border-slate-200/60">
              <div className="sticky top-16 z-30 h-[calc(100vh-4rem)] overflow-y-auto">
              <div className="flex items-center gap-4 mt-2">
                <Link href="/technician/requests">
                  <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Requests
                  </Button>
                </Link>
             
              </div>
                
                <nav className="p-2">
                  {allTabs.map((tab) => {
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
                  <Button variant="outline" onClick={() => handleTabChange('service')}>
                    Go to Service Catalog
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
