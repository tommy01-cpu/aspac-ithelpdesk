'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Tags, ChevronDown, ChevronUp, ChevronRight, Search, Clock, AlertCircle, Bug, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getPriorityColor } from '@/lib/status-colors';

// Simple debounce function
const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

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
  usageCount: number;
  avgResolutionTime?: string;
}

interface ServiceCategory {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  incidentCount: number;
}

interface SearchResult {
  id: number;
  name: string;
  description?: string;
  type: 'service' | 'incident';
  categoryName: string;
  templateId?: number;
  templateName?: string;
}

export default function IncidentCatalogTab() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
  const [categoryIncidents, setCategoryIncidents] = useState<{ [key: number]: IncidentCatalogItem[] }>({});

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      if (term.trim().length < 2) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      try {
        const response = await fetch(`/api/templates/search?q=${encodeURIComponent(term)}&type=incident`);
        if (response.ok) {
          const data = await response.json();
          const results = data.templates || data || [];
          setSearchResults(results);
          setShowDropdown(true);
        }
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 300),
    []
  );

  const performSearch = useCallback((term: string) => {
    debouncedSearch(term);
  }, [debouncedSearch]);

  useEffect(() => {
    performSearch(searchTerm);
  }, [searchTerm, performSearch]);

  // Hide dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.search-container')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '100',
        type: 'incident'
      });

      const response = await fetch(`/api/service-categories?${params}`);
      if (response.ok) {
        const data = await response.json();
        // Ensure we get the categories array from the response
        const categoriesArray = data.categories || data || [];
        setCategories(Array.isArray(categoriesArray) ? categoriesArray : []);
      } else {
        console.error('Failed to fetch categories:', response.status);
        setCategories([]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
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
      } else {
        console.error('API Error:', response.status, response.statusText);
        setCategoryIncidents(prev => ({
          ...prev,
          [categoryId]: []
        }));
      }
    } catch (error) {
      console.error('Error fetching category incidents:', error);
      setCategoryIncidents(prev => ({
        ...prev,
        [categoryId]: []
      }));
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

  const handleReportIncident = (incident: IncidentCatalogItem) => {
    if (incident.templateId) {
      router.push(`/requests/templateid/${incident.templateId}?type=incident&incidentId=${incident.id}`);
    } else {
      alert('This incident type is not available for reporting at the moment.');
    }
  };

  const handleSearchResultClick = (result: SearchResult) => {
    if (result.templateId) {
      router.push(`/requests/templateid/${result.templateId}?type=${result.type}`);
    }
    setSearchTerm('');
    setShowDropdown(false);
  };

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Incident Catalog</h1>
        <p className="text-slate-600 mb-6">Browse and request available Incident</p>
        
        {/* Search */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 max-w-lg">
            <div className="relative search-container">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
              <Input
                placeholder="Search categories, incidents & templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 pl-12 pr-4 text-base border-2 border-slate-200 rounded-xl shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
              />
              
              {/* Search Dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200/50 rounded-xl shadow-2xl mt-2 max-h-96 overflow-hidden z-[9999] backdrop-blur-sm">
                  <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-red-50 to-orange-50">
                    <p className="text-sm font-semibold text-gray-800">
                      🚨 Found {searchResults.length} incident template{searchResults.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {searchResults.map((result, index) => (
                      <div
                        key={`${result.type}-${result.id}`}
                        className="p-4 hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-all duration-200 group"
                        onClick={() => handleSearchResultClick(result)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-grow min-w-0">
                            {result.categoryName && (
                              <div className="text-xs text-slate-600 font-medium truncate mb-1">Category: {result.categoryName}</div>
                            )}
                            <div className="font-medium text-slate-900 truncate mt-1 group-hover:text-red-700 transition-colors">Template name: {result.name}</div>
                            {result.description && (
                              <div className="text-sm text-slate-500 truncate mt-1 group-hover:text-slate-600 transition-colors">Description: {result.description}</div>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 bg-gradient-to-r from-red-50 to-orange-50 text-center border-t border-red-100">
                    <p className="text-xs text-red-700 font-medium">
                      💡 Click on any template to report the incident
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Categories List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (!Array.isArray(categories) || categories.length === 0) ? (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <FolderOpen className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No incident categories found</h3>
            <p className="text-slate-500">Try adjusting your search terms</p>
          </div>
        ) : (
          (Array.isArray(categories) ? categories : []).map((category) => (
            <div key={category.id} className="bg-white rounded-lg border border-slate-200 shadow-sm">
              {/* Category Header */}
              <button
                className="w-full p-6 text-left hover:bg-slate-50 transition-colors flex items-center justify-between"
                onClick={() => handleToggleCategory(category.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center p-2">
                    {category.icon ? (
                      <img 
                        src={`/serviceicons/${category.icon}`} 
                        alt={category.name} 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-slate-900">{category.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {category.incidentCount || 0} {category.incidentCount === 1 ? 'incident type' : 'incident types'}
                      </Badge>
                      {category.isActive && (
                        <Badge className="bg-green-100 text-green-800 text-xs status-badge">Active</Badge>
                      )}
                    </div>
                    <p className="text-slate-600">{category.description || 'No description available'}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  {expandedCategory === category.id ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Expanded Incidents */}
              {expandedCategory === category.id && (
                <div className="border-t border-slate-200 bg-slate-50">
                  <div className="p-6">
                    <h4 className="font-medium text-slate-900 mb-4">
                      Available Incident Types ({(categoryIncidents[category.id] || []).length})
                    </h4>
                    
                    {(categoryIncidents[category.id] || []).length > 0 ? (
                      <div className="space-y-3">
                        {(categoryIncidents[category.id] || []).map((incident) => (
                          <div key={incident.id} className="bg-white rounded-lg border border-slate-200 p-4 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 flex-1">
                                {/* Incident Icon */}
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
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

                                {/* Incident Details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h5 className="font-medium text-slate-900">{incident.name}</h5>
                                    {!incident.isActive && (
                                      <Badge variant="outline" className="text-xs text-slate-500">
                                        Unavailable
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-slate-600 mb-2">
                                    {incident.description || 'No description available'}
                                  </p>
                                  
                                  {/* Incident Metadata */}
                                  <div className="flex items-center gap-4 text-xs text-slate-500">
                                    {incident.avgResolutionTime && (
                                      <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        <span>Avg. resolution: {incident.avgResolutionTime}</span>
                                      </div>
                                    )}
                                    <span>{incident.usageCount} reports submitted</span>
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-2 ml-4">
                                <Button
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                  onClick={() => handleReportIncident(incident)}
                                  disabled={!incident.isActive}
                                >
                                  Request Incident
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        <FolderOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p>No incident types available in this category</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
