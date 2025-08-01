'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ChevronLeft, ChevronRight, AlertTriangle, Eye, Edit, Tags, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface IncidentCatalogItem {
  id: number;
  name: string;
  description?: string;
  categoryId: number;
  categoryName: string;
  templateId?: number;
  templateName?: string;
  priority: string;
  isActive: boolean;
  usageCount: number;
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

const PRIORITY_OPTIONS = [
  { value: 'Low', label: 'Low – Affects only you as an individual', color: 'bg-green-100 text-green-800' },
  { value: 'Medium', label: 'Medium – Affects the delivery of your services', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'High', label: 'High – Affects the company\'s business', color: 'bg-orange-100 text-orange-800' },
  { value: 'Top', label: 'Top – Utmost action needed as classified by Management', color: 'bg-red-100 text-red-800' }
];

export default function IncidentCatalogTab() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
  const [categoryIncidents, setCategoryIncidents] = useState<{ [key: number]: IncidentCatalogItem[] }>({});
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 25,
    total: 0,
    pages: 0
  });

  // Data fetching functions
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/service-categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getPriorityColor = (priority: string) => {
    const priorityOption = PRIORITY_OPTIONS.find(p => p.value === priority);
    return priorityOption ? priorityOption.color : 'bg-gray-100 text-gray-800';
  };

  const getIncidentsForCategory = (categoryId: number) => {
    return categoryIncidents[categoryId] || [];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Incident Catalog</h1>
          <p className="text-slate-600">Manage incident catalog items by category</p>
        </div>
        <Button onClick={() => router.push('/admin/incident-template/template/builder?type=incident')}>
          <Plus className="w-4 h-4 mr-2" />
          Add Incident
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search categories..."
          className="max-w-sm"
        />
        <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-lg border border-slate-200">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Category Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Incidents
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Created Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-slate-500">Loading categories...</p>
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  No categories found
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <React.Fragment key={category.id}>
                  <tr className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                          className="p-1 h-6 w-6"
                        >
                          {expandedCategory === category.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 h-10 w-10">
                            {category.icon ? (
                              <img className="h-10 w-10 rounded-lg" src={category.icon} alt="" />
                            ) : (
                              <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Tags className="h-5 w-5 text-blue-600" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-900">{category.name}</div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-900">{category.description || 'No description'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {category.incidentCount || 0} incidents
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        category.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {category.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {formatDate(category.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/admin/incident-template/template/builder?category=${category.id}&type=incident`)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Incident
                        </Button>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Expandable incident list */}
                  {expandedCategory === category.id && (
                    <tr>
                      <td colSpan={6} className="px-6 py-0">
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                          {getIncidentsForCategory(category.id).length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                              <AlertTriangle className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                              <h3 className="text-sm font-medium text-slate-900 mb-2">No incidents found</h3>
                              <p className="text-sm text-slate-500 mb-4">Get started by creating a new incident for this category.</p>
                              <Button
                                size="sm"
                                onClick={() => router.push(`/admin/incident-template/template/builder?category=${category.id}&type=incident`)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add First Incident
                              </Button>
                            </div>
                          ) : (
                            <div className="grid gap-3">
                              {getIncidentsForCategory(category.id).map((incident) => (
                                <div key={incident.id} className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                      <AlertTriangle className="w-5 h-5 text-red-600" />
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-medium text-slate-900">{incident.name}</h4>
                                      <p className="text-sm text-slate-500">{incident.description}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="outline" className={getPriorityColor(incident.priority)}>
                                          {incident.priority}
                                        </Badge>
                                        <span className="text-xs text-slate-500">
                                          Used {incident.usageCount} times
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm">
                                      <Eye className="h-4 w-4 mr-1" />
                                      View
                                    </Button>
                                    {incident.templateId && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => router.push(`/admin/incident-template/template/builder?id=${incident.templateId}&type=incident`)}
                                      >
                                        <Edit className="h-4 w-4 mr-1" />
                                        Edit
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
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

      {/* Pagination */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div className="flex-1 flex justify-between sm:hidden">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(Math.min(pagination.pages, currentPage + 1))}
            disabled={currentPage === pagination.pages}
          >
            Next
          </Button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{((currentPage - 1) * pageSize) + 1}</span> to{' '}
              <span className="font-medium">{Math.min(currentPage * pageSize, pagination.total)}</span> of{' '}
              <span className="font-medium">{pagination.total}</span> results
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <Button
                variant="outline"
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </Button>
              <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                Page {currentPage} of {pagination.pages}
              </span>
              <Button
                variant="outline"
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                onClick={() => setCurrentPage(Math.min(pagination.pages, currentPage + 1))}
                disabled={currentPage === pagination.pages}
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </Button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
