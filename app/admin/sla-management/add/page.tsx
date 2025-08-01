"use client";

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SessionWrapper } from '@/components/session-wrapper';

export default function AddSLAPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slaType = searchParams?.get('type') || 'service'; // service or incident

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
      level2Enabled: false,
      level2Days: '',
      level2Hours: '',
      level2Minutes: '',
      level3Enabled: false,
      level3Days: '',
      level3Hours: '',
      level3Minutes: '',
      level4Enabled: false,
      level4Days: '',
      level4Hours: '',
      level4Minutes: ''
    }
  });

  const handleSave = () => {
    console.log('Creating SLA:', slaForm);
    // Here you would typically save to your backend
    router.push(`/admin/sla-management?tab=${slaType}`);
  };

  const handleCancel = () => {
    router.push(`/admin/sla-management?tab=${slaType}`);
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
                  onClick={handleCancel}
                  className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    Create {slaType === 'service' ? 'Service' : 'Incident'} SLA
                  </h1>
                  <p className="text-xs text-gray-600">Define service level agreements and escalation workflows</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-blue-600 border-blue-600">
                  {slaType === 'service' ? 'Service SLA' : 'Incident SLA'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto p-6">

          {/* Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create {slaType === 'service' ? 'Service' : 'Incident'} SLA</CardTitle>
                <p className="text-slate-600 text-sm">Fill in all the required information to create a new SLA</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
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

                {/* Request Matching Criteria */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Request Matching Criteria</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium">Match the below criteria</span>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                          <input 
                            type="radio" 
                            id="match-all" 
                            name="matchType" 
                            value="all" 
                            checked={slaForm.matchType === 'all'}
                            onChange={(e) => setSlaForm(prev => ({ ...prev, matchType: 'all' }))}
                            className="text-blue-600" 
                          />
                          <Label htmlFor="match-all" className="text-sm">Match ALL of the following (AND)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input 
                            type="radio" 
                            id="match-any" 
                            name="matchType" 
                            value="any" 
                            checked={slaForm.matchType === 'any'}
                            onChange={(e) => setSlaForm(prev => ({ ...prev, matchType: 'any' }))}
                            className="text-blue-600" 
                          />
                          <Label htmlFor="match-any" className="text-sm">Match ANY of the following (OR)</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Response Time */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Response Time</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="response-days">Days</Label>
                      <Input
                        id="response-days"
                        type="number"
                        value={slaForm.responseTime.days}
                        onChange={(e) => setSlaForm(prev => ({
                          ...prev,
                          responseTime: { ...prev.responseTime, days: e.target.value }
                        }))}
                        placeholder="0"
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="response-hours">Hours</Label>
                      <Input
                        id="response-hours"
                        type="number"
                        value={slaForm.responseTime.hours}
                        onChange={(e) => setSlaForm(prev => ({
                          ...prev,
                          responseTime: { ...prev.responseTime, hours: e.target.value }
                        }))}
                        placeholder="0"
                        min="0"
                        max="23"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="response-minutes">Minutes</Label>
                      <Input
                        id="response-minutes"
                        type="number"
                        value={slaForm.responseTime.minutes}
                        onChange={(e) => setSlaForm(prev => ({
                          ...prev,
                          responseTime: { ...prev.responseTime, minutes: e.target.value }
                        }))}
                        placeholder="0"
                        min="0"
                        max="59"
                      />
                    </div>
                  </div>
                  <div className="text-sm text-slate-600">
                    Response Time: {(() => {
                      const days = slaForm.responseTime.days || '';
                      const hours = slaForm.responseTime.hours || '';
                      const minutes = slaForm.responseTime.minutes || '';
                      
                      const parts = [];
                      if (days && parseInt(days) > 0) parts.push(`${days} day${parseInt(days) === 1 ? '' : 's'}`);
                      if (hours && parseInt(hours) > 0) parts.push(`${hours} hour${parseInt(hours) === 1 ? '' : 's'}`);
                      if (minutes && parseInt(minutes) > 0) parts.push(`${minutes} minute${parseInt(minutes) === 1 ? '' : 's'}`);
                      
                      return parts.length > 0 ? parts.join(' ') : 'Not set';
                    })()}
                  </div>
                </div>

                {/* Resolution Time */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Resolution Time</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="resolution-days">Days</Label>
                      <Input
                        id="resolution-days"
                        type="number"
                        value={slaForm.resolutionTime.days}
                        onChange={(e) => setSlaForm(prev => ({
                          ...prev,
                          resolutionTime: { ...prev.resolutionTime, days: e.target.value }
                        }))}
                        placeholder="0"
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="resolution-hours">Hours</Label>
                      <Input
                        id="resolution-hours"
                        type="number"
                        value={slaForm.resolutionTime.hours}
                        onChange={(e) => setSlaForm(prev => ({
                          ...prev,
                          resolutionTime: { ...prev.resolutionTime, hours: e.target.value }
                        }))}
                        placeholder="8"
                        min="0"
                        max="23"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="resolution-minutes">Minutes</Label>
                      <Input
                        id="resolution-minutes"
                        type="number"
                        value={slaForm.resolutionTime.minutes}
                        onChange={(e) => setSlaForm(prev => ({
                          ...prev,
                          resolutionTime: { ...prev.resolutionTime, minutes: e.target.value }
                        }))}
                        placeholder="0"
                        min="0"
                        max="59"
                      />
                    </div>
                  </div>
                  <div className="text-sm text-slate-600">
                    Resolution Time: {getResolutionTimeDisplay() || 'Not set'}
                  </div>
                </div>

                {/* Operational Hours */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Operational Hours</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="operationalHours"
                        checked={slaForm.operationalHours.enabled}
                        onCheckedChange={(checked) => setSlaForm(prev => ({
                          ...prev,
                          operationalHours: { ...prev.operationalHours, enabled: checked === true }
                        }))}
                      />
                      <Label htmlFor="operationalHours" className="text-sm">Consider Operational Hours Only</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="excludeHolidays"
                        checked={slaForm.operationalHours.excludeHolidays}
                        onCheckedChange={(checked) => setSlaForm(prev => ({
                          ...prev,
                          operationalHours: { ...prev.operationalHours, excludeHolidays: checked === true }
                        }))}
                      />
                      <Label htmlFor="excludeHolidays" className="text-sm">Exclude Holidays</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="excludeWeekends"
                        checked={slaForm.operationalHours.excludeWeekends}
                        onCheckedChange={(checked) => setSlaForm(prev => ({
                          ...prev,
                          operationalHours: { ...prev.operationalHours, excludeWeekends: checked === true }
                        }))}
                      />
                      <Label htmlFor="excludeWeekends" className="text-sm">Exclude Weekends</Label>
                    </div>
                  </div>
                </div>

                {/* Response Escalation */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Response Escalation</h3>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="responseEscalation"
                      checked={slaForm.responseEscalation.enabled}
                      onCheckedChange={(checked) => setSlaForm(prev => ({
                        ...prev,
                        responseEscalation: { ...prev.responseEscalation, enabled: checked === true }
                      }))}
                    />
                    <Label htmlFor="responseEscalation" className="text-sm">Enable Response Escalation</Label>
                  </div>
                </div>

                {/* Resolution Escalation */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Resolution Escalation</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="resolutionEscalation"
                        checked={slaForm.resolutionEscalation.enabled}
                        onCheckedChange={(checked) => setSlaForm(prev => ({
                          ...prev,
                          resolutionEscalation: { ...prev.resolutionEscalation, enabled: checked === true }
                        }))}
                      />
                      <Label htmlFor="resolutionEscalation" className="text-sm">Enable Resolution Escalation</Label>
                    </div>

                    {slaForm.resolutionEscalation.enabled && (
                      <div className="border rounded-lg p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="escalateTo">Escalate To</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select escalation target" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="senior-tech">Senior Technician</SelectItem>
                                <SelectItem value="admin">Administrator</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="escalateType">Escalate</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select escalation timing" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="before">Before due time</SelectItem>
                                <SelectItem value="after">After due time</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="escalate-days">Days</Label>
                            <Input
                              id="escalate-days"
                              type="number"
                              value={slaForm.resolutionEscalation.escalateDays}
                              onChange={(e) => setSlaForm(prev => ({
                                ...prev,
                                resolutionEscalation: { ...prev.resolutionEscalation, escalateDays: e.target.value }
                              }))}
                              placeholder="0"
                              min="0"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="escalate-hours">Hours</Label>
                            <Input
                              id="escalate-hours"
                              type="number"
                              value={slaForm.resolutionEscalation.escalateHours}
                              onChange={(e) => setSlaForm(prev => ({
                                ...prev,
                                resolutionEscalation: { ...prev.resolutionEscalation, escalateHours: e.target.value }
                              }))}
                              placeholder="0"
                              min="0"
                              max="23"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="escalate-minutes">Minutes</Label>
                            <Input
                              id="escalate-minutes"
                              type="number"
                              value={slaForm.resolutionEscalation.escalateMinutes}
                              onChange={(e) => setSlaForm(prev => ({
                                ...prev,
                                resolutionEscalation: { ...prev.resolutionEscalation, escalateMinutes: e.target.value }
                              }))}
                              placeholder="0"
                              min="0"
                              max="59"
                            />
                          </div>
                        </div>
                        <div className="text-sm text-slate-600">
                          Escalation Time: {(() => {
                            const days = slaForm.resolutionEscalation.escalateDays || '';
                            const hours = slaForm.resolutionEscalation.escalateHours || '';
                            const minutes = slaForm.resolutionEscalation.escalateMinutes || '';
                            
                            const parts = [];
                            if (days && parseInt(days) > 0) parts.push(`${days} day${parseInt(days) === 1 ? '' : 's'}`);
                            if (hours && parseInt(hours) > 0) parts.push(`${hours} hour${parseInt(hours) === 1 ? '' : 's'}`);
                            if (minutes && parseInt(minutes) > 0) parts.push(`${minutes} minute${parseInt(minutes) === 1 ? '' : 's'}`);
                            
                            return parts.length > 0 ? parts.join(' ') : 'Not set';
                          })()}
                        </div>

                        <div className="space-y-4">
                          <h4 className="font-medium text-slate-900">Escalation Levels</h4>
                          
                          {/* Level 2 Escalation */}
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="enableLevel2"
                                checked={slaForm.resolutionEscalation.level2Enabled}
                                onCheckedChange={(checked) => setSlaForm(prev => ({
                                  ...prev,
                                  resolutionEscalation: { ...prev.resolutionEscalation, level2Enabled: checked === true }
                                }))}
                              />
                              <Label htmlFor="enableLevel2" className="text-sm font-medium">Enable Level 2 Escalation</Label>
                            </div>
                            {slaForm.resolutionEscalation.level2Enabled && (
                              <div className="ml-6 space-y-3 border-l-2 border-orange-200 pl-4">
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="level2-days">Days</Label>
                                    <Input
                                      id="level2-days"
                                      type="number"
                                      value={slaForm.resolutionEscalation.level2Days}
                                      onChange={(e) => setSlaForm(prev => ({
                                        ...prev,
                                        resolutionEscalation: { ...prev.resolutionEscalation, level2Days: e.target.value }
                                      }))}
                                      placeholder="0"
                                      min="0"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="level2-hours">Hours</Label>
                                    <Input
                                      id="level2-hours"
                                      type="number"
                                      value={slaForm.resolutionEscalation.level2Hours}
                                      onChange={(e) => setSlaForm(prev => ({
                                        ...prev,
                                        resolutionEscalation: { ...prev.resolutionEscalation, level2Hours: e.target.value }
                                      }))}
                                      placeholder="0"
                                      min="0"
                                      max="23"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="level2-minutes">Minutes</Label>
                                    <Input
                                      id="level2-minutes"
                                      type="number"
                                      value={slaForm.resolutionEscalation.level2Minutes}
                                      onChange={(e) => setSlaForm(prev => ({
                                        ...prev,
                                        resolutionEscalation: { ...prev.resolutionEscalation, level2Minutes: e.target.value }
                                      }))}
                                      placeholder="0"
                                      min="0"
                                      max="59"
                                    />
                                  </div>
                                </div>
                                <div className="text-sm text-orange-600">
                                  Level 2 Escalation Time: {(() => {
                                    const days = slaForm.resolutionEscalation.level2Days || '';
                                    const hours = slaForm.resolutionEscalation.level2Hours || '';
                                    const minutes = slaForm.resolutionEscalation.level2Minutes || '';
                                    
                                    const parts = [];
                                    if (days && parseInt(days) > 0) parts.push(`${days} day${parseInt(days) === 1 ? '' : 's'}`);
                                    if (hours && parseInt(hours) > 0) parts.push(`${hours} hour${parseInt(hours) === 1 ? '' : 's'}`);
                                    if (minutes && parseInt(minutes) > 0) parts.push(`${minutes} minute${parseInt(minutes) === 1 ? '' : 's'}`);
                                    
                                    return parts.length > 0 ? parts.join(' ') : 'Not set';
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Level 3 Escalation */}
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="enableLevel3"
                                checked={slaForm.resolutionEscalation.level3Enabled}
                                onCheckedChange={(checked) => setSlaForm(prev => ({
                                  ...prev,
                                  resolutionEscalation: { ...prev.resolutionEscalation, level3Enabled: checked === true }
                                }))}
                              />
                              <Label htmlFor="enableLevel3" className="text-sm font-medium">Enable Level 3 Escalation</Label>
                            </div>
                            {slaForm.resolutionEscalation.level3Enabled && (
                              <div className="ml-6 space-y-3 border-l-2 border-red-200 pl-4">
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="level3-days">Days</Label>
                                    <Input
                                      id="level3-days"
                                      type="number"
                                      value={slaForm.resolutionEscalation.level3Days}
                                      onChange={(e) => setSlaForm(prev => ({
                                        ...prev,
                                        resolutionEscalation: { ...prev.resolutionEscalation, level3Days: e.target.value }
                                      }))}
                                      placeholder="0"
                                      min="0"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="level3-hours">Hours</Label>
                                    <Input
                                      id="level3-hours"
                                      type="number"
                                      value={slaForm.resolutionEscalation.level3Hours}
                                      onChange={(e) => setSlaForm(prev => ({
                                        ...prev,
                                        resolutionEscalation: { ...prev.resolutionEscalation, level3Hours: e.target.value }
                                      }))}
                                      placeholder="0"
                                      min="0"
                                      max="23"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="level3-minutes">Minutes</Label>
                                    <Input
                                      id="level3-minutes"
                                      type="number"
                                      value={slaForm.resolutionEscalation.level3Minutes}
                                      onChange={(e) => setSlaForm(prev => ({
                                        ...prev,
                                        resolutionEscalation: { ...prev.resolutionEscalation, level3Minutes: e.target.value }
                                      }))}
                                      placeholder="0"
                                      min="0"
                                      max="59"
                                    />
                                  </div>
                                </div>
                                <div className="text-sm text-red-600">
                                  Level 3 Escalation Time: {(() => {
                                    const days = slaForm.resolutionEscalation.level3Days || '';
                                    const hours = slaForm.resolutionEscalation.level3Hours || '';
                                    const minutes = slaForm.resolutionEscalation.level3Minutes || '';
                                    
                                    const parts = [];
                                    if (days && parseInt(days) > 0) parts.push(`${days} day${parseInt(days) === 1 ? '' : 's'}`);
                                    if (hours && parseInt(hours) > 0) parts.push(`${hours} hour${parseInt(hours) === 1 ? '' : 's'}`);
                                    if (minutes && parseInt(minutes) > 0) parts.push(`${minutes} minute${parseInt(minutes) === 1 ? '' : 's'}`);
                                    
                                    return parts.length > 0 ? parts.join(' ') : 'Not set';
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Level 4 Escalation */}
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="enableLevel4"
                                checked={slaForm.resolutionEscalation.level4Enabled}
                                onCheckedChange={(checked) => setSlaForm(prev => ({
                                  ...prev,
                                  resolutionEscalation: { ...prev.resolutionEscalation, level4Enabled: checked === true }
                                }))}
                              />
                              <Label htmlFor="enableLevel4" className="text-sm font-medium">Enable Level 4 Escalation</Label>
                            </div>
                            {slaForm.resolutionEscalation.level4Enabled && (
                              <div className="ml-6 space-y-3 border-l-2 border-purple-200 pl-4">
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="level4-days">Days</Label>
                                    <Input
                                      id="level4-days"
                                      type="number"
                                      value={slaForm.resolutionEscalation.level4Days}
                                      onChange={(e) => setSlaForm(prev => ({
                                        ...prev,
                                        resolutionEscalation: { ...prev.resolutionEscalation, level4Days: e.target.value }
                                      }))}
                                      placeholder="0"
                                      min="0"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="level4-hours">Hours</Label>
                                    <Input
                                      id="level4-hours"
                                      type="number"
                                      value={slaForm.resolutionEscalation.level4Hours}
                                      onChange={(e) => setSlaForm(prev => ({
                                        ...prev,
                                        resolutionEscalation: { ...prev.resolutionEscalation, level4Hours: e.target.value }
                                      }))}
                                      placeholder="0"
                                      min="0"
                                      max="23"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="level4-minutes">Minutes</Label>
                                    <Input
                                      id="level4-minutes"
                                      type="number"
                                      value={slaForm.resolutionEscalation.level4Minutes}
                                      onChange={(e) => setSlaForm(prev => ({
                                        ...prev,
                                        resolutionEscalation: { ...prev.resolutionEscalation, level4Minutes: e.target.value }
                                      }))}
                                      placeholder="0"
                                      min="0"
                                      max="59"
                                    />
                                  </div>
                                </div>
                                <div className="text-sm text-purple-600">
                                  Level 4 Escalation Time: {(() => {
                                    const days = slaForm.resolutionEscalation.level4Days || '';
                                    const hours = slaForm.resolutionEscalation.level4Hours || '';
                                    const minutes = slaForm.resolutionEscalation.level4Minutes || '';
                                    
                                    const parts = [];
                                    if (days && parseInt(days) > 0) parts.push(`${days} day${parseInt(days) === 1 ? '' : 's'}`);
                                    if (hours && parseInt(hours) > 0) parts.push(`${hours} hour${parseInt(hours) === 1 ? '' : 's'}`);
                                    if (minutes && parseInt(minutes) > 0) parts.push(`${minutes} minute${parseInt(minutes) === 1 ? '' : 's'}`);
                                    
                                    return parts.length > 0 ? parts.join(' ') : 'Not set';
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-6 border-t">
                  <Button 
                    variant="outline" 
                    onClick={handleCancel}
                    className="flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </Button>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                    onClick={handleSave}
                    disabled={!slaForm.name.trim()}
                  >
                    <Save className="w-4 h-4" />
                    Create SLA
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SessionWrapper>
  );
}
