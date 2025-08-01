'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Users, Shield, Lock, Settings, UserCheck, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { SessionWrapper } from '@/components/session-wrapper';

// Import the individual tab components
import SupportGroupsPage from './support-groups/page';
import UsersPage from './users/page';
import TechniciansPage from './technicians/page';

interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  component?: React.ComponentType;
}

const userPermissionTabs: TabItem[] = [
  { id: 'roles', label: 'Roles', icon: Shield },
  { id: 'users', label: 'Users', icon: Users, component: UsersPage },
  { id: 'technicians', label: 'Technicians', icon: UserCheck, component: TechniciansPage },
  { id: 'user-groups', label: 'User Groups', icon: Users },
  { id: 'support-groups', label: 'Support Groups', icon: Users, component: SupportGroupsPage },
  { id: 'group-roles', label: 'Group Roles', icon: Shield },
  { id: 'active-directory', label: 'Active Directory', icon: Settings },
  { id: 'saml', label: 'SAML Single Sign On', icon: Key },
  { id: 'ldap', label: 'LDAP', icon: Settings },
  { id: 'privacy-settings', label: 'Privacy Settings', icon: Lock },
];

export default function UsersPermissionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('roles');

  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab && userPermissionTabs.find((t: TabItem) => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/admin/settings/users-permissions?tab=${tabId}`);
  };

  const activeTabData = userPermissionTabs.find((tab: TabItem) => tab.id === activeTab);
  const ActiveComponent = activeTabData?.component;

  const renderTabContent = () => {
    // If there's a specific component for this tab, render it
    if (ActiveComponent) {
      return <ActiveComponent />;
    }

    // Otherwise, render the default content based on tab
    switch (activeTab) {
      case 'roles':
        return (
          <div className="p-8 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Roles</h3>
            <p className="text-slate-600">Configure user roles and their permissions.</p>
          </div>
        );
      case 'technicians':
        return (
          <div className="p-8 text-center">
            <UserCheck className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Technicians</h3>
            <p className="text-slate-600">Manage technician accounts and permissions.</p>
          </div>
        );
      case 'user-groups':
        return (
          <div className="p-8 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">User Groups</h3>
            <p className="text-slate-600">Organize users into groups for easier management.</p>
          </div>
        );
      case 'group-roles':
        return (
          <div className="p-8 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Group Roles</h3>
            <p className="text-slate-600">Define roles and permissions for user groups.</p>
          </div>
        );
      case 'active-directory':
        return (
          <div className="p-8 text-center">
            <Settings className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Active Directory</h3>
            <p className="text-slate-600">Configure Active Directory integration settings.</p>
          </div>
        );
      case 'saml':
        return (
          <div className="p-8 text-center">
            <Key className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">SAML Single Sign On</h3>
            <p className="text-slate-600">Configure SAML SSO authentication settings.</p>
          </div>
        );
      case 'ldap':
        return (
          <div className="p-8 text-center">
            <Settings className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">LDAP</h3>
            <p className="text-slate-600">Configure LDAP directory service settings.</p>
          </div>
        );
      case 'privacy-settings':
        return (
          <div className="p-8 text-center">
            <Lock className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Privacy Settings</h3>
            <p className="text-slate-600">Configure privacy and data protection settings.</p>
          </div>
        );
      default:
        return (
          <div className="p-8 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Roles</h3>
            <p className="text-slate-600">Configure user roles and their permissions.</p>
          </div>
        );
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
                  <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    Users & Permissions
                  </h1>
                  <p className="text-sm text-slate-600">Manage users, roles, and access controls</p>
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
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">Users & Permission</h3>
                        <p className="text-xs text-slate-600">Management</p>
                      </div>
                    </div>
                  </div>
                  
                  <nav className="p-2">
                    {userPermissionTabs.map((tab) => {
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
                  {renderTabContent()}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </SessionWrapper>
  );
}
