'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Bot, Users, Zap, GitBranch, AlertTriangle, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { SessionWrapper } from '@/components/session-wrapper';

// Import the individual tab components
import TechnicianAutoAssignTab from './technician-auto-assign/page';

interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  component?: React.ComponentType;
}

// Overview Component
const OverviewTab = () => (
  <div className="p-6">
    <h2 className="text-2xl font-bold text-slate-800 mb-6">Automation Overview</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Bot className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-slate-700">Active Rules</h3>
          </div>
          <div className="text-3xl font-bold text-green-600">12</div>
          <p className="text-slate-600 text-sm">automation rules running</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-slate-700">Auto-Assigned Today</h3>
          </div>
          <div className="text-3xl font-bold text-blue-600">47</div>
          <p className="text-slate-600 text-sm">tickets assigned automatically</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <GitBranch className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-slate-700">Active Workflows</h3>
          </div>
          <div className="text-3xl font-bold text-purple-600">8</div>
          <p className="text-slate-600 text-sm">automated workflows</p>
        </CardContent>
      </Card>
    </div>
  </div>
);

const automationTabs: TabItem[] = [
  { id: 'overview', label: 'Overview', icon: Bot, component: OverviewTab },
  { id: 'technician-auto-assign', label: 'Technician Auto Assign', icon: Users, component: TechnicianAutoAssignTab },
  { id: 'workflows', label: 'Workflow Automation', icon: GitBranch },
  { id: 'escalation', label: 'Escalation Rules', icon: AlertTriangle },
  { id: 'notifications', label: 'Notification Automation', icon: Bell },
];

export default function AutomationConfigurationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('technician-auto-assign');

  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab && automationTabs.find(t => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/admin/settings/automation?tab=${tabId}`);
  };

  const activeTabData = automationTabs.find(tab => tab.id === activeTab);
  const ActiveComponent = activeTabData?.component;

  return (
    <SessionWrapper>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-16 z-40">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Link href="/admin/settings">
                  <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Settings
                  </Button>
                </Link>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    Automation Configuration
                  </h1>
                  <p className="text-sm text-slate-600">Manage your automation settings and workflows</p>
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
                        <Bot className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">Automation</h3>
                        <p className="text-xs text-slate-600">Configuration</p>
                      </div>
                    </div>
                  </div>
                  
                  <nav className="p-2">
                    {automationTabs.map((tab) => {
                      const IconComponent = tab.icon;
                      const isActive = activeTab === tab.id;
                      
                      return (
                        <button
                          key={tab.id}
                          onClick={() => handleTabChange(tab.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                            isActive
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                          }`}
                        >
                          <IconComponent className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                          <span className="text-left">{tab.label}</span>
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
                        This configuration page is coming soon.
                      </p>
                      <Button variant="outline" onClick={() => handleTabChange('technician-auto-assign')}>
                        Go to Technician Auto Assign
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