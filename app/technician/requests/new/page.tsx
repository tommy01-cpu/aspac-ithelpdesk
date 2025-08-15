'use client';

import { useState, useMemo } from 'react';
import { ArrowLeft, Search, Grid, List, ChevronRight, Clock, Users, Settings, Shield, Database, Network, Monitor, Smartphone, Printer, Bug, AlertTriangle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { SessionWrapper } from '@/components/session-wrapper';

interface Category {
  id: string;
  name: string;
  description: string;
  icon: any;
  type: 'SERVICE' | 'INCIDENT';
  templateCount: number;
}

interface ServiceTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  type: 'SERVICE' | 'INCIDENT';
  estimatedTime: string;
  complexity: 'Simple' | 'Medium' | 'Complex';
  popularity: number;
  tags: string[];
}

const categories: Category[] = [
  // Service Request Categories
  {
    id: 'user-management',
    name: 'User Management',
    description: 'Account creation, access requests, and user administration',
    icon: Users,
    type: 'SERVICE',
    templateCount: 5
  },
  {
    id: 'software-licensing',
    name: 'Software & Licensing',
    description: 'Software installation, licensing, and application requests',
    icon: Settings,
    type: 'SERVICE',
    templateCount: 4
  },
  {
    id: 'access-security',
    name: 'Access & Security',
    description: 'Security clearances, VPN access, and permissions',
    icon: Shield,
    type: 'SERVICE',
    templateCount: 3
  },
  {
    id: 'data-storage',
    name: 'Data & Storage',
    description: 'File storage, backup requests, and data management',
    icon: Database,
    type: 'SERVICE',
    templateCount: 3
  },
  {
    id: 'network-connectivity',
    name: 'Network & Connectivity',
    description: 'Network access, internet connectivity, and infrastructure',
    icon: Network,
    type: 'SERVICE',
    templateCount: 4
  },
  {
    id: 'procurement',
    name: 'Equipment & Procurement',
    description: 'Hardware requests, equipment procurement, and asset management',
    icon: Monitor,
    type: 'SERVICE',
    templateCount: 4
  },

  // Incident Report Categories
  {
    id: 'hardware-issues',
    name: 'Hardware Issues',
    description: 'Computer, laptop, and peripheral hardware problems',
    icon: Monitor,
    type: 'INCIDENT',
    templateCount: 3
  },
  {
    id: 'software-issues',
    name: 'Software Issues',
    description: 'Application errors, crashes, and software malfunctions',
    icon: Bug,
    type: 'INCIDENT',
    templateCount: 2
  },
  {
    id: 'network-issues',
    name: 'Network Issues',
    description: 'Connectivity problems, internet outages, and network errors',
    icon: Network,
    type: 'INCIDENT',
    templateCount: 2
  },
  {
    id: 'security-incidents',
    name: 'Security Incidents',
    description: 'Security breaches, suspicious activity, and safety concerns',
    icon: AlertTriangle,
    type: 'INCIDENT',
    templateCount: 2
  },
  {
    id: 'system-outages',
    name: 'System Outages',
    description: 'Service disruptions, system downtime, and critical failures',
    icon: Zap,
    type: 'INCIDENT',
    templateCount: 2
  }
];

const templates: ServiceTemplate[] = [
  // User Management Templates
  { id: '1', name: 'New User Account Request', description: 'Create a new user account with basic access permissions', icon: '/serviceicons/account-creation-in-ad.svg', category: 'user-management', type: 'SERVICE', estimatedTime: '2-4 hours', complexity: 'Simple', popularity: 95, tags: ['Account', 'New User', 'Access'] },
  { id: '2', name: 'User Account Modification', description: 'Modify existing user account permissions or details', icon: '/serviceicons/user-management.svg', category: 'user-management', type: 'SERVICE', estimatedTime: '1-2 hours', complexity: 'Simple', popularity: 80, tags: ['Account', 'Modify', 'Permissions'] },
  { id: '3', name: 'User Account Deactivation', description: 'Deactivate or suspend a user account', icon: '/serviceicons/account-deletion-in-ad.svg', category: 'user-management', type: 'SERVICE', estimatedTime: '30 minutes', complexity: 'Simple', popularity: 70, tags: ['Account', 'Deactivate', 'Suspend'] },
  { id: '4', name: 'Password Reset Request', description: 'Reset password for user account', icon: '/serviceicons/reset-password-in-ad.svg', category: 'user-management', type: 'SERVICE', estimatedTime: '15 minutes', complexity: 'Simple', popularity: 90, tags: ['Password', 'Reset', 'Security'] },
  { id: '5', name: 'Group Membership Request', description: 'Add user to specific groups or distribution lists', icon: '/serviceicons/mailing-list.svg', category: 'user-management', type: 'SERVICE', estimatedTime: '1 hour', complexity: 'Medium', popularity: 65, tags: ['Group', 'Membership', 'Access'] },

  // Software & Licensing Templates
  { id: '6', name: 'Software Installation Request', description: 'Install new software applications on user devices', icon: '/serviceicons/software-installation.svg', category: 'software-licensing', type: 'SERVICE', estimatedTime: '1-3 hours', complexity: 'Medium', popularity: 85, tags: ['Software', 'Installation', 'Applications'] },
  { id: '7', name: 'Software License Request', description: 'Request license for commercial software', icon: '/serviceicons/additional-client-access-license.svg', category: 'software-licensing', type: 'SERVICE', estimatedTime: '2-5 days', complexity: 'Medium', popularity: 60, tags: ['License', 'Commercial', 'Procurement'] },
  { id: '8', name: 'Software Update Request', description: 'Update existing software to latest version', icon: '/serviceicons/software-upgrade.svg', category: 'software-licensing', type: 'SERVICE', estimatedTime: '30 minutes', complexity: 'Simple', popularity: 75, tags: ['Software', 'Update', 'Version'] },
  { id: '9', name: 'Software Removal Request', description: 'Uninstall software from user devices', icon: '/serviceicons/software-uninstallation.svg', category: 'software-licensing', type: 'SERVICE', estimatedTime: '30 minutes', complexity: 'Simple', popularity: 45, tags: ['Software', 'Removal', 'Uninstall'] },

  // Access & Security Templates
  { id: '10', name: 'VPN Access Request', description: 'Request VPN access for remote work', icon: '/serviceicons/vpn-account-creation.svg', category: 'access-security', type: 'SERVICE', estimatedTime: '1-2 hours', complexity: 'Medium', popularity: 85, tags: ['VPN', 'Remote', 'Security'] },
  { id: '11', name: 'Security Clearance Request', description: 'Request security clearance for sensitive areas', icon: '/serviceicons/security.png', category: 'access-security', type: 'SERVICE', estimatedTime: '1-2 weeks', complexity: 'Complex', popularity: 30, tags: ['Security', 'Clearance', 'Access'] },
  { id: '12', name: 'Multi-Factor Authentication Setup', description: 'Setup MFA for enhanced account security', icon: '/serviceicons/mobile.png', category: 'access-security', type: 'SERVICE', estimatedTime: '30 minutes', complexity: 'Simple', popularity: 70, tags: ['MFA', 'Security', 'Authentication'] },

  // Data & Storage Templates
  { id: '13', name: 'File Storage Request', description: 'Request additional file storage space', icon: '/serviceicons/file-download.svg', category: 'data-storage', type: 'SERVICE', estimatedTime: '1-2 hours', complexity: 'Simple', popularity: 80, tags: ['Storage', 'Files', 'Space'] },
  { id: '14', name: 'Data Backup Request', description: 'Request data backup and recovery setup', icon: '/serviceicons/request-data-backup.svg', category: 'data-storage', type: 'SERVICE', estimatedTime: '2-4 hours', complexity: 'Medium', popularity: 65, tags: ['Backup', 'Recovery', 'Data'] },
  { id: '15', name: 'Shared Drive Access', description: 'Request access to shared network drives', icon: '/serviceicons/data-management.svg', category: 'data-storage', type: 'SERVICE', estimatedTime: '30 minutes', complexity: 'Simple', popularity: 90, tags: ['Shared Drive', 'Network', 'Access'] },

  // Network & Connectivity Templates
  { id: '16', name: 'Internet Access Request', description: 'Request internet access for new locations', icon: '/serviceicons/internet-access.svg', category: 'network-connectivity', type: 'SERVICE', estimatedTime: '1-2 days', complexity: 'Medium', popularity: 70, tags: ['Internet', 'Network', 'Access'] },
  { id: '17', name: 'Wi-Fi Setup Request', description: 'Setup wireless network access', icon: '/serviceicons/wifi-access.svg', category: 'network-connectivity', type: 'SERVICE', estimatedTime: '2-4 hours', complexity: 'Medium', popularity: 85, tags: ['Wi-Fi', 'Wireless', 'Network'] },
  { id: '18', name: 'Network Printer Setup', description: 'Configure network printer access', icon: '/serviceicons/printer2.png', category: 'network-connectivity', type: 'SERVICE', estimatedTime: '1 hour', complexity: 'Simple', popularity: 75, tags: ['Printer', 'Network', 'Setup'] },
  { id: '19', name: 'Network Drive Mapping', description: 'Map network drives to user devices', icon: '/serviceicons/lan.png', category: 'network-connectivity', type: 'SERVICE', estimatedTime: '30 minutes', complexity: 'Simple', popularity: 80, tags: ['Network Drive', 'Mapping', 'Access'] },

  // Equipment & Procurement Templates
  { id: '20', name: 'New Computer Request', description: 'Request new desktop or laptop computer', icon: '/serviceicons/request-desktop.svg', category: 'procurement', type: 'SERVICE', estimatedTime: '3-7 days', complexity: 'Medium', popularity: 75, tags: ['Computer', 'Hardware', 'Procurement'] },
  { id: '21', name: 'Mobile Device Request', description: 'Request company mobile phone or tablet', icon: '/serviceicons/request-mobile-for-support.svg', category: 'procurement', type: 'SERVICE', estimatedTime: '2-5 days', complexity: 'Medium', popularity: 60, tags: ['Mobile', 'Device', 'Procurement'] },
  { id: '22', name: 'Monitor Request', description: 'Request additional or replacement monitor', icon: '/serviceicons/monitor.png', category: 'procurement', type: 'SERVICE', estimatedTime: '1-3 days', complexity: 'Simple', popularity: 70, tags: ['Monitor', 'Display', 'Hardware'] },
  { id: '23', name: 'Peripheral Equipment Request', description: 'Request keyboards, mice, headsets, or other peripherals', icon: '/serviceicons/keyboard.png', category: 'procurement', type: 'SERVICE', estimatedTime: '1-2 days', complexity: 'Simple', popularity: 65, tags: ['Peripheral', 'Equipment', 'Hardware'] },

  // Hardware Issues Templates
  { id: '24', name: 'Computer Not Starting', description: 'Desktop or laptop computer fails to boot or start', icon: '/serviceicons/desktop.png', category: 'hardware-issues', type: 'INCIDENT', estimatedTime: '1-4 hours', complexity: 'Medium', popularity: 80, tags: ['Computer', 'Boot', 'Hardware'] },
  { id: '25', name: 'Monitor Display Issues', description: 'Monitor showing no display, flickering, or distorted image', icon: '/serviceicons/monitor.png', category: 'hardware-issues', type: 'INCIDENT', estimatedTime: '30 minutes - 2 hours', complexity: 'Simple', popularity: 70, tags: ['Monitor', 'Display', 'Hardware'] },
  { id: '26', name: 'Printer Hardware Problems', description: 'Printer paper jams, hardware failures, or mechanical issues', icon: '/serviceicons/printer2.png', category: 'hardware-issues', type: 'INCIDENT', estimatedTime: '30 minutes - 1 hour', complexity: 'Simple', popularity: 65, tags: ['Printer', 'Hardware', 'Mechanical'] }
];

export default function NewRequestPage() {
  const [selectedType, setSelectedType] = useState<'SERVICE' | 'INCIDENT' | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const router = useRouter();

  // Get categories for selected type
  const filteredCategories = useMemo(() => {
    if (!selectedType) return [];
    return categories.filter(cat => cat.type === selectedType);
  }, [selectedType]);

  // Get templates for selected category
  const filteredTemplates = useMemo(() => {
    if (!selectedCategory) return [];
    return templates
      .filter(template => template.category === selectedCategory)
      .filter(template => 
        searchTerm === '' || 
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .sort((a, b) => b.popularity - a.popularity);
  }, [selectedCategory, searchTerm]);

  const handleTemplateSelect = (templateId: string) => {
    router.push(`/technician/requests/new/template?template=${templateId}`);
  };

  const resetToTypeSelection = () => {
    setSelectedType(null);
    setSelectedCategory(null);
    setSearchTerm('');
  };

  const resetToCategorySelection = () => {
    setSelectedCategory(null);
    setSearchTerm('');
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'Simple': return 'bg-green-100 text-green-700';
      case 'Medium': return 'bg-yellow-100 text-yellow-700';
      case 'Complex': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <SessionWrapper>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
        <div className="container mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link href="/requests">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Requests
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Create New Request
                </h1>
                <p className="text-gray-600 mt-1">
                  {!selectedType && "Choose the type of request you'd like to create"}
                  {selectedType && !selectedCategory && `Select a ${selectedType.toLowerCase()} category`}
                  {selectedType && selectedCategory && "Choose a template to get started"}
                </p>
              </div>
            </div>
          </div>

          {/* Breadcrumb Navigation */}
          {(selectedType || selectedCategory) && (
            <div className="flex items-center gap-2 mb-6 text-sm text-gray-600">
              <button 
                onClick={resetToTypeSelection}
                className="hover:text-purple-600 transition-colors"
              >
                Request Type
              </button>
              {selectedType && (
                <>
                  <ChevronRight className="h-4 w-4" />
                  <button 
                    onClick={resetToCategorySelection}
                    className="hover:text-purple-600 transition-colors"
                  >
                    {selectedType === 'SERVICE' ? 'Service Request' : 'Incident Report'}
                  </button>
                </>
              )}
              {selectedCategory && (
                <>
                  <ChevronRight className="h-4 w-4" />
                  <span className="text-purple-600 font-medium">
                    {categories.find(cat => cat.id === selectedCategory)?.name}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Step 1: Request Type Selection */}
          {!selectedType && (
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card 
                  className="bg-white/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
                  onClick={() => setSelectedType('SERVICE')}
                >
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Settings className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Service Request</h3>
                    <p className="text-gray-600 mb-4">
                      Request new services, access, equipment, or make changes to existing services
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <Badge variant="outline" className="bg-green-50 text-green-700">Account Creation</Badge>
                      <Badge variant="outline" className="bg-green-50 text-green-700">Software Installation</Badge>
                      <Badge variant="outline" className="bg-green-50 text-green-700">Equipment Request</Badge>
                    </div>
                    <div className="mt-4 text-sm text-gray-500">
                      {categories.filter(cat => cat.type === 'SERVICE').length} categories available
                    </div>
                  </CardContent>
                </Card>

                <Card 
                  className="bg-white/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
                  onClick={() => setSelectedType('INCIDENT')}
                >
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-red-400 to-orange-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <AlertTriangle className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Incident Report</h3>
                    <p className="text-gray-600 mb-4">
                      Report technical issues, system problems, or request assistance with existing services
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <Badge variant="outline" className="bg-red-50 text-red-700">Hardware Issues</Badge>
                      <Badge variant="outline" className="bg-red-50 text-red-700">Software Problems</Badge>
                      <Badge variant="outline" className="bg-red-50 text-red-700">Network Issues</Badge>
                    </div>
                    <div className="mt-4 text-sm text-gray-500">
                      {categories.filter(cat => cat.type === 'INCIDENT').length} categories available
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Step 2: Category Selection */}
          {selectedType && !selectedCategory && (
            <div className="max-w-6xl mx-auto">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {selectedType === 'SERVICE' ? 'Service Request Categories' : 'Incident Report Categories'}
                </h2>
                <p className="text-gray-600">
                  Select the category that best matches your {selectedType.toLowerCase()}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCategories.map((category) => {
                  const IconComponent = category.icon;
                  return (
                    <Card 
                      key={category.id}
                      className="bg-white/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 ${
                            selectedType === 'SERVICE' 
                              ? 'bg-gradient-to-r from-green-400 to-blue-500' 
                              : 'bg-gradient-to-r from-red-400 to-orange-500'
                          }`}>
                            <IconComponent className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900 mb-1">{category.name}</h3>
                            <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="bg-gray-50 text-gray-700">
                                {category.templateCount} templates
                              </Badge>
                              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-purple-600" />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Template Selection */}
          {selectedType && selectedCategory && (
            <div className="max-w-6xl mx-auto">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {categories.find(cat => cat.id === selectedCategory)?.name} Templates
                    </h2>
                    <p className="text-gray-600">
                      Choose a template to create your {selectedType.toLowerCase()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Search */}
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/50"
                  />
                </div>
              </div>

              {/* Template Grid */}
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTemplates.map((template) => (
                    <Card 
                      key={template.id}
                      className="bg-white/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
                      onClick={() => handleTemplateSelect(template.id)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-12 h-12 flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
                            <Image 
                              src={template.icon} 
                              alt={template.name}
                              width={32}
                              height={32}
                              className="object-contain"
                              onError={(e) => {
                                e.currentTarget.src = '/serviceicons/service-default.svg';
                              }}
                            />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">
                              {template.name}
                            </h3>
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                              {template.description}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-1 text-gray-600">
                              <Clock className="h-3 w-3" />
                              {template.estimatedTime}
                            </div>
                            <Badge variant="secondary" className={getComplexityColor(template.complexity)}>
                              {template.complexity}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {template.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs bg-gray-50 text-gray-600">
                                {tag}
                              </Badge>
                            ))}
                            {template.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600">
                                +{template.tags.length - 3}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                            <div className="text-xs text-gray-500">
                              {template.popularity}% popularity
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-purple-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Template List */}
              {viewMode === 'list' && (
                <div className="space-y-4">
                  {filteredTemplates.map((template) => (
                    <Card 
                      key={template.id}
                      className="bg-white/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
                      onClick={() => handleTemplateSelect(template.id)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center gap-6">
                          <div className="w-12 h-12 flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
                            <Image 
                              src={template.icon} 
                              alt={template.name}
                              width={32}
                              height={32}
                              className="object-contain"
                              onError={(e) => {
                                e.currentTarget.src = '/serviceicons/service-default.svg';
                              }}
                            />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">
                              {template.name}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                            <div className="flex flex-wrap gap-1">
                              {template.tags.map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs bg-gray-50 text-gray-600">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="text-right space-y-2">
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Clock className="h-3 w-3" />
                              {template.estimatedTime}
                            </div>
                            <Badge variant="secondary" className={getComplexityColor(template.complexity)}>
                              {template.complexity}
                            </Badge>
                            <div className="text-xs text-gray-500">
                              {template.popularity}% popularity
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-purple-600" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {filteredTemplates.length === 0 && (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
                  <p className="text-gray-600">
                    Try adjusting your search terms or browse other categories
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </SessionWrapper>
  );
}
