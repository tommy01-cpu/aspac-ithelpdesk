'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronDown, ChevronUp, ChevronRight, FolderOpen, Briefcase } from 'lucide-react';

// Simple debounce function
const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

interface ServiceCatalogItem {
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
  serviceCount: number;
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

export default function ServiceCatalog() {
  const router = useRouter();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [categoryServices, setCategoryServices] = useState<{ [key: number]: ServiceCatalogItem[] }>({});
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      if (term.trim().length < 2) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      try {
        const response = await fetch(`/api/templates/search?q=${encodeURIComponent(term)}&type=service`);
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

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/service-categories?type=service');
      if (response.ok) {
        const data = await response.json();
        // Ensure we get the categories array from the response
        const categoriesArray = Array.isArray(data) ? data : (data.categories || []);
        setCategories(categoriesArray);
        
        // Auto-expand first category if only one exists
        if (categoriesArray.length === 1) {
          setExpandedCategory(categoriesArray[0].id);
          fetchCategoryServices(categoriesArray[0].id);
        }
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

  const fetchCategoryServices = async (categoryId: number) => {
    try {
      const response = await fetch(`/api/service-catalog?categoryId=${categoryId}`);
      if (response.ok) {
        const data = await response.json();
        // Extract the services array from the API response
        const servicesArray = data.services || data.serviceCatalogItems || data || [];
        setCategoryServices(prev => ({
          ...prev,
          [categoryId]: servicesArray
        }));
      } else {
        console.error('Failed to fetch services:', response.status);
        setCategoryServices(prev => ({
          ...prev,
          [categoryId]: []
        }));
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      setCategoryServices(prev => ({
        ...prev,
        [categoryId]: []
      }));
    }
  };

  const handleToggleCategory = (categoryId: number) => {
    if (expandedCategory === categoryId) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(categoryId);
      if (!categoryServices[categoryId]) {
        fetchCategoryServices(categoryId);
      }
    }
  };

  const handleServiceClick = (service: ServiceCatalogItem) => {
    if (service.templateId && service.template) {
      router.push(`/requests/templateid/${service.templateId}?type=${service.template.type}`);
    } else {
      alert('This service is not available for request at the moment.');
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
    <div className="p-3 sm:p-4 lg:p-6">
      {/* Header Section */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Service Catalog</h1>
        <p className="text-sm sm:text-base text-slate-600 mb-4 sm:mb-6">Browse and request available services</p>
        
        {/* Search */}
        <div className="flex items-center gap-2 sm:gap-4 mb-4">
          <div className="flex-1 max-w-full sm:max-w-lg">
            <div className="relative search-container">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
              <Input
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 sm:h-12 pl-10 sm:pl-12 pr-3 sm:pr-4 text-sm sm:text-base border-2 border-slate-200 rounded-lg sm:rounded-xl shadow-sm focus:border-blue-500 focus:ring-2 sm:focus:ring-4 focus:ring-blue-100 transition-all duration-200"
              />
              
              {/* Search Dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200/50 rounded-lg sm:rounded-xl shadow-2xl mt-2 max-h-80 sm:max-h-96 overflow-hidden z-[9999] backdrop-blur-sm">
                  <div className="p-3 sm:p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <p className="text-xs sm:text-sm font-semibold text-gray-800">
                      🔍 Found {searchResults.length} service template{searchResults.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="max-h-60 sm:max-h-80 overflow-y-auto">
                    {searchResults.map((result, index) => (
                      <div
                        key={`${result.type}-${result.id}`}
                        className="p-3 sm:p-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-all duration-200 group"
                        onClick={() => handleSearchResultClick(result)}
                      >
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="flex-grow min-w-0">
                            {result.categoryName && (
                              <div className="text-xs text-slate-600 font-medium truncate mb-1">Category: {result.categoryName}</div>
                            )}
                            <div className="text-sm sm:font-medium text-slate-900 truncate mt-1 group-hover:text-blue-700 transition-colors">Template: {result.name}</div>
                            {result.description && (
                              <div className="text-xs sm:text-sm text-slate-500 truncate mt-1 group-hover:text-slate-600 transition-colors line-clamp-1">Description: {result.description}</div>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-50 to-indigo-50 text-center border-t border-blue-100">
                    <p className="text-xs text-blue-700 font-medium">
                      💡 Tap to request service
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
          <div className="text-center py-8 sm:py-12 bg-white rounded-lg border border-slate-200 mx-2 sm:mx-0">
            <FolderOpen className="w-8 sm:w-12 h-8 sm:h-12 mx-auto mb-3 sm:mb-4 text-slate-300" />
            <h3 className="text-base sm:text-lg font-medium text-slate-900 mb-2">No service categories found</h3>
            <p className="text-sm sm:text-base text-slate-500">Check back later for available services</p>
          </div>
        ) : (
          (Array.isArray(categories) ? categories : []).map((category) => (
            <div key={category.id} className="bg-white rounded-lg border border-slate-200 shadow-sm">
              {/* Category Header */}
              <button
                className="w-full p-4 sm:p-6 text-left hover:bg-slate-50 transition-colors flex items-center justify-between"
                onClick={() => handleToggleCategory(category.id)}
              >
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center p-2 flex-shrink-0">
                    {category.icon ? (
                      <img 
                        src={`/serviceicons/${category.icon}`} 
                        alt={category.name} 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 text-base sm:text-lg truncate">{category.name}</h3>
                    <p className="text-slate-600 text-xs sm:text-sm truncate">{category.description}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-500">
                        {category.serviceCount} service{category.serviceCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {expandedCategory === category.id ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </button>
              
              {/* Expanded Services */}
              {expandedCategory === category.id && (
                <div className="border-t border-slate-200 bg-slate-50">
                  <div className="p-4 sm:p-6">
                    <h4 className="font-medium text-slate-900 mb-3 sm:mb-4 text-sm sm:text-base">
                      Available Services ({(categoryServices[category.id] || []).length})
                    </h4>
                    
                    {(categoryServices[category.id] || []).length > 0 ? (
                      <div className="space-y-3">
                        {(categoryServices[category.id] || []).map((service) => (
                          <div key={service.id} className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4 hover:bg-slate-50 transition-colors">
                            <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
                              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 w-full sm:w-auto">
                                {/* Service Icon */}
                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  {service.template?.icon ? (
                                    <img 
                                      src={`/serviceicons/${service.template.icon}`} 
                                      alt={service.name} 
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                                  )}
                                </div>
                                
                                {/* Service Details */}
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-medium text-slate-900 truncate text-sm sm:text-base">{service.name}</h5>
                                  {service.description && (
                                    <p className="text-xs sm:text-sm text-slate-600 truncate">{service.description}</p>
                                  )}
                                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1">
                                    {service.templateName && (
                                      <span className="text-xs text-blue-600">Template: {service.templateName}</span>
                                    )}
                                    <span className="text-xs text-slate-500">Used {service.usageCount} times</span>
                                    {service.avgResolutionTime && (
                                      <span className="text-xs text-slate-500">Avg: {service.avgResolutionTime}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Request Button */}
                              <button
                                onClick={() => handleServiceClick(service)}
                                disabled={!service.isActive || !service.templateId}
                                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 w-full sm:w-auto ${
                                  service.isActive && service.templateId
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                }`}
                              >
                                {service.isActive && service.templateId ? 'Request' : 'Unavailable'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 sm:py-8 text-slate-500">
                        <Briefcase className="w-6 sm:w-8 h-6 sm:h-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-sm sm:text-base">No services available in this category</p>
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
