"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Building2, Users, FileText, Shield, Network, Database, MessageSquare, FileSpreadsheet, MapPin, Clock, Building, UserCheck, Globe, Zap, ClipboardList, FolderOpen, Tags, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SessionWrapper } from '@/components/session-wrapper';

export default function AdminSettingsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  // Navigation handler for specific items
  const handleItemClick = (itemName: string) => {
    switch (itemName) {
      case 'Service Categories':
        router.push('/admin/catalog-management?tab=categories');
        break;
      case 'Service Catalog':
        router.push('/admin/catalog-management?tab=service');
        break;
      case 'Incident Template':
        router.push('/admin/catalog-management?tab=incident');
        break;
      case 'Service Level Agreements':
        router.push('/admin/settings/sla-management?tab=sla-service');
        break;
      case 'Technician Auto Assign':
        router.push('/admin/settings/automation');
        break;
      case 'Auto Backup':
        router.push('/admin/settings/automation?tab=auto-backup');
        break;
      // Service Desk Configuration items
      case 'Departments':
        router.push('/admin/settings/service-desk?tab=departments');
        break;
      case 'Operational hours':
        router.push('/admin/settings/service-desk?tab=operational-hours');
        break;
      case 'Holidays':
        router.push('/admin/settings/service-desk?tab=holidays');
        break;
      case 'Organization Details':
        router.push('/admin/settings/service-desk?tab=organization');
        break;
      case 'Organization Roles':
        router.push('/admin/settings/service-desk?tab=roles');
        break;
      case 'Regions':
        router.push('/admin/settings/service-desk?tab=regions');
        break;
      case 'Sites':
        router.push('/admin/settings/service-desk?tab=sites');
        break;
      case 'Leave Types':
        router.push('/admin/settings/service-desk?tab=leave-types');
        break;
      case 'Currency':
        router.push('/admin/settings/service-desk?tab=currency');
        break;
      // Users & Permission items
      case 'Roles':
        router.push('/admin/settings/users-permissions?tab=roles');
        break;
      case 'Users':
        router.push('/admin/settings/users-permissions?tab=users');
        break;
      case 'Technicians':
        router.push('/admin/settings/users-permissions?tab=technicians');
        break;
      case 'User Groups':
        router.push('/admin/settings/users-permissions?tab=user-groups');
        break;
      case 'Support Groups':
        router.push('/admin/settings/users-permissions?tab=support-groups');
        break;
      case 'Group Roles':
        router.push('/admin/settings/users-permissions?tab=group-roles');
        break;
      case 'Active Directory':
        router.push('/admin/settings/users-permissions?tab=active-directory');
        break;
      case 'SAML Single Sign On':
        router.push('/admin/settings/users-permissions?tab=saml');
        break;
      case 'LDAP':
        router.push('/admin/settings/users-permissions?tab=ldap');
        break;
      case 'Privacy Settings':
        router.push('/admin/settings/users-permissions?tab=privacy-settings');
        break;
      // Mail Server Settings items - route to notification page with tab parameter
      case 'Email Template':
        router.push('/admin/settings/notification?tab=email-template');
        break;
      case 'Mail Server Settings':
        router.push('/admin/settings/notification?tab=mail-server-settings');
        break;
      case 'Announcements':
        router.push('/admin/settings/notification?tab=announcements');
        break;
      default:
        // All visible items should have routes defined above
        console.warn(`No route defined for: ${itemName}`);
        break;
    }
  };

  const settingsCategories = [
    {
      title: "Service Desk Configuration",
      icon: Building2,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
      items: [
        "Organization Details", "Organization Roles", "Regions", "Sites", 
        "Operational hours", "Holidays", "Departments", "Leave Types", "Currency"
      ]
    },
    {
      title: "Users & Permission", 
      icon: Users,
      color: "from-emerald-500 to-emerald-600",
      bgColor: "bg-emerald-50",
      iconColor: "text-emerald-600",
      items: [
        "Roles", "Users", "Technicians", "User Groups",
        "Support Groups", "Group Roles", "Active Directory", "SAML Single Sign On",
        "LDAP", "Privacy Settings"
      ]
    },
    {
      title: "Notification Settings",
      icon: MessageSquare,
      color: "from-indigo-500 to-indigo-600", 
      bgColor: "bg-indigo-50",
      iconColor: "text-indigo-600",
      items: [
        "Announcements", "Email Template", "Mail Server Settings"
      ]
    },
    {
      title: "Templates & Forms",
      icon: FileText,
      color: "from-cyan-500 to-cyan-600",
      bgColor: "bg-cyan-50",
      iconColor: "text-cyan-600", 
      items: [
        "Service Categories", "Service Catalog", "Incident Template"
      ]
    },
    {
      title: "Automation",
      icon: Zap,
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-50",
      iconColor: "text-orange-600",
      items: [
        "Service Level Agreements", "Technician Auto Assign", "Auto Backup"
      ]
    }
  ];

  const filteredCategories = settingsCategories.map(category => ({
    ...category,
    items: category.items.filter(item =>
      item.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.items.length > 0 || searchQuery === '');

  return (
    <SessionWrapper>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 p-6">
        {/* Header */}
        <div className="max-w-6xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Admin Settings
              </h1>
              <p className="text-slate-600 mt-1">Configure and manage your system settings</p>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6">
              ESM Directory
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-slate-200 rounded-lg h-11"
              placeholder="Search..."
            />
          </div>
        </div>

        {/* Settings Grid */}
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredCategories.map((category, index) => {
              const IconComponent = category.icon;
              return (
                <Card key={index} className="bg-white/90 backdrop-blur-sm shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 group overflow-hidden">
                  <CardHeader className="text-center py-6 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100">
                    <CardTitle className="flex flex-col items-center space-y-3">
                      <div className={`w-16 h-16 rounded-2xl ${category.bgColor} flex items-center justify-center border border-white/60 shadow-sm group-hover:scale-105 transition-transform duration-300`}>
                        <IconComponent className={`w-8 h-8 ${category.iconColor}`} />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-800 leading-tight">
                        {category.title}
                      </h3>
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="p-4">
                    <div className="space-y-1">
                      {category.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="text-left">
                          <Button
                            variant="ghost"
                            className="w-full justify-start h-8 p-2 text-xs hover:bg-slate-50 rounded text-slate-600 hover:text-slate-900 transition-colors"
                            onClick={() => handleItemClick(item)}
                          >
                            {item}
                          </Button>
                          {itemIndex < category.items.length - 1 && (
                            <div className="border-b border-slate-100 ml-2 mr-2"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* No Results Message */}
          {filteredCategories.length === 0 && searchQuery && (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No settings found</h3>
              <p className="text-slate-600">
                Try adjusting your search query or browse all categories above.
              </p>
            </div>
          )}
        </div>
      </div>
    </SessionWrapper>
  );
}
