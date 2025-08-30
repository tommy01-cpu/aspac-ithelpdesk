'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight, FolderOpen, Upload, Image, Eye, Tags, ChevronDown, ChevronUp, AlertTriangle, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface IncidentCatalogItem {
  id: number;
  name: string;
  description?: string;
  categoryId: number;
  categoryName: string;
  templateId?: number;
  templateName?: string;
  template?: {
    id: number;
    name: string;
    type: string;
    icon?: string;
  };
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
  incidentCount: number;
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

export default function IncidentCatalogTab() {
  const router = useRouter();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
  const [categoryIncidents, setCategoryIncidents] = useState<{ [key: number]: IncidentCatalogItem[] }>({});
  const [reorderingCategory, setReorderingCategory] = useState<number | null>(null);
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
        type: 'incident', // Specify that we want incident-specific data
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

  const fetchCategoryIncidents = async (categoryId: number) => {
    try {
      const response = await fetch(`/api/incident-catalog?categoryId=${categoryId}`);
      if (response.ok) {
        const data = await response.json();
        setCategoryIncidents(prev => ({
          ...prev,
          [categoryId]: data.incidentCatalogItems || []
        }));
      } 
    } catch (error) {
      console.error('Error fetching category incidents:', error);
    }
  };

  const handleAddIncident = (categoryId: number) => {
    router.push(`/admin/catalog-management/incident/template/builder?type=incident&categoryId=${categoryId}`);
  };

  const handleEditTemplate = (templateId?: number, categoryId?: number) => {
    if (templateId) {
      const url = categoryId 
        ? `/admin/catalog-management/incident/template/builder?id=${templateId}&type=incident&categoryId=${categoryId}`
        : `/admin/catalog-management/incident/template/builder?id=${templateId}&type=incident`;
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

  const handleDeleteIncident = async (incidentId: number, incidentName: string) => {
    if (!window.confirm(`Are you sure you want to delete the incident "${incidentName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/incident-catalog?id=${incidentId}`, {
        method: 'DELETE',
      });

      const responseData = await response.json();

      if (response.ok) {
        // Refresh the categories and their incidents
        await fetchCategories(currentPage, pageSize, searchTerm);
        // Also refresh the specific category incidents if it's currently expanded
        if (expandedCategory) {
          await fetchCategoryIncidents(expandedCategory);
        }
        alert('Incident deleted successfully!');
      } else if (response.status === 409) {
        // Handle conflict due to active requests
        showErrorDialog(
          'Template Deletion Not Allowed', 
          responseData.error
        );
      } else {
        showErrorDialog('Delete Failed', responseData.error || 'Failed to delete incident. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting incident:', error);
      showErrorDialog('Delete Failed', 'Failed to delete incident. Please try again.');
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
        // Handle conflict due to existing incidents or templates
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
      if (!categoryIncidents[categoryId]) {
        await fetchCategoryIncidents(categoryId);
      }
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Incident reorder functions
  const handleMoveIncident = async (categoryId: number, incidentIndex: number, direction: 'up' | 'down') => {
    const incidents = [...categoryIncidents[categoryId]];
    const targetIndex = direction === 'up' ? incidentIndex - 1 : incidentIndex + 1;
    
    if (targetIndex < 0 || targetIndex >= incidents.length) return;
    
    // Swap incidents
    [incidents[incidentIndex], incidents[targetIndex]] = [incidents[targetIndex], incidents[incidentIndex]];
    
    // Update local state
    setCategoryIncidents(prev => ({
      ...prev,
      [categoryId]: incidents
    }));

    // Save to backend
    try {
      const reorderData = incidents.map((incident, index) => ({
        id: incident.id,
        sortOrder: index + 1
      }));

      console.log('🔄 Sending reorder request for incident catalog:', {
        type: 'incident-catalog',
        items: reorderData
      });

      const response = await fetch('/api/catalog/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'incident-catalog',
          items: reorderData
        }),
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response not OK. Status:', response.status, 'Text:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();
      console.log('✅ Success response data:', responseData);

      toast({
        title: "Success",
        description: "Incident order updated successfully",
      });
    } catch (error) {
      console.error('❌ Error updating incident order:', error);
      
      let errorMessage = "Failed to update incident order";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      // Revert local changes
      await fetchCategoryIncidents(categoryId);
    }
  };

  const toggleReorderMode = (categoryId: number) => {
    setReorderingCategory(reorderingCategory === categoryId ? null : categoryId);
  };

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Incident Catalog</h1>
        
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
            {/* Removed Add Incident and Delete buttons */}
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
              <th className="text-left p-4 font-medium text-slate-900">Incidents</th>
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
                          title={`Click to view incidents for ${category.name}`}
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
                        {category.incidentCount}
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
                          onClick={() => handleAddIncident(category.id)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Incident
                        </Button>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Expanded Incident Items */}
                  {expandedCategory === category.id && (
                    <tr>
                      <td colSpan={7} className="p-0">
                        <div className="bg-slate-50 border-t border-slate-200">
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-slate-900">
                                Incidents in {category.name} ({categoryIncidents[category.id]?.length || 0})
                              </h4>
                              {categoryIncidents[category.id]?.length > 1 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleReorderMode(category.id)}
                                  className="flex items-center gap-2"
                                >
                                  <ArrowUpDown className="h-4 w-4" />
                                  {reorderingCategory === category.id ? 'Done Reordering' : 'Reorder Incidents'}
                                </Button>
                              )}
                            </div>
                            {categoryIncidents[category.id]?.length > 0 ? (
                              <div className="space-y-2">
                                {categoryIncidents[category.id].map((incident, incidentIndex) => (
                                  <div key={incident.id} className="bg-white rounded-lg border border-slate-200 p-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3 flex-1">
                                        {reorderingCategory === category.id && (
                                          <div className="flex flex-col gap-1">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => handleMoveIncident(category.id, incidentIndex, 'up')}
                                              disabled={incidentIndex === 0}
                                              className="h-6 w-6 p-0"
                                            >
                                              <ArrowUp className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => handleMoveIncident(category.id, incidentIndex, 'down')}
                                              disabled={incidentIndex === categoryIncidents[category.id].length - 1}
                                              className="h-6 w-6 p-0"
                                            >
                                              <ArrowDown className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        )}
                                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                          {incident.template?.icon ? (
                                            <img 
                                              src={`/serviceicons/${incident.template.icon}`} 
                                              alt={incident.name} 
                                              className="w-full h-full object-contain"
                                            />
                                          ) : (
                                            <Tags className="w-5 h-5 text-blue-600" />
                                          )}
                                        </div>
                                        <div>
                                          <div className="font-medium text-slate-900">{incident.name}</div>
                                          <div className="text-sm text-slate-500">{incident.description}</div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <div className="text-sm text-slate-600">
                                          Requests: <span className="font-medium">{incident.requestCount}</span>
                                          {incident.requestCount > 0 && (
                                            <span className="ml-1 text-amber-600" title="This incident has been used by requests">
                                              ⚠️
                                            </span>
                                          )}
                                        </div>
                                        {incident.templateName && !reorderingCategory && (
                                          <>
                                            <button
                                              onClick={() => handleEditTemplate(incident.templateId, category.id)}
                                              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                            >
                                              edit
                                            </button>
                                            <button
                                              onClick={() => handleDeleteIncident(incident.id, incident.name)}
                                              className={`text-sm hover:underline ${
                                                incident.requestCount > 0
                                                  ? 'text-amber-600 hover:text-amber-800'
                                                  : 'text-red-600 hover:text-red-800'
                                              }`}
                                              title={incident.requestCount > 0 ? `Warning: This incident has ${incident.requestCount} request(s). Deletion may be restricted if there are active requests.` : 'Delete this incident'}
                                            >
                                              delete
                                            </button>
                                          </>
                                        )}
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                          incident.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                          {incident.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-slate-500">
                                No incidents found in this category
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
