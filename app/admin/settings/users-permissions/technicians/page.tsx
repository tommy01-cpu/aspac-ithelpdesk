'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight, User, Building, X, Eye, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

// Helper function to generate avatar initials
const generateInitials = (firstName: string, lastName: string) => {
  return `${firstName?.charAt(0)?.toUpperCase() || ''}${lastName?.charAt(0)?.toUpperCase() || ''}`;
};

interface Technician {
  id: string;
  userId: number;
  // ALL user information from users table including new fields
  user: {
    id: number;
    emp_fname: string;
    emp_mid?: string;
    emp_lname: string;
    emp_suffix?: string;
    emp_code?: string;
    emp_email?: string;
    emp_cell?: string;
    post_des?: string;
    department?: string;
    emp_status?: string;
    profile_image?: string;
    description?: string;
    landline_no?: string;
    local_no?: string;
    requester_view_permission?: string;
    reportingTo?: {
      id: number;
      emp_fname: string;
      emp_lname: string;
    };
  };
  // Essential technician fields only (removed status/technicianStatus)
  isActive: boolean;
  isAdmin?: boolean;
  supportGroupMemberships: Array<{
    supportGroup: {
      id: string;
      name: string;
    };
  }>;
  createdAt: string;
  updatedAt: string;
}

interface TechnicianUser {
  id: string;
  emp_fname: string;
  emp_mid?: string;
  emp_lname: string;
  emp_suffix?: string;
  emp_code: string;
  emp_email?: string;
  emp_cell?: string;
  post_des?: string;
  department?: string;
  emp_status: string;
  roles: string[];
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function TechniciansPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);
  const [viewingTechnician, setViewingTechnician] = useState<Technician | null>(null);
  const [loading, setLoading] = useState(false);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 25,
    total: 0,
    pages: 0
  });

  // New state for all users selection
  const [technicianUsers, setTechnicianUsers] = useState<TechnicianUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [newTechnician, setNewTechnician] = useState({
    // User info (read-only from selected user)
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    employeeId: '',
    email: '',
    mobileNumber: '',
    jobTitle: '',
    departmentName: '',
    description: '',
    landlineNo: '',
    localNo: '',
    primaryEmail: '',
    userStatus: '',
    // Only editable technician fields
    isActive: true,
    isAdmin: false,
  });

  // Fetch technicians from API
  const fetchTechnicians = async (page = 1, limit = 25, search = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
      });

      const response = await fetch(`/api/technicians?${params}`);
      const data = await response.json();
      
      if (data.technicians && data.pagination) {
        setTechnicians(data.technicians);
        setPagination(data.pagination);
      } else {
        console.error('Invalid response format:', data);
        setTechnicians([]);
        setPagination({
          page: 1,
          limit: 25,
          total: 0,
          pages: 0
        });
      }
    } catch (error) {
      console.error('Error fetching technicians:', error);
      setTechnicians([]);
      setPagination({
        page: 1,
        limit: 25,
        total: 0,
        pages: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch users with technician role for selection
  const fetchTechnicianUsers = async () => {
    setLoadingUsers(true);
    try {
      const params = new URLSearchParams({
        search: userSearchTerm,
        excludeExistingTechnicians: 'true', // Exclude users who already have technician profiles
        limit: '100' // Get more users for selection
      });

      const response = await fetch(`/api/users?${params}`);
      const data = await response.json();
      
      if (data.success) {
        // Show all users who don't already have technician profiles
        setTechnicianUsers(data.users);
      } else {
        console.error('Error fetching users:', data.error);
        setTechnicianUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setTechnicianUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Load technicians on component mount
  useEffect(() => {
    fetchTechnicians(currentPage, pageSize, searchTerm);
  }, [currentPage, pageSize]);

  // Load all users when modal opens
  useEffect(() => {
    if (isAddModalOpen) {
      fetchTechnicianUsers();
    }
  }, [isAddModalOpen, userSearchTerm]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTechnicians(1, pageSize, searchTerm);
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleAddTechnician = async () => {
    if (selectedUserId) {
      try {
        const response = await fetch('/api/technicians', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: selectedUserId,
            isActive: newTechnician.isActive,
            isAdmin: newTechnician.isAdmin,
          }),
        });

        if (response.ok) {
          setNewTechnician({
            firstName: '',
            middleName: '',
            lastName: '',
            suffix: '',
            employeeId: '',
            email: '',
            mobileNumber: '',
            jobTitle: '',
            departmentName: '',
            description: '',
            landlineNo: '',
            localNo: '',
            primaryEmail: '',
            userStatus: '',
            isActive: true,
            isAdmin: false,
          });
          setSelectedUserId('');
          setUserSearchTerm('');
          setShowSuggestions(false);
          setIsAddModalOpen(false);
          // Refresh both technicians list and available users list
          fetchTechnicians(currentPage, pageSize, searchTerm);
          fetchTechnicianUsers(); // Refresh user dropdown to remove newly added technician
        } else {
          const errorData = await response.json();
          console.error('Error adding technician:', errorData);
          alert(errorData.error || 'Failed to add technician');
        }
      } catch (error) {
        console.error('Error adding technician:', error);
        alert('Failed to add technician');
      }
    } else {
      alert('Please select a user');
    }
  };

  const handleEditTechnician = (technician: Technician) => {
    setEditingTechnician(technician);
    setNewTechnician({
      firstName: technician.user?.emp_fname || '',
      middleName: technician.user?.emp_mid || '',
      lastName: technician.user?.emp_lname || '',
      suffix: technician.user?.emp_suffix || '',
      employeeId: technician.user?.emp_code || '',
      email: technician.user?.emp_email || '',
      mobileNumber: technician.user?.emp_cell || '',
      jobTitle: technician.user?.post_des || '',
      departmentName: technician.user?.department || '',
      description: technician.user?.description || '',
      landlineNo: technician.user?.landline_no || '',
      localNo: technician.user?.local_no || '',
      primaryEmail: technician.user?.emp_email || '',
      userStatus: technician.user?.emp_status || '',
      isActive: technician.isActive,
      isAdmin: technician.isAdmin || false,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateTechnician = async () => {
    if (editingTechnician) {
      try {
        const response = await fetch(`/api/technicians/${editingTechnician.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            isActive: newTechnician.isActive,
            isAdmin: newTechnician.isAdmin,
          }),
        });

        if (response.ok) {
          setNewTechnician({
            firstName: '',
            middleName: '',
            lastName: '',
            suffix: '',
            employeeId: '',
            email: '',
            mobileNumber: '',
            jobTitle: '',
            departmentName: '',
            description: '',
            landlineNo: '',
            localNo: '',
            primaryEmail: '',
            userStatus: '',
            isActive: true,
            isAdmin: false,
          });
          setEditingTechnician(null);
          setIsEditModalOpen(false);
          fetchTechnicians(currentPage, pageSize, searchTerm);
        } else {
          const errorData = await response.json();
          console.error('Error updating technician:', errorData);
          alert(errorData.error || 'Failed to update technician');
        }
      } catch (error) {
        console.error('Error updating technician:', error);
        alert('Failed to update technician');
      }
    } else {
      alert('No technician selected for update');
    }
  };

  const handleDeleteTechnician = async (technicianId: string) => {
    if (confirm('Are you sure you want to delete this technician?')) {
      try {
        const response = await fetch(`/api/technicians/${technicianId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          fetchTechnicians(currentPage, pageSize, searchTerm);
          fetchTechnicianUsers(); // Refresh user dropdown to include deleted technician
        } else {
          const errorData = await response.json();
          console.error('Error deleting technician:', errorData);
          alert(errorData.error || 'Failed to delete technician');
        }
      } catch (error) {
        console.error('Error deleting technician:', error);
        alert('Failed to delete technician');
      }
    }
  };

  const handleViewTechnicianDetails = (technician: Technician) => {
    setViewingTechnician(technician);
    setIsViewModalOpen(true);
  };

  const handleDeleteSelected = async () => {
    if (selectedTechnicians.length === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedTechnicians.length} selected technician(s)?`)) {
      try {
        const deletePromises = selectedTechnicians.map(id => 
          fetch(`/api/technicians/${id}`, { method: 'DELETE' })
        );
        
        const results = await Promise.all(deletePromises);
        const failures = results.filter(r => !r.ok);
        
        if (failures.length === 0) {
          setSelectedTechnicians([]);
          fetchTechnicians(currentPage, pageSize, searchTerm);
          fetchTechnicianUsers(); // Refresh user dropdown
        } else {
          alert(`Failed to delete ${failures.length} technician(s)`);
        }
      } catch (error) {
        console.error('Error deleting technicians:', error);
        alert('Failed to delete technicians');
      }
    }
  };

  const handleSelectTechnician = (technicianId: string) => {
    setSelectedTechnicians(prev => 
      prev.includes(technicianId) 
        ? prev.filter(id => id !== technicianId)
        : [...prev, technicianId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTechnicians.length === technicians.length) {
      setSelectedTechnicians([]);
    } else {
      setSelectedTechnicians(technicians.map(tech => tech.id));
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Technician Management</h1>
        
        {/* Top Action Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-slate-800 hover:bg-slate-900 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  New Technician
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Technician</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {/* User Selection */}
                  <div className="space-y-4">
                   
                    <div>
                      <Label htmlFor="userSelect">Select User *</Label>
                      <div className="relative">
                        <Input
                          id="userSelect"
                          value={userSearchTerm}
                          onChange={(e) => {
                            setUserSearchTerm(e.target.value);
                            setShowSuggestions(true);
                          }}
                          onFocus={() => setShowSuggestions(true)}
                          onBlur={() => {
                            // Small delay to allow clicking on suggestions
                            setTimeout(() => setShowSuggestions(false), 200);
                          }}
                          placeholder="Type to search users..."
                          className="pr-10"
                        />
                        {userSearchTerm && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                            onClick={() => {
                              setUserSearchTerm('');
                              setSelectedUserId('');
                              setShowSuggestions(false);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {/* Suggestions dropdown */}
                        {userSearchTerm && showSuggestions && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {loadingUsers ? (
                              <div className="p-3 text-sm text-gray-500">Loading users...</div>
                            ) : (
                              (() => {
                                const filteredUsers = technicianUsers.filter(user =>
                                  `${user.emp_fname} ${user.emp_lname}`.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                                  user.emp_code.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                                  (user.emp_email && user.emp_email.toLowerCase().includes(userSearchTerm.toLowerCase())) ||
                                  (user.department && user.department.toLowerCase().includes(userSearchTerm.toLowerCase()))
                                );
                                
                                return filteredUsers.length === 0 ? (
                                  <div className="p-3 text-sm text-gray-500">No users found</div>
                                ) : (
                                  filteredUsers.map(user => (
                                    <div
                                      key={user.id}
                                      className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                      onClick={() => {
                                        setSelectedUserId(user.id.toString());
                                        setUserSearchTerm(`${user.emp_code} - ${user.emp_fname} ${user.emp_lname}`);
                                        setShowSuggestions(false);
                                        setNewTechnician(prev => ({
                                          ...prev,
                                          firstName: user.emp_fname,
                                          middleName: user.emp_mid || '',
                                          lastName: user.emp_lname,
                                          suffix: user.emp_suffix || '',
                                          employeeId: user.emp_code,
                                          email: user.emp_email || '',
                                          mobileNumber: user.emp_cell || '',
                                          primaryEmail: user.emp_email || '',
                                          departmentName: user.department || '',
                                          jobTitle: user.post_des || '',
                                          userStatus: user.emp_status || '',
                                          description: '',
                                          landlineNo: '',
                                          localNo: '',
                                        }));
                                      }}
                                    >
                                      <div className="font-medium text-sm">
                                        {user.emp_code} - {user.emp_fname} {user.emp_lname}
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        {user.emp_email} • {user.department || 'No Department'} • {user.post_des || 'No Position'}
                                      </div>
                                    </div>
                                  ))
                                );
                              })()
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* User Information Display - Show when user is selected */}
                    {selectedUserId && (
                      <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="text-md font-semibold text-gray-900">User Information</h4>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                              id="firstName"
                              value={newTechnician.firstName}
                              placeholder="First Name"
                              disabled
                              className="bg-gray-100"
                            />
                          </div>
                          <div>
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input
                              id="lastName"
                              value={newTechnician.lastName}
                              placeholder="Last Name"
                              disabled
                              className="bg-gray-100"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="middleName">Middle Name</Label>
                            <Input
                              id="middleName"
                              value={newTechnician.middleName}
                              placeholder="Enter middle name"
                              disabled
                              className="bg-gray-100"
                            />
                          </div>
                          <div>
                            <Label htmlFor="suffix">Suffix</Label>
                            <Input
                              id="suffix"
                              value={newTechnician.suffix}
                              placeholder="Jr., Sr., III"
                              disabled
                              className="bg-gray-100"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="email"
                              type="email"
                              value={newTechnician.email}
                              placeholder="Enter email address"
                              disabled
                              className="bg-gray-100"
                            />
                          </div>
                          <div>
                            <Label htmlFor="mobile">Mobile Number</Label>
                            <Input
                              id="mobile"
                              value={newTechnician.mobileNumber}
                              placeholder="Enter mobile number"
                              disabled
                              className="bg-gray-100"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="department">Department</Label>
                            <Input
                              id="department"
                              value={newTechnician.departmentName}
                              placeholder="No department"
                              disabled
                              className="bg-gray-100"
                            />
                          </div>
                          <div>
                            <Label htmlFor="position">Position</Label>
                            <Input
                              id="position"
                              value={newTechnician.jobTitle}
                              placeholder="Enter position"
                              disabled
                              className="bg-gray-100"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={newTechnician.description}
                            placeholder="Enter user description or notes"
                            disabled
                            className="bg-gray-100"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="landline">Landline No</Label>
                            <Input
                              id="landline"
                              value={newTechnician.landlineNo}
                              placeholder="Enter landline number"
                              disabled
                              className="bg-gray-100"
                            />
                          </div>
                          <div>
                            <Label htmlFor="local">Local No</Label>
                            <Input
                              id="local"
                              value={newTechnician.localNo}
                              placeholder="Enter local extension"
                              disabled
                              className="bg-gray-100"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Technician Settings - Show below User Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">Technician Settings</h3>
                      <div className="p-4  rounded-lg space-y-4">
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="isAdmin"
                            checked={newTechnician.isAdmin}
                            onCheckedChange={(checked) => setNewTechnician(prev => ({ ...prev, isAdmin: checked as boolean }))}
                          />
                          <Label htmlFor="isAdmin">Admin</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="isActive"
                            checked={newTechnician.isActive}
                            onCheckedChange={(checked) => setNewTechnician(prev => ({ ...prev, isActive: checked as boolean }))}
                          />
                          <Label htmlFor="isActive">Is Active</Label>
                        </div>

                        <div>
                         
                          <div className="mt-2 p-3 border border-blue-200 rounded-md bg-blue-100">
                            <div className="flex items-center space-x-2 text-blue-700">
                              <Info className="h-4 w-4" />
                              <p className="text-sm">You can assign a support group to this technician after creation.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => {
                    setIsAddModalOpen(false);
                    setUserSearchTerm('');
                    setSelectedUserId('');
                    setShowSuggestions(false);
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddTechnician}>
                    Add Technician
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            {/* Edit Technician Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Technician</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {/* Profile Section with Image */}
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                      {editingTechnician?.user?.profile_image ? (
                        <img 
                          src={`/uploads/${editingTechnician.user.profile_image}`} 
                          alt={`${editingTechnician.user?.emp_fname} ${editingTechnician.user?.emp_lname}`}
                          className="w-20 h-20 rounded-full object-cover border-4 border-gray-200 shadow-lg"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg">
                          {generateInitials(editingTechnician?.user?.emp_fname || '', editingTechnician?.user?.emp_lname || '')}
                        </div>
                      )}
                    </div>
                    
                    {/* Name and Job Title */}
                    <div className="text-center">
                      <h2 className="text-xl font-bold text-gray-900">
                        {editingTechnician?.user?.emp_fname} {editingTechnician?.user?.emp_lname}
                      </h2>
                      <p className="text-sm text-gray-600">{editingTechnician?.user?.post_des || 'No Position'}</p>
                    </div>
                  </div>

                  {/* User Information (Read-only) */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">User Information</h3>
                    <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                      
                      {/* Employee ID - At the top */}
                      <div>
                        <Label htmlFor="editEmployeeId">Employee ID</Label>
                        <Input
                          id="editEmployeeId"
                          value={newTechnician.employeeId}
                          placeholder="Employee ID"
                          disabled
                          className="bg-gray-100"
                        />
                      </div>

                      {/* First Name and Last Name */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="editFirstName">First Name</Label>
                          <Input
                            id="editFirstName"
                            value={newTechnician.firstName}
                            placeholder="First Name"
                            disabled
                            className="bg-gray-100"
                          />
                        </div>
                        <div>
                          <Label htmlFor="editLastName">Last Name</Label>
                          <Input
                            id="editLastName"
                            value={newTechnician.lastName}
                            placeholder="Last Name"
                            disabled
                            className="bg-gray-100"
                          />
                        </div>
                      </div>

                      {/* Middle Name and Suffix */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="editMiddleName">Middle Name</Label>
                          <Input
                            id="editMiddleName"
                            value={newTechnician.middleName}
                            placeholder="Enter middle name"
                            disabled
                            className="bg-gray-100"
                          />
                        </div>
                        <div>
                          <Label htmlFor="editSuffix">Suffix</Label>
                          <Input
                            id="editSuffix"
                            value={newTechnician.suffix}
                            placeholder="Jr., Sr., III"
                            disabled
                            className="bg-gray-100"
                          />
                        </div>
                      </div>

                      {/* Email and Mobile Number */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="editEmail">Email</Label>
                          <Input
                            id="editEmail"
                            type="email"
                            value={newTechnician.email}
                            placeholder="Enter email address"
                            disabled
                            className="bg-gray-100"
                          />
                        </div>
                        <div>
                          <Label htmlFor="editMobile">Mobile Number</Label>
                          <Input
                            id="editMobile"
                            value={newTechnician.mobileNumber}
                            placeholder="Enter mobile number"
                            disabled
                            className="bg-gray-100"
                          />
                        </div>
                      </div>

                      {/* Department and Position */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="editDepartment">Department</Label>
                          <Input
                            id="editDepartment"
                            value={newTechnician.departmentName}
                            placeholder="No department"
                            disabled
                            className="bg-gray-100"
                          />
                        </div>
                        <div>
                          <Label htmlFor="editPosition">Position</Label>
                          <Input
                            id="editPosition"
                            value={newTechnician.jobTitle}
                            placeholder="Enter position"
                            disabled
                            className="bg-gray-100"
                          />
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <Label htmlFor="editDescription">Description</Label>
                        <Textarea
                          id="editDescription"
                          value={newTechnician.description}
                          placeholder="Enter user description or notes"
                          disabled
                          className="bg-gray-100"
                        />
                      </div>

                      {/* Landline and Local */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="editLandline">Landline No</Label>
                          <Input
                            id="editLandline"
                            value={newTechnician.landlineNo}
                            placeholder="Enter landline number"
                            disabled
                            className="bg-gray-100"
                          />
                        </div>
                        <div>
                          <Label htmlFor="editLocal">Local No</Label>
                          <Input
                            id="editLocal"
                            value={newTechnician.localNo}
                            placeholder="Enter local extension"
                            disabled
                            className="bg-gray-100"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Technician Settings (Editable) */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Technician Settings</h3>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="editIsAdmin"
                        checked={!!newTechnician.isAdmin}
                        onCheckedChange={(checked) => setNewTechnician(prev => ({ ...prev, isAdmin: checked as boolean }))}
                      />
                      <Label htmlFor="editIsAdmin">Admin</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="editIsActive"
                        checked={newTechnician.isActive}
                        onCheckedChange={(checked) => setNewTechnician(prev => ({ ...prev, isActive: checked as boolean }))}
                      />
                      <Label htmlFor="editIsActive">Is Active</Label>
                    </div>

                    <div>
                      <Label htmlFor="editSupportGroups">Support Groups</Label>
                      <div className="mt-2 space-y-2">
                        {editingTechnician?.supportGroupMemberships && editingTechnician.supportGroupMemberships.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {editingTechnician.supportGroupMemberships.map((membership, index) => (
                              <div
                                key={index}
                                className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200"
                              >
                                {membership.supportGroup.name}
                            
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 border border-blue-200 rounded-md bg-blue-100">
                            <div className="flex items-center space-x-2 text-blue-700">
                              <Info className="h-4 w-4" />
                              <p className="text-sm">No support groups assigned</p>
                            </div>
                          </div>
                        )}
                      
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateTechnician}>
                    Update Technician
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* View Technician Modal */}
            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>View Technician Details</DialogTitle>
                </DialogHeader>
                {viewingTechnician && (
                  <div className="space-y-6 py-4">
                    {/* Profile Section with Image */}
                    <div className="flex flex-col items-center space-y-4">
                      <div className="relative">
                        {viewingTechnician.user?.profile_image ? (
                          <img 
                            src={`/uploads/${viewingTechnician.user.profile_image}`} 
                            alt={`${viewingTechnician.user?.emp_fname} ${viewingTechnician.user?.emp_lname}`}
                            className="w-24 h-24 rounded-full object-cover border-4 border-gray-200 shadow-lg"
                          />
                        ) : (
                          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                            {generateInitials(viewingTechnician.user?.emp_fname || '', viewingTechnician.user?.emp_lname || '')}
                          </div>
                        )}
                      </div>
                      
                      {/* Name and Job Title */}
                      <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900">
                          {viewingTechnician.user?.emp_fname} {viewingTechnician.user?.emp_lname}
                        </h2>
                        <p className="text-lg text-gray-600">{viewingTechnician.user?.post_des || 'No Position'}</p>
                        <p className="text-sm text-gray-500">{viewingTechnician.user?.department || 'No Department'}</p>
                      </div>
                    </div>

                    {/* User Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">User Information</h3>
                      <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                        
                        {/* Employee ID - At the top */}
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Employee ID</Label>
                          <p className="mt-1 text-sm text-gray-900">{viewingTechnician.user?.emp_code || 'N/A'}</p>
                        </div>

                        {/* First Name and Last Name */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">First Name</Label>
                            <p className="mt-1 text-sm text-gray-900">{viewingTechnician.user?.emp_fname || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Last Name</Label>
                            <p className="mt-1 text-sm text-gray-900">{viewingTechnician.user?.emp_lname || 'N/A'}</p>
                          </div>
                        </div>

                        {/* Middle Name and Suffix */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Middle Name</Label>
                            <p className="mt-1 text-sm text-gray-900">{viewingTechnician.user?.emp_mid || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Suffix</Label>
                            <p className="mt-1 text-sm text-gray-900">{viewingTechnician.user?.emp_suffix || 'N/A'}</p>
                          </div>
                        </div>

                        {/* Email and Mobile Number */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Email</Label>
                            <p className="mt-1 text-sm text-gray-900">{viewingTechnician.user?.emp_email || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Mobile Number</Label>
                            <p className="mt-1 text-sm text-gray-900">{viewingTechnician.user?.emp_cell || 'N/A'}</p>
                          </div>
                        </div>

                        {/* Department and Position */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Department</Label>
                            <p className="mt-1 text-sm text-gray-900">{viewingTechnician.user?.department || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Position</Label>
                            <p className="mt-1 text-sm text-gray-900">{viewingTechnician.user?.post_des || 'N/A'}</p>
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Description</Label>
                          <p className="mt-1 text-sm text-gray-900">{viewingTechnician.user?.description || 'N/A'}</p>
                        </div>

                        {/* Landline and Local */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Landline No</Label>
                            <p className="mt-1 text-sm text-gray-900">{viewingTechnician.user?.landline_no || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Local No</Label>
                            <p className="mt-1 text-sm text-gray-900">{viewingTechnician.user?.local_no || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Technician Settings */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">Technician Settings</h3>
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Admin</Label>
                            <p className="mt-1 text-sm text-gray-900">{viewingTechnician.isAdmin ? 'Yes' : 'No'}</p>
                          </div>
                          
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Technician Status</Label>
                            <div className="mt-1">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                viewingTechnician.isActive 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {viewingTechnician.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Support Groups */}
                    {viewingTechnician.supportGroupMemberships && viewingTechnician.supportGroupMemberships.length > 0 ? (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Support Groups</h3>
                        <div className="flex flex-wrap gap-2">
                          {viewingTechnician.supportGroupMemberships.map((membership, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200"
                            >
                              {membership.supportGroup.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Support Groups</h3>
                        <div className="p-3 border border-blue-200 rounded-md bg-blue-100">
                          <div className="flex items-center space-x-2 text-blue-700">
                            <Info className="h-4 w-4" />
                            <p className="text-sm">No support groups assigned</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* System Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">System Information</h3>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Created</Label>
                            <p className="mt-1 text-sm text-gray-900">
                              {new Date(viewingTechnician.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Last Updated</Label>
                            <p className="mt-1 text-sm text-gray-900">
                              {new Date(viewingTechnician.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
                    Close
                  </Button>
                  <Button onClick={() => {
                    setIsViewModalOpen(false);
                    if (viewingTechnician) {
                      handleEditTechnician(viewingTechnician);
                    }
                  }}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Technician
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button variant="outline" className="text-red-600 hover:bg-red-50" disabled={selectedTechnicians.length === 0} onClick={handleDeleteSelected}>
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

      {/* Technicians Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left p-4 w-12">
                <Checkbox
                  checked={selectedTechnicians.length === technicians.length && technicians.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </th>
              <th className="text-left p-4 font-medium text-slate-900">Technician Name</th>
              <th className="text-left p-4 font-medium text-slate-900">Employee ID</th>
              <th className="text-left p-4 font-medium text-slate-900">Department</th>
              <th className="text-left p-4 font-medium text-slate-900">Email</th>
              <th className="text-left p-4 font-medium text-slate-900">Is Active</th>
              <th className="text-left p-4 font-medium text-slate-900">Created At</th>
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
            ) : technicians.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-slate-500">
                  No technicians found
                </td>
              </tr>
            ) : (
              technicians.map((technician) => (
                <tr key={technician.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-4">
                    <Checkbox
                      checked={selectedTechnicians.includes(technician.id)}
                      onCheckedChange={() => handleSelectTechnician(technician.id)}
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {technician.user?.profile_image ? (
                        <img 
                          src={`/uploads/${technician.user.profile_image}`} 
                          alt={`${technician.user?.emp_fname} ${technician.user?.emp_lname}`}
                          className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {technician.user ? generateInitials(technician.user.emp_fname, technician.user.emp_lname) : 'N/A'}
                        </div>
                      )}
                      <div>
                        <button 
                          className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          onClick={() => handleViewTechnicianDetails(technician)}
                        >
                          {technician.user ? `${technician.user.emp_fname} ${technician.user.emp_lname}` : 'N/A'}
                        </button>
                        <div className="text-sm text-slate-600">{technician.user?.post_des || 'N/A'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-slate-900">{technician.user?.emp_code || 'N/A'}</td>
                  <td className="p-4 text-slate-900">{technician.user?.department || 'N/A'}</td>
                  <td className="p-4 text-slate-900">{technician.user?.emp_email || 'N/A'}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      technician.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {technician.isActive ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="p-4 text-slate-900 text-sm">
                    {new Date(technician.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800" onClick={() => handleEditTechnician(technician)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      {/* <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800" onClick={() => handleDeleteTechnician(technician.id)}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button> */}
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