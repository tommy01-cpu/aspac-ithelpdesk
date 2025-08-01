"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Settings, Users, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

interface SupportGroup {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  technicianCount?: number;
}

interface SupportGroupAssignment {
  id?: number;
  supportGroupId: number;
  supportGroup?: SupportGroup;
  isActive: boolean;
  loadBalanceType: 'round_robin' | 'least_load' | 'random';
  priority: number;
}

interface SupportGroupAssignmentProps {
  slaId?: number;
  onAssignmentsChange?: (assignments: SupportGroupAssignment[]) => void;
}

const loadBalanceOptions = [
  { value: 'round_robin', label: 'Round Robin', description: 'Distribute tickets equally among technicians' },
  { value: 'least_load', label: 'Least Load', description: 'Assign to technician with fewest active tickets' },
  { value: 'random', label: 'Random', description: 'Randomly assign to available technicians' }
];

export default function SupportGroupAssignment({ slaId, onAssignmentsChange }: SupportGroupAssignmentProps) {
  const [assignments, setAssignments] = useState<SupportGroupAssignment[]>([]);
  const [availableSupportGroups, setAvailableSupportGroups] = useState<SupportGroup[]>([]);
  const [loading, setLoading] = useState(false);

  // Load available support groups
  useEffect(() => {
    const fetchSupportGroups = async () => {
      try {
        const response = await fetch('/api/support-groups');
        const data = await response.json();
        
        if (response.ok) {
          setAvailableSupportGroups(data.supportGroups || []);
        }
      } catch (error) {
        console.error('Error fetching support groups:', error);
      }
    };

    fetchSupportGroups();
  }, []);

  // Load existing assignments if editing
  useEffect(() => {
    if (slaId) {
      const fetchAssignments = async () => {
        try {
          setLoading(true);
          const response = await fetch(`/api/sla/${slaId}/support-groups`);
          const data = await response.json();
          
          if (response.ok) {
            setAssignments(data.supportGroups || []);
          }
        } catch (error) {
          console.error('Error fetching SLA support group assignments:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchAssignments();
    }
  }, [slaId]);

  // Notify parent of changes
  useEffect(() => {
    onAssignmentsChange?.(assignments);
  }, [assignments, onAssignmentsChange]);

  const addAssignment = () => {
    const newAssignment: SupportGroupAssignment = {
      supportGroupId: 0,
      isActive: true,
      loadBalanceType: 'round_robin',
      priority: assignments.length + 1
    };
    setAssignments([...assignments, newAssignment]);
  };

  const removeAssignment = (index: number) => {
    const newAssignments = assignments.filter((_, i) => i !== index);
    // Update priorities
    const updatedAssignments = newAssignments.map((assignment, i) => ({
      ...assignment,
      priority: i + 1
    }));
    setAssignments(updatedAssignments);
  };

  const updateAssignment = (index: number, updates: Partial<SupportGroupAssignment>) => {
    const newAssignments = [...assignments];
    newAssignments[index] = { ...newAssignments[index], ...updates };
    setAssignments(newAssignments);
  };

  const movePriority = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === assignments.length - 1)
    ) {
      return;
    }

    const newAssignments = [...assignments];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap the assignments
    [newAssignments[index], newAssignments[targetIndex]] = 
    [newAssignments[targetIndex], newAssignments[index]];
    
    // Update priorities
    newAssignments.forEach((assignment, i) => {
      assignment.priority = i + 1;
    });

    setAssignments(newAssignments);
  };

  const getAvailableSupportGroups = (currentIndex: number) => {
    const selectedIds = assignments
      .filter((_, index) => index !== currentIndex)
      .map(a => a.supportGroupId);
    
    return availableSupportGroups.filter(sg => 
      sg.isActive && !selectedIds.includes(sg.id)
    );
  };

  const getSupportGroupById = (id: number) => {
    return availableSupportGroups.find(sg => sg.id === id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-gray-900">Support Groups</h4>
          <p className="text-sm text-gray-600">
            Configure which support groups will receive auto-assigned tickets
          </p>
        </div>
        <Button
          onClick={addAssignment}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Group
        </Button>
      </div>

      {assignments.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Support Groups Assigned</h3>
            <p className="text-gray-600 mb-4">
              Add support groups to enable automatic ticket assignment with load balancing
            </p>
            <Button onClick={addAssignment} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Support Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment, index) => {
            const supportGroup = getSupportGroupById(assignment.supportGroupId);
            const availableGroups = getAvailableSupportGroups(index);
            
            return (
              <Card key={index} className="bg-slate-50 border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Priority Controls */}
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => movePriority(index, 'up')}
                        disabled={index === 0}
                        className="h-6 w-6 p-0"
                      >
                        <ArrowUpDown className="w-3 h-3" />
                      </Button>
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-xs font-medium text-blue-600">{assignment.priority}</span>
                      </div>
                    </div>

                    <div className="flex-1 space-y-4">
                      {/* Support Group Selection */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Support Group</Label>
                          <Select
                            value={assignment.supportGroupId.toString()}
                            onValueChange={(value) => updateAssignment(index, { 
                              supportGroupId: parseInt(value),
                              supportGroup: getSupportGroupById(parseInt(value))
                            })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select support group" />
                            </SelectTrigger>
                            <SelectContent>
                              {assignment.supportGroupId > 0 && supportGroup && (
                                <SelectItem value={assignment.supportGroupId.toString()}>
                                  {supportGroup.name}
                                  {supportGroup.technicianCount && (
                                    <span className="text-xs text-gray-500 ml-1">
                                      ({supportGroup.technicianCount} technicians)
                                    </span>
                                  )}
                                </SelectItem>
                              )}
                              {availableGroups.map((group) => (
                                <SelectItem key={group.id} value={group.id.toString()}>
                                  {group.name}
                                  {group.technicianCount && (
                                    <span className="text-xs text-gray-500 ml-1">
                                      ({group.technicianCount} technicians)
                                    </span>
                                  )}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Load Balance Type</Label>
                          <Select
                            value={assignment.loadBalanceType}
                            onValueChange={(value: 'round_robin' | 'least_load' | 'random') => 
                              updateAssignment(index, { loadBalanceType: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {loadBalanceOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  <div className="flex flex-col">
                                    <span>{option.label}</span>
                                    <span className="text-xs text-gray-500">{option.description}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Status and Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={assignment.isActive}
                              onCheckedChange={(checked) => updateAssignment(index, { isActive: checked })}
                            />
                            <Label className="text-sm">Active</Label>
                          </div>
                          {supportGroup && (
                            <Badge variant="outline" className="text-xs">
                              {supportGroup.technicianCount || 0} technicians
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAssignment(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {assignments.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <Settings className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900">Auto-Assignment Rules</p>
              <p className="text-blue-700">
                Tickets matching this SLA will be automatically assigned to technicians from these support groups
                based on priority order and load balancing settings.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
