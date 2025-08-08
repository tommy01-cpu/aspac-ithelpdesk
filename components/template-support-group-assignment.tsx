"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Search, Users, Plus, Trash2, Edit3, ArrowUp, ArrowDown, 
  Settings, CheckCircle2, AlertCircle, UserCheck 
} from 'lucide-react';

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
  priority: number;
}

interface SupportGroupAssignmentProps {
  templateId?: number;
  assignments: SupportGroupAssignment[];
  onAssignmentsChange: (assignments: SupportGroupAssignment[]) => void;
}

export default function TemplateSupportGroupAssignment({ 
  templateId, 
  assignments, 
  onAssignmentsChange 
}: SupportGroupAssignmentProps) {
  const [supportGroups, setSupportGroups] = useState<SupportGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  useEffect(() => {
    fetchSupportGroups();
  }, []);

  const fetchSupportGroups = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/template-support-groups');
      if (response.ok) {
        const result = await response.json();
        setSupportGroups(result.supportGroups || []);
      } else {
        console.error('API Error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching support groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAssignment = () => {
    if (!selectedGroupId) return;

    const supportGroup = supportGroups.find(sg => sg.id === parseInt(selectedGroupId));
    if (!supportGroup) return;

    // Check if already assigned
    const alreadyAssigned = assignments.some(a => a.supportGroupId === parseInt(selectedGroupId));
    if (alreadyAssigned) {
      alert('This support group is already assigned');
      return;
    }

    const newAssignment: SupportGroupAssignment = {
      supportGroupId: parseInt(selectedGroupId),
      supportGroup: supportGroup,
      isActive: true,
      priority: assignments.length + 1
    };

    onAssignmentsChange([...assignments, newAssignment]);
    setIsAddModalOpen(false);
    setSelectedGroupId('');
  };

  const handleRemoveAssignment = (index: number) => {
    const newAssignments = assignments.filter((_, i) => i !== index);
    // Recalculate priorities
    const updatedAssignments = newAssignments.map((assignment, i) => ({
      ...assignment,
      priority: i + 1
    }));
    onAssignmentsChange(updatedAssignments);
  };

  const handleToggleActive = (index: number) => {
    const newAssignments = [...assignments];
    newAssignments[index].isActive = !newAssignments[index].isActive;
    onAssignmentsChange(newAssignments);
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

    onAssignmentsChange(newAssignments);
  };

  const availableGroups = supportGroups.filter(sg => 
    !assignments.some(a => a.supportGroupId === sg.id) &&
    (searchTerm === '' || sg.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Support Group Assignment
            </CardTitle>
            <p className="text-xs text-slate-600 mt-1">
              Assign support groups for auto-assignment with load balancing
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Group
          </Button>
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
                  
                  <div className="flex items-center gap-1">
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
            <p className="font-medium mb-1">No support groups assigned</p>
            <p className="text-sm">Add support groups to enable auto-assignment for approved requests</p>
          </div>
        )}


      </CardContent>

      {/* Add Support Group Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Support Group</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search support groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Support Group Selection */}
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">
                Support Group
              </Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a support group..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {loading ? (
                    <SelectItem value="loading" disabled>
                      Loading support groups...
                    </SelectItem>
                  ) : availableGroups.length > 0 ? (
                    availableGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id.toString()}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{group.name}</span>
                          {group.technicianCount && (
                            <Badge variant="outline" className="text-xs">
                              {group.technicianCount} techs
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      {searchTerm ? 'No groups found' : 'No available groups'}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddAssignment}
              disabled={!selectedGroupId}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Add Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
