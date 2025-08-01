"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Edit, Clock, AlertTriangle, Target, Users, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SessionWrapper } from '@/components/session-wrapper';

// Mock data - in real app this would come from an API
const getSLADetails = (id: string, type: string) => {
  const mockSLA = {
    id,
    name: "Hardware Request SLA",
    description: "SLA for hardware request processing and fulfillment",
    category: "Hardware",
    priority: "Medium",
    responseTime: "4 hours",
    resolutionTime: "48 hours",
    escalationLevels: 4,
    status: "Active",
    compliance: 95,
    lastModified: "2024-01-15",
    createdBy: "John Doe",
    createdDate: "2024-01-01",
    matchCriteria: "ALL",
    operationalHours: true,
    excludeHolidays: true,
    excludeWeekends: false,
    responseEscalation: true,
    resolutionEscalation: true,
    escalationMatrix: [
      { level: 1, enabled: true, target: "Team Lead", timing: "2 hours before due" },
      { level: 2, enabled: true, target: "Manager", timing: "1 hour before due" },
      { level: 3, enabled: false, target: "Director", timing: "30 minutes before due" },
      { level: 4, enabled: false, target: "VP", timing: "At due time" }
    ],
    metrics: {
      totalRequests: 150,
      onTimeResolution: 142,
      escalatedRequests: 12,
      avgResolutionTime: "36 hours"
    }
  };
  return mockSLA;
};

export default function ViewSLAPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slaId = searchParams?.get('id') || '1';
  const slaType = searchParams?.get('type') || 'service';
  
  const [slaDetails, setSlaDetails] = useState<any>(null);

  useEffect(() => {
    // In real app, fetch SLA details from API
    const details = getSLADetails(slaId, slaType);
    setSlaDetails(details);
  }, [slaId, slaType]);

  const handleEdit = () => {
    router.push(`/admin/sla-management/edit?id=${slaId}&type=${slaType}`);
  };

  const handleBack = () => {
    router.push(`/admin/sla-management?tab=${slaType}`);
  };

  if (!slaDetails) {
    return (
      <SessionWrapper>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
          <div className="container mx-auto p-6">
            <div className="text-center">Loading...</div>
          </div>
        </div>
      </SessionWrapper>
    );
  }

  return (
    <SessionWrapper>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl border-b border-purple-200/60 sticky top-0 z-40">
          <div className="w-full px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    {slaDetails.name}
                  </h1>
                  <p className="text-xs text-gray-600">View SLA details and performance metrics</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-blue-600 border-blue-600">
                  {slaType === 'service' ? 'Service SLA' : 'Incident SLA'}
                </Badge>
                <Button onClick={handleEdit} className="bg-blue-600 hover:bg-blue-700">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit SLA
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">SLA Name</label>
                      <p className="text-sm text-gray-900">{slaDetails.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Category</label>
                      <p className="text-sm text-gray-900">{slaDetails.category}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Priority</label>
                      <Badge variant={slaDetails.priority === 'Critical' ? 'destructive' : 'secondary'}>
                        {slaDetails.priority}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Status</label>
                      <Badge variant={slaDetails.status === 'Active' ? 'default' : 'secondary'}>
                        {slaDetails.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Description</label>
                    <p className="text-sm text-gray-900">{slaDetails.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Created By</label>
                      <p className="text-sm text-gray-900">{slaDetails.createdBy}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Last Modified</label>
                      <p className="text-sm text-gray-900">{slaDetails.lastModified}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Time Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-green-600" />
                    Time Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Response Time</label>
                      <p className="text-sm text-gray-900 font-semibold">{slaDetails.responseTime}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Resolution Time</label>
                      <p className="text-sm text-gray-900 font-semibold">{slaDetails.resolutionTime}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">Operational Settings</label>
                    <div className="flex flex-wrap gap-2">
                      {slaDetails.operationalHours && (
                        <Badge variant="outline" className="text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Operational Hours Only
                        </Badge>
                      )}
                      {slaDetails.excludeHolidays && (
                        <Badge variant="outline" className="text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Exclude Holidays
                        </Badge>
                      )}
                      {slaDetails.excludeWeekends ? (
                        <Badge variant="outline" className="text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Exclude Weekends
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <XCircle className="w-3 h-3 mr-1" />
                          Include Weekends
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Escalation Matrix */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    Escalation Matrix
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {slaDetails.escalationMatrix.map((level: any) => (
                      <div 
                        key={level.level}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          level.enabled 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant={level.enabled ? 'default' : 'secondary'}>
                            Level {level.level}
                          </Badge>
                          <div>
                            <p className="text-sm font-medium">{level.target}</p>
                            <p className="text-xs text-gray-600">{level.timing}</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          {level.enabled ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Metrics */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Compliance Rate</span>
                      <span className="text-sm font-bold text-green-600">{slaDetails.compliance}%</span>
                    </div>
                    <Progress value={slaDetails.compliance} className="h-2" />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Requests</span>
                      <span className="text-sm font-semibold">{slaDetails.metrics.totalRequests}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">On-Time Resolution</span>
                      <span className="text-sm font-semibold text-green-600">{slaDetails.metrics.onTimeResolution}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Escalated Requests</span>
                      <span className="text-sm font-semibold text-orange-600">{slaDetails.metrics.escalatedRequests}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Avg Resolution Time</span>
                      <span className="text-sm font-semibold">{slaDetails.metrics.avgResolutionTime}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-xs">
                      <p className="font-medium">SLA Updated</p>
                      <p className="text-gray-600">Resolution time adjusted to 48 hours</p>
                      <p className="text-gray-500">2 days ago</p>
                    </div>
                    <div className="text-xs">
                      <p className="font-medium">Escalation Triggered</p>
                      <p className="text-gray-600">Level 2 escalation for Request #1234</p>
                      <p className="text-gray-500">5 days ago</p>
                    </div>
                    <div className="text-xs">
                      <p className="font-medium">SLA Created</p>
                      <p className="text-gray-600">Initial SLA configuration set</p>
                      <p className="text-gray-500">2 weeks ago</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </SessionWrapper>
  );
}
