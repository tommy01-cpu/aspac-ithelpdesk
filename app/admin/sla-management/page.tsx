"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Plus, Search, Filter, MoreVertical, Edit, Eye, Clock, AlertTriangle, Target, Users, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SessionWrapper } from '@/components/session-wrapper';

// Mock data for Service SLAs
const mockServiceSLAs = [
  { 
    id: 1, 
    name: "Hardware Request SLA", 
    category: "Hardware", 
    priority: "Medium", 
    responseTime: "4 hours", 
    resolutionTime: "48 hours",
    escalationLevels: 4,
    status: "Active", 
    compliance: 95,
    lastModified: "2024-01-15" 
  },
  { 
    id: 2, 
    name: "Software Installation SLA", 
    category: "Software", 
    priority: "Low", 
    responseTime: "8 hours", 
    resolutionTime: "72 hours",
    escalationLevels: 3,
    status: "Active", 
    compliance: 88,
    lastModified: "2024-01-14" 
  },
  { 
    id: 3, 
    name: "Critical System Access SLA", 
    category: "Access", 
    priority: "Critical", 
    responseTime: "30 minutes", 
    resolutionTime: "4 hours",
    escalationLevels: 4,
    status: "Active", 
    compliance: 92,
    lastModified: "2024-01-13" 
  },
  { 
    id: 4, 
    name: "Network Setup SLA", 
    category: "Network", 
    priority: "High", 
    responseTime: "2 hours", 
    resolutionTime: "24 hours",
    escalationLevels: 4,
    status: "Active", 
    compliance: 97,
    lastModified: "2024-01-12" 
  },
];

// Mock data for Incident SLAs
const mockIncidentSLAs = [
  { 
    id: 1, 
    name: "Critical System Failure SLA", 
    category: "System", 
    priority: "Critical", 
    responseTime: "15 minutes", 
    resolutionTime: "2 hours",
    escalationLevels: 4,
    status: "Active", 
    compliance: 98,
    lastModified: "2024-01-15" 
  },
  { 
    id: 2, 
    name: "Security Incident SLA", 
    category: "Security", 
    priority: "Critical", 
    responseTime: "30 minutes", 
    resolutionTime: "4 hours",
    escalationLevels: 4,
    status: "Active", 
    compliance: 94,
    lastModified: "2024-01-14" 
  },
  { 
    id: 3, 
    name: "Network Outage SLA", 
    category: "Network", 
    priority: "High", 
    responseTime: "1 hour", 
    resolutionTime: "8 hours",
    escalationLevels: 3,
    status: "Active", 
    compliance: 91,
    lastModified: "2024-01-13" 
  },
  { 
    id: 4, 
    name: "Performance Issue SLA", 
    category: "Performance", 
    priority: "Medium", 
    responseTime: "2 hours", 
    resolutionTime: "24 hours",
    escalationLevels: 3,
    status: "Active", 
    compliance: 89,
    lastModified: "2024-01-12" 
  },
  { 
    id: 5, 
    name: "Application Bug SLA", 
    category: "Software", 
    priority: "Low", 
    responseTime: "4 hours", 
    resolutionTime: "72 hours",
    escalationLevels: 2,
    status: "Active", 
    compliance: 85,
    lastModified: "2024-01-11" 
  },
];

export default function SLAManagementPage() {
  const [activeTab, setActiveTab] = useState('service');
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Set active tab based on URL parameter
  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab && ['service', 'incident'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Handle tab change and update URL
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const newUrl = `/admin/sla-management?tab=${value}`;
    router.push(newUrl);
  };

  const handleSLAClick = (sla: any) => {
    router.push(`/admin/sla-management/view?id=${sla.id}&type=${activeTab}`);
  };

  const handleAddSLA = () => {
    router.push(`/admin/sla-management/add?type=${activeTab}`);
  };

  const handleEditSLA = (sla: any) => {
    router.push(`/admin/sla-management/edit?id=${sla.id}&type=${activeTab}`);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'border-red-500 text-red-700 bg-red-50';
      case 'High': return 'border-orange-500 text-orange-700 bg-orange-50';
      case 'Medium': return 'border-yellow-500 text-yellow-700 bg-yellow-50';
      case 'Low': return 'border-green-500 text-green-700 bg-green-50';
      default: return 'border-gray-500 text-gray-700 bg-gray-50';
    }
  };

  const getComplianceColor = (compliance: number) => {
    if (compliance >= 95) return 'text-green-700 bg-green-100';
    if (compliance >= 85) return 'text-yellow-700 bg-yellow-100';
    return 'text-red-700 bg-red-100';
  };

  const renderSLACards = (slaData: any[]) => (
    <div className="grid gap-4">
      {slaData.map((sla) => (
        <Card key={sla.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleSLAClick(sla)}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    {sla.name}
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </h3>
                  <p className="text-slate-600 text-sm mb-2">SLA for {sla.category.toLowerCase()} request processing and fulfillment</p>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className={getPriorityColor(sla.priority)}>
                      {sla.priority}
                    </Badge>
                    <span className="text-sm text-slate-500">Response: {sla.responseTime}</span>
                    <span className="text-sm text-slate-500">Resolution: {sla.resolutionTime}</span>
                    <span className="text-sm text-slate-500">{sla.escalationLevels} levels</span>
                    <Badge variant="secondary" className={getComplianceColor(sla.compliance)}>
                      {sla.compliance}% compliance
                    </Badge>
                    <Badge variant="secondary" className="text-green-700 bg-green-100">
                      {sla.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm">
                  <Eye className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleEditSLA(sla)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderSLAList = () => {
    const currentData = activeTab === 'service' ? mockServiceSLAs : mockIncidentSLAs;
    const filteredData = currentData.filter(sla =>
      sla.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sla.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
                placeholder={`Search ${activeTab} SLAs...`}
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>
          <Button 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={handleAddSLA}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add {activeTab === 'service' ? 'Service' : 'Incident'} SLA
          </Button>
        </div>

        {renderSLACards(filteredData)}
      </div>
    );
  };

  return (
    <SessionWrapper>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 p-6">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => router.push('/admin/settings')}
                className="text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Settings
              </Button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  SLA Management
                </h1>
                <p className="text-slate-600 mt-1">Manage service level agreements and escalation workflows</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:grid-cols-2">
              <TabsTrigger value="service" className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Service SLAs
              </TabsTrigger>
              <TabsTrigger value="incident" className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Incident SLAs
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="service" className="space-y-4">
                {renderSLAList()}
              </TabsContent>
              
              <TabsContent value="incident" className="space-y-4">
                {renderSLAList()}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </SessionWrapper>
  );
}
