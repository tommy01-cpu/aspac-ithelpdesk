'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Settings, 
  Users, 
  Building2,
  AlertTriangle, 
  CheckCircle2, 
  Zap, 
  Tags, 
  UserCheck,
  Shield,
  Clock,
  FileText,
  X,
  ChevronRight,
  Database,
  HardDrive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface SettingsItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  path: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

interface SettingsCategory {
  id: string;
  title: string;
  description: string;
  items: SettingsItem[];
}

const settingsCategories: SettingsCategory[] = [
  {
    id: 'lookup-data',
    title: 'Lookup Data',
    description: 'Manage system lookup values and configurations',
    items: [
      {
        id: 'departments',
        title: 'Departments',
        description: 'Manage organizational departments',
        icon: Building2,
        path: '/admin/settings/departments',
        badge: '91',
        badgeVariant: 'secondary'
      },
      {
        id: 'priorities',
        title: 'Priorities',
        description: 'Configure request priority levels',
        icon: AlertTriangle,
        path: '/admin/settings/priorities',
        badge: 'New',
        badgeVariant: 'default'
      },
      {
        id: 'statuses',
        title: 'Request Statuses',
        description: 'Manage request status workflow',
        icon: CheckCircle2,
        path: '/admin/settings/statuses',
        badge: 'New',
        badgeVariant: 'default'
      },
      {
        id: 'modes',
        title: 'Request Modes',
        description: 'Configure request submission methods',
        icon: Zap,
        path: '/admin/settings/modes',
        badge: 'New',
        badgeVariant: 'default'
      },
      {
        id: 'categories',
        title: 'Categories',
        description: 'Manage service categories',
        icon: Tags,
        path: '/admin/settings/categories',
        badge: 'New',
        badgeVariant: 'default'
      }
    ]
  },
  {
    id: 'user-management',
    title: 'User Management',
    description: 'Manage users, roles and permissions',
    items: [
      {
        id: 'users',
        title: 'Users',
        description: 'Manage system users',
        icon: Users,
        path: '/admin/settings/users',
        badge: 'New',
        badgeVariant: 'default'
      },
      {
        id: 'roles',
        title: 'Roles & Permissions',
        description: 'Configure user roles and permissions',
        icon: Shield,
        path: '/admin/settings/roles',
        badge: 'New',
        badgeVariant: 'default'
      },
      {
        id: 'technicians',
        title: 'Technicians',
        description: 'Manage technician assignments',
        icon: UserCheck,
        path: '/admin/settings/technicians',
        badge: 'New',
        badgeVariant: 'default'
      }
    ]
  },
  {
    id: 'system-config',
    title: 'System Configuration',
    description: 'System-wide settings and configurations',
    items: [
      {
        id: 'sla',
        title: 'SLA Management',
        description: 'Configure service level agreements',
        icon: Clock,
        path: '/admin/sla-management',
        badge: 'Active',
        badgeVariant: 'outline'
      },
      {
        id: 'templates',
        title: 'Template Settings',
        description: 'Global template configurations',
        icon: FileText,
        path: '/admin/settings/templates',
        badge: 'New',
        badgeVariant: 'default'
      },
      {
        id: 'database',
        title: 'Database Settings',
        description: 'Database configuration and maintenance',
        icon: Database,
        path: '/admin/settings/database',
        badge: 'New',
        badgeVariant: 'default'
      },
      {
        id: 'auto-backup',
        title: 'Auto Backup',
        description: 'Configure automatic database backups',
        icon: HardDrive,
        path: '/admin/settings/automation?tab=auto-backup',
        badge: 'Active',
        badgeVariant: 'outline'
      }
    ]
  }
];

interface AdminSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath?: string;
}

export function AdminSettingsPanel({ isOpen, onClose, currentPath }: AdminSettingsPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeCategory, setActiveCategory] = useState<string>('lookup-data');

  const handleItemClick = (path: string) => {
    router.push(path);
    onClose();
  };

  const isCurrentPath = (path: string) => {
    return pathname === path || currentPath === path;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      {/* Side Panel */}
      <div className="fixed right-0 top-0 h-full w-[600px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Admin Settings</h2>
              <p className="text-white/80 text-sm">Manage system configurations</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex h-full">
          {/* Categories Sidebar */}
          <div className="w-56 bg-slate-50 border-r border-slate-200 overflow-y-auto">
            <div className="p-4 space-y-2">
              {settingsCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                    activeCategory === category.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <div className="font-medium text-sm">{category.title}</div>
                  <div className={`text-xs mt-1 ${
                    activeCategory === category.id ? 'text-blue-100' : 'text-slate-500'
                  }`}>
                    {category.items.length} items
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Settings Content */}
          <div className="flex-1 overflow-y-auto">
            {settingsCategories
              .filter(category => category.id === activeCategory)
              .map((category) => (
                <div key={category.id} className="p-6">
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-slate-800 mb-2">
                      {category.title}
                    </h3>
                    <p className="text-slate-600">{category.description}</p>
                  </div>

                  <div className="space-y-3">
                    {category.items.map((item, index) => {
                      const IconComponent = item.icon;
                      const isCurrent = isCurrentPath(item.path);
                      
                      return (
                        <Card 
                          key={item.id}
                          className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                            isCurrent ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:border-blue-300'
                          }`}
                          onClick={() => handleItemClick(item.path)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                  isCurrent 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-slate-100 text-slate-600'
                                }`}>
                                  <IconComponent className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className={`font-medium ${
                                      isCurrent ? 'text-blue-900' : 'text-slate-800'
                                    }`}>
                                      {item.title}
                                    </h4>
                                    {item.badge && (
                                      <Badge 
                                        variant={item.badgeVariant || 'secondary'}
                                        className="text-xs"
                                      >
                                        {item.badge}
                                      </Badge>
                                    )}
                                    {isCurrent && (
                                      <Badge variant="default" className="text-xs bg-blue-600">
                                        Current
                                      </Badge>
                                    )}
                                  </div>
                                  <p className={`text-sm mt-1 ${
                                    isCurrent ? 'text-blue-700' : 'text-slate-600'
                                  }`}>
                                    {item.description}
                                  </p>
                                </div>
                              </div>
                              <ChevronRight className={`w-4 h-4 ${
                                isCurrent ? 'text-blue-600' : 'text-slate-400'
                              }`} />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>


                </div>
              ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 bg-slate-50">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Admin Settings Panel</span>
            <span>{settingsCategories.reduce((acc, cat) => acc + cat.items.length, 0)} total settings</span>
          </div>
        </div>
      </div>
    </>
  );
}

// Hook for easy access to settings panel
export function useAdminSettings() {
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);

  const openSettingsPanel = () => setIsSettingsPanelOpen(true);
  const closeSettingsPanel = () => setIsSettingsPanelOpen(false);
  const toggleSettingsPanel = () => setIsSettingsPanelOpen(prev => !prev);

  return {
    isSettingsPanelOpen,
    openSettingsPanel,
    closeSettingsPanel,
    toggleSettingsPanel,
  };
}
