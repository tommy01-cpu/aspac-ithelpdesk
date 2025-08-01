'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight, MoreHorizontal, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

interface SupportGroup {
  id: string;
  groupName: string;
  description: string;
  technicians: string[];
  technicianIds: number[];
  isActive: boolean;
  technicianCount?: number;
  createdAt?: string;
  updatedAt?: string;
  notifications: {
    newRequest: boolean;
    leftUnpicked: boolean;
    requestUpdated: boolean;
  };
  groupEmail: string;
  senderName: string;
  senderEmail: string;
}

interface User {
  id: number;
  emp_fname: string;
  emp_lname: string;
  emp_email: string;
  emp_code: string;
  post_des: string;
  department: string;
}

const availableUsers: User[] = [];

export default function SupportGroupsPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<SupportGroup | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  
  const [supportGroups, setSupportGroups] = useState<SupportGroup[]>([]);

  const [newGroup, setNewGroup] = useState<Partial<SupportGroup>>({
    groupName: '',
    description: '',
    technicians: [],
    technicianIds: [],
    notifications: {
      newRequest: false,
      leftUnpicked: false,
      requestUpdated: false
    },
    groupEmail: '',
    senderName: '',
    senderEmail: ''
  });

  // Fetch support groups from API
  const fetchSupportGroups = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/support-groups?page=${currentPage}&limit=${pageSize}&search=${searchTerm}`);
      const data = await response.json();
      
      if (data.success) {
        setSupportGroups(data.data);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch support groups",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching support groups:', error);
      toast({
        title: "Error",
        description: "Failed to fetch support groups",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch active technician users from API
  const fetchActiveTechnicians = async () => {
    try {
      const response = await fetch('/api/users/technicians');
      const data = await response.json();
      
      if (data.success) {
        setActiveUsers(data.data);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch technicians",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching technicians:', error);
      toast({
        title: "Error",
        description: "Failed to fetch technicians",
        variant: "destructive",
      });
    }
  };

  // Load data on component mount and when dependencies change
  useEffect(() => {
    fetchSupportGroups();
  }, [currentPage, pageSize, searchTerm]);

  useEffect(() => {
    fetchActiveTechnicians();
  }, []);

  const filteredGroups = supportGroups;

  const totalPages = Math.ceil(supportGroups.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, supportGroups.length);
  const currentGroups = supportGroups;

  const handleSelectGroup = (groupId: string) => {
    setSelectedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleSelectAll = () => {
    if (selectedGroups.length === currentGroups.length) {
      setSelectedGroups([]);
    } else {
      setSelectedGroups(currentGroups.map(group => group.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedGroups.length === 0) return;

    try {
      setLoading(true);
      const response = await fetch('/api/support-groups/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: selectedGroups }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: data.message || "Support groups deleted successfully",
        });
        setSelectedGroups([]);
        fetchSupportGroups();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete support groups",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting support groups:', error);
      toast({
        title: "Error",
        description: "Failed to delete support groups",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddGroup = async () => {
    if (!newGroup.groupName) {
      toast({
        title: "Error",
        description: "Group name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/support-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groupName: newGroup.groupName,
          description: newGroup.description,
          technicianIds: newGroup.technicianIds || [],
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: data.message || "Support group created successfully",
        });
        setNewGroup({
          groupName: '',
          description: '',
          technicians: [],
          technicianIds: [],
          notifications: {
            newRequest: false,
            leftUnpicked: false,
            requestUpdated: false
          },
          groupEmail: '',
          senderName: '',
          senderEmail: ''
        });
        setIsAddModalOpen(false);
        fetchSupportGroups();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create support group",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating support group:', error);
      toast({
        title: "Error",
        description: "Failed to create support group",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditGroup = async () => {
    if (!editingGroup || !editingGroup.groupName) {
      toast({
        title: "Error",
        description: "Group name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/support-groups/${editingGroup.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groupName: editingGroup.groupName,
          description: editingGroup.description,
          technicianIds: editingGroup.technicianIds || [],
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: data.message || "Support group updated successfully",
        });
        setEditingGroup(null);
        setIsEditModalOpen(false);
        fetchSupportGroups();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update support group",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating support group:', error);
      toast({
        title: "Error",
        description: "Failed to update support group",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this support group?')) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/support-groups/${groupId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: data.message || "Support group deleted successfully",
        });
        fetchSupportGroups();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete support group",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting support group:', error);
      toast({
        title: "Error",
        description: "Failed to delete support group",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (group: SupportGroup) => {
    setEditingGroup({ ...group });
    setIsEditModalOpen(true);
  };

  const handleTechnicianMove = (direction: 'add' | 'remove', user: User | number, isEdit = false) => {
    const userId = typeof user === 'number' ? user : user.id;
    const userName = typeof user === 'number' 
      ? (() => {
          const foundUser = activeUsers.find(u => u.id === user);
          return foundUser ? `${foundUser.emp_fname} ${foundUser.emp_lname}` : '';
        })()
      : `${user.emp_fname} ${user.emp_lname}`;

    console.log('Moving technician:', { direction, userId, userName, isEdit });

    if (isEdit && editingGroup) {
      const currentTechnicianIds = editingGroup.technicianIds || [];
      const currentTechnicians = editingGroup.technicians || [];
      
      if (direction === 'add') {
        const newIds = [...currentTechnicianIds, userId];
        const newNames = [...currentTechnicians, userName];
        console.log('Edit mode - adding:', { newIds, newNames });
        
        setEditingGroup(prev => prev ? {
          ...prev,
          technicianIds: newIds,
          technicians: newNames
        } : null);
      } else {
        const newIds = currentTechnicianIds.filter(id => id !== userId);
        const newNames = currentTechnicians.filter(name => name !== userName);
        console.log('Edit mode - removing:', { newIds, newNames });
        
        setEditingGroup(prev => prev ? {
          ...prev,
          technicianIds: newIds,
          technicians: newNames
        } : null);
      }
    } else {
      const currentTechnicianIds = newGroup.technicianIds || [];
      const currentTechnicians = newGroup.technicians || [];
      
      if (direction === 'add') {
        const newIds = [...currentTechnicianIds, userId];
        const newNames = [...currentTechnicians, userName];
        console.log('New group - adding:', { newIds, newNames });
        
        setNewGroup(prev => ({
          ...prev,
          technicianIds: newIds,
          technicians: newNames
        }));
      } else {
        const newIds = currentTechnicianIds.filter(id => id !== userId);
        const newNames = currentTechnicians.filter(name => name !== userName);
        console.log('New group - removing:', { newIds, newNames });
        
        setNewGroup(prev => ({
          ...prev,
          technicianIds: newIds,
          technicians: newNames
        }));
      }
    }
  };

  const getAvailableForSelection = (isEdit = false) => {
    const selectedIds = isEdit 
      ? (editingGroup?.technicianIds || [])
      : (newGroup.technicianIds || []);
    
    return activeUsers.filter(user => !selectedIds.includes(user.id));
  };

  const handleSelectAllTechnicians = (isEdit = false) => {
    const availableUsers = getAvailableForSelection(isEdit);
    const userIds = availableUsers.map(user => user.id);
    const userNames = availableUsers.map(user => `${user.emp_fname} ${user.emp_lname}`);

    console.log('Select all technicians:', { isEdit, availableUsers: availableUsers.length, userIds, userNames });

    if (isEdit && editingGroup) {
      const currentTechnicianIds = editingGroup.technicianIds || [];
      const currentTechnicians = editingGroup.technicians || [];
      
      const newIds = [...currentTechnicianIds, ...userIds];
      const newNames = [...currentTechnicians, ...userNames];
      
      console.log('Edit mode - select all result:', { newIds, newNames });
      
      setEditingGroup(prev => prev ? {
        ...prev,
        technicianIds: newIds,
        technicians: newNames
      } : null);
    } else {
      const currentTechnicianIds = newGroup.technicianIds || [];
      const currentTechnicians = newGroup.technicians || [];
      
      const newIds = [...currentTechnicianIds, ...userIds];
      const newNames = [...currentTechnicians, ...userNames];
      
      console.log('New group - select all result:', { newIds, newNames });
      
      setNewGroup(prev => ({
        ...prev,
        technicianIds: newIds,
        technicians: newNames
      }));
    }
  };

  const handleDeselectAllTechnicians = (isEdit = false) => {
    if (isEdit) {
      setEditingGroup(prev => prev ? ({ ...prev, technicians: [], technicianIds: [] }) : null);
    } else {
      setNewGroup(prev => ({ ...prev, technicians: [], technicianIds: [] }));
    }
  };

  const getSelectedTechnicians = (isEdit = false) => {
    const selectedIds = isEdit 
      ? (editingGroup?.technicianIds || [])
      : (newGroup.technicianIds || []);
    
    return activeUsers.filter(user => selectedIds.includes(user.id));
  };

  return (
    <div className="p-0">
      {/* Header Section */}
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Support Groups</h2>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search support groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full sm:w-80"
          />
        </div>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mt-4">
          
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
           
            
            {/* Add Group Button */}    
            
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2">
                  <Plus className="w-4 h-4 mr-2" />
                  New Support Group
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <ChevronLeft className="w-4 h-4" />
                    Add New Group
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="groupName">Name <span className="text-red-600">*</span></Label>
                      <Input
                        id="groupName"
                        value={newGroup.groupName}
                        onChange={(e) => setNewGroup(prev => ({ ...prev, groupName: e.target.value }))}
                        placeholder="Enter group name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newGroup.description}
                        onChange={(e) => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Enter group description"
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Technicians Section */}
                  <div className="space-y-2">
                    <Label>Technicians <span className="text-red-600">*</span></Label>

                    <div className="flex flex-wrap gap-6 mt-2">
                      {/* Available Technicians */}
                      <div className="flex-1 min-w-[300px] max-w-[400px]">
                        <Label className="text-sm font-medium">Available Technicians</Label>
                        <div className="border rounded-md h-60 overflow-y-auto p-3 bg-gray-50">
                          {getAvailableForSelection().length > 0 ? (
                            getAvailableForSelection().map((user) => (
                              <div
                                key={user.id}
                                className="flex items-center justify-between p-2 hover:bg-gray-100 rounded text-sm"
                              >
                                <span title={`${user.emp_code} - ${user.department || 'No Department'}`}>
                                  {`${user.emp_fname} ${user.emp_lname}`}
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleTechnicianMove('add', user)}
                                  className="h-6 w-6 p-0"
                                >
                                  →
                                </Button>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500 italic">No available technicians</p>
                          )}
                        </div>
                      </div>

                      {/* Move Buttons */}
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSelectAllTechnicians()}
                        >
                          &gt;&gt;
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeselectAllTechnicians()}
                        >
                          &lt;&lt;
                        </Button>
                      </div>

                      {/* Selected Technicians */}
                      <div className="flex-1 min-w-[300px] max-w-[400px]">
                        <Label className="text-sm font-medium">Selected Technicians</Label>
                        <div className="border rounded-md h-60 overflow-y-auto p-3 bg-gray-50">
                          {getSelectedTechnicians().length > 0 ? (
                            getSelectedTechnicians().map((user) => (
                              <div
                                key={user.id}
                                className="flex items-center justify-between p-2 hover:bg-gray-100 rounded text-sm"
                              >
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleTechnicianMove('remove', user)}
                                  className="h-6 w-6 p-0"
                                >
                                  ←
                                </Button>
                                <span title={`${user.emp_code} - ${user.department || 'No Department'}`}>
                                  {`${user.emp_fname} ${user.emp_lname}`}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500 italic">No selected technicians</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>



                  {/* Action Buttons */}
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => setIsAddModalOpen(false)}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddGroup}
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Edit className="w-4 h-4" />
                    Edit Support Group
                  </DialogTitle>
                </DialogHeader>

                {editingGroup && (
                  <div className="space-y-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="editGroupName">Name <span className="text-red-600">*</span></Label>
                        <Input
                          id="editGroupName"
                          value={editingGroup.groupName}
                          onChange={(e) => setEditingGroup(prev => prev ? ({ ...prev, groupName: e.target.value }) : null)}
                          placeholder="Enter group name"
                        />
                      </div>

                      <div>
                        <Label htmlFor="editDescription">Description</Label>
                        <Textarea
                          id="editDescription"
                          value={editingGroup.description}
                          onChange={(e) => setEditingGroup(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                          placeholder="Enter group description"
                          rows={3}
                        />
                      </div>
                    </div>

                    {/* Technicians Section */}
                    <div className="space-y-2">
                      <Label>Technicians <span className="text-red-600">*</span></Label>

                      <div className="flex flex-wrap gap-6 mt-2">
                        {/* Available Technicians */}
                        <div className="flex-1 min-w-[300px] max-w-[400px]">
                          <Label className="text-sm font-medium">Available Technicians</Label>
                          <div className="border rounded-md h-60 overflow-y-auto p-3 bg-gray-50">
                            {getAvailableForSelection(true).length > 0 ? (
                              getAvailableForSelection(true).map((user) => (
                                <div
                                  key={user.id}
                                  className="flex items-center justify-between p-2 hover:bg-gray-100 rounded text-sm"
                                >
                                  <span title={`${user.emp_code} - ${user.department || 'No Department'}`}>
                                    {`${user.emp_fname} ${user.emp_lname}`}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleTechnicianMove('add', user, true)}
                                    className="h-6 w-6 p-0"
                                  >
                                    →
                                  </Button>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-gray-500 italic">No available technicians</p>
                            )}
                          </div>
                        </div>

                        {/* Move Buttons */}
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelectAllTechnicians(true)}
                          >
                            &gt;&gt;
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeselectAllTechnicians(true)}
                          >
                            &lt;&lt;
                          </Button>
                        </div>

                        {/* Selected Technicians */}
                        <div className="flex-1 min-w-[300px] max-w-[400px]">
                          <Label className="text-sm font-medium">Selected Technicians</Label>
                          <div className="border rounded-md h-60 overflow-y-auto p-3 bg-gray-50">
                            {getSelectedTechnicians(true).length > 0 ? (
                              getSelectedTechnicians(true).map((user) => (
                                <div
                                  key={user.id}
                                  className="flex items-center justify-between p-2 hover:bg-gray-100 rounded text-sm"
                                >
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleTechnicianMove('remove', user, true)}
                                    className="h-6 w-6 p-0"
                                  >
                                    ←
                                  </Button>
                                  <span title={`${user.emp_code} - ${user.department || 'No Department'}`}>
                                    {`${user.emp_fname} ${user.emp_lname}`}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-gray-500 italic">No selected technicians</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>



                    {/* Action Buttons */}
                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => setIsEditModalOpen(false)}
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleEditGroup}
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={loading}
                      >
                        {loading ? 'Updating...' : 'Update'}
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={handleDeleteSelected}
              disabled={selectedGroups.length === 0 || loading}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {loading ? 'Deleting...' : 'Delete'}
            </Button>
            <span className="text-sm text-slate-600">
              {supportGroups.length > 0 ? `1 - ${supportGroups.length} of ${supportGroups.length}` : '0 results'}
            </span>
          </div>
        
          {/* Results count and pagination info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || loading}
                className="h-8 px-3"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-slate-600">Page {currentPage} of {totalPages || 1}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages || 1, prev + 1))}
                disabled={currentPage === totalPages || totalPages <= 1 || loading}
                className="h-8 px-3"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Show</span>
              <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
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
      {/* End Header Section */}

      {/* Table Section */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left">
                <input 
                  type="checkbox" 
                  className="rounded border-slate-300"
                  checked={selectedGroups.length === currentGroups.length && currentGroups.length > 0}
                  onChange={(e) => handleSelectAll()}
                />
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">
                Group Name
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">
                Description
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">
                Technicians
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  Loading support groups...
                </td>
              </tr>
            ) : supportGroups.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  No support groups found
                </td>
              </tr>
            ) : (
              currentGroups.map((group) => (
                <tr key={group.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300"
                      checked={selectedGroups.includes(group.id)}
                      onChange={() => handleSelectGroup(group.id)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-900">{group.groupName}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-600 max-w-xs truncate" title={group.description}>
                      {group.description}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-600">
                      {group.technicians.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {group.technicians.slice(0, 2).map((tech, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tech}
                            </Badge>
                          ))}
                          {group.technicians.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{group.technicians.length - 2} more
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">No technicians</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1"
                        onClick={() => openEditModal(group)}
                        disabled={loading}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
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
}
