"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Trash2, Settings, Users, ArrowUp, ArrowDown, UserCheck } from 'lucide-react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface SupportGroup {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  technicianCount?: number;
}

interface LoadBalanceAssignment {
  id?: number;
  supportGroupId: number;
  supportGroup?: SupportGroup;
  isActive: boolean;
  loadBalanceType: 'load_balancing';
  priority: number;
}

export default function TechnicianAutoAssign() {
  const [assignments, setAssignments] = useState<LoadBalanceAssignment[]>([]);
  const [supportGroups, setSupportGroups] = useState<SupportGroup[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSupportGroups();
    fetchLoadBalanceAssignments();
  }, []);

  const fetchSupportGroups = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/template-support-groups');
      if (response.ok) {
        const result = await response.json();
        setSupportGroups(result.supportGroups || []);
      }
    } catch (error) {
      console.error('Error fetching support groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLoadBalanceAssignments = async () => {
    // This would fetch existing global load balance assignments
    // For now, we'll simulate some existing assignments with global load balancing
    const mockAssignments: LoadBalanceAssignment[] = [
      {
        id: 1,
        supportGroupId: 1,
        supportGroup: { id: 1, name: 'Network Support', description: 'Network infrastructure support team', isActive: true, technicianCount: 5 },
        isActive: true,
        loadBalanceType: 'load_balancing',
        priority: 1
      },
      {
        id: 2,
        supportGroupId: 2,
        supportGroup: { id: 2, name: 'Software Support', description: 'Software application support team', isActive: true, technicianCount: 8 },
        isActive: true,
        loadBalanceType: 'load_balancing',
        priority: 2
      },
      {
        id: 3,
        supportGroupId: 3,
        supportGroup: { id: 3, name: 'Hardware Support', description: 'Hardware maintenance team', isActive: true, technicianCount: 3 },
        isActive: false,
        loadBalanceType: 'load_balancing',
        priority: 3
      }
    ];
    setAssignments(mockAssignments);
  };

  const handleRemoveAssignment = (index: number) => {
    const newAssignments = assignments.filter((_, i) => i !== index);
    // Recalculate priorities
    const updatedAssignments = newAssignments.map((assignment, i) => ({
      ...assignment,
      priority: i + 1
    }));
    setAssignments(updatedAssignments);
  };

  const handleToggleActive = (index: number) => {
    const newAssignments = [...assignments];
    newAssignments[index].isActive = !newAssignments[index].isActive;
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

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Load Balancing Configuration
            </CardTitle>
            <p className="text-xs text-slate-600 mt-1">
              Configure global load balancing for technician auto-assignment across all support groups
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Assignments */}
        {assignments.length > 0 ? (
          <div className="space-y-3">
            {assignments.map((assignment, index) => (
              <div
                key={`${assignment.supportGroupId}-${index}`}
                className={`p-3 rounded-lg border transition-all ${
                  assignment.isActive
                    ? 'border-slate-200 bg-white'
                    : 'border-slate-100 bg-slate-50 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => movePriority(index, 'up')}
                        disabled={index === 0}
                        className="h-5 w-5 p-0 text-slate-400 hover:text-slate-600"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => movePriority(index, 'down')}
                        disabled={index === assignments.length - 1}
                        className="h-5 w-5 p-0 text-slate-400 hover:text-slate-600"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full font-medium text-xs">
                      {assignment.priority}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-700">
                          {assignment.supportGroup?.name || `Group ${assignment.supportGroupId}`}
                        </span>
                        {assignment.supportGroup?.technicianCount && (
                          <Badge variant="outline" className="text-xs">
                            {assignment.supportGroup.technicianCount} technicians
                          </Badge>
                        )}
                      </div>
                      {assignment.supportGroup?.description && (
                        <p className="text-xs text-slate-500 mt-1">
                          {assignment.supportGroup.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="text-xs bg-blue-100 text-blue-700">
                          Load Balancing
                        </Badge>
                        <div className="flex items-center gap-1">
                          {assignment.isActive ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-green-500" />
                              <span className="text-xs text-green-600">Active</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3 h-3 text-slate-400" />
                              <span className="text-xs text-slate-500">Inactive</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge className="text-xs bg-blue-100 text-blue-700">
                      Load Balancing
                    </Badge>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(index)}
                      className={`h-8 w-8 p-0 ${
                        assignment.isActive
                          ? 'text-green-600 hover:text-green-700'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <UserCheck className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAssignment(index)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-200 rounded-lg">
            <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-medium mb-1">No load balancing groups found</p>
            <p className="text-sm">Configure support groups in the system to enable auto-assignment with load balancing</p>
          </div>
        )}

        {/* Global Settings Info */}
        {assignments.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <Settings className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">Global Load Balancing Configuration</p>
                <p className="text-blue-700">
                  This configuration applies to all service templates with auto-assignment enabled.
                  Support groups are tried in priority order using intelligent load balancing to distribute tickets evenly among available technicians.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
