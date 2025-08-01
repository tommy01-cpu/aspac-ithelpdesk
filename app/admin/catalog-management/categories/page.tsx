'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight, Tags, Upload, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

interface ServiceCategory {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  serviceCount: number;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: number;
    emp_fname: string;
    emp_lname: string;
  };
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Available service icons
const availableIcons = [
  'account-creation-in-ad.svg', 'account-deletion-in-ad.svg', 'additional-client-access-license.svg',
  'alias-for-mailing-list.svg', 'alias-removal.svg', 'application-login.svg', 'application.png',
  'battery.png', 'bluetooth.png', 'broadband.png', 'building-services.png', 'camera.png',
  'change-of-place.svg', 'comm-devices.png', 'communication.svg', 'contractwrkr.png',
  'corporate-website.png', 'data-managagement.svg', 'data-management.svg', 'datamgmt.png',
  'datarequest.png', 'delete-email-account.svg', 'department-change.svg', 'desktop.png',
  'drawing-pad.png', 'dvd-drive.png', 'DVD.png', 'electrical-services.png', 'email-server.png',
  'email.svg', 'emergency-service.png', 'emergency.png', 'employee-leaving.svg', 'ethernet.png',
  'event-support.png', 'exchange-server.png', 'file-download.svg', 'fIle-upload.svg',
  'fire-prevention.png', 'foodservices.png', 'furniture.png', 'furniture_new.png',
  'grounds-maintenance.png', 'hardware.svg', 'hazardous-waste-management.png', 'healthpolicy.png',
  'HVAC.png', 'incident-default.svg', 'increased-email-storage.svg', 'internet-access.svg',
  'internet.svg', 'intranet.png', 'keyboard.png', 'lan.png', 'laptop.png', 'leaverequest.png',
  'lock-and-locksmith.png', 'mail-client-software.svg', 'mail-services.png', 'mailing-list.svg',
  'member-addition-to-existing-mailing-list.svg', 'member-deletion-to-existing-mailing-list.svg',
  'mobile.png', 'monitor.png', 'mouse.png', 'network1.png', 'new-email-account.svg',
  'new-hire.svg', 'online-meeting-setup.svg', 'others.png', 'parking-and-transport.png',
  'password-reset-for-email.svg', 'payroll.png', 'pda.png', 'pendrive.png', 'popular-service.png',
  'printer2.png', 'projector.png', 'proxy-server.png', 'request-apple-device.svg',
  'request-blackeberry-device.svg', 'request-crm-account.svg', 'request-data-backup.svg',
  'request-data-restoration-from-backup.svg', 'request-desktop.svg', 'request-did-extension.svg',
  'request-laptop.svg', 'request-machine-cleanup.svg', 'request-mobile-for-support.svg',
  'request-mssql-account.svg', 'request-ram-upgrade.svg', 'request-telephone-extension.svg',
  'reset-password-in-ad.svg', 'router.png', 'security-services.png', 'security.png',
  'server.png', 'service-default.svg', 'simcard.png', 'software-installation.svg',
  'software-uninstallation.svg', 'software-upgrade.svg', 'software.svg', 'speakers.png',
  'switch.png', 'telephone.png', 'user-management-old.png', 'user-management.svg',
  'userbenefits.png', 'voice-message-cleanup.svg', 'voice-message-password-reset.svg',
  'vpn-account-creation.svg', 'wan.png', 'web-browser.png', 'wifi-access.svg', 'wifi.png'
];

export default function ServiceCategoriesTab() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 25,
    total: 0,
    pages: 0
  });

  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    icon: '',
    isActive: true,
  });

  // Fetch categories from API
  const fetchCategories = async (page = 1, limit = 25, search = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
      });

      const response = await fetch(`/api/service-categories?${params}`);
      const data = await response.json();
      
      if (data.categories && data.pagination) {
        setCategories(data.categories);
        setPagination(data.pagination);
      } else {
        console.error('Invalid response format:', data);
        setCategories([]);
      }
    } catch (error) {
      console.error('Error fetching service categories:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  // Load categories on component mount
  useEffect(() => {
    fetchCategories(currentPage, pageSize, searchTerm);
  }, [currentPage, pageSize]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCategories(1, pageSize, searchTerm);
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleAddCategory = async () => {
    if (newCategory.name) {
      try {
        const response = await fetch('/api/service-categories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newCategory),
        });

        if (response.ok) {
          setNewCategory({
            name: '',
            description: '',
            icon: '',
            isActive: true,
          });
          setIsAddModalOpen(false);
          fetchCategories(currentPage, pageSize, searchTerm);
        } else {
          const errorData = await response.json();
          console.error('Error adding category:', errorData);
          alert(errorData.error || 'Failed to add category');
        }
      } catch (error) {
        console.error('Error adding category:', error);
        alert('Failed to add category');
      }
    } else {
      alert('Please enter category name');
    }
  };

  const handleEditCategory = (category: ServiceCategory) => {
    setEditingCategory(category);
    setNewCategory({
      name: category.name,
      description: category.description || '',
      icon: category.icon || '',
      isActive: category.isActive,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateCategory = async () => {
    if (editingCategory && newCategory.name) {
      try {
        const response = await fetch(`/api/service-categories/${editingCategory.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newCategory),
        });

        if (response.ok) {
          setNewCategory({
            name: '',
            description: '',
            icon: '',
            isActive: true,
          });
          setEditingCategory(null);
          setIsEditModalOpen(false);
          fetchCategories(currentPage, pageSize, searchTerm);
        } else {
          const errorData = await response.json();
          console.error('Error updating category:', errorData);
          alert(errorData.error || 'Failed to update category');
        }
      } catch (error) {
        console.error('Error updating category:', error);
        alert('Failed to update category');
      }
    } else {
      alert('Please enter category name');
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (confirm('Are you sure you want to delete this category?')) {
      try {
        const response = await fetch(`/api/service-categories/${categoryId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          fetchCategories(currentPage, pageSize, searchTerm);
        } else {
          const errorData = await response.json();
          console.error('Error deleting category:', errorData);
          alert(errorData.error || 'Failed to delete category');
        }
      } catch (error) {
        console.error('Error deleting category:', error);
        alert('Failed to delete category');
      }
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedCategories.length === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedCategories.length} selected category(ies)?`)) {
      try {
        const deletePromises = selectedCategories.map(id => 
          fetch(`/api/service-categories/${id}`, { method: 'DELETE' })
        );
        
        const results = await Promise.all(deletePromises);
        const failures = results.filter(r => !r.ok);
        
        if (failures.length === 0) {
          setSelectedCategories([]);
          fetchCategories(currentPage, pageSize, searchTerm);
        } else {
          alert(`Failed to delete ${failures.length} category(ies)`);
        }
      } catch (error) {
        console.error('Error deleting categories:', error);
        alert('Failed to delete categories');
      }
    }
  };

  const handleSelectCategory = (categoryId: number) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCategories.length === categories.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(categories.map(category => category.id));
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleIconSelect = (iconName: string) => {
    setNewCategory(prev => ({ ...prev, icon: iconName }));
    setIsIconPickerOpen(false);
  };

  const handleViewCategoryServices = (categoryId: number, categoryName: string) => {
    router.push(`/admin/catalog-management?tab=catalog&categoryId=${categoryId}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Service Categories</h1>
        
        {/* Search and Filter */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Search categories..."
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
                  New Category
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Service Category</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="name">Category Name *</Label>
                    <Input
                      id="name"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter category name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newCategory.description}
                      onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter category description"
                    />
                  </div>
                  
                  <div>
                    <Label>Icon</Label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
                        {newCategory.icon ? (
                          <img 
                            src={`/serviceicons/${newCategory.icon}`} 
                            alt="Selected icon" 
                            className="w-10 h-10 object-contain"
                          />
                        ) : (
                          <Upload className="w-8 h-8 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsIconPickerOpen(true)}
                          className="w-full"
                        >
                          <Image className="w-4 h-4 mr-2" />
                          Choose Icon
                        </Button>
                        {newCategory.icon && (
                          <p className="text-sm text-gray-500 mt-1 truncate">
                            {newCategory.icon}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isActive"
                      checked={newCategory.isActive}
                      onCheckedChange={(checked) => setNewCategory(prev => ({ ...prev, isActive: checked as boolean }))}
                    />
                    <Label htmlFor="isActive">Active</Label>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddCategory}>
                    Add Category
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            {/* Edit Category Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Service Category</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="editName">Category Name *</Label>
                    <Input
                      id="editName"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter category name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="editDescription">Description</Label>
                    <Textarea
                      id="editDescription"
                      value={newCategory.description}
                      onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter category description"
                    />
                  </div>
                  
                  <div>
                    <Label>Icon</Label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
                        {newCategory.icon ? (
                          <img 
                            src={`/serviceicons/${newCategory.icon}`} 
                            alt="Selected icon" 
                            className="w-10 h-10 object-contain"
                          />
                        ) : (
                          <Upload className="w-8 h-8 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsIconPickerOpen(true)}
                          className="w-full"
                        >
                          <Image className="w-4 h-4 mr-2" />
                          Choose Icon
                        </Button>
                        {newCategory.icon && (
                          <p className="text-sm text-gray-500 mt-1 truncate">
                            {newCategory.icon}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="editIsActive"
                      checked={newCategory.isActive}
                      onCheckedChange={(checked) => setNewCategory(prev => ({ ...prev, isActive: checked as boolean }))}
                    />
                    <Label htmlFor="editIsActive">Active</Label>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateCategory}>
                    Update Category
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Icon Picker Dialog */}
            <Dialog open={isIconPickerOpen} onOpenChange={setIsIconPickerOpen}>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle>Choose Service Icon</DialogTitle>
                </DialogHeader>
                <div className="overflow-y-auto max-h-[60vh] p-4">
                  <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                    {availableIcons.map((iconName) => (
                      <button
                        key={iconName}
                        onClick={() => handleIconSelect(iconName)}
                        className={`
                          w-12 h-12 p-2 border-2 rounded-lg hover:border-blue-500 transition-colors
                          ${newCategory.icon === iconName ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                        `}
                        title={iconName}
                      >
                        <img 
                          src={`/serviceicons/${iconName}`} 
                          alt={iconName} 
                          className="w-full h-full object-contain"
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsIconPickerOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button variant="outline" className="text-red-600 hover:bg-red-50" disabled={selectedCategories.length === 0} onClick={handleDeleteSelected}>
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

      {/* Categories Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left p-4 w-12">
                <Checkbox
                  checked={selectedCategories.length === categories.length && categories.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </th>
              <th className="text-left p-4 font-medium text-slate-900">Category Name</th>
              <th className="text-left p-4 font-medium text-slate-900">Description</th>
              <th className="text-left p-4 font-medium text-slate-900">Services</th>
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
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-500">
                  No categories found
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr key={category.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-4">
                    <Checkbox
                      checked={selectedCategories.includes(category.id)}
                      onCheckedChange={() => handleSelectCategory(category.id)}
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center p-2">
                        {category.icon ? (
                          <img 
                            src={`/serviceicons/${category.icon}`} 
                            alt={category.name} 
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Tags className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <button 
                        className="font-medium text-slate-900 hover:text-blue-600 transition-colors text-left"
                        onClick={() => handleViewCategoryServices(category.id, category.name)}
                        title={`View services for ${category.name}`}
                      >
                        {category.name}
                      </button>
                    </div>
                  </td>
                  <td className="p-4 text-slate-900">{category.description || 'N/A'}</td>
                  <td className="p-4">
                    <button 
                      className="text-slate-900 hover:text-blue-600 transition-colors font-medium"
                      onClick={() => handleViewCategoryServices(category.id, category.name)}
                      title={`View ${category.serviceCount} services for ${category.name}`}
                    >
                      {category.serviceCount}
                    </button>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      category.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {category.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4 text-slate-900">{formatDate(category.createdAt)}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800" onClick={() => handleEditCategory(category)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800" onClick={() => handleDeleteCategory(category.id)}>
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
