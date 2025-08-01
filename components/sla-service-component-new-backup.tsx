'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Clock, Target, AlertCircle, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ServiceSLA {
  id: number;
  name: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  responseTime: number;
  resolutionTime: number;
  operationalHours: boolean;
  autoEscalate: boolean;
  escalationTime: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface SLAFormData {
  name: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  responseTime: {
    days: string;
    hours: string;
    minutes: string;
  };
  resolutionTime: {
    days: string;
    hours: string;
    minutes: string;
  };
  operationalHours: {
    enabled: boolean;
    excludeHolidays: boolean;
    excludeWeekends: boolean;
  };
  escalationLevels: {
    level: number;
    time: {
      days: string;
      hours: string;
      minutes: string;
    };
    assignTo: string;
    notifyChannels: string[];
  }[];
  notifications: {
    enabled: boolean;
    channels: {
      email: boolean;
      sms: boolean;
      slack: boolean;
      teams: boolean;
    };
  };
  status: 'active' | 'inactive';
  autoEscalate: boolean;
  escalationTime: {
    days: string;
    hours: string;
    minutes: string;
  };
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const SLAServiceComponent = () => {
  const [slas, setSLAs] = useState<ServiceSLA[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedSLAs, setSelectedSLAs] = useState<number[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSLA, setEditingSLA] = useState<ServiceSLA | null>(null);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 25,
    total: 0,
    pages: 0
  });

  const [newSLA, setNewSLA] = useState<SLAFormData>({
    name: '',
    description: '',
    priority: 'medium',
    responseTime: {
      days: '0',
      hours: '4',
      minutes: '0'
    },
    resolutionTime: {
      days: '2',
      hours: '0',
      minutes: '0'
    },
    operationalHours: {
      enabled: false,
      excludeHolidays: false,
      excludeWeekends: false
    },
    escalationLevels: [
      {
        level: 1,
        time: {
          days: '0',
          hours: '2',
          minutes: '0'
        },
        assignTo: 'Team Lead',
        notifyChannels: ['email']
      },
      {
        level: 2,
        time: {
          days: '0',
          hours: '4',
          minutes: '0'
        },
        assignTo: 'Manager',
        notifyChannels: ['email', 'slack']
      }
    ],
    notifications: {
      enabled: true,
      channels: {
        email: true,
        sms: false,
        slack: false,
        teams: false
      }
    },
    status: 'active',
    autoEscalate: true,
    escalationTime: {
      days: '0',
      hours: '4',
      minutes: '0'
    }
  });

  // Utility functions to convert between ServiceSLA and SLAFormData
  const convertTimeToMinutes = (time: { days: string; hours: string; minutes: string }): number => {
    const days = parseInt(time.days) || 0;
    const hours = parseInt(time.hours) || 0;
    const minutes = parseInt(time.minutes) || 0;
    return (days * 24 * 60) + (hours * 60) + minutes;
  };

  const convertMinutesToTime = (minutes: number): { days: string; hours: string; minutes: string } => {
    const days = Math.floor(minutes / (24 * 60));
    const remainingAfterDays = minutes % (24 * 60);
    const hours = Math.floor(remainingAfterDays / 60);
    const mins = remainingAfterDays % 60;
    
    return {
      days: days.toString(),
      hours: hours.toString(),
      minutes: mins.toString()
    };
  };

  const convertSLAFormDataToServiceSLA = (formData: SLAFormData): Omit<ServiceSLA, 'id' | 'createdAt'> => {
    return {
      name: formData.name,
      description: formData.description,
      priority: formData.priority,
      responseTime: convertTimeToMinutes(formData.responseTime),
      resolutionTime: convertTimeToMinutes(formData.resolutionTime),
      operationalHours: formData.operationalHours.enabled,
      autoEscalate: formData.autoEscalate,
      escalationTime: convertTimeToMinutes(formData.escalationTime),
      status: formData.status
    };
  };

  const convertServiceSLAToFormData = (sla: ServiceSLA): SLAFormData => {
    return {
      name: sla.name,
      description: sla.description,
      priority: sla.priority,
      responseTime: convertMinutesToTime(sla.responseTime),
      resolutionTime: convertMinutesToTime(sla.resolutionTime),
      operationalHours: {
        enabled: sla.operationalHours,
        excludeHolidays: false,
        excludeWeekends: false
      },
      escalationLevels: [{
        level: 1,
        time: convertMinutesToTime(sla.escalationTime),
        assignTo: '',
        notifyChannels: ['email']
      }],
      notifications: {
        enabled: true,
        channels: {
          email: true,
          sms: false,
          slack: false,
          teams: false
        }
      },
      status: sla.status,
      autoEscalate: sla.autoEscalate,
      escalationTime: convertMinutesToTime(sla.escalationTime)
    };
  };

  // Mock data
  const mockSLAs: ServiceSLA[] = [
    {
      id: 1,
      name: 'Critical Service SLA',
      description: 'SLA for critical business services',
      priority: 'critical',
      responseTime: 1,
      resolutionTime: 4,
      operationalHours: false,
      autoEscalate: true,
      escalationTime: 2,
      status: 'active',
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      name: 'Standard Service SLA',
      description: 'Standard SLA for regular services',
      priority: 'medium',
      responseTime: 4,
      resolutionTime: 24,
      operationalHours: true,
      autoEscalate: true,
      escalationTime: 8,
      status: 'active',
      createdAt: new Date().toISOString(),
    },
  ];

  useEffect(() => {
    setTimeout(() => {
      setSLAs(mockSLAs);
      setPagination({
        page: 1,
        limit: 25,
        total: mockSLAs.length,
        pages: 1
      });
      setLoading(false);
    }, 1000);
  }, []);

  const handleAddSLA = async () => {
    if (newSLA.name && newSLA.description) {
      const convertedSLA = convertSLAFormDataToServiceSLA(newSLA);
      const slaToAdd: ServiceSLA = {
        ...convertedSLA,
        id: Math.max(...slas.map(s => s.id), 0) + 1,
        createdAt: new Date().toISOString(),
      };
      
      setSLAs([...slas, slaToAdd]);
      setNewSLA({
        name: '',
        description: '',
        priority: 'medium',
        responseTime: {
          days: '0',
          hours: '4',
          minutes: '0'
        },
        resolutionTime: {
          days: '2',
          hours: '0',
          minutes: '0'
        },
        operationalHours: {
          enabled: false,
          excludeHolidays: false,
          excludeWeekends: false
        },
        escalationLevels: [],
        notifications: {
          enabled: true,
          channels: {
            email: true,
            sms: false,
            slack: false,
            teams: false
          }
        },
        status: 'active',
        autoEscalate: true,
        escalationTime: {
          days: '0',
          hours: '4',
          minutes: '0'
        }
      });
      setIsAddModalOpen(false);
    }
  };

  const handleEditSLA = (sla: ServiceSLA) => {
    setEditingSLA(sla);
    setNewSLA(convertServiceSLAToFormData(sla));
    setIsEditModalOpen(true);
  };

  const handleUpdateSLA = async () => {
    if (editingSLA && newSLA.name && newSLA.description) {
      const convertedSLA = convertSLAFormDataToServiceSLA(newSLA);
      setSLAs(slas.map(sla => 
        sla.id === editingSLA.id 
          ? { ...sla, ...convertedSLA }
          : sla
      ));
      
      setNewSLA({
        name: '',
        description: '',
        priority: 'medium',
        responseTime: {
          days: '0',
          hours: '4',
          minutes: '0'
        },
        resolutionTime: {
          days: '2',
          hours: '0',
          minutes: '0'
        },
        operationalHours: {
          enabled: false,
          excludeHolidays: false,
          excludeWeekends: false
        },
        escalationLevels: [],
        notifications: {
          enabled: true,
          channels: {
            email: true,
            sms: false,
            slack: false,
            teams: false
          }
        },
        status: 'active',
        autoEscalate: true,
        escalationTime: {
          days: '0',
          hours: '4',
          minutes: '0'
        }
      });
      setEditingSLA(null);
      setIsEditModalOpen(false);
    }
  };

  const handleDeleteSLA = async (slaId: number) => {
    if (confirm('Are you sure you want to delete this SLA?')) {
      setSLAs(slas.filter(sla => sla.id !== slaId));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedSLAs.length === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedSLAs.length} selected SLA(s)?`)) {
      setSLAs(slas.filter(sla => !selectedSLAs.includes(sla.id)));
      setSelectedSLAs([]);
    }
  };

  const handleSelectSLA = (slaId: number) => {
    setSelectedSLAs(prev => 
      prev.includes(slaId) 
        ? prev.filter(id => id !== slaId)
        : [...prev, slaId]
    );
  };

  const handleSelectAll = () => {
    if (selectedSLAs.length === filteredSLAs.length) {
      setSelectedSLAs([]);
    } else {
      setSelectedSLAs(filteredSLAs.map(sla => sla.id));
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredSLAs = slas.filter(sla => 
    sla.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sla.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Service SLA Management</h1>
        
        {/* Search and Filter */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Search service SLAs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
        
        {/* Top Action Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-slate-800 hover:bg-slate-900 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  New Service SLA
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Service SLA</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">SLA Name *</Label>
                      <Input
                        id="name"
                        value={newSLA.name}
                        onChange={(e) => setNewSLA(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter SLA name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="priority">Priority *</Label>
                      <Select value={newSLA.priority} onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') => setNewSLA(prev => ({ ...prev, priority: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newSLA.description}
                      onChange={(e) => setNewSLA(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter SLA description"
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label>Response Time</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-sm text-gray-600">Days</Label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={newSLA.responseTime.days}
                            onChange={(e) => setNewSLA(prev => ({ 
                              ...prev, 
                              responseTime: { ...prev.responseTime, days: e.target.value }
                            }))}
                          />
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Hours</Label>
                          <Input
                            type="number"
                            min="0"
                            max="23"
                            placeholder="0"
                            value={newSLA.responseTime.hours}
                            onChange={(e) => setNewSLA(prev => ({ 
                              ...prev, 
                              responseTime: { ...prev.responseTime, hours: e.target.value }
                            }))}
                          />
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Minutes</Label>
                          <Input
                            type="number"
                            min="0"
                            max="59"
                            placeholder="0"
                            value={newSLA.responseTime.minutes}
                            onChange={(e) => setNewSLA(prev => ({ 
                              ...prev, 
                              responseTime: { ...prev.responseTime, minutes: e.target.value }
                            }))}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <Label>Resolution Time</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-sm text-gray-600">Days</Label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={newSLA.resolutionTime.days}
                            onChange={(e) => setNewSLA(prev => ({ 
                              ...prev, 
                              resolutionTime: { ...prev.resolutionTime, days: e.target.value }
                            }))}
                          />
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Hours</Label>
                          <Input
                            type="number"
                            min="0"
                            max="23"
                            placeholder="0"
                            value={newSLA.resolutionTime.hours}
                            onChange={(e) => setNewSLA(prev => ({ 
                              ...prev, 
                              resolutionTime: { ...prev.resolutionTime, hours: e.target.value }
                            }))}
                          />
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Minutes</Label>
                          <Input
                            type="number"
                            min="0"
                            max="59"
                            placeholder="0"
                            value={newSLA.resolutionTime.minutes}
                            onChange={(e) => setNewSLA(prev => ({ 
                              ...prev, 
                              resolutionTime: { ...prev.resolutionTime, minutes: e.target.value }
                            }))}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label>Escalation Time</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-sm text-gray-600">Days</Label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={newSLA.escalationTime.days}
                            onChange={(e) => setNewSLA(prev => ({ 
                              ...prev, 
                              escalationTime: { ...prev.escalationTime, days: e.target.value }
                            }))}
                          />
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Hours</Label>
                          <Input
                            type="number"
                            min="0"
                            max="23"
                            placeholder="0"
                            value={newSLA.escalationTime.hours}
                            onChange={(e) => setNewSLA(prev => ({ 
                              ...prev, 
                              escalationTime: { ...prev.escalationTime, hours: e.target.value }
                            }))}
                          />
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Minutes</Label>
                          <Input
                            type="number"
                            min="0"
                            max="59"
                            placeholder="0"
                            value={newSLA.escalationTime.minutes}
                            onChange={(e) => setNewSLA(prev => ({ 
                              ...prev, 
                              escalationTime: { ...prev.escalationTime, minutes: e.target.value }
                            }))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="operationalHours"
                        checked={newSLA.operationalHours.enabled}
                        onCheckedChange={(checked) => setNewSLA(prev => ({ 
                          ...prev, 
                          operationalHours: { ...prev.operationalHours, enabled: checked as boolean }
                        }))}
                      />
                      <Label htmlFor="operationalHours">Apply during operational hours only</Label>
                    </div>
                    
                    {newSLA.operationalHours.enabled && (
                      <div className="ml-6 space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="excludeWeekends"
                            checked={newSLA.operationalHours.excludeWeekends}
                            onCheckedChange={(checked) => setNewSLA(prev => ({ 
                              ...prev, 
                              operationalHours: { ...prev.operationalHours, excludeWeekends: checked as boolean }
                            }))}
                          />
                          <Label htmlFor="excludeWeekends">Exclude weekends</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="excludeHolidays"
                            checked={newSLA.operationalHours.excludeHolidays}
                            onCheckedChange={(checked) => setNewSLA(prev => ({ 
                              ...prev, 
                              operationalHours: { ...prev.operationalHours, excludeHolidays: checked as boolean }
                            }))}
                          />
                          <Label htmlFor="excludeHolidays">Exclude holidays</Label>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="autoEscalate"
                        checked={newSLA.autoEscalate}
                        onCheckedChange={(checked) => setNewSLA(prev => ({ ...prev, autoEscalate: checked as boolean }))}
                      />
                      <Label htmlFor="autoEscalate">Auto Escalate</Label>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={newSLA.status} onValueChange={(value: 'active' | 'inactive') => setNewSLA(prev => ({ ...prev, status: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddSLA}>
                    Add Service SLA
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            {/* Edit SLA Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Service SLA</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="editName">SLA Name *</Label>
                      <Input
                        id="editName"
                        value={newSLA.name}
                        onChange={(e) => setNewSLA(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter SLA name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="editPriority">Priority *</Label>
                      <Select value={newSLA.priority} onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') => setNewSLA(prev => ({ ...prev, priority: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="editDescription">Description</Label>
                    <Textarea
                      id="editDescription"
                      value={newSLA.description}
                      onChange={(e) => setNewSLA(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter SLA description"
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label>Response Time</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-sm text-gray-600">Days</Label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={newSLA.responseTime.days}
                            onChange={(e) => setNewSLA(prev => ({ 
                              ...prev, 
                              responseTime: { ...prev.responseTime, days: e.target.value }
                            }))}
                          />
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Hours</Label>
                          <Input
                            type="number"
                            min="0"
                            max="23"
                            placeholder="0"
                            value={newSLA.responseTime.hours}
                            onChange={(e) => setNewSLA(prev => ({ 
                              ...prev, 
                              responseTime: { ...prev.responseTime, hours: e.target.value }
                            }))}
                          />
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Minutes</Label>
                          <Input
                            type="number"
                            min="0"
                            max="59"
                            placeholder="0"
                            value={newSLA.responseTime.minutes}
                            onChange={(e) => setNewSLA(prev => ({ 
                              ...prev, 
                              responseTime: { ...prev.responseTime, minutes: e.target.value }
                            }))}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <Label>Resolution Time</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-sm text-gray-600">Days</Label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={newSLA.resolutionTime.days}
                            onChange={(e) => setNewSLA(prev => ({ 
                              ...prev, 
                              resolutionTime: { ...prev.resolutionTime, days: e.target.value }
                            }))}
                          />
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Hours</Label>
                          <Input
                            type="number"
                            min="0"
                            max="23"
                            placeholder="0"
                            value={newSLA.resolutionTime.hours}
                            onChange={(e) => setNewSLA(prev => ({ 
                              ...prev, 
                              resolutionTime: { ...prev.resolutionTime, hours: e.target.value }
                            }))}
                          />
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Minutes</Label>
                          <Input
                            type="number"
                            min="0"
                            max="59"
                            placeholder="0"
                            value={newSLA.resolutionTime.minutes}
                            onChange={(e) => setNewSLA(prev => ({ 
                              ...prev, 
                              resolutionTime: { ...prev.resolutionTime, minutes: e.target.value }
                            }))}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label>Escalation Time</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-sm text-gray-600">Days</Label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={newSLA.escalationTime.days}
                            onChange={(e) => setNewSLA(prev => ({ 
                              ...prev, 
                              escalationTime: { ...prev.escalationTime, days: e.target.value }
                            }))}
                          />
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Hours</Label>
                          <Input
                            type="number"
                            min="0"
                            max="23"
                            placeholder="0"
                            value={newSLA.escalationTime.hours}
                            onChange={(e) => setNewSLA(prev => ({ 
                              ...prev, 
                              escalationTime: { ...prev.escalationTime, hours: e.target.value }
                            }))}
                          />
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Minutes</Label>
                          <Input
                            type="number"
                            min="0"
                            max="59"
                            placeholder="0"
                            value={newSLA.escalationTime.minutes}
                            onChange={(e) => setNewSLA(prev => ({ 
                              ...prev, 
                              escalationTime: { ...prev.escalationTime, minutes: e.target.value }
                            }))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="editOperationalHours"
                        checked={newSLA.operationalHours.enabled}
                        onCheckedChange={(checked) => setNewSLA(prev => ({ 
                          ...prev, 
                          operationalHours: { ...prev.operationalHours, enabled: checked as boolean }
                        }))}
                      />
                      <Label htmlFor="editOperationalHours">Apply during operational hours only</Label>
                    </div>
                    
                    {newSLA.operationalHours.enabled && (
                      <div className="ml-6 space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="editExcludeWeekends"
                            checked={newSLA.operationalHours.excludeWeekends}
                            onCheckedChange={(checked) => setNewSLA(prev => ({ 
                              ...prev, 
                              operationalHours: { ...prev.operationalHours, excludeWeekends: checked as boolean }
                            }))}
                          />
                          <Label htmlFor="editExcludeWeekends">Exclude weekends</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="editExcludeHolidays"
                            checked={newSLA.operationalHours.excludeHolidays}
                            onCheckedChange={(checked) => setNewSLA(prev => ({ 
                              ...prev, 
                              operationalHours: { ...prev.operationalHours, excludeHolidays: checked as boolean }
                            }))}
                          />
                          <Label htmlFor="editExcludeHolidays">Exclude holidays</Label>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="editAutoEscalate"
                        checked={newSLA.autoEscalate}
                        onCheckedChange={(checked) => setNewSLA(prev => ({ ...prev, autoEscalate: checked as boolean }))}
                      />
                      <Label htmlFor="editAutoEscalate">Auto Escalate</Label>
                    </div>
                  </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="editAutoEscalate"
                        checked={newSLA.autoEscalate}
                        onCheckedChange={(checked) => setNewSLA(prev => ({ ...prev, autoEscalate: checked as boolean }))}
                      />
                      <Label htmlFor="editAutoEscalate">Auto Escalate</Label>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="editStatus">Status</Label>
                    <Select value={newSLA.status} onValueChange={(value: 'active' | 'inactive') => setNewSLA(prev => ({ ...prev, status: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateSLA}>
                    Update Service SLA
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button variant="outline" className="text-red-600 hover:bg-red-50" disabled={selectedSLAs.length === 0} onClick={handleDeleteSelected}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
          
          {/* Right side - Pagination info and controls */}
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-600">
              {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, pagination.total)} of {pagination.total}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-slate-600">
                Page {currentPage} of {pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === pagination.pages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Show</span>
              <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger className="w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-slate-600">per page</span>
            </div>
          </div>
        </div>
      </div>

      {/* Service SLA Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left p-4 w-12">
                <Checkbox
                  checked={selectedSLAs.length === filteredSLAs.length && filteredSLAs.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </th>
              <th className="text-left p-4 font-medium text-slate-900">SLA Name</th>
              <th className="text-left p-4 font-medium text-slate-900">Priority</th>
              <th className="text-left p-4 font-medium text-slate-900">Response Time</th>
              <th className="text-left p-4 font-medium text-slate-900">Resolution Time</th>
              <th className="text-left p-4 font-medium text-slate-900">Auto Escalate</th>
              <th className="text-left p-4 font-medium text-slate-900">Status</th>
              <th className="text-left p-4 font-medium text-slate-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-8">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                </td>
              </tr>
            ) : filteredSLAs.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-slate-500">
                  No service SLAs found
                </td>
              </tr>
            ) : (
              filteredSLAs.map((sla) => (
                <tr key={sla.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-4">
                    <Checkbox
                      checked={selectedSLAs.includes(sla.id)}
                      onCheckedChange={() => handleSelectSLA(sla.id)}
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <Target className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{sla.name}</div>
                        <div className="text-sm text-slate-500">{sla.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(sla.priority)}`}>
                      {sla.priority.charAt(0).toUpperCase() + sla.priority.slice(1)}
                    </span>
                  </td>
                  <td className="p-4 text-slate-900">{sla.responseTime}h</td>
                  <td className="p-4 text-slate-900">{sla.resolutionTime}h</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      sla.autoEscalate ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {sla.autoEscalate ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      sla.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {sla.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800" onClick={() => handleEditSLA(sla)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800" onClick={() => handleDeleteSLA(sla.id)}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
