'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight, FolderOpen, Upload, Image, Eye, Tags, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

interface ServiceCatalogItem {
  id: number;
  name: string;
  description?: string;
  categoryId: number;
  categoryName: string;
  templateId?: number;
  templateName?: string;
  template_icon?: string;
  isActive: boolean;
  requestCount: number;
  activeRequestCount?: number; // For active requests specifically
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: number;
    emp_fname: string;
    emp_lname: string;
  };
}

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

interface Template {
  id: number;
  name: string;
  type: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function ServiceCatalogTab() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
  const [categoryServices, setCategoryServices] = useState<{ [key: number]: ServiceCatalogItem[] }>({});
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({ open: false, title: '', message: '' });
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 25,
    total: 0,
    pages: 0
  });

  // Fetch data on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch categories when dependencies change
  useEffect(() => {
    fetchCategories(currentPage, pageSize, searchTerm);
  }, [currentPage, pageSize, searchTerm]);

  const fetchCategories = async (page = 1, limit = 25, search = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        type: 'service', // Specify that we want service-specific data
        ...(search && { search })
      });

      const response = await fetch(`/api/service-categories?${params}`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
        setPagination(data.pagination || {
          page: page,
          limit: limit,
          total: data.categories?.length || 0,
          pages: Math.ceil((data.categories?.length || 0) / limit)
        });
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryServices = async (categoryId: number) => {
    try {
      const response = await fetch(`/api/service-catalog?categoryId=${categoryId}`);
      if (response.ok) {
        const data = await response.json();
        setCategoryServices(prev => ({
          ...prev,
          [categoryId]: data.services || []
        }));
      } 
    } catch (error) {
      console.error('Error fetching category services:', error);
    }
  };

  const handleAddService = (categoryId: number) => {
    router.push(`/admin/catalog-management/service/template/builder?type=service&categoryId=${categoryId}`);
  };

  const handleEditTemplate = (templateId?: number, categoryId?: number) => {
    if (templateId) {
      const url = categoryId 
        ? `/admin/catalog-management/service/template/builder?id=${templateId}&type=service&categoryId=${categoryId}`
        : `/admin/catalog-management/service/template/builder?id=${templateId}&type=service`;
      router.push(url);
    }
  };

  const showErrorDialog = (title: string, message: string) => {
    setErrorDialog({
      open: true,
      title,
      message
    });
  };

  const handleDeleteService = async (serviceId: number, serviceName: string) => {
    if (!window.confirm(`Are you sure you want to delete the service "${serviceName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/service-catalog?id=${serviceId}`, {
        method: 'DELETE',
      });

      const responseData = await response.json();

      if (response.ok) {
        // Refresh the categories and their services
        await fetchCategories(currentPage, pageSize, searchTerm);
        // Also refresh the specific category services if it's currently expanded
        if (expandedCategory) {
          await fetchCategoryServices(expandedCategory);
        }
        alert('Service deleted successfully!');
      } else if (response.status === 409) {
        // Handle conflict due to active requests
        showErrorDialog(
          'Template Deletion Not Allowed', 
          responseData.error
        );
      } else {
        showErrorDialog('Delete Failed', responseData.error || 'Failed to delete service. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting service:', error);
      showErrorDialog('Delete Failed', 'Failed to delete service. Please try again.');
    }
  };

  const handleDeleteCategory = async (categoryId: number, categoryName: string) => {
    if (!window.confirm(`Are you sure you want to delete the category "${categoryName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/service-categories?id=${categoryId}`, {
        method: 'DELETE',
      });

      const responseData = await response.json();

      if (response.ok) {
        // Refresh the categories
        await fetchCategories(currentPage, pageSize, searchTerm);
        alert('Category deleted successfully!');
      } else if (response.status === 409) {
        // Handle conflict due to existing services or templates
        showErrorDialog(
          'Cannot Delete Category',
          responseData.error + '\n\nPlease delete or reassign all items first.'
        );
      } else {
        showErrorDialog('Delete Failed', responseData.error || 'Failed to delete category. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      showErrorDialog('Delete Failed', 'Failed to delete category. Please try again.');
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

  const handleToggleCategory = async (categoryId: number) => {
    if (expandedCategory === categoryId) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(categoryId);
      if (!categoryServices[categoryId]) {
        await fetchCategoryServices(categoryId);
      }
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
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Service Catalog</h1>
        
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
            {/* Removed Add Service and Delete buttons */}
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
                <React.Fragment key={category.id}>
                  <tr className="border-b border-slate-200 hover:bg-slate-50">
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
                          className="font-medium text-slate-900 hover:text-blue-600 transition-colors text-left flex items-center gap-2"
                          onClick={() => handleToggleCategory(category.id)}
                          title={`Click to view services for ${category.name}`}
                        >
                          {category.name}
                          {expandedCategory === category.id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="p-4 text-slate-900">{category.description || 'N/A'}</td>
                    <td className="p-4">
                      <span className="text-slate-900 font-medium">
                        {category.serviceCount}
                      </span>
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
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700"
                          onClick={() => handleAddService(category.id)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Service
                        </Button>
                        {/* <Button 
                          variant="outline" 
                          size="sm" 
                          className={`${
                            category.serviceCount > 0 
                              ? 'text-gray-400 hover:text-gray-400 hover:bg-gray-50 border-gray-200 cursor-not-allowed' 
                              : 'text-red-600 hover:text-red-800 hover:bg-red-50 border-red-200 hover:border-red-300'
                          }`}
                          onClick={() => handleDeleteCategory(category.id, category.name)}
                          disabled={category.serviceCount > 0}
                          title={category.serviceCount > 0 ? `Cannot delete category with ${category.serviceCount} service(s). Delete all services first.` : `Delete category "${category.name}"`}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button> */}
                      </div>
                    </td>
                  </tr>
                  
                  {/* Expanded Service Items */}
                  {expandedCategory === category.id && (
                    <tr>
                      <td colSpan={7} className="p-0">
                        <div className="bg-slate-50 border-t border-slate-200">
                          <div className="p-4">
                            <h4 className="font-medium text-slate-900 mb-3">
                              Services in {category.name} ({categoryServices[category.id]?.length || 0})
                            </h4>
                            {categoryServices[category.id]?.length > 0 ? (
                              <div className="space-y-2">
                                {categoryServices[category.id].map((service) => (
                                  <div key={service.id} className="bg-white rounded-lg border border-slate-200 p-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                          {service.template_icon ? (
                                            <img 
                                              src={`/serviceicons/${service.template_icon}`} 
                                              alt={service.name} 
                                              className="w-full h-full object-contain"
                                            />
                                          ) : (
                                            <Tags className="w-5 h-5 text-blue-600" />
                                          )}
                                        </div>
                                        <div>
                                          <div className="font-medium text-slate-900">{service.name}</div>
                                          <div className="text-sm text-slate-500">{service.description}</div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <div className="text-sm text-slate-600">
                                          Requests: <span className="font-medium">{service.requestCount}</span>
                                          {service.requestCount > 0 && (
                                            <span className="ml-1 text-amber-600" title="This service has been used by requests">
                                              ⚠️
                                            </span>
                                          )}
                                        </div>
                                        {service.templateName && (
                                          <>
                                            <button
                                              onClick={() => handleEditTemplate(service.templateId, category.id)}
                                              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                            >
                                              edit
                                            </button>
                                            <button
                                              onClick={() => handleDeleteService(service.id, service.name)}
                                              className={`text-sm hover:underline ${
                                                service.requestCount > 0
                                                  ? 'text-amber-600 hover:text-amber-800'
                                                  : 'text-red-600 hover:text-red-800'
                                              }`}
                                              title={service.requestCount > 0 ? `Warning: This service has ${service.requestCount} request(s). Deletion may be restricted if there are active requests.` : 'Delete this service'}
                                            >
                                              delete
                                            </button>
                                          </>
                                        )}
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                          service.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                          {service.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-slate-500">
                                No services found in this category
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Error Dialog */}
      <Dialog open={errorDialog.open} onOpenChange={(open) => setErrorDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              {errorDialog.title}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-700 whitespace-pre-line">{errorDialog.message}</p>
          </div>
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              onClick={() => setErrorDialog({ open: false, title: '', message: '' })}
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
