'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

interface Department {
  id: number;
  name: string;
  description?: string;
  departmentHead?: {
    id: string;
    name: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    email: string;
    jobTitle: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  emp_code: string;
  emp_fname: string;
  emp_mid?: string;
  emp_lname: string;
  emp_email: string;
  post_des?: string;
  department?: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function DepartmentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedDepartments, setSelectedDepartments] = useState<number[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 25,
    total: 0,
    pages: 0
  });

  const [newDepartment, setNewDepartment] = useState({
    name: '',
    description: '',
    departmentHeadId: '',
    isActive: true,
  });

  // Fetch users for department head selection
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/users?limit=100');
      const data = await response.json();
      
      if (data.success && data.users) {
        setUsers(data.users);
      } else {
        console.error('Invalid users response format:', data);
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch departments from API
  const fetchDepartments = async (page = 1, limit = 25, search = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
      });

      const response = await fetch(`/api/departments?${params}`);
      const data = await response.json();
      
      if (data.departments && data.pagination) {
        setDepartments(data.departments);
        setPagination(data.pagination);
      } else {
        console.error('Invalid response format:', data);
        setDepartments([]);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  // Load departments and users on component mount
  useEffect(() => {
    fetchDepartments(currentPage, pageSize, searchTerm);
    fetchUsers();
  }, [currentPage, pageSize]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDepartments(1, pageSize, searchTerm);
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleAddDepartment = async () => {
    if (newDepartment.name) {
      try {
        const response = await fetch('/api/departments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newDepartment),
        });

        if (response.ok) {
          setNewDepartment({
            name: '',
            description: '',
            departmentHeadId: '',
            isActive: true,
          });
          setIsAddModalOpen(false);
          fetchDepartments(currentPage, pageSize, searchTerm);
        } else {
          const errorData = await response.json();
          console.error('Error adding department:', errorData);
          alert(errorData.error || 'Failed to add department');
        }
      } catch (error) {
        console.error('Error adding department:', error);
        alert('Failed to add department');
      }
    } else {
      alert('Please enter department name');
    }
  };

  const handleEditDepartment = (department: Department) => {
    setEditingDepartment(department);
    setNewDepartment({
      name: department.name,
      description: department.description || '',
      departmentHeadId: department.departmentHead?.id || '',
      isActive: department.isActive,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateDepartment = async () => {
    if (editingDepartment && newDepartment.name) {
      try {
        const response = await fetch(`/api/departments/${editingDepartment.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newDepartment),
        });

        if (response.ok) {
          setNewDepartment({
            name: '',
            description: '',
            departmentHeadId: '',
            isActive: true,
          });
          setEditingDepartment(null);
          setIsEditModalOpen(false);
          fetchDepartments(currentPage, pageSize, searchTerm);
        } else {
          const errorData = await response.json();
          console.error('Error updating department:', errorData);
          alert(errorData.error || 'Failed to update department');
        }
      } catch (error) {
        console.error('Error updating department:', error);
        alert('Failed to update department');
      }
    } else {
      alert('Please enter department name');
    }
  };

  const handleDeleteDepartment = async (departmentId: number) => {
    if (confirm('Are you sure you want to delete this department?')) {
      try {
        const response = await fetch(`/api/departments/${departmentId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          fetchDepartments(currentPage, pageSize, searchTerm);
        } else {
          const errorData = await response.json();
          console.error('Error deleting department:', errorData);
          alert(errorData.error || 'Failed to delete department');
        }
      } catch (error) {
        console.error('Error deleting department:', error);
        alert('Failed to delete department');
      }
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedDepartments.length === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedDepartments.length} selected department(s)?`)) {
      try {
        const deletePromises = selectedDepartments.map(id => 
          fetch(`/api/departments/${id}`, { method: 'DELETE' })
        );
        
        const results = await Promise.all(deletePromises);
        const failures = results.filter(r => !r.ok);
        
        if (failures.length === 0) {
          setSelectedDepartments([]);
          fetchDepartments(currentPage, pageSize, searchTerm);
        } else {
          alert(`Failed to delete ${failures.length} department(s)`);
        }
      } catch (error) {
        console.error('Error deleting departments:', error);
        alert('Failed to delete departments');
      }
    }
  };

  const handleSelectDepartment = (departmentId: number) => {
    setSelectedDepartments(prev => 
      prev.includes(departmentId) 
        ? prev.filter(id => id !== departmentId)
        : [...prev, departmentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedDepartments.length === departments.length) {
      setSelectedDepartments([]);
    } else {
      setSelectedDepartments(departments.map(department => department.id));
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Department Management</h1>
        
        {/* Search and Filter */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Search departments..."
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
                  New Department
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Department</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="name">Department Name *</Label>
                    <Input
                      id="name"
                      value={newDepartment.name}
                      onChange={(e) => setNewDepartment(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter department name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newDepartment.description}
                      onChange={(e) => setNewDepartment(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter department description"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="departmentHead">Department Head</Label>
                    <Select 
                      value={newDepartment.departmentHeadId === '' ? 'none' : newDepartment.departmentHeadId.toString()} 
                      onValueChange={(value) => setNewDepartment(prev => ({ ...prev, departmentHeadId: value === 'none' ? '' : value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department head (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No department head</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.emp_fname} {user.emp_lname} ({user.emp_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isActive"
                      checked={newDepartment.isActive}
                      onCheckedChange={(checked) => setNewDepartment(prev => ({ ...prev, isActive: checked as boolean }))}
                    />
                    <Label htmlFor="isActive">Active</Label>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddDepartment}>
                    Add Department
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            {/* Edit Department Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Department</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="editName">Department Name *</Label>
                    <Input
                      id="editName"
                      value={newDepartment.name}
                      onChange={(e) => setNewDepartment(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter department name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="editDescription">Description</Label>
                    <Textarea
                      id="editDescription"
                      value={newDepartment.description}
                      onChange={(e) => setNewDepartment(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter department description"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="editDepartmentHead">Department Head</Label>
                    <Select 
                      value={newDepartment.departmentHeadId === '' ? 'none' : newDepartment.departmentHeadId.toString()} 
                      onValueChange={(value) => setNewDepartment(prev => ({ ...prev, departmentHeadId: value === 'none' ? '' : value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department head (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No department head</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.emp_fname} {user.emp_lname} ({user.emp_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="editIsActive"
                      checked={newDepartment.isActive}
                      onCheckedChange={(checked) => setNewDepartment(prev => ({ ...prev, isActive: checked as boolean }))}
                    />
                    <Label htmlFor="editIsActive">Active</Label>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateDepartment}>
                    Update Department
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button variant="outline" className="text-red-600 hover:bg-red-50" disabled={selectedDepartments.length === 0} onClick={handleDeleteSelected}>
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

      {/* Departments Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left p-4 w-12">
                <Checkbox
                  checked={selectedDepartments.length === departments.length && departments.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </th>
              <th className="text-left p-4 font-medium text-slate-900">Department Name</th>
              <th className="text-left p-4 font-medium text-slate-900">Description</th>
              <th className="text-left p-4 font-medium text-slate-900">Department Head</th>
              <th className="text-left p-4 font-medium text-slate-900">Status</th>
              <th className="text-left p-4 font-medium text-slate-900">Created</th>
              <th className="text-left p-4 font-medium text-slate-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                </td>
              </tr>
            ) : departments.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-500">
                  No departments found
                </td>
              </tr>
            ) : (
              departments.map((department) => (
                <tr key={department.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-4">
                    <Checkbox
                      checked={selectedDepartments.includes(department.id)}
                      onCheckedChange={() => handleSelectDepartment(department.id)}
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="font-medium text-slate-900">{department.name}</div>
                    </div>
                  </td>
                  <td className="p-4 text-slate-900">{department.description || 'N/A'}</td>
                  <td className="p-4 text-slate-900">
                    {department.departmentHead ? (
                      <div className="flex flex-col">
                        <span className="font-medium">{department.departmentHead.name}</span>
                        <span className="text-sm text-slate-500">{department.departmentHead.employeeId}</span>
                        {department.departmentHead.jobTitle && (
                          <span className="text-sm text-slate-500">{department.departmentHead.jobTitle}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">No head assigned</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      department.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {department.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4 text-slate-900">{formatDate(department.createdAt)}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800" onClick={() => handleEditDepartment(department)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800" onClick={() => handleDeleteDepartment(department.id)}>
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
}
