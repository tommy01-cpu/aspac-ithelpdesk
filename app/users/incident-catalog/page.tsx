'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Tags, ChevronDown, ChevronUp, Search, Clock, AlertCircle, Bug, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getPriorityColor } from '@/lib/status-colors';

interface IncidentCatalogItem {
  id: number;
  name: string;
  description?: string;
  categoryId: number;
  categoryName: string;
  templateId?: number;
  templateName?: string;
  template_icon?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  isActive: boolean;
  usageCount: number;
  avgResolutionTime?: string;
  isUrgent?: boolean;
}

interface ServiceCategory {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  incidentCount: number;
}

export default function IncidentCatalogTab() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
  const [categoryIncidents, setCategoryIncidents] = useState<{ [key: number]: IncidentCatalogItem[] }>({});

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
        // For incident catalog, we'll use the same categories but fetch incident items
        setCategories(data.categories || []);
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
        console.log('API Response:', data); // Debug log
        setCategoryIncidents(prev => ({
          ...prev,
          [categoryId]: data.incidentCatalogItems || []
        }));
      } else {
        console.error('API Error:', response.status, response.statusText);
        // Mock data for now since API might not exist yet
        const mockIncidents: IncidentCatalogItem[] = [
          {
            id: 1,
            name: "System Performance Issue",
            description: "Report slow system performance or application lag",
            categoryId: categoryId,
            categoryName: "Performance",
            templateId: 1,
            templateName: "Performance Issue Template",
            priority: "High",
            isActive: true,
            usageCount: 45,
            avgResolutionTime: "2-4 hours",
            isUrgent: true
          },
          {
            id: 2,
            name: "Login Access Problem",
            description: "Unable to login or authentication issues",
            categoryId: categoryId,
            categoryName: "Authentication",
            templateId: 2,
            templateName: "Login Issue Template",
            priority: "Medium",
            isActive: true,
            usageCount: 32,
            avgResolutionTime: "1-2 hours"
          },
          {
            id: 3,
            name: "Application Error",
            description: "Application crashes or error messages",
            categoryId: categoryId,
            categoryName: "Applications",
            templateId: 3,
            templateName: "Application Error Template",
            priority: "High",
            isActive: true,
            usageCount: 28,
            avgResolutionTime: "3-6 hours"
          }
        ];
        setCategoryIncidents(prev => ({
          ...prev,
          [categoryId]: mockIncidents
        }));
      }
    } catch (error) {
      console.error('Error fetching category incidents:', error);
      // Use mock data as fallback to show some incidents for testing
      const mockIncidents: IncidentCatalogItem[] = [
        {
          id: 1,
          name: "System Performance Issue",
          description: "Report slow system performance or application lag",
          categoryId: categoryId,
          categoryName: "Performance",
          templateId: 1,
          templateName: "Performance Issue Template",
          priority: "High",
          isActive: true,
          usageCount: 45,
          avgResolutionTime: "2-4 hours",
          isUrgent: true
        },
        {
          id: 2,
          name: "Login Access Problem",
          description: "Unable to login or authentication issues",
          categoryId: categoryId,
          categoryName: "Authentication",
          templateId: 2,
          templateName: "Login Issue Template",
          priority: "Medium",
          isActive: true,
          usageCount: 32,
          avgResolutionTime: "1-2 hours"
        },
        {
          id: 3,
          name: "Application Error",
          description: "Application crashes or error messages",
          categoryId: categoryId,
          categoryName: "Applications",
          templateId: 3,
          templateName: "Application Error Template",
          priority: "High",
          isActive: true,
          usageCount: 28,
          avgResolutionTime: "3-6 hours"
        }
      ];
      setCategoryIncidents(prev => ({
        ...prev,
        [categoryId]: mockIncidents
      }));
    }
  };

  const handleToggleCategory = async (categoryId: number) => {
    console.log('Toggling category:', categoryId); // Debug log
    if (expandedCategory === categoryId) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(categoryId);
      if (!categoryIncidents[categoryId]) {
        console.log('Fetching incidents for category:', categoryId); // Debug log
        await fetchCategoryIncidents(categoryId);
      }
    }
  };

  const handleReportIncident = (incident: IncidentCatalogItem) => {
    if (incident.templateId) {
      router.push(`/users/request/${incident.templateId}?type=incident&incidentId=${incident.id}`);
    } else {
      alert('This incident type is not available for reporting at the moment.');
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return <AlertTriangle className="w-4 h-4" />;
      case 'High':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Bug className="w-4 h-4" />;
    }
  };

  const filteredCategories = categories.filter(category => 
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Incident Catalog</h1>
        <p className="text-slate-600 mb-6">Browse and request available Incident</p>
        
        {/* Search */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Search incident types and categories..."
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
            <h3 className="text-lg font-medium text-slate-900 mb-2">No incident categories found</h3>
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
                      <AlertTriangle className="w-6 h-6 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-slate-900">{category.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {categoryIncidents[category.id]?.length || 0} {categoryIncidents[category.id]?.length === 1 ? 'incident type' : 'incident types'}
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
                      Available Incident Types ({categoryIncidents[category.id]?.length || 0})
                    </h4>
                    
                    {categoryIncidents[category.id]?.length > 0 ? (
                      <div className="space-y-3">
                        {categoryIncidents[category.id].map((incident) => (
                          <div key={incident.id} className="bg-white rounded-lg border border-slate-200 p-4 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 flex-1">
                                {/* Incident Icon */}
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  {incident.template_icon ? (
                                    <img 
                                      src={`/serviceicons/${incident.template_icon}`} 
                                      alt={incident.name} 
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <AlertTriangle className="w-5 h-5 text-blue-600" />
                                  )}
                                </div>

                                {/* Incident Details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h5 className="font-medium text-slate-900">{incident.name}</h5>
                                    <Badge className={`text-xs ${getPriorityColor(incident.priority)}`}>
                                      <span className="flex items-center gap-1">
                                        {getPriorityIcon(incident.priority)}
                                        {incident.priority} Priority
                                      </span>
                                    </Badge>
                                    {incident.isUrgent && (
                                      <Badge className="bg-red-100 text-red-800 text-xs">Urgent</Badge>
                                    )}
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
