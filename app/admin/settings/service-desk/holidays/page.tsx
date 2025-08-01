'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

interface Holiday {
  id: number;
  name: string;
  date: string;
  description?: string;
  isRecurring: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function HolidaysPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedHolidays, setSelectedHolidays] = useState<number[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [loading, setLoading] = useState(false);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 25,
    total: 0,
    pages: 0
  });

  const [newHoliday, setNewHoliday] = useState({
    name: '',
    date: '',
    description: '',
    isRecurring: false,
    isActive: true,
  });

  // Fetch holidays from API
  const fetchHolidays = async (page = 1, limit = 25, search = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
      });

      const response = await fetch(`/api/holidays?${params}`);
      const data = await response.json();
      
      if (data.holidays && data.pagination) {
        setHolidays(data.holidays);
        setPagination(data.pagination);
      } else {
        console.error('Invalid response format:', data);
        setHolidays([]);
      }
    } catch (error) {
      console.error('Error fetching holidays:', error);
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  };

  // Load holidays on component mount
  useEffect(() => {
    fetchHolidays(currentPage, pageSize, searchTerm);
  }, [currentPage, pageSize]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHolidays(1, pageSize, searchTerm);
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleAddHoliday = async () => {
    if (newHoliday.name && newHoliday.date) {
      try {
        const response = await fetch('/api/holidays', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newHoliday),
        });

        if (response.ok) {
          setNewHoliday({
            name: '',
            date: '',
            description: '',
            isRecurring: false,
            isActive: true,
          });
          setIsAddModalOpen(false);
          fetchHolidays(currentPage, pageSize, searchTerm);
        } else {
          const errorData = await response.json();
          console.error('Error adding holiday:', errorData);
          alert(errorData.error || 'Failed to add holiday');
        }
      } catch (error) {
        console.error('Error adding holiday:', error);
        alert('Failed to add holiday');
      }
    } else {
      alert('Please enter holiday name and date');
    }
  };

  const handleEditHoliday = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setNewHoliday({
      name: holiday.name,
      date: holiday.date.split('T')[0], // Format date for input
      description: holiday.description || '',
      isRecurring: holiday.isRecurring,
      isActive: holiday.isActive,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateHoliday = async () => {
    if (editingHoliday && newHoliday.name && newHoliday.date) {
      try {
        const response = await fetch(`/api/holidays/${editingHoliday.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newHoliday),
        });

        if (response.ok) {
          setNewHoliday({
            name: '',
            date: '',
            description: '',
            isRecurring: false,
            isActive: true,
          });
          setEditingHoliday(null);
          setIsEditModalOpen(false);
          fetchHolidays(currentPage, pageSize, searchTerm);
        } else {
          const errorData = await response.json();
          console.error('Error updating holiday:', errorData);
          alert(errorData.error || 'Failed to update holiday');
        }
      } catch (error) {
        console.error('Error updating holiday:', error);
        alert('Failed to update holiday');
      }
    } else {
      alert('Please enter holiday name and date');
    }
  };

  const handleDeleteHoliday = async (holidayId: number) => {
    if (confirm('Are you sure you want to delete this holiday?')) {
      try {
        const response = await fetch(`/api/holidays/${holidayId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          fetchHolidays(currentPage, pageSize, searchTerm);
        } else {
          const errorData = await response.json();
          console.error('Error deleting holiday:', errorData);
          alert(errorData.error || 'Failed to delete holiday');
        }
      } catch (error) {
        console.error('Error deleting holiday:', error);
        alert('Failed to delete holiday');
      }
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedHolidays.length === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedHolidays.length} selected holiday(s)?`)) {
      try {
        const deletePromises = selectedHolidays.map(id => 
          fetch(`/api/holidays/${id}`, { method: 'DELETE' })
        );
        
        const results = await Promise.all(deletePromises);
        const failures = results.filter(r => !r.ok);
        
        if (failures.length === 0) {
          setSelectedHolidays([]);
          fetchHolidays(currentPage, pageSize, searchTerm);
        } else {
          alert(`Failed to delete ${failures.length} holiday(s)`);
        }
      } catch (error) {
        console.error('Error deleting holidays:', error);
        alert('Failed to delete holidays');
      }
    }
  };

  const handleSelectHoliday = (holidayId: number) => {
    setSelectedHolidays(prev => 
      prev.includes(holidayId) 
        ? prev.filter(id => id !== holidayId)
        : [...prev, holidayId]
    );
  };

  const handleSelectAll = () => {
    if (selectedHolidays.length === holidays.length) {
      setSelectedHolidays([]);
    } else {
      setSelectedHolidays(holidays.map(holiday => holiday.id));
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
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Holiday Management</h1>
        
        {/* Search and Filter */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Search holidays..."
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
                  New Holiday
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Holiday</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="name">Holiday Name *</Label>
                    <Input
                      id="name"
                      value={newHoliday.name}
                      onChange={(e) => setNewHoliday(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter holiday name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="date">Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={newHoliday.date}
                      onChange={(e) => setNewHoliday(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newHoliday.description}
                      onChange={(e) => setNewHoliday(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter holiday description"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isRecurring"
                      checked={newHoliday.isRecurring}
                      onCheckedChange={(checked) => setNewHoliday(prev => ({ ...prev, isRecurring: checked as boolean }))}
                    />
                    <Label htmlFor="isRecurring">Recurring Holiday</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isActive"
                      checked={newHoliday.isActive}
                      onCheckedChange={(checked) => setNewHoliday(prev => ({ ...prev, isActive: checked as boolean }))}
                    />
                    <Label htmlFor="isActive">Active</Label>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddHoliday}>
                    Add Holiday
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            {/* Edit Holiday Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Holiday</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="editName">Holiday Name *</Label>
                    <Input
                      id="editName"
                      value={newHoliday.name}
                      onChange={(e) => setNewHoliday(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter holiday name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="editDate">Date *</Label>
                    <Input
                      id="editDate"
                      type="date"
                      value={newHoliday.date}
                      onChange={(e) => setNewHoliday(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="editDescription">Description</Label>
                    <Textarea
                      id="editDescription"
                      value={newHoliday.description}
                      onChange={(e) => setNewHoliday(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter holiday description"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="editIsRecurring"
                      checked={newHoliday.isRecurring}
                      onCheckedChange={(checked) => setNewHoliday(prev => ({ ...prev, isRecurring: checked as boolean }))}
                    />
                    <Label htmlFor="editIsRecurring">Recurring Holiday</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="editIsActive"
                      checked={newHoliday.isActive}
                      onCheckedChange={(checked) => setNewHoliday(prev => ({ ...prev, isActive: checked as boolean }))}
                    />
                    <Label htmlFor="editIsActive">Active</Label>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateHoliday}>
                    Update Holiday
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button variant="outline" className="text-red-600 hover:bg-red-50" disabled={selectedHolidays.length === 0} onClick={handleDeleteSelected}>
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

      {/* Holidays Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left p-4 w-12">
                <Checkbox
                  checked={selectedHolidays.length === holidays.length && holidays.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </th>
              <th className="text-left p-4 font-medium text-slate-900">Holiday Name</th>
              <th className="text-left p-4 font-medium text-slate-900">Date</th>
              <th className="text-left p-4 font-medium text-slate-900">Description</th>
              <th className="text-left p-4 font-medium text-slate-900">Recurring</th>
              <th className="text-left p-4 font-medium text-slate-900">Status</th>
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
            ) : holidays.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-500">
                  No holidays found
                </td>
              </tr>
            ) : (
              holidays.map((holiday) => (
                <tr key={holiday.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-4">
                    <Checkbox
                      checked={selectedHolidays.includes(holiday.id)}
                      onCheckedChange={() => handleSelectHoliday(holiday.id)}
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <Calendar className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="font-medium text-slate-900">{holiday.name}</div>
                    </div>
                  </td>
                  <td className="p-4 text-slate-900">{formatDate(holiday.date)}</td>
                  <td className="p-4 text-slate-900">{holiday.description || 'N/A'}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      holiday.isRecurring ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {holiday.isRecurring ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      holiday.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {holiday.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800" onClick={() => handleEditHoliday(holiday)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800" onClick={() => handleDeleteHoliday(holiday.id)}>
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
