'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FolderOpen, Tags, ChevronDown, ChevronUp, Search, Clock, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

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
  rating?: number;
  estimatedTime?: string;
  isPopular?: boolean;
}

interface ServiceCategory {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  serviceCount: number;
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
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
  const [categoryServices, setCategoryServices] = useState<{ [key: number]: ServiceCatalogItem[] }>({});

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async (search = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '100',
        ...(search && { search })
      });

      const response = await fetch(`/api/service-categories?${params}`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
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

  const handleRequestService = (service: ServiceCatalogItem) => {
    if (service.templateId) {
      router.push(`/users/request/${service.templateId}?type=service`);
    } else {
      alert('This service is not available for request at the moment.');
    }
  };

  const filteredCategories = categories.filter(category => 
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-3 h-3 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Service Catalog</h1>
        <p className="text-slate-600 mb-6">Browse and request available services</p>
        
        {/* Search */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Search services and categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
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
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <FolderOpen className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No service categories found</h3>
            <p className="text-slate-500">Try adjusting your search terms</p>
          </div>
        ) : (
          filteredCategories.map((category) => (
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
                      <Tags className="w-6 h-6 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-slate-900">{category.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {category.serviceCount} {category.serviceCount === 1 ? 'service' : 'services'}
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

              {/* Expanded Services */}
              {expandedCategory === category.id && (
                <div className="border-t border-slate-200 bg-slate-50">
                  <div className="p-6">
                    <h4 className="font-medium text-slate-900 mb-4">
                      Available Services ({categoryServices[category.id]?.length || 0})
                    </h4>
                    
                    {categoryServices[category.id]?.length > 0 ? (
                      <div className="space-y-3">
                        {categoryServices[category.id].map((service) => (
                          <div key={service.id} className="bg-white rounded-lg border border-slate-200 p-4 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 flex-1">
                                {/* Service Icon */}
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  {service.template_icon ? (
                                    <img 
                                      src={`/serviceicons/${service.template_icon}`} 
                                      alt={service.name} 
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <FolderOpen className="w-5 h-5 text-blue-600" />
                                  )}
                                </div>

                                {/* Service Details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h5 className="font-medium text-slate-900">{service.name}</h5>
                                    {service.isPopular && (
                                      <Badge className="bg-orange-100 text-orange-800 text-xs">Popular</Badge>
                                    )}
                                    {!service.isActive && (
                                      <Badge variant="outline" className="text-xs text-slate-500">
                                        Unavailable
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-slate-600 mb-2">
                                    {service.description || 'No description available'}
                                  </p>
                                  
                                  {/* Service Metadata */}
                                  <div className="flex items-center gap-4 text-xs text-slate-500">
                                    {service.rating && (
                                      <div className="flex items-center gap-1">
                                        <div className="flex items-center">
                                          {renderStars(Math.round(service.rating))}
                                        </div>
                                        <span>{service.rating.toFixed(1)} rating</span>
                                      </div>
                                    )}
                                    
                                    {service.estimatedTime && (
                                      <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        <span>Est. {service.estimatedTime}</span>
                                      </div>
                                    )}

                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-2 ml-4">
                                {service.templateId && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.push(`/users/service/preview/${service.templateId}`)}
                                  >
                                    Preview
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                  onClick={() => handleRequestService(service)}
                                  disabled={!service.isActive}
                                >
                                  Request Service
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        <FolderOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p>No services available in this category</p>
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
