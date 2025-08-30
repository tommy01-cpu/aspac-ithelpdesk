'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight, Tags, Upload, Image, ArrowUpDown, List, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReorderList from '@/components/ui/drag-drop-reorder';

interface ServiceCategory {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  serviceCount: number;
  sortOrder?: number;
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
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [activeTab, setActiveTab] = useState('list');
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

  const fetchCategories = async (page = 1, limit = 25, search = '') => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: search,
        type: 'service', // Add type parameter for service categories
      });

      const response = await fetch(`/api/service-categories?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }

      const data = await response.json();
      console.log('API Response:', data); // Debug log
      setCategories(data.categories || []);
      setPagination(data.pagination || {
        page: 1,
        limit: 25,
        total: 0,
        pages: 0
      });
    } catch (error) {
      console.error('Error fetching categories:', error);
      console.log('Categories state:', categories); // Debug log
      toast({
        title: "Error",
        description: "Failed to fetch categories. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories(currentPage, pageSize, searchTerm);
  }, [currentPage, pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCategories(1, pageSize, searchTerm);
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, pageSize]);

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      toast({
        title: "Error",
        description: "Category name is required.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/service-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCategory),
      });

      if (!response.ok) {
        throw new Error('Failed to create category');
      }

      toast({
        title: "Success",
        description: "Category created successfully.",
      });

      setNewCategory({ name: '', description: '', icon: '', isActive: true });
      setIsAddModalOpen(false);
      fetchCategories(currentPage, pageSize, searchTerm);
    } catch (error) {
      console.error('Error creating category:', error);
      toast({
        title: "Error",
        description: "Failed to create category. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditCategory = (category: ServiceCategory) => {
    setEditingCategory(category);
    setIsEditModalOpen(true);
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editingCategory.name.trim()) {
      toast({
        title: "Error",
        description: "Category name is required.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/service-categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editingCategory.name,
          description: editingCategory.description,
          icon: editingCategory.icon,
          isActive: editingCategory.isActive,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update category');
      }

      toast({
        title: "Success",
        description: "Category updated successfully.",
      });

      setIsEditModalOpen(false);
      setEditingCategory(null);
      fetchCategories(currentPage, pageSize, searchTerm);
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "Error",
        description: "Failed to update category. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!confirm('Are you sure you want to delete this category?')) {
      return;
    }

    try {
      const response = await fetch(`/api/service-categories/${categoryId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete category');
      }

      toast({
        title: "Success",
        description: "Category deleted successfully.",
      });

      fetchCategories(currentPage, pageSize, searchTerm);
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "Failed to delete category. Please try again.",
        variant: "destructive",
      });
    }
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
    if (editingCategory) {
      setEditingCategory(prev => prev ? { ...prev, icon: iconName } : null);
    } else {
      setNewCategory(prev => ({ ...prev, icon: iconName }));
    }
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
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Categories List
            </TabsTrigger>
            <TabsTrigger value="reorder" className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4" />
              Reorder Categories
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
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
                <Button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-slate-800 hover:bg-slate-900 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Category
                </Button>
              </div>
              
              {/* Pagination Controls */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-slate-600">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(Math.min(pagination.pages, currentPage + 1))}
                    disabled={currentPage === pagination.pages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                    <SelectTrigger className="w-20">
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
                    <th className="text-left p-4 font-medium text-slate-900">Template Count</th>
                    <th className="text-left p-4 font-medium text-slate-900">Status</th>
                    <th className="text-left p-4 font-medium text-slate-900">Created</th>
                    <th className="text-right p-4 font-medium text-slate-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">Loading categories...</td>
                    </tr>
                  ) : categories.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">No categories found.</td>
                    </tr>
                  ) : (
                    categories.map((category) => (
                      <tr key={category.id} className="hover:bg-slate-50">
                        <td className="p-4">
                          <Checkbox
                            checked={selectedCategories.includes(category.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedCategories([...selectedCategories, category.id]);
                              } else {
                                setSelectedCategories(selectedCategories.filter(id => id !== category.id));
                              }
                            }}
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center p-2">
                              {category.icon ? (
                                <img 
                                  src={`/serviceicons/${category.icon}`} 
                                  alt={category.name}
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    // Fallback to Tags icon if image fails to load
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent && !parent.querySelector('.fallback-icon')) {
                                      const fallbackIcon = document.createElement('div');
                                      fallbackIcon.className = 'fallback-icon w-5 h-5 text-blue-600';
                                      fallbackIcon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
                                      parent.appendChild(fallbackIcon);
                                    }
                                  }}
                                />
                              ) : (
                                <Tags className="w-5 h-5 text-blue-600" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-slate-900">{category.name}</div>
                              {category.description && (
                                <div className="text-sm text-slate-500">{category.description}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-slate-600">{category.description || '-'}</td>
                        <td className="p-4">
                          <button
                            onClick={() => handleViewCategoryServices(category.id, category.name)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            {category.serviceCount} services
                          </button>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            category.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {category.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-4 text-slate-600">
                          <div>{formatDate(category.createdAt)}</div>
                          <div className="text-sm text-slate-400">
                            {category.creator ? `${category.creator.emp_fname} ${category.creator.emp_lname}` : 'Unknown'}
                          </div>
                        </td>
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
          </TabsContent>

          <TabsContent value="reorder" className="space-y-4">
            <ReorderList
              items={categories.map(cat => ({
                id: cat.id,
                name: cat.name,
                description: cat.description || '',
                icon: cat.icon,
                sortOrder: cat.sortOrder || 0,
                isActive: cat.isActive,
                serviceCount: cat.serviceCount,
                createdAt: cat.createdAt,
                creator: cat.creator
              }))}
              type="service-categories"
              itemRenderer={(item, index, moveUp, moveDown) => (
                <div className="flex items-center gap-3 p-4">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="h-6 w-6 p-0"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveDown(index)}
                      disabled={index === categories.length - 1}
                      className="h-6 w-6 p-0"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center p-2">
                      {item.icon ? (
                        <img 
                          src={`/serviceicons/${item.icon}`} 
                          alt={item.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'block';
                          }}
                        />
                      ) : null}
                      <Tags className={`w-5 h-5 text-blue-600 ${item.icon ? 'hidden' : ''}`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <h4 className="font-medium text-slate-900">{item.name}</h4>
                          {item.description && (
                            <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                          )}
                        </div>
                        <div className="ml-auto flex items-center gap-4">
                          <div className="text-sm text-slate-600">
                            <span className="font-medium">{item.serviceCount}</span> services
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {item.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <div className="text-xs text-slate-400 min-w-0">
                            <div>{formatDate(item.createdAt)}</div>
                            <div className="truncate">
                              {item.creator ? `${item.creator.emp_fname} ${item.creator.emp_lname}` : 'Unknown'}
                            </div>
                          </div>
                          <div className="bg-slate-100 px-2 py-1 rounded text-xs font-medium text-slate-600">
                            #{index + 1}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              onReorder={async (reorderedItems) => {
                console.log('Reordering categories:', reorderedItems); // Debug log
                const requestData = {
                  type: 'service-categories',
                  items: reorderedItems.map((item, index) => ({
                    id: item.id,
                    sortOrder: index + 1
                  }))
                };
                console.log('Request data:', requestData); // Debug log
                
                try {
                  const response = await fetch('/api/catalog/reorder', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestData),
                  });

                  console.log('Reorder response status:', response.status); // Debug log
                  console.log('Reorder response headers:', Object.fromEntries(response.headers.entries())); // Debug log
                  
                  // Check if response is JSON
                  const contentType = response.headers.get('content-type');
                  if (!contentType || !contentType.includes('application/json')) {
                    const textResponse = await response.text();
                    console.error('Non-JSON response:', textResponse);
                    throw new Error(`Expected JSON response but got ${contentType || 'unknown'}. Response: ${textResponse.substring(0, 200)}`);
                  }

                  const responseData = await response.json();
                  console.log('Reorder response data:', responseData); // Debug log

                  if (!response.ok) {
                    throw new Error(responseData.error || `HTTP error! status: ${response.status}`);
                  }

                  // Refresh the categories list with a small delay to ensure DB update is complete
                  setTimeout(async () => {
                    await fetchCategories(currentPage, pageSize, searchTerm);
                  }, 100);
                  
                  // Show success message
                  toast({
                    title: "Success",
                    description: "Categories reordered successfully.",
                  });
                  
                  return true;
                } catch (error) {
                  console.error('Error reordering categories:', error);
                  toast({
                    title: "Error",
                    description: `Failed to reorder categories: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    variant: "destructive",
                  });
                  return false;
                }
              }}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs - Positioned outside of tabs */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
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
                rows={3}
              />
            </div>

            <div>
              <Label>Icon</Label>
              <div className="flex items-center gap-2 mt-1">
                {newCategory.icon && (
                  <img 
                    src={`/serviceicons/${newCategory.icon}`} 
                    alt="Selected icon" 
                    className="w-8 h-8"
                  />
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsIconPickerOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Image className="h-4 w-4" />
                  {newCategory.icon ? 'Change Icon' : 'Select Icon'}
                </Button>
                {newCategory.icon && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewCategory(prev => ({ ...prev, icon: '' }))}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={newCategory.isActive}
                onCheckedChange={(checked) => setNewCategory(prev => ({ ...prev, isActive: !!checked }))}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCategory}>
                Create Category
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Service Category</DialogTitle>
          </DialogHeader>
          {editingCategory && (
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="editName">Category Name *</Label>
                <Input
                  id="editName"
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                  placeholder="Enter category name"
                />
              </div>
              
              <div>
                <Label htmlFor="editDescription">Description</Label>
                <Textarea
                  id="editDescription"
                  value={editingCategory.description || ''}
                  onChange={(e) => setEditingCategory(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                  placeholder="Enter category description"
                  rows={3}
                />
              </div>

              <div>
                <Label>Icon</Label>
                <div className="flex items-center gap-2 mt-1">
                  {editingCategory.icon && (
                    <img 
                      src={`/serviceicons/${editingCategory.icon}`} 
                      alt="Selected icon" 
                      className="w-8 h-8"
                    />
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsIconPickerOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Image className="h-4 w-4" />
                    {editingCategory.icon ? 'Change Icon' : 'Select Icon'}
                  </Button>
                  {editingCategory.icon && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingCategory(prev => prev ? ({ ...prev, icon: '' }) : null)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="editIsActive"
                  checked={editingCategory.isActive}
                  onCheckedChange={(checked) => setEditingCategory(prev => prev ? ({ ...prev, isActive: !!checked }) : null)}
                />
                <Label htmlFor="editIsActive">Active</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateCategory}>
                  Update Category
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isIconPickerOpen} onOpenChange={setIsIconPickerOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Choose Service Icon</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-8 gap-4 p-4 max-h-96 overflow-y-auto">
            {availableIcons.map((iconName) => (
              <button
                key={iconName}
                onClick={() => handleIconSelect(iconName)}
                className="p-3 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors flex flex-col items-center gap-2"
              >
                <img 
                  src={`/serviceicons/${iconName}`} 
                  alt={iconName} 
                  className="w-8 h-8"
                />
                <span className="text-xs text-slate-600 text-center break-all">
                  {iconName.replace(/\.(svg|png)$/, '')}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
