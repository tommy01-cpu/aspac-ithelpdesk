"use client";

import { useState, useEffect } from 'react';
import { ArrowLeft, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import SupportGroupAssignment from '@/components/support-group-assignment';

interface SLAFormProps {
  slaType: 'service' | 'incident';
  editingSLA?: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (slaData: any) => void;
}

export default function SLAForm({ slaType, editingSLA, isOpen, onClose, onSave }: SLAFormProps) {
  const [slaForm, setSlaForm] = useState({
    name: '',
    description: '',
    matchType: 'all' as 'all' | 'any',
    criteria: [],
    responseTime: {
      days: '',
      hours: '',
      minutes: ''
    },
    resolutionTime: {
      days: '',
      hours: '8',
      minutes: ''
    },
    operationalHours: {
      enabled: false,
      excludeHolidays: false,
      excludeWeekends: false
    },
    responseEscalation: {
      enabled: false
    },
    resolutionEscalation: {
      enabled: false,
      escalateTo: '',
      escalateType: 'after' as 'before' | 'after',
      escalateDays: '',
      escalateHours: '',
      escalateMinutes: '',
      levels: [
        {
          id: '1',
          enabled: true,
          name: 'Level 1 Escalation',
          days: '',
          hours: '2',
          minutes: '',
          escalateTo: 'Manager'
        },
        {
          id: '2',
          enabled: false,
          name: 'Level 2 Escalation',
          days: '',
          hours: '4',
          minutes: '',
          escalateTo: 'Senior Manager'
        },
        {
          id: '3',
          enabled: false,
          name: 'Level 3 Escalation',
          days: '',
          hours: '8',
          minutes: '',
          escalateTo: 'Director'
        },
        {
          id: '4',
          enabled: false,
          name: 'Level 4 Escalation',
          days: '1',
          hours: '',
          minutes: '',
          escalateTo: 'Executive'
        }
      ]
    }
  });

  useEffect(() => {
    if (editingSLA) {
      // Parse existing SLA data for editing
      setSlaForm(prev => ({
        ...prev,
        name: editingSLA.name || '',
        description: editingSLA.description || '',
        responseTime: {
          days: '',
          hours: editingSLA.responseTime?.split(' ')[0] || '',
          minutes: ''
        },
        resolutionTime: {
          days: editingSLA.resolutionTime?.split(' ')[0] || '',
          hours: '',
          minutes: ''
        }
      }));
    } else {
      // Reset form for new SLA
      setSlaForm({
        name: '',
        description: '',
        matchType: 'all',
        criteria: [],
        responseTime: {
          days: '',
          hours: '',
          minutes: ''
        },
        resolutionTime: {
          days: '',
          hours: '8',
          minutes: ''
        },
        operationalHours: {
          enabled: false,
          excludeHolidays: false,
          excludeWeekends: false
        },
        responseEscalation: {
          enabled: false
        },
        resolutionEscalation: {
          enabled: false,
          escalateTo: '',
          escalateType: 'after',
          escalateDays: '',
          escalateHours: '',
          escalateMinutes: '',
          levels: [
            {
              id: '1',
              enabled: true,
              name: 'Level 1 Escalation',
              days: '',
              hours: '2',
              minutes: '',
              escalateTo: 'Manager'
            },
            {
              id: '2',
              enabled: false,
              name: 'Level 2 Escalation',
              days: '',
              hours: '4',
              minutes: '',
              escalateTo: 'Senior Manager'
            },
            {
              id: '3',
              enabled: false,
              name: 'Level 3 Escalation',
              days: '',
              hours: '8',
              minutes: '',
              escalateTo: 'Director'
            },
            {
              id: '4',
              enabled: false,
              name: 'Level 4 Escalation',
              days: '1',
              hours: '',
              minutes: '',
              escalateTo: 'Executive'
            }
          ]
        }
      });
    }
  }, [editingSLA, isOpen]);

  const handleSave = () => {
    console.log(editingSLA ? 'Updating SLA:' : 'Creating SLA:', slaForm);
    onSave(slaForm);
  };

  const getResolutionTimeDisplay = () => {
    const { days, hours, minutes } = slaForm.resolutionTime;
    if (!days && !hours && !minutes) return '';
    
    const parts = [];
    if (days) parts.push(`${days} Days`);
    if (hours) parts.push(`${hours} Hrs`);
    if (minutes) parts.push(`${minutes} Mins`);
    
    return parts.join(' ');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto">
      <div className="bg-white w-full max-w-6xl min-h-screen">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl border-b border-purple-200/60 sticky top-0 z-40">
          <div className="w-full px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    {editingSLA ? 'Edit' : 'Create'} {slaType === 'service' ? 'Service' : 'Incident'} SLA
                  </h1>
                  <p className="text-xs text-gray-600">
                    {editingSLA ? 'Modify' : 'Define'} service level agreements and escalation workflows
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-blue-600 border-blue-600">
                  {slaType === 'service' ? 'Service SLA' : 'Incident SLA'}
                </Badge>
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                  <Save className="w-4 h-4 mr-2" />
                  {editingSLA ? 'Update' : 'Create'} SLA
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto p-6">
          {/* Form */}
          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sla-name">
                      SLA Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="sla-name"
                      value={slaForm.name}
                      onChange={(e) => setSlaForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter SLA name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sla-description">Description</Label>
                    <Textarea
                      id="sla-description"
                      value={slaForm.description}
                      onChange={(e) => setSlaForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter SLA description"
                      rows={3}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Response Time */}
            <Card>
              <CardHeader>
                <CardTitle>Response Time</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Days</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={slaForm.responseTime.days}
                      onChange={(e) => setSlaForm(prev => ({
                        ...prev,
                        responseTime: { ...prev.responseTime, days: e.target.value }
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hours</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={slaForm.responseTime.hours}
                      onChange={(e) => setSlaForm(prev => ({
                        ...prev,
                        responseTime: { ...prev.responseTime, hours: e.target.value }
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Minutes</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={slaForm.responseTime.minutes}
                      onChange={(e) => setSlaForm(prev => ({
                        ...prev,
                        responseTime: { ...prev.responseTime, minutes: e.target.value }
                      }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resolution Time */}
            <Card>
              <CardHeader>
                <CardTitle>Resolution Time</CardTitle>
                {getResolutionTimeDisplay() && (
                  <p className="text-sm text-gray-600">Resolution Time: {getResolutionTimeDisplay()}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Days</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={slaForm.resolutionTime.days}
                      onChange={(e) => setSlaForm(prev => ({
                        ...prev,
                        resolutionTime: { ...prev.resolutionTime, days: e.target.value }
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hours</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={slaForm.resolutionTime.hours}
                      onChange={(e) => setSlaForm(prev => ({
                        ...prev,
                        resolutionTime: { ...prev.resolutionTime, hours: e.target.value }
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Minutes</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={slaForm.resolutionTime.minutes}
                      onChange={(e) => setSlaForm(prev => ({
                        ...prev,
                        resolutionTime: { ...prev.resolutionTime, minutes: e.target.value }
                      }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Escalation Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Escalation Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Resolution Escalation */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Resolution Escalation</h4>
                      <p className="text-sm text-gray-600">Configure escalation levels for resolution time breaches</p>
                    </div>
                    <Switch
                      checked={slaForm.resolutionEscalation.enabled}
                      onCheckedChange={(checked) => setSlaForm(prev => ({
                        ...prev,
                        resolutionEscalation: { ...prev.resolutionEscalation, enabled: checked }
                      }))}
                    />
                  </div>

                  {slaForm.resolutionEscalation.enabled && (
                    <div className="space-y-4 pl-4 border-l-2 border-blue-200">
                      {slaForm.resolutionEscalation.levels.map((level, index) => (
                        <Card key={level.id} className="bg-slate-50">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${level.enabled ? 'bg-blue-100' : 'bg-slate-200'}`}>
                                  <span className={`text-sm font-medium ${level.enabled ? 'text-blue-600' : 'text-slate-400'}`}>
                                    {index + 1}
                                  </span>
                                </div>
                                <h5 className="font-medium">{level.name}</h5>
                              </div>
                              <Switch
                                checked={level.enabled}
                                onCheckedChange={(checked) => {
                                  const newLevels = [...slaForm.resolutionEscalation.levels];
                                  newLevels[index] = { ...newLevels[index], enabled: checked };
                                  setSlaForm(prev => ({
                                    ...prev,
                                    resolutionEscalation: { ...prev.resolutionEscalation, levels: newLevels }
                                  }));
                                }}
                              />
                            </div>
                            
                            {level.enabled && (
                              <div className="grid grid-cols-4 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-xs">Days</Label>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    value={level.days}
                                    onChange={(e) => {
                                      const newLevels = [...slaForm.resolutionEscalation.levels];
                                      newLevels[index] = { ...newLevels[index], days: e.target.value };
                                      setSlaForm(prev => ({
                                        ...prev,
                                        resolutionEscalation: { ...prev.resolutionEscalation, levels: newLevels }
                                      }));
                                    }}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Hours</Label>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    value={level.hours}
                                    onChange={(e) => {
                                      const newLevels = [...slaForm.resolutionEscalation.levels];
                                      newLevels[index] = { ...newLevels[index], hours: e.target.value };
                                      setSlaForm(prev => ({
                                        ...prev,
                                        resolutionEscalation: { ...prev.resolutionEscalation, levels: newLevels }
                                      }));
                                    }}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Minutes</Label>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    value={level.minutes}
                                    onChange={(e) => {
                                      const newLevels = [...slaForm.resolutionEscalation.levels];
                                      newLevels[index] = { ...newLevels[index], minutes: e.target.value };
                                      setSlaForm(prev => ({
                                        ...prev,
                                        resolutionEscalation: { ...prev.resolutionEscalation, levels: newLevels }
                                      }));
                                    }}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Escalate To</Label>
                                  <Input
                                    placeholder="Manager"
                                    value={level.escalateTo}
                                    onChange={(e) => {
                                      const newLevels = [...slaForm.resolutionEscalation.levels];
                                      newLevels[index] = { ...newLevels[index], escalateTo: e.target.value };
                                      setSlaForm(prev => ({
                                        ...prev,
                                        resolutionEscalation: { ...prev.resolutionEscalation, levels: newLevels }
                                      }));
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Support Group Assignment */}
            {slaType === 'service' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Support Group Assignment
                    <Badge variant="secondary" className="text-xs">Auto-Assignment</Badge>
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    Assign support groups for automatic ticket routing with load balancing
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <SupportGroupAssignment 
                    slaId={editingSLA?.id}
                    onAssignmentsChange={(assignments) => {
                      // Handle support group assignments change
                      console.log('Support group assignments changed:', assignments);
                    }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                <Save className="w-4 h-4 mr-2" />
                {editingSLA ? 'Update' : 'Create'} SLA
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
