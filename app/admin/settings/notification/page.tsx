'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Mail, FileText, Server, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { SessionWrapper } from '@/components/session-wrapper';

interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

// Overview Component
const OverviewTab = () => (
  <div className="p-6">
    <h2 className="text-2xl font-bold text-slate-800 mb-6">Notification Settings</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-slate-700">Email Templates</h3>
          </div>
          <div className="text-lg font-bold text-blue-600">12</div>
          <p className="text-slate-600 text-sm">templates configured</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Server className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-slate-700">Mail Server</h3>
          </div>
          <div className="text-lg font-bold text-green-600">Connected</div>
          <p className="text-slate-600 text-sm">SMTP configured</p>
        </CardContent>
      </Card>
    </div>
    
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h3>
      <div className="flex gap-4">
        <Link href="/admin/settings/notification?tab=email-template">
          <Button variant="outline" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Manage Email Templates
          </Button>
        </Link>
        <Link href="/admin/settings/notification?tab=mail-server-settings">
          <Button variant="outline" className="flex items-center gap-2">
            <Server className="w-4 h-4" />
            Configure Mail Server
          </Button>
        </Link>
      </div>
    </div>
  </div>
);

// Tab configuration - these will redirect to the actual sub-pages
const notificationTabs: TabItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: Bell,
    path: '/admin/settings/notification'
  },
  {
    id: 'email-template',
    label: 'Email Templates',
    icon: FileText,
    path: '/admin/settings/notification/email-template'
  },
  {
    id: 'mail-server-settings',
    label: 'Mail Server Settings',
    icon: Server,
    path: '/admin/settings/notification/mail-server-settings'
  }
];

export default function NotificationSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab && notificationTabs.find(t => t.id === tab)) {
      setActiveTab(tab);
      // Redirect to the actual page for non-overview tabs
      if (tab !== 'overview') {
        const tabData = notificationTabs.find(t => t.id === tab);
        if (tabData) {
          router.push(tabData.path);
        }
      }
    }
  }, [searchParams, router]);

  const handleTabChange = (tabId: string) => {
    const tab = notificationTabs.find(t => t.id === tabId);
    if (tab) {
      setActiveTab(tabId);
      router.push(tabId === 'overview' ? '/admin/settings/notification' : tab.path);
    }
  };

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
                  <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                    Notification Settings
                  </h1>
                  <p className="text-sm text-slate-600">Configure email templates and notification settings</p>
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
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <Bell className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">Notifications</h3>
                        <p className="text-xs text-slate-600">Configuration</p>
                      </div>
                    </div>
                  </div>
                  
                  <nav className="p-2">
                    {notificationTabs.map((tab) => {
                      const IconComponent = tab.icon;
                      const isActive = activeTab === tab.id;
                      
                      return (
                        <button
                          key={tab.id}
                          onClick={() => handleTabChange(tab.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                            isActive
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                          }`}
                        >
                          <IconComponent className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
                          <span className="text-left">{tab.label}</span>
                        </button>
                      );
                    })}
                  </nav>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-0">
                  <OverviewTab />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </SessionWrapper>
  );
}
