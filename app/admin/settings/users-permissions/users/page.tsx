'use client';

import { useState, useEffect } from 'react';
import { Edit, Trash2, Plus, ChevronLeft, ChevronRight, User as UserIcon, Mail, Phone, Building, IdCard, Briefcase, CheckSquare, X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';

interface User {
  id: number;
  emp_code: string;
  emp_fname: string;
  emp_mid?: string;
  emp_lname: string;
  emp_suffix?: string;
  emp_email: string;
  emp_cell?: string;
  post_des?: string;
  emp_status: string;
  department?: string;
  departmentId?: number;
  created_at: string;
  profile_image?: string;
  username?: string;
  description?: string;
  landline_no?: string;
  local_no?: string;
  reportingToId?: number;
  reportingTo?: {
    id: number;
    emp_fname: string;
    emp_lname: string;
    emp_code: string;
  };
  isServiceApprover?: boolean;
  requester_view_permission?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [reportingUsers, setReportingUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userToView, setUserToView] = useState<User | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);

  const [formData, setFormData] = useState({
    emp_code: '',
    emp_fname: '',
    emp_mid: '',
    emp_lname: '',
    emp_suffix: '',
    emp_email: '',
    emp_cell: '',
    post_des: '',
    department: '',
    departmentId: '',
    emp_status: 'active',
    description: '',
    landline_no: '',
    local_no: '',
    reportingToId: '',
    isServiceApprover: false,
    requester_view_permission: 'own_requests',
  });

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Generate avatar initials
  const generateInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  // Fetch users from database
  useEffect(() => {
    fetchUsers();
    fetchDepartments();
    fetchReportingUsers();
  }, []);

  const fetchReportingUsers = async () => {
    try {
      const response = await fetch('/api/users?limit=1000');
      const data = await response.json();
      
      if (data.success) {
        setReportingUsers(data.users);
      } else {
        console.error('Failed to fetch reporting users:', data.error);
      }
    } catch (error) {
      console.error('Error fetching reporting users:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      console.log('🏢 Fetching departments...');
      const response = await fetch('/api/departments');
      const data = await response.json();
      
      console.log('🏢 Departments API response:', data);
      
      if (data.success) {
        console.log('🏢 Setting departments:', data.departments);
        setDepartments(data.departments);
      } else {
        console.error('Failed to fetch departments:', data.error);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users?limit=1000');
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.users);
      } else {
        console.error('Failed to fetch users:', data.error);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    (user.emp_fname && user.emp_fname.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.emp_lname && user.emp_lname.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.emp_email && user.emp_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.emp_code && user.emp_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.department && user.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.post_des && user.post_des.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const resetForm = () => {
    setFormData({
      emp_code: '',
      emp_fname: '',
      emp_mid: '',
      emp_lname: '',
      emp_suffix: '',
      emp_email: '',
      emp_cell: '',
      post_des: '',
      department: '',
      departmentId: '',
      emp_status: 'active',
      description: '',
      landline_no: '',
      local_no: '',
      reportingToId: '',
      isServiceApprover: false,
      requester_view_permission: 'own_requests',
    });
    setSelectedImage(null);
    setImagePreview('');
    setValidationErrors([]);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('Image size should be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
      }

      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview('');
  };

  const handleAddUser = async () => {
    // Validate required fields
    const errors = [];
    if (!formData.emp_fname) errors.push('emp_fname');
    if (!formData.emp_lname) errors.push('emp_lname');
    if (!formData.emp_email) errors.push('emp_email');
    if (!formData.emp_code) errors.push('emp_code');

    setValidationErrors(errors);

    if (errors.length > 0) {
      alert('Please fill in all required fields');
      return;
    }

    setOperationLoading(true);
    try {
      // Debug logging before submission
      console.log('🚀 FORM SUBMISSION DEBUG:');
      console.log('Form data object:', formData);
      console.log('Department ID specifically:', formData.departmentId);
      console.log('Department name specifically:', formData.department);
      
      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        // Convert boolean values to strings for FormData
        const stringValue = typeof value === 'boolean' ? value.toString() : value;
        formDataToSend.append(key, stringValue);
      });
      
      // Add username and password as employee ID (default)
      formDataToSend.append('username', formData.emp_code);
      formDataToSend.append('password', formData.emp_code);
      
      // Debug FormData contents
      console.log('FormData entries:');
      const entries = Array.from(formDataToSend.entries());
      for (const [key, value] of entries) {
        console.log(`  ${key}: ${value}`);
      }
      
      if (selectedImage) {
        formDataToSend.append('profile_image', selectedImage);
      }

      const response = await fetch('/api/users', {
        method: 'POST',
        body: formDataToSend,
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchUsers(); // Refresh the list
        resetForm();
        setIsAddModalOpen(false);
        alert('User added successfully');
      } else {
        alert('Failed to add user: ' + data.error);
      }
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Failed to add user');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleEditUser = async () => {
    // Validate required fields
    const errors = [];
    if (!formData.emp_fname) errors.push('emp_fname');
    if (!formData.emp_lname) errors.push('emp_lname');
    if (!formData.emp_email) errors.push('emp_email');
    if (!formData.emp_code) errors.push('emp_code');

    setValidationErrors(errors);

    if (!userToEdit || errors.length > 0) {
      alert('Please fill in all required fields');
      return;
    }

    setOperationLoading(true);
    try {
      // Debug logging before submission
      console.log('🔄 EDIT FORM SUBMISSION DEBUG:');
      console.log('Form data object:', formData);
      console.log('Department ID specifically:', formData.departmentId);
      console.log('Department name specifically:', formData.department);
      
      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        // Convert boolean values to strings for FormData
        const stringValue = typeof value === 'boolean' ? value.toString() : value;
        formDataToSend.append(key, stringValue);
      });
      
      // Debug FormData contents
      console.log('FormData entries:');
      const entries = Array.from(formDataToSend.entries());
      for (const [key, value] of entries) {
        console.log(`  ${key}: ${value}`);
      }
      
      if (selectedImage) {
        formDataToSend.append('profile_image', selectedImage);
      }

      const response = await fetch(`/api/users/${userToEdit.id}`, {
        method: 'PUT',
        body: formDataToSend,
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchUsers(); // Refresh the list
        resetForm();
        setUserToEdit(null);
        setIsEditModalOpen(false);
        alert('User updated successfully');
      } else {
        // Show detailed error message
        let errorMessage = 'Failed to update user';
        if (data.error) {
          errorMessage += ': ' + data.error;
        }
        if (data.details) {
          errorMessage += '\nDetails: ' + data.details;
        }
        alert(errorMessage);
        console.error('Update user error:', data);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      // Check if it's a network error or server error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        alert('Failed to update user: Network connection error. Please check your internet connection and try again.');
      } else {
        alert('Failed to update user: An unexpected error occurred. Please try again or contact support if the problem persists.');
      }
    } finally {
      setOperationLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!userToEdit) return;

    if (confirm(`Are you sure you want to reset the password for ${userToEdit.emp_fname} ${userToEdit.emp_lname}? The new password will be their Employee ID: ${userToEdit.emp_code}`)) {
      setOperationLoading(true);
      try {
        const response = await fetch(`/api/users/${userToEdit.id}/reset-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ newPassword: userToEdit.emp_code }),
        });

        const data = await response.json();
        
        if (data.success) {
          alert(`Password reset successfully! New password: ${userToEdit.emp_code}`);
        } else {
          alert('Failed to reset password: ' + data.error);
        }
      } catch (error) {
        console.error('Error resetting password:', error);
        alert('Failed to reset password');
      } finally {
        setOperationLoading(false);
      }
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setOperationLoading(true);
    try {
      const response = await fetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchUsers(); // Refresh the list
        setUserToDelete(null);
        setIsDeleteModalOpen(false);
        alert('User deleted successfully');
      } else {
        alert('Failed to delete user: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user: Network error occurred');
    } finally {
      setOperationLoading(false);
    }
  };

  const openViewModal = (user: User) => {
    setUserToView(user);
    setIsViewModalOpen(true);
  };

  const openEditModal = (user: User) => {
    console.log('👤 Opening edit modal for user:', user);
    console.log('👤 User departmentId:', user.departmentId);
    console.log('👤 User department:', user.department);
    
    setUserToEdit(user);
    setFormData({
      emp_code: user.emp_code,
      emp_fname: user.emp_fname,
      emp_mid: user.emp_mid || '',
      emp_lname: user.emp_lname,
      emp_suffix: user.emp_suffix || '',
      emp_email: user.emp_email,
      emp_cell: user.emp_cell || '',
      post_des: user.post_des || '',
      department: user.department || '',
      departmentId: user.departmentId?.toString() || '',
      emp_status: user.emp_status,
      description: user.description || '',
      landline_no: user.landline_no || '',
      local_no: user.local_no || '',
      reportingToId: user.reportingToId?.toString() || '',
      isServiceApprover: user.isServiceApprover || false,
      requester_view_permission: user.requester_view_permission || 'own_requests',
    });
    
    console.log('👤 Form data after setting:', {
      departmentId: user.departmentId?.toString() || '',
      department: user.department || ''
    });
    
    // Reset image states and set existing profile image
    setSelectedImage(null);
    setImagePreview(user.profile_image ? `/uploads/${user.profile_image}` : '');
    setValidationErrors([]);
    
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (user: User) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(filteredUsers.map(user => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId: number, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedUsers.length === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedUsers.length} selected user(s)?`)) {
      setOperationLoading(true);
      
      try {
        const deletePromises = selectedUsers.map(async (userId) => {
          const response = await fetch(`/api/users/${userId}`, { 
            method: 'DELETE' 
          });
          const data = await response.json();
          
          if (!data.success) {
            throw new Error(data.error || 'Failed to delete user');
          }
          
          return data;
        });
        
        // Wait for all delete operations to complete
        const results = await Promise.allSettled(deletePromises);
        
        // Check results and show appropriate messages
        const successful = results.filter(result => result.status === 'fulfilled').length;
        const failed = results.filter(result => result.status === 'rejected').length;
        
        if (failed > 0) {
          const failedReasons = results
            .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
            .map(result => result.reason?.message || 'Unknown error')
            .join('\n');
          
          alert(`${successful} user(s) deleted successfully.\n${failed} failed:\n${failedReasons}`);
        } else {
          alert(`${successful} user(s) deleted successfully`);
        }
        
        // Refresh the list and clear selections
        await fetchUsers();
        setSelectedUsers([]);
        
      } catch (error) {
        console.error('Error in bulk delete:', error);
        alert('An error occurred during bulk delete operation');
      } finally {
        setOperationLoading(false);
      }
    }
  };

  return (
    <div className="p-0">
      {/* Add User Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Employee Code */}
            <div>
              <Label htmlFor="emp_code" className="text-sm font-medium text-gray-700">
                Employee Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="emp_code"
                value={formData.emp_code}
                onChange={(e) => setFormData(prev => ({ ...prev, emp_code: e.target.value }))}
                placeholder="Enter employee code"
                className={`mt-1 ${validationErrors.includes('emp_code') ? 'border-red-500 ring-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
              />
              {validationErrors.includes('emp_code') && (
                <p className="text-red-500 text-xs mt-1">Employee code is required</p>
              )}
            </div>

            {/* Profile Image */}
            <div>
              <Label htmlFor="profile_image">Profile Image</Label>
              <div className="mt-1 space-y-4">
                {imagePreview && (
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Profile preview"
                      className="w-24 h-24 object-cover rounded-full border-2 border-gray-300"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={removeImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    id="profile_image"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <Label
                    htmlFor="profile_image"
                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-md text-sm font-medium text-gray-700 transition-colors"
                  >
                    <UserIcon className="w-4 h-4" />
                    {imagePreview ? 'Change Image' : 'Upload Image'}
                  </Label>
                  <span className="text-xs text-gray-500">
                    Max 5MB, JPG/PNG only
                  </span>
                </div>
              </div>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emp_fname" className="text-sm font-medium text-gray-700">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="emp_fname"
                  value={formData.emp_fname}
                  onChange={(e) => setFormData(prev => ({ ...prev, emp_fname: e.target.value }))}
                  placeholder="Enter first name"
                  className={`mt-1 ${validationErrors.includes('emp_fname') ? 'border-red-500 ring-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                />
                {validationErrors.includes('emp_fname') && (
                  <p className="text-red-500 text-xs mt-1">First name is required</p>
                )}
              </div>
              <div>
                <Label htmlFor="emp_lname" className="text-sm font-medium text-gray-700">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="emp_lname"
                  value={formData.emp_lname}
                  onChange={(e) => setFormData(prev => ({ ...prev, emp_lname: e.target.value }))}
                  placeholder="Enter last name"
                  className={`mt-1 ${validationErrors.includes('emp_lname') ? 'border-red-500 ring-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                />
                {validationErrors.includes('emp_lname') && (
                  <p className="text-red-500 text-xs mt-1">Last name is required</p>
                )}
              </div>
            </div>

            {/* Middle Name & Suffix */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emp_mid">Middle Name</Label>
                <Input
                  id="emp_mid"
                  value={formData.emp_mid}
                  onChange={(e) => setFormData(prev => ({ ...prev, emp_mid: e.target.value }))}
                  placeholder="Enter middle name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="emp_suffix">Suffix</Label>
                <Input
                  id="emp_suffix"
                  value={formData.emp_suffix}
                  onChange={(e) => setFormData(prev => ({ ...prev, emp_suffix: e.target.value }))}
                  placeholder="Jr., Sr., III"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Email & Mobile */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emp_email" className="text-sm font-medium text-gray-700">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="emp_email"
                  type="email"
                  value={formData.emp_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, emp_email: e.target.value }))}
                  placeholder="Enter email address"
                  className={`mt-1 ${validationErrors.includes('emp_email') ? 'border-red-500 ring-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                />
                {validationErrors.includes('emp_email') && (
                  <p className="text-red-500 text-xs mt-1">Email is required</p>
                )}
              </div>
              <div>
                <Label htmlFor="emp_cell" className="text-sm font-medium text-gray-700">Mobile Number</Label>
                <Input
                  id="emp_cell"
                  value={formData.emp_cell}
                  onChange={(e) => setFormData(prev => ({ ...prev, emp_cell: e.target.value }))}
                  placeholder="Enter mobile number"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Department & Position */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="department" className="text-sm font-medium text-gray-700">Department</Label>
                <Select 
                  value={formData.departmentId === '' ? 'none' : formData.departmentId} 
                  onValueChange={(value) => {
                    if (value === 'none') {
                      setFormData(prev => ({ ...prev, departmentId: '', department: '' }));
                    } else {
                      const selectedDept = departments.find(dept => dept.id.toString() === value);
                      setFormData(prev => ({ 
                        ...prev, 
                        departmentId: value,
                        department: selectedDept?.name || ''
                      }));
                    }
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No department</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="post_des" className="text-sm font-medium text-gray-700">Position</Label>
                <Input
                  id="post_des"
                  value={formData.post_des}
                  onChange={(e) => setFormData(prev => ({ ...prev, post_des: e.target.value }))}
                  placeholder="Enter position"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emp_status" className="text-sm font-medium text-gray-700">Status</Label>
                <Select value={formData.emp_status} onValueChange={(value) => setFormData(prev => ({ ...prev, emp_status: value }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div></div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="text-sm font-medium text-gray-700">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter user description or notes"
                className="mt-1"
                rows={3}
              />
            </div>

            {/* Landline & Local No */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="landline_no" className="text-sm font-medium text-gray-700">Landline No</Label>
                <Input
                  id="landline_no"
                  value={formData.landline_no}
                  onChange={(e) => setFormData(prev => ({ ...prev, landline_no: e.target.value }))}
                  placeholder="Enter landline number"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="local_no" className="text-sm font-medium text-gray-700">Local No</Label>
                <Input
                  id="local_no"
                  value={formData.local_no}
                  onChange={(e) => setFormData(prev => ({ ...prev, local_no: e.target.value }))}
                  placeholder="Enter local extension"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Reporting To */}
            <div>
              <Label htmlFor="reportingToId" className="text-sm font-medium text-gray-700">Reporting To</Label>
              <Select value={formData.reportingToId === '' ? 'none' : formData.reportingToId} onValueChange={(value) => setFormData(prev => ({ ...prev, reportingToId: value === 'none' ? '' : value }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select reporting manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No reporting to</SelectItem>
                  {reportingUsers.map(user => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.emp_fname} {user.emp_lname} ({user.emp_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Service Request Approver & Requester View Permission */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isServiceApprover"
                  checked={formData.isServiceApprover}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isServiceApprover: checked as boolean }))}
                />
                <Label htmlFor="isServiceApprover" className="text-sm font-medium text-gray-700">Service Request Approver</Label>
              </div>
              <div>
                <Label htmlFor="requester_view_permission" className="text-sm font-medium text-gray-700">Requester Allowed to View</Label>
                <Select value={formData.requester_view_permission} onValueChange={(value) => setFormData(prev => ({ ...prev, requester_view_permission: value }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="own_requests">Only their own requests</SelectItem>
                    <SelectItem value="department_requests">All their Department Requests</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Login Information Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <UserIcon className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Login Information</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>Username and Password will be automatically set to the Employee ID.</p>
                    <p className="mt-1"><strong>Username:</strong> {formData.emp_code || '[Employee ID]'}</p>
                    <p><strong>Password:</strong> {formData.emp_code || '[Employee ID]'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => { setIsAddModalOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleAddUser} disabled={operationLoading}>
              {operationLoading ? 'Adding...' : 'Add User'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Employee Code */}
            <div>
              <Label htmlFor="edit_emp_code" className="text-sm font-medium text-gray-700">
                Employee Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit_emp_code"
                value={formData.emp_code}
                onChange={(e) => setFormData(prev => ({ ...prev, emp_code: e.target.value }))}
                placeholder="Enter employee code"
                className={`mt-1 ${validationErrors.includes('emp_code') ? 'border-red-500 ring-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
              />
              {validationErrors.includes('emp_code') && (
                <p className="text-red-500 text-xs mt-1">Employee code is required</p>
              )}
            </div>

            {/* Profile Image */}
            <div>
              <Label htmlFor="edit_profile_image">Profile Image</Label>
              <div className="mt-1 space-y-4">
                {imagePreview && (
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Profile preview"
                      className="w-24 h-24 object-cover rounded-full border-2 border-gray-300"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={removeImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    id="edit_profile_image"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <Label
                    htmlFor="edit_profile_image"
                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-md text-sm font-medium text-gray-700 transition-colors"
                  >
                    <UserIcon className="w-4 h-4" />
                    {imagePreview ? 'Change Image' : 'Upload Image'}
                  </Label>
                  <span className="text-xs text-gray-500">
                    Max 5MB, JPG/PNG only
                  </span>
                </div>
              </div>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_emp_fname" className="text-sm font-medium text-gray-700">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit_emp_fname"
                  value={formData.emp_fname}
                  onChange={(e) => setFormData(prev => ({ ...prev, emp_fname: e.target.value }))}
                  placeholder="Enter first name"
                  className={`mt-1 ${validationErrors.includes('emp_fname') ? 'border-red-500 ring-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                />
                {validationErrors.includes('emp_fname') && (
                  <p className="text-red-500 text-xs mt-1">First name is required</p>
                )}
              </div>
              <div>
                <Label htmlFor="edit_emp_lname" className="text-sm font-medium text-gray-700">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit_emp_lname"
                  value={formData.emp_lname}
                  onChange={(e) => setFormData(prev => ({ ...prev, emp_lname: e.target.value }))}
                  placeholder="Enter last name"
                  className={`mt-1 ${validationErrors.includes('emp_lname') ? 'border-red-500 ring-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                />
                {validationErrors.includes('emp_lname') && (
                  <p className="text-red-500 text-xs mt-1">Last name is required</p>
                )}
              </div>
            </div>

            {/* Middle Name & Suffix */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_emp_mid">Middle Name</Label>
                <Input
                  id="edit_emp_mid"
                  value={formData.emp_mid}
                  onChange={(e) => setFormData(prev => ({ ...prev, emp_mid: e.target.value }))}
                  placeholder="Enter middle name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit_emp_suffix">Suffix</Label>
                <Input
                  id="edit_emp_suffix"
                  value={formData.emp_suffix}
                  onChange={(e) => setFormData(prev => ({ ...prev, emp_suffix: e.target.value }))}
                  placeholder="Jr., Sr., III"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Email & Mobile */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_emp_email" className="text-sm font-medium text-gray-700">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit_emp_email"
                  type="email"
                  value={formData.emp_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, emp_email: e.target.value }))}
                  placeholder="Enter email address"
                  className={`mt-1 ${validationErrors.includes('emp_email') ? 'border-red-500 ring-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                />
                {validationErrors.includes('emp_email') && (
                  <p className="text-red-500 text-xs mt-1">Email is required</p>
                )}
              </div>
              <div>
                <Label htmlFor="edit_emp_cell" className="text-sm font-medium text-gray-700">Mobile Number</Label>
                <Input
                  id="edit_emp_cell"
                  value={formData.emp_cell}
                  onChange={(e) => setFormData(prev => ({ ...prev, emp_cell: e.target.value }))}
                  placeholder="Enter mobile number"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Department & Position */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_department" className="text-sm font-medium text-gray-700">Department</Label>
                <Select 
                  value={formData.departmentId === '' ? 'none' : formData.departmentId} 
                  onValueChange={(value) => {
                    if (value === 'none') {
                      setFormData(prev => ({ ...prev, departmentId: '', department: '' }));
                    } else {
                      const selectedDept = departments.find(dept => dept.id.toString() === value);
                      setFormData(prev => ({ 
                        ...prev, 
                        departmentId: value,
                        department: selectedDept?.name || ''
                      }));
                    }
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No department</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_post_des" className="text-sm font-medium text-gray-700">Position</Label>
                <Input
                  id="edit_post_des"
                  value={formData.post_des}
                  onChange={(e) => setFormData(prev => ({ ...prev, post_des: e.target.value }))}
                  placeholder="Enter position"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_emp_status" className="text-sm font-medium text-gray-700">Status</Label>
                <Select value={formData.emp_status} onValueChange={(value) => setFormData(prev => ({ ...prev, emp_status: value }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div></div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="edit_description" className="text-sm font-medium text-gray-700">Description</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter user description or notes"
                className="mt-1"
                rows={3}
              />
            </div>

            {/* Landline & Local No */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_landline_no" className="text-sm font-medium text-gray-700">Landline No</Label>
                <Input
                  id="edit_landline_no"
                  value={formData.landline_no}
                  onChange={(e) => setFormData(prev => ({ ...prev, landline_no: e.target.value }))}
                  placeholder="Enter landline number"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit_local_no" className="text-sm font-medium text-gray-700">Local No</Label>
                <Input
                  id="edit_local_no"
                  value={formData.local_no}
                  onChange={(e) => setFormData(prev => ({ ...prev, local_no: e.target.value }))}
                  placeholder="Enter local extension"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Reporting To */}
            <div>
              <Label htmlFor="edit_reportingToId" className="text-sm font-medium text-gray-700">Reporting To</Label>
              <Select value={formData.reportingToId === '' ? 'none' : formData.reportingToId} onValueChange={(value) => setFormData(prev => ({ ...prev, reportingToId: value === 'none' ? '' : value }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select reporting manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No reporting to</SelectItem>
                  {reportingUsers.map(user => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.emp_fname} {user.emp_lname} ({user.emp_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Service Request Approver & Requester View Permission */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit_isServiceApprover"
                  checked={formData.isServiceApprover}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isServiceApprover: checked as boolean }))}
                />
                <Label htmlFor="edit_isServiceApprover" className="text-sm font-medium text-gray-700">Service Request Approver</Label>
              </div>
              <div>
                <Label htmlFor="edit_requester_view_permission" className="text-sm font-medium text-gray-700">Requester Allowed to View</Label>
                <Select value={formData.requester_view_permission} onValueChange={(value) => setFormData(prev => ({ ...prev, requester_view_permission: value }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="own_requests">Only their own requests</SelectItem>
                    <SelectItem value="department_requests">All their Department Requests</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between space-x-2 pt-4 border-t">
            <Button 
              variant="outline" 
              className="text-orange-600 border-orange-200 hover:bg-orange-50"
              onClick={handleResetPassword}
              disabled={operationLoading}
            >
              <UserIcon className="w-4 h-4 mr-2" />
              Reset Password
            </Button>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => { setIsEditModalOpen(false); setUserToEdit(null); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleEditUser} disabled={operationLoading}>
                {operationLoading ? 'Updating...' : 'Update User'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete user{' '}
              <span className="font-medium">
                {userToDelete?.emp_fname} {userToDelete?.emp_lname}
              </span>
              ? This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => { setIsDeleteModalOpen(false); setUserToDelete(null); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={operationLoading}>
              {operationLoading ? 'Deleting...' : 'Delete User'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* View User Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>View User Details</DialogTitle>
          </DialogHeader>
          {userToView && (
            <div className="space-y-6 py-4">
              {/* Profile Image */}
              <div className="flex justify-center">
                <div className="relative">
                  {userToView.profile_image ? (
                    <img
                      src={`/uploads/${userToView.profile_image}`}
                      alt="Profile"
                      className="w-24 h-24 object-cover rounded-full border-2 border-gray-300"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                      {generateInitials(userToView.emp_fname, userToView.emp_lname)}
                    </div>
                  )}
                </div>
              </div>

              {/* User Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Employee Code</Label>
                  <p className="mt-1 text-sm text-gray-900">{userToView.emp_code}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Full Name</Label>
                  <p className="mt-1 text-sm text-gray-900">
                    {userToView.emp_fname} {userToView.emp_mid} {userToView.emp_lname} {userToView.emp_suffix}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Email</Label>
                  <p className="mt-1 text-sm text-gray-900">{userToView.emp_email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Mobile Number</Label>
                  <p className="mt-1 text-sm text-gray-900">{userToView.emp_cell || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Landline Number</Label>
                  <p className="mt-1 text-sm text-gray-900">{userToView.landline_no || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Local Number</Label>
                  <p className="mt-1 text-sm text-gray-900">{userToView.local_no || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Department</Label>
                  <p className="mt-1 text-sm text-gray-900">{userToView.department || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Position</Label>
                  <p className="mt-1 text-sm text-gray-900">{userToView.post_des || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Reporting To</Label>
                  <p className="mt-1 text-sm text-gray-900">
                    {userToView.reportingTo ? 
                      `${userToView.reportingTo.emp_fname} ${userToView.reportingTo.emp_lname} (${userToView.reportingTo.emp_code})` : 
                      'N/A'
                    }
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Status</Label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      userToView.emp_status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {userToView.emp_status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Service Request Approver</Label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      userToView.isServiceApprover 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {userToView.isServiceApprover ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Request View Permission</Label>
                  <p className="mt-1 text-sm text-gray-900">
                    {userToView.requester_view_permission === 'department_requests' ? 
                      'All Department Requests' : 
                      'Only Own Requests'
                    }
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Created</Label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(userToView.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              {/* Description */}
              {userToView.description && (
                <div className="mt-4">
                  <Label className="text-sm font-medium text-gray-700">Description</Label>
                  <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                    {userToView.description}
                  </p>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setIsViewModalOpen(false);
              if (userToView) openEditModal(userToView);
            }}>
              <Edit className="w-4 h-4 mr-2" />
              Edit User
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Header Section */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
          </div>
        </div>
        
        {/* Search */}
        <div className="mt-4">
          <div className="relative">
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <UserIcon className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>
        
        {/* Toolbar with buttons and pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-3">
            <Button 
              className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              New User
            </Button>
            <Button 
              variant="outline" 
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={handleDeleteSelected}
              disabled={selectedUsers.length === 0}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected
            </Button>
            <div className="text-sm text-slate-600 ml-4">
              {loading ? 'Loading...' : `1 - ${Math.min(25, filteredUsers.length)} of ${filteredUsers.length}`}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-slate-600">Page 1 of 1</span>
              <Button variant="outline" size="sm" disabled>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Show</span>
              <Select defaultValue="25">
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

      {/* Table Section */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left">
                <input 
                  type="checkbox" 
                  className="rounded border-slate-300"
                  checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
             
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">
                Profile
              </th>
               <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">
                Employee ID
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">
                Name
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">
                Department
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">
                Position
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">
                Status
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-6 py-4 text-center text-sm text-slate-500">
                  Loading users...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-4 text-center text-sm text-slate-500">
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300"
                      checked={selectedUsers.includes(user.id)}
                      onChange={(e) => handleSelectUser(user.id, e.target.checked)}
                    />
                  </td>
                   <td className="px-6 py-4">
                    <div className="flex items-center justify-center">
                      {user.profile_image ? (
                        <img 
                          src={`/uploads/${user.profile_image}`} 
                          alt="Profile" 
                          className="w-10 h-10 rounded-full object-cover border-2 border-gray-300" 
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {generateInitials(user.emp_fname, user.emp_lname)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-600">{user.emp_code}</div>
                  </td>
                 
                  <td className="px-6 py-4">
                    <div 
                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      onClick={() => openViewModal(user)}
                    >
                      {user.emp_fname} {user.emp_mid} {user.emp_lname} {user.emp_suffix}
                    </div>
                  </td>
                
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-600">{user.department || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-600">{user.post_des || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      user.emp_status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.emp_status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1"
                        onClick={() => openEditModal(user)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1"
                        onClick={() => openDeleteModal(user)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
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
}
