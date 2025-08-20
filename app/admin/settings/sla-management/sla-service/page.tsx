'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight, Clock, Target, Shield, X, Eye, Search, ArrowLeft, Save, ChevronDown, Check, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SessionWrapper } from '@/components/session-wrapper';

// Tooltip component for hover info
const InfoTooltip = ({
  children,
  content,
}: {
  children: React.ReactNode;
  content: string | React.ReactNode;
}) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-flex items-center">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-pointer"
      >
        {children}
      </div>

      {isVisible && (
        <div className="absolute left-full ml-2 z-50 w-80 bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-lg">
          <div className="text-sm text-amber-800">{content}</div>
          {/* Arrow pointing left */}
          <div className="absolute left-[-6px] top-2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-amber-200"></div>
        </div>
      )}
    </div>
  );
};

// Define Technician interface - matching your Prisma schema
interface Technician {
  id: string;
  displayName: string;        // matches schema
  employeeId: string;         // matches schema  
  jobTitle?: string;          // matches schema
  primaryEmail?: string;      // matches schema
  department?: {              // matches schema relationship
    id: string;
    name: string;
  };
  user?: {                    // user data from database
    emp_fname?: string;
    emp_lname?: string;
    emp_code?: string;
    emp_email?: string;
    post_des?: string;
    department?: string;
  };
  value: string;             // for component compatibility
  name: string;              // for component compatibility
}

// Simple Technician Input Component with Dropdown
const TechnicianInput = ({ 
  selectedTechnicians = [], 
  onSelectionChange, 
  placeholder = "Select technicians..." 
}: {
  selectedTechnicians: string[];
  onSelectionChange: (technicians: string[]) => void;
  placeholder?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [allTechnicians, setAllTechnicians] = useState<Technician[]>([]); // Keep all technicians for display
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Safety checks for props
  const safeSelectedTechnicians = Array.isArray(selectedTechnicians) ? selectedTechnicians.filter(Boolean) : [];
  const safeOnSelectionChange = typeof onSelectionChange === 'function' ? onSelectionChange : () => {};

  // Fetch technicians from API
  const fetchTechnicians = async (search = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search && search.trim()) {
        params.set('search', search.trim());
      }
      
      const response = await fetch(`/api/technicians/active?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result && result.success && result.data && Array.isArray(result.data)) {
        const transformedTechnicians = result.data
          .filter((tech: any) => tech && tech.id)
          .map((tech: any) => ({
            id: String(tech.id),
            displayName: `${tech.user?.emp_fname || ''} ${tech.user?.emp_lname || ''}`.trim() || 'Unknown Technician',
            employeeId: String(tech.employeeId || tech.user?.emp_code || ''),
            jobTitle: String(tech.jobTitle || tech.user?.post_des || ''),
            primaryEmail: String(tech.primaryEmail || tech.user?.emp_email || ''),
            department: tech.department || (tech.user?.department ? {
              id: tech.user.department,
              name: tech.user.department
            } : null),
            user: tech.user,  // Include the raw user data
            value: String(tech.id),
            name: `${tech.user?.emp_fname || ''} ${tech.user?.emp_lname || ''}`.trim() || 'Unknown Technician'
          }));
        
        setTechnicians(transformedTechnicians);
        
        // If no search term, this is the full list - store it for display purposes
        if (!search || !search.trim()) {
          setAllTechnicians(transformedTechnicians);
        }
      } else {
        setTechnicians([]);
        if (!search || !search.trim()) {
          setAllTechnicians([]);
        }
      }
    } catch (error) {
      console.error('Error fetching technicians:', error);
      setTechnicians([]);
      if (!search || !search.trim()) {
        setAllTechnicians([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Load technicians on component mount
  useEffect(() => {
    fetchTechnicians();
  }, []);

  // Handle search with debounce - fetch for any search change
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      // Fetch technicians for any search term change (including empty)
      fetchTechnicians(searchTerm);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (technicianId: string) => {
    if (!technicianId || typeof technicianId !== 'string') {
      return;
    }
    
    const currentSelection = [...safeSelectedTechnicians];
    const newSelection = currentSelection.includes(technicianId)
      ? currentSelection.filter(id => id !== technicianId)
      : [...currentSelection, technicianId];
    
    safeOnSelectionChange(newSelection);
    
    // Close dropdown after selection but don't clear search yet
    setIsOpen(false);
  };

  // Clear search term when dropdown closes (separate from selection)
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  const handleRemoveTechnician = (technicianId: string) => {
    const newSelection = safeSelectedTechnicians.filter(id => id !== technicianId);
    safeOnSelectionChange(newSelection);
  };

  const getDisplayText = () => {
    if (safeSelectedTechnicians.length === 0) {
      return placeholder;
    } else if (safeSelectedTechnicians.length === 1) {
      const techId = safeSelectedTechnicians[0];
      
      // Handle special options
      if (techId === 'DH') return 'Department Head';
      if (techId === 'AS') return 'Assigned Technician';
      
      // Look in allTechnicians first, then fall back to current technicians
      const tech = allTechnicians.find(t => String(t.id) === String(techId)) ||
                   technicians.find(t => String(t.id) === String(techId));
      return (`${tech?.user?.emp_fname || ''} ${tech?.user?.emp_lname || ''}`.trim() || 'Unknown Technician');
    } else {
      return `${safeSelectedTechnicians.length} technicians selected`;
    }
  };

  // Filter technicians based on search term, but show all when no search
  const filteredTechnicians = searchTerm.trim() 
    ? technicians.filter(tech => {
        const fullName = `${tech.user?.emp_fname || ''} ${tech.user?.emp_lname || ''}`.trim();
        return fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
               tech.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
               tech.department?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      })
    : technicians; // Show all technicians when no search term

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Select Button (not editable) */}
      <div className="relative">
        <Button
          variant="outline"
          className="w-full justify-between text-left font-normal"
          onClick={() => setIsOpen(!isOpen)}
          type="button"
        >
          <span className={safeSelectedTechnicians.length === 0 ? "text-muted-foreground" : ""}>
            {getDisplayText()}
          </span>
          <ChevronDown 
            className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </Button>
      </div>

      {/* Selected Technicians Display */}
      {safeSelectedTechnicians.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {safeSelectedTechnicians.map(techId => {
            // Handle special options
            if (techId === 'DH') {
              return (
                <div key={techId} className="inline-flex items-center bg-green-100 text-green-800 px-2 py-1 rounded-md text-sm">
                  <span>Department Head</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTechnician(techId)}
                    className="ml-1 hover:bg-green-200 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            }
            
            if (techId === 'AS') {
              return (
                <div key={techId} className="inline-flex items-center bg-purple-100 text-purple-800 px-2 py-1 rounded-md text-sm">
                  <span>Assigned Technician</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTechnician(techId)}
                    className="ml-1 hover:bg-purple-200 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            }
            
            // Look in allTechnicians first, then fall back to current technicians
            const tech = allTechnicians.find(t => String(t.id) === String(techId)) ||
                        technicians.find(t => String(t.id) === String(techId));
            const displayName = `${tech?.user?.emp_fname || ''} ${tech?.user?.emp_lname || ''}`.trim() || 'Unknown Technician';
            return (
              <div key={techId} className="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm">
                <span>{displayName}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTechnician(techId)}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Dropdown List */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-hidden">
          {/* Search Input inside dropdown */}
          <div className="p-2 border-b border-gray-100">
            <Input
              type="text"
              placeholder="Search technicians..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8"
              autoFocus
            />
          </div>
          
          {/* Scrollable list */}
          <div className="max-h-48 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading technicians...</div>
            ) : (
              <>
                {/* Special Options - Always show these */}
                <div
                  className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                  onClick={() => handleSelect('DH')}
                >
                  <div className="flex items-center mr-3">
                    {safeSelectedTechnicians.includes('DH') ? (
                      <Check className="h-4 w-4 text-blue-600" />
                    ) : (
                      <div className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Department Head</div>
                    <div className="text-sm text-gray-500">Escalate to the department head of the requester</div>
                  </div>
                </div>
                
                <div
                  className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                  onClick={() => handleSelect('AS')}
                >
                  <div className="flex items-center mr-3">
                    {safeSelectedTechnicians.includes('AS') ? (
                      <Check className="h-4 w-4 text-blue-600" />
                    ) : (
                      <div className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Assigned Technician</div>
                    <div className="text-sm text-gray-500">Escalate to the currently assigned technician</div>
                  </div>
                </div>

                {/* Technicians List */}
                {filteredTechnicians.length > 0 ? (
                  filteredTechnicians.map((technician) => {
                    const isSelected = safeSelectedTechnicians.includes(String(technician.id));
                    return (
                      <div
                        key={technician.id}
                        className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-b-0"
                        onClick={() => handleSelect(String(technician.id))}
                      >
                        <div className="flex items-center mr-3">
                          {isSelected ? (
                            <Check className="h-4 w-4 text-blue-600" />
                          ) : (
                            <div className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {`${technician.user?.emp_fname || ''} ${technician.user?.emp_lname || ''}`.trim() || 'Unknown Technician'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {technician.employeeId || 'No ID'} • {technician.department?.name || 'No Department'}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : searchTerm ? (
                  <div className="p-4 text-center text-gray-500">
                    No technicians found matching your search.
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Define Service SLA interface (without priority)
interface ServiceSLA {
  id: number;
  name: string;
  description: string;
  resolutionTime: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export default function ServiceSLAPage() {
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingSLAId, setEditingSLAId] = useState<number | null>(null);

  // State for search and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSLAs, setSelectedSLAs] = useState<number[]>([]);
  const itemsPerPage = 25;

  // State for SLA list - now managed from API
  const [slaList, setSlaList] = useState<ServiceSLA[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);

  // Fetch Service SLA incidents from API
  const fetchServiceSLAs = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/sla-service`);
      const result = await response.json();

      if (result.success) {
        setSlaList(result.data || []);
        setTotalItems(result.data?.length || 0);
      } else {
        console.error('Failed to fetch Service SLAs:', result.error);
      }
    } catch (error) {
      console.error('Error fetching Service SLAs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount and when dependencies change
  useEffect(() => {
    fetchServiceSLAs();
  }, [currentPage, searchTerm]);

  // Filter and pagination logic - now handled by API
  const filteredSLAs = slaList; // API already returns filtered results
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentSLAs = filteredSLAs; // API already returns paginated results

  // Handlers
  const handleSelectSLA = (id: number) => {
    setSelectedSLAs(prev => 
      prev.includes(id) 
        ? prev.filter(slaId => slaId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedSLAs.length === currentSLAs.length) {
      setSelectedSLAs([]);
    } else {
      setSelectedSLAs(currentSLAs.map(sla => sla.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedSLAs.length === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedSLAs.length} selected Service SLA(s)?`)) {
      try {
        const response = await fetch('/api/sla-service/bulk-delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ids: selectedSLAs }),
        });

        const result = await response.json();
        if (result.success) {
          console.log('Service SLAs deleted successfully');
          setSelectedSLAs([]);
          await fetchServiceSLAs(); // Refresh the list
        } else {
          console.error('Failed to delete Service SLAs:', result.error);
        }
      } catch (error) {
        console.error('Error deleting Service SLAs:', error);
      }
    }
  };

  const handleDeleteSLA = async (id: number) => {
    if (confirm('Are you sure you want to delete this Service SLA?')) {
      try {
        const response = await fetch(`/api/sla-service/${id}`, {
          method: 'DELETE',
        });

        const result = await response.json();
        if (result.success) {
          console.log('Service SLA deleted successfully');
          await fetchServiceSLAs(); // Refresh the list
        } else {
          console.error('Failed to delete Service SLA:', result.error);
        }
      } catch (error) {
        console.error('Error deleting Service SLA:', error);
      }
    }
  };

  const [slaForm, setSlaForm] = useState({
    name: '',
    description: '',
    matchType: 'all' as 'all' | 'any',
    criteria: [],
    resolutionTime: {
      days: '',
      hours: '8',
      minutes: ''
    },
    operationalHours: {
      enabled: false,
      excludeHolidays: false,
      excludeWeekends: false
    },
    resolutionEscalation: {
      enabled: false,
      escalateTo: [] as string[], // Changed to array of technician IDs
      escalateType: 'before' as 'before' | 'after',
      escalateDays: '',
      escalateHours: '',
      escalateMinutes: '',
      level1EscalateTo: [] as string[], // Add technician array for level 1 consistency
      level1EscalateType: 'before' as 'before' | 'after', // Add escalate type for level 1 consistency
      level2Enabled: false,
      level2EscalateTo: [] as string[], // Add technician array for level 2
      level2EscalateType: 'before' as 'before' | 'after', // Add escalate type for level 2
      level2EscalateDays: '', // Add escalate timing for level 2
      level2EscalateHours: '',
      level2EscalateMinutes: '',
      level3Enabled: false,
      level3EscalateTo: [] as string[], // Add technician array for level 3
      level3EscalateType: 'before' as 'before' | 'after', // Add escalate type for level 3
      level3EscalateDays: '', // Add escalate timing for level 3
      level3EscalateHours: '',
      level3EscalateMinutes: '',
      level4Enabled: false,
      level4EscalateTo: [] as string[], // Add technician array for level 4
      level4EscalateType: 'before' as 'before' | 'after', // Add escalate type for level 4
      level4EscalateDays: '', // Add escalate timing for level 4
      level4EscalateHours: '',
      level4EscalateMinutes: ''
    }
  });

  const resetForm = () => {
    setSlaForm({
      name: '',
      description: '',
      matchType: 'all',
      criteria: [],
      resolutionTime: { days: '', hours: '8', minutes: '' },
      operationalHours: { enabled: false, excludeHolidays: false, excludeWeekends: false },
      resolutionEscalation: {
        enabled: false,
        escalateTo: [],
        escalateType: 'before',
        escalateDays: '',
        escalateHours: '',
        escalateMinutes: '',
        level1EscalateTo: [],
        level1EscalateType: 'before',
        level2Enabled: false,
        level2EscalateTo: [],
        level2EscalateType: 'before',
        level2EscalateDays: '',
        level2EscalateHours: '',
        level2EscalateMinutes: '',
        level3Enabled: false,
        level3EscalateTo: [],
        level3EscalateType: 'before',
        level3EscalateDays: '',
        level3EscalateHours: '',
        level3EscalateMinutes: '',
        level4Enabled: false,
        level4EscalateTo: [],
        level4EscalateType: 'before',
        level4EscalateDays: '',
        level4EscalateHours: '',
        level4EscalateMinutes: ''
      }
    });
  };

  const handleSave = async () => {
    console.log('Creating/Updating Service SLA:', slaForm);
    
    try {
      if (isEditMode && editingSLAId) {
        // Update existing Service SLA
        const response = await fetch(`/api/sla-service/${editingSLAId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(slaForm),
        });

        const result = await response.json();
        if (result.success) {
          console.log('Service SLA updated successfully');
          await fetchServiceSLAs(); // Refresh the list
        } else {
          console.error('Failed to update Service SLA:', result.error);
        }
      } else {
        // Create new Service SLA
        const response = await fetch('/api/sla-service', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(slaForm),
        });

        const result = await response.json();
        if (result.success) {
          console.log('Service SLA created successfully');
          await fetchServiceSLAs(); // Refresh the list
        } else {
          console.error('Failed to create Service SLA:', result.error);
        }
      }
      
      setIsCreateModalOpen(false);
      setIsEditMode(false);
      setEditingSLAId(null);
      
      // Reset form
      resetForm();
    } catch (error) {
      console.error('Error saving Service SLA:', error);
    }
  };

  const handleCancel = () => {
    router.push('/admin/settings/sla-management?tab=sla-service');
  };

  const getResolutionTimeDisplay = () => {
    const { days, hours, minutes } = slaForm.resolutionTime;
    if (!days && !hours && !minutes) return 'Not set';
    
    const parts = [];
    if (days && parseInt(days) > 0) parts.push(`${days} day${parseInt(days) === 1 ? '' : 's'}`);
    if (hours && parseInt(hours) > 0) parts.push(`${hours} hour${parseInt(hours) === 1 ? '' : 's'}`);
    if (minutes && parseInt(minutes) > 0) parts.push(`${minutes} minute${parseInt(minutes) === 1 ? '' : 's'}`);
    
    return parts.join(' ');
  };

  const formatResolutionTimeForTable = (sla: any) => {
    // Handle both database field names (snake_case) and Prisma field names (camelCase)
    const days = sla.resolution_days || sla.resolutionDays || 0;
    const hours = sla.resolution_hours || sla.resolutionHours || 0;
    const minutes = sla.resolution_minutes || sla.resolutionMinutes || 0;
    
    console.log('SLA resolution data:', { days, hours, minutes, slaName: sla.name }); // Debug log
    
    if (days === 0 && hours === 0 && minutes === 0) return 'Not set';
    
    const parts = [];
    if (days > 0) parts.push(`${days} day${days === 1 ? '' : 's'}`);
    if (hours > 0) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
    if (minutes > 0) parts.push(`${minutes} min${minutes === 1 ? '' : 's'}`);
    
    if (parts.length === 0) parts.push('Less than 1 min');
    return parts.join(' ');
  };

  const handleEdit = async (id: number) => {
    try {
      const response = await fetch(`/api/sla-service/${id}`);
      const result = await response.json();
      
      if (result.success) {
        const slaData = result.data;
        setSlaForm({
          name: slaData.name,
          description: slaData.description,
          matchType: slaData.matchType || 'all',
          criteria: [],
          resolutionTime: slaData.resolutionTime || { days: '', hours: '8', minutes: '' },
          operationalHours: slaData.operationalHours || { enabled: false, excludeHolidays: false, excludeWeekends: false },
          resolutionEscalation: {
            enabled: slaData.resolutionEscalation?.enabled || false,
            escalateTo: Array.isArray(slaData.resolutionEscalation?.level1EscalateTo) 
              ? slaData.resolutionEscalation.level1EscalateTo 
              : Array.isArray(slaData.resolutionEscalation?.escalateTo) 
                ? slaData.resolutionEscalation.escalateTo 
                : (slaData.resolutionEscalation?.escalateTo ? [slaData.resolutionEscalation.escalateTo] : []),
            escalateType: slaData.resolutionEscalation?.escalateType || 'before',
            escalateDays: slaData.resolutionEscalation?.escalateDays || '',
            escalateHours: slaData.resolutionEscalation?.escalateHours || '',
            escalateMinutes: slaData.resolutionEscalation?.escalateMinutes || '',
            level1EscalateTo: Array.isArray(slaData.resolutionEscalation?.level1EscalateTo) 
              ? slaData.resolutionEscalation.level1EscalateTo 
              : Array.isArray(slaData.resolutionEscalation?.escalateTo) 
                ? slaData.resolutionEscalation.escalateTo 
                : (slaData.resolutionEscalation?.escalateTo ? [slaData.resolutionEscalation.escalateTo] : []),
            level1EscalateType: slaData.resolutionEscalation?.level1EscalateType || slaData.resolutionEscalation?.escalateType || 'before',
            level2Enabled: slaData.resolutionEscalation?.level2Enabled || false,
            level2EscalateTo: Array.isArray(slaData.resolutionEscalation?.level2EscalateTo) 
              ? slaData.resolutionEscalation.level2EscalateTo 
              : (slaData.resolutionEscalation?.level2EscalateTo ? [slaData.resolutionEscalation.level2EscalateTo] : []),
            level2EscalateType: slaData.resolutionEscalation?.level2EscalateType || 'before',
            level2EscalateDays: slaData.resolutionEscalation?.level2EscalateDays || '',
            level2EscalateHours: slaData.resolutionEscalation?.level2EscalateHours || '',
            level2EscalateMinutes: slaData.resolutionEscalation?.level2EscalateMinutes || '',
            level3Enabled: slaData.resolutionEscalation?.level3Enabled || false,
            level3EscalateTo: Array.isArray(slaData.resolutionEscalation?.level3EscalateTo) 
              ? slaData.resolutionEscalation.level3EscalateTo 
              : (slaData.resolutionEscalation?.level3EscalateTo ? [slaData.resolutionEscalation.level3EscalateTo] : []),
            level3EscalateType: slaData.resolutionEscalation?.level3EscalateType || 'before',
            level3EscalateDays: slaData.resolutionEscalation?.level3EscalateDays || '',
            level3EscalateHours: slaData.resolutionEscalation?.level3EscalateHours || '',
            level3EscalateMinutes: slaData.resolutionEscalation?.level3EscalateMinutes || '',
            level4Enabled: slaData.resolutionEscalation?.level4Enabled || false,
            level4EscalateTo: Array.isArray(slaData.resolutionEscalation?.level4EscalateTo) 
              ? slaData.resolutionEscalation.level4EscalateTo 
              : (slaData.resolutionEscalation?.level4EscalateTo ? [slaData.resolutionEscalation.level4EscalateTo] : []),
            level4EscalateType: slaData.resolutionEscalation?.level4EscalateType || 'before',
            level4EscalateDays: slaData.resolutionEscalation?.level4EscalateDays || '',
            level4EscalateHours: slaData.resolutionEscalation?.level4EscalateHours || '',
            level4EscalateMinutes: slaData.resolutionEscalation?.level4EscalateMinutes || ''
          }
        });
        setIsEditMode(true);
        setEditingSLAId(id);
        setIsCreateModalOpen(true);
      } else {
        console.error('Failed to fetch Service SLA:', result.error);
      }
    } catch (error) {
      console.error('Error fetching Service SLA for edit:', error);
    }
  };

  const handleView = (id: number) => {
    console.log('View Service SLA:', id);
    // Implement view functionality
  };

  return (
    <SessionWrapper>
        <div className=" p-6">
          {/* Service SLA List */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Service SLA List</CardTitle>
                <p className="text-slate-600 text-sm">Manage your service level agreements</p>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search */}
              <div className="mt-4">
                <div className="relative">
                  <Input
                    placeholder="Search Service SLAs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
              
              {/* Toolbar with buttons and pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-3">
                  <Button 
                    className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2"
                    onClick={() => {
                      // Clear form when creating new SLA
                      resetForm();
                      setIsEditMode(false);
                      setEditingSLAId(null);
                      setIsCreateModalOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Service SLA
                  </Button>
                  <Button 
                    variant="outline" 
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={handleDeleteSelected}
                    disabled={selectedSLAs.length === 0}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Selected
                  </Button>
                  <div className="text-sm text-slate-600 ml-4">
                    {startIndex + 1} - {Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-slate-600">Page {currentPage} of {totalPages}</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">Show</span>
                    <Select defaultValue="25">
                      <SelectTrigger className="w-20 h-8">
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

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedSLAs.length === currentSLAs.length && currentSLAs.length > 0}
                        onChange={handleSelectAll}
                        className="rounded"
                      />
                    </TableHead>
                    <TableHead>SLA Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Resolution Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentSLAs.map((sla) => (
                    <TableRow key={sla.id} className="hover:bg-gray-50">
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedSLAs.includes(sla.id)}
                          onChange={() => handleSelectSLA(sla.id)}
                          className="rounded"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{sla.name}</TableCell>
                      <TableCell className="text-gray-600">{sla.description}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {formatResolutionTimeForTable(sla)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={sla.status === 'Active' ? 'default' : 'secondary'}
                          className={sla.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                        >
                          {sla.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(sla.id)}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          >
                            <Eye className="w-4 h-4" />
                          </Button> */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(sla.id)}
                            className="text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSLA(sla.id)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {slaList.length === 0 && !loading && (
                <div className="text-center py-8">
                  <p className="text-slate-500">
                    {searchTerm ? 'No Service SLAs found matching your search.' : 'No Service SLA records found. Create your first service SLA to get started.'}
                  </p>
                </div>
              )}

              {loading && (
                <div className="text-center py-8">
                  <p className="text-slate-500">Loading Service SLAs...</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Create Service SLA Modal */}
          <Dialog open={isCreateModalOpen} onOpenChange={(open) => {
            if (!open) {
              // Reset form when modal is closed
              resetForm();
              setIsEditMode(false);
              setEditingSLAId(null);
            }
            setIsCreateModalOpen(open);
          }}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isEditMode ? 'Edit Service SLA' : 'Create Service SLA'}</DialogTitle>
              </DialogHeader>
              
              {/* Service SLA Form Content */}
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sla-name">
                      SLA Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="sla-name"
                      value={slaForm.name}
                      onChange={(e) => setSlaForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter Service SLA name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sla-description">Description</Label>
                    <Textarea
                      id="sla-description"
                      value={slaForm.description}
                      onChange={(e) => setSlaForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter Service SLA description"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Resolution Time */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Resolution Time</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="resolution-days">Days</Label>
                      <Input
                        id="resolution-days"
                        type="number"
                        value={slaForm.resolutionTime.days}
                        onChange={(e) => setSlaForm(prev => ({
                          ...prev,
                          resolutionTime: { ...prev.resolutionTime, days: e.target.value }
                        }))}
                        placeholder="0"
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="resolution-hours">Hours</Label>
                      <Input
                        id="resolution-hours"
                        type="number"
                        value={slaForm.resolutionTime.hours}
                        onChange={(e) => setSlaForm(prev => ({
                          ...prev,
                          resolutionTime: { ...prev.resolutionTime, hours: e.target.value }
                        }))}
                        placeholder="8"
                        min="0"
                        max="23"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="resolution-minutes">Minutes</Label>
                      <Input
                        id="resolution-minutes"
                        type="number"
                        value={slaForm.resolutionTime.minutes}
                        onChange={(e) => setSlaForm(prev => ({
                          ...prev,
                          resolutionTime: { ...prev.resolutionTime, minutes: e.target.value }
                        }))}
                        placeholder="0"
                        min="0"
                        max="59"
                      />
                    </div>
                  </div>
                  <div className="text-sm text-slate-600">
                    Resolution Time: {getResolutionTimeDisplay()}
                  </div>
                </div>

                {/* Resolution Escalation */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Resolution Escalation</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="resolutionEscalation"
                        checked={slaForm?.resolutionEscalation?.enabled ?? false}
                        onCheckedChange={(checked) => setSlaForm(prev => ({
                          ...prev,
                          resolutionEscalation: { 
                            ...(prev?.resolutionEscalation || {}), 
                            enabled: checked === true 
                          }
                        }))}
                      />
                      <Label htmlFor="resolutionEscalation" className="text-sm">Enable Level 1 Escalation</Label>
                    </div>

                    {slaForm?.resolutionEscalation?.enabled && (
                      <div className="border rounded-lg p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="escalateTo">Escalate To</Label>
                            <TechnicianInput
                              selectedTechnicians={slaForm?.resolutionEscalation?.escalateTo ?? []}
                              onSelectionChange={(technicians) => 
                                setSlaForm(prev => ({
                                  ...prev,
                                  resolutionEscalation: { 
                                    ...(prev?.resolutionEscalation || {}), 
                                    escalateTo: technicians,
                                    level1EscalateTo: technicians
                                  }
                                }))
                              }
                              placeholder="Select technicians to escalate to..."
                            />
                            {(slaForm?.resolutionEscalation?.escalateTo?.length ?? 0) > 0 && (
                              <div className="text-sm text-slate-600">
                                Selected: {slaForm?.resolutionEscalation?.escalateTo?.length ?? 0} technician(s)
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="escalateType">Escalate</Label>
                            <Select 
                              value={slaForm?.resolutionEscalation?.escalateType ?? 'before'}
                              onValueChange={(value) => setSlaForm(prev => ({
                                ...prev,
                                resolutionEscalation: { 
                                  ...(prev?.resolutionEscalation || {}), 
                                  escalateType: value as 'before' | 'after',
                                  level1EscalateType: value as 'before' | 'after'
                                }
                              }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select escalation timing" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="before">Before resolution due time</SelectItem>
                                <SelectItem value="after">After resolution due time</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="escalate-days">Days</Label>
                            <Input
                              id="escalate-days"
                              type="number"
                              value={slaForm?.resolutionEscalation?.escalateDays ?? ''}
                              onChange={(e) => setSlaForm(prev => ({
                                ...prev,
                                resolutionEscalation: { 
                                  ...(prev?.resolutionEscalation || {}), 
                                  escalateDays: e.target.value 
                                }
                              }))}
                              placeholder="0"
                              min="0"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="escalate-hours">Hours</Label>
                            <Input
                              id="escalate-hours"
                              type="number"
                              value={slaForm?.resolutionEscalation?.escalateHours ?? ''}
                              onChange={(e) => setSlaForm(prev => ({
                                ...prev,
                                resolutionEscalation: { 
                                  ...(prev?.resolutionEscalation || {}), 
                                  escalateHours: e.target.value 
                                }
                              }))}
                              placeholder="0"
                              min="0"
                              max="23"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="escalate-minutes">Minutes</Label>
                            <Input
                              id="escalate-minutes"
                              type="number"
                              value={slaForm?.resolutionEscalation?.escalateMinutes ?? ''}
                              onChange={(e) => setSlaForm(prev => ({
                                ...prev,
                                resolutionEscalation: { 
                                  ...(prev?.resolutionEscalation || {}), 
                                  escalateMinutes: e.target.value 
                                }
                              }))}
                              placeholder="0"
                              min="0"
                              max="59"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <h4 className="font-medium text-slate-900">Escalation Levels</h4>
                          
                          {/* Level 2 Escalation */}
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="enableLevel2"
                                checked={slaForm?.resolutionEscalation?.level2Enabled ?? false}
                                onCheckedChange={(checked) => setSlaForm(prev => ({
                                  ...prev,
                                  resolutionEscalation: { 
                                    ...(prev?.resolutionEscalation || {}), 
                                    level2Enabled: checked === true 
                                  }
                                }))}
                              />
                              <Label htmlFor="enableLevel2" className="text-sm font-medium">Enable Level 2 Escalation</Label>
                            </div>
                            {slaForm?.resolutionEscalation?.level2Enabled && (
                              <div className="ml-6 space-y-3 border-l-2 border-orange-200 pl-4">
                                <div className="space-y-2">
                                  <Label htmlFor="level2EscalateTo">Level 2 Escalate To</Label>
                                  <TechnicianInput
                                    selectedTechnicians={slaForm?.resolutionEscalation?.level2EscalateTo ?? []}
                                    onSelectionChange={(technicians) => 
                                      setSlaForm(prev => ({
                                        ...prev,
                                        resolutionEscalation: { 
                                          ...(prev?.resolutionEscalation || {}), 
                                          level2EscalateTo: technicians 
                                        }
                                      }))
                                    }
                                    placeholder="Select technicians for Level 2 escalation..."
                                  />
                                  {(slaForm?.resolutionEscalation?.level2EscalateTo?.length ?? 0) > 0 && (
                                    <div className="text-sm text-orange-600">
                                      Level 2 Selected: {slaForm?.resolutionEscalation?.level2EscalateTo?.length ?? 0} technician(s)
                                    </div>
                                  )}
                                </div>
                                
                                {/* Level 2 Escalate Timing */}
                                <div className="space-y-3 bg-orange-50 p-3 rounded-lg border border-orange-200">
                                  <h5 className="font-medium text-orange-800">Escalate Timing</h5>
                                  <p className="text-sm text-orange-600">When to escalate TO Level 2</p>
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="level2EscalateType">Escalate</Label>
                                      <Select 
                                        value={slaForm?.resolutionEscalation?.level2EscalateType ?? 'before'}
                                        onValueChange={(value) => setSlaForm(prev => ({
                                          ...prev,
                                          resolutionEscalation: { 
                                            ...(prev?.resolutionEscalation || {}), 
                                            level2EscalateType: value as 'before' | 'after' 
                                          }
                                        }))}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select escalation timing" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="before">Before resolution due time</SelectItem>
                                          <SelectItem value="after">After resolution due time</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="level2-escalate-days">Days</Label>
                                      <Input
                                        id="level2-escalate-days"
                                        type="number"
                                        value={slaForm?.resolutionEscalation?.level2EscalateDays ?? ''}
                                        onChange={(e) => setSlaForm(prev => ({
                                          ...prev,
                                          resolutionEscalation: { ...(prev?.resolutionEscalation || {}), level2EscalateDays: e.target.value }
                                        }))}
                                        placeholder="0"
                                        min="0"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="level2-escalate-hours">Hours</Label>
                                      <Input
                                        id="level2-escalate-hours"
                                        type="number"
                                        value={slaForm?.resolutionEscalation?.level2EscalateHours ?? ''}
                                        onChange={(e) => setSlaForm(prev => ({
                                          ...prev,
                                          resolutionEscalation: { ...(prev?.resolutionEscalation || {}), level2EscalateHours: e.target.value }
                                        }))}
                                        placeholder="0"
                                        min="0"
                                        max="23"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="level2-escalate-minutes">Minutes</Label>
                                      <Input
                                        id="level2-escalate-minutes"
                                        type="number"
                                        value={slaForm?.resolutionEscalation?.level2EscalateMinutes ?? ''}
                                        onChange={(e) => setSlaForm(prev => ({
                                          ...prev,
                                          resolutionEscalation: { ...(prev?.resolutionEscalation || {}), level2EscalateMinutes: e.target.value }
                                        }))}
                                        placeholder="0"
                                        min="0"
                                        max="59"
                                      />
                                    </div>
                                  </div>
                                  <div className="text-sm text-orange-600">
                                    Level 2 Escalation Trigger: {(() => {
                                      const days = slaForm?.resolutionEscalation?.level2EscalateDays ?? '';
                                      const hours = slaForm?.resolutionEscalation?.level2EscalateHours ?? '';
                                      const minutes = slaForm?.resolutionEscalation?.level2EscalateMinutes ?? '';
                                      const type = slaForm?.resolutionEscalation?.level2EscalateType ?? 'before';
                                      
                                      const parts = [];
                                      if (days && parseInt(days) > 0) parts.push(`${days} day${parseInt(days) === 1 ? '' : 's'}`);
                                      if (hours && parseInt(hours) > 0) parts.push(`${hours} hour${parseInt(hours) === 1 ? '' : 's'}`);
                                      if (minutes && parseInt(minutes) > 0) parts.push(`${minutes} minute${parseInt(minutes) === 1 ? '' : 's'}`);
                                      
                                      const timeStr = parts.length > 0 ? parts.join(' ') : 'immediate';
                                      return `${timeStr} ${type} resolution due time`;
                                    })()}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Level 3 Escalation */}
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="enableLevel3"
                                checked={slaForm?.resolutionEscalation?.level3Enabled ?? false}
                                onCheckedChange={(checked) => setSlaForm(prev => ({
                                  ...prev,
                                  resolutionEscalation: { 
                                    ...(prev?.resolutionEscalation || {}), 
                                    level3Enabled: checked === true 
                                  }
                                }))}
                              />
                              <Label htmlFor="enableLevel3" className="text-sm font-medium">Enable Level 3 Escalation</Label>
                            </div>
                            {slaForm?.resolutionEscalation?.level3Enabled && (
                              <div className="ml-6 space-y-3 border-l-2 border-red-200 pl-4">
                                <div className="space-y-2">
                                  <Label htmlFor="level3EscalateTo">Level 3 Escalate To</Label>
                                  <TechnicianInput
                                    selectedTechnicians={slaForm?.resolutionEscalation?.level3EscalateTo ?? []}
                                    onSelectionChange={(technicians) => 
                                      setSlaForm(prev => ({
                                        ...prev,
                                        resolutionEscalation: { 
                                          ...(prev?.resolutionEscalation || {}), 
                                          level3EscalateTo: technicians 
                                        }
                                      }))
                                    }
                                    placeholder="Select technicians for Level 3 escalation..."
                                  />
                                  {(slaForm?.resolutionEscalation?.level3EscalateTo?.length ?? 0) > 0 && (
                                    <div className="text-sm text-red-600">
                                      Level 3 Selected: {slaForm?.resolutionEscalation?.level3EscalateTo?.length ?? 0} technician(s)
                                    </div>
                                  )}
                                </div>
                                
                                {/* Level 3 Escalate Timing */}
                                <div className="space-y-3 bg-red-50 p-3 rounded-lg border border-red-200">
                                  <h5 className="font-medium text-red-800">Escalate Timing</h5>
                                  <p className="text-sm text-red-600">When to escalate TO Level 3</p>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="level3EscalateType">Escalate</Label>
                                      <Select 
                                        value={slaForm?.resolutionEscalation?.level3EscalateType ?? 'before'}
                                        onValueChange={(value) => setSlaForm(prev => ({
                                          ...prev,
                                          resolutionEscalation: { 
                                            ...(prev?.resolutionEscalation || {}), 
                                            level3EscalateType: value as 'before' | 'after' 
                                          }
                                        }))}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select escalation timing" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="before">Before resolution due time</SelectItem>
                                          <SelectItem value="after">After resolution due time</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="level3-escalate-days">Days</Label>
                                      <Input
                                        id="level3-escalate-days"
                                        type="number"
                                        value={slaForm?.resolutionEscalation?.level3EscalateDays ?? ''}
                                        onChange={(e) => setSlaForm(prev => ({
                                          ...prev,
                                          resolutionEscalation: { ...(prev?.resolutionEscalation || {}), level3EscalateDays: e.target.value }
                                        }))}
                                        placeholder="0"
                                        min="0"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="level3-escalate-hours">Hours</Label>
                                      <Input
                                        id="level3-escalate-hours"
                                        type="number"
                                        value={slaForm?.resolutionEscalation?.level3EscalateHours ?? ''}
                                        onChange={(e) => setSlaForm(prev => ({
                                          ...prev,
                                          resolutionEscalation: { ...(prev?.resolutionEscalation || {}), level3EscalateHours: e.target.value }
                                        }))}
                                        placeholder="0"
                                        min="0"
                                        max="23"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="level3-escalate-minutes">Minutes</Label>
                                      <Input
                                        id="level3-escalate-minutes"
                                        type="number"
                                        value={slaForm?.resolutionEscalation?.level3EscalateMinutes ?? ''}
                                        onChange={(e) => setSlaForm(prev => ({
                                          ...prev,
                                          resolutionEscalation: { ...(prev?.resolutionEscalation || {}), level3EscalateMinutes: e.target.value }
                                        }))}
                                        placeholder="0"
                                        min="0"
                                        max="59"
                                      />
                                    </div>
                                  </div>
                                  <div className="text-sm text-red-600">
                                    Level 3 Escalation Trigger: {(() => {
                                      const days = slaForm?.resolutionEscalation?.level3EscalateDays ?? '';
                                      const hours = slaForm?.resolutionEscalation?.level3EscalateHours ?? '';
                                      const minutes = slaForm?.resolutionEscalation?.level3EscalateMinutes ?? '';
                                      const type = slaForm?.resolutionEscalation?.level3EscalateType ?? 'after';
                                      
                                      const parts = [];
                                      if (days && parseInt(days) > 0) parts.push(`${days} day${parseInt(days) === 1 ? '' : 's'}`);
                                      if (hours && parseInt(hours) > 0) parts.push(`${hours} hour${parseInt(hours) === 1 ? '' : 's'}`);
                                      if (minutes && parseInt(minutes) > 0) parts.push(`${minutes} minute${parseInt(minutes) === 1 ? '' : 's'}`);
                                      
                                      const timeStr = parts.length > 0 ? parts.join(' ') : 'immediate';
                                      return `${timeStr} ${type} resolution due time`;
                                    })()}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Level 4 Escalation */}
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="enableLevel4"
                                checked={slaForm?.resolutionEscalation?.level4Enabled ?? false}
                                onCheckedChange={(checked) => setSlaForm(prev => ({
                                  ...prev,
                                  resolutionEscalation: { 
                                    ...(prev?.resolutionEscalation || {}), 
                                    level4Enabled: checked === true 
                                  }
                                }))}
                              />
                              <Label htmlFor="enableLevel4" className="text-sm font-medium">Enable Level 4 Escalation</Label>
                            </div>
                            {slaForm?.resolutionEscalation?.level4Enabled && (
                              <div className="ml-6 space-y-3 border-l-2 border-purple-200 pl-4">
                                <div className="space-y-2">
                                  <Label htmlFor="level4EscalateTo">Level 4 Escalate To</Label>
                                  <TechnicianInput
                                    selectedTechnicians={slaForm?.resolutionEscalation?.level4EscalateTo ?? []}
                                    onSelectionChange={(technicians) => 
                                      setSlaForm(prev => ({
                                        ...prev,
                                        resolutionEscalation: { 
                                          ...(prev?.resolutionEscalation || {}), 
                                          level4EscalateTo: technicians 
                                        }
                                      }))
                                    }
                                    placeholder="Select technicians for Level 4 escalation..."
                                  />
                                  {(slaForm?.resolutionEscalation?.level4EscalateTo?.length ?? 0) > 0 && (
                                    <div className="text-sm text-purple-600">
                                      Level 4 Selected: {slaForm?.resolutionEscalation?.level4EscalateTo?.length ?? 0} technician(s)
                                    </div>
                                  )}
                                </div>
                                
                                {/* Level 4 Escalate Timing */}
                                <div className="space-y-3 bg-purple-50 p-3 rounded-lg border border-purple-200">
                                  <h5 className="font-medium text-purple-800">Escalate Timing</h5>
                                  <p className="text-sm text-purple-600">When to escalate TO Level 4</p>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="level4EscalateType">Escalate</Label>
                                      <Select 
                                        value={slaForm?.resolutionEscalation?.level4EscalateType ?? 'before'}
                                        onValueChange={(value) => setSlaForm(prev => ({
                                          ...prev,
                                          resolutionEscalation: { 
                                            ...(prev?.resolutionEscalation || {}), 
                                            level4EscalateType: value as 'before' | 'after' 
                                          }
                                        }))}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select escalation timing" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="before">Before resolution due time</SelectItem>
                                          <SelectItem value="after">After resolution due time</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="level4-escalate-days">Days</Label>
                                      <Input
                                        id="level4-escalate-days"
                                        type="number"
                                        value={slaForm?.resolutionEscalation?.level4EscalateDays ?? ''}
                                        onChange={(e) => setSlaForm(prev => ({
                                          ...prev,
                                          resolutionEscalation: { ...(prev?.resolutionEscalation || {}), level4EscalateDays: e.target.value }
                                        }))}
                                        placeholder="0"
                                        min="0"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="level4-escalate-hours">Hours</Label>
                                      <Input
                                        id="level4-escalate-hours"
                                        type="number"
                                        value={slaForm?.resolutionEscalation?.level4EscalateHours ?? ''}
                                        onChange={(e) => setSlaForm(prev => ({
                                          ...prev,
                                          resolutionEscalation: { ...(prev?.resolutionEscalation || {}), level4EscalateHours: e.target.value }
                                        }))}
                                        placeholder="0"
                                        min="0"
                                        max="23"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="level4-escalate-minutes">Minutes</Label>
                                      <Input
                                        id="level4-escalate-minutes"
                                        type="number"
                                        value={slaForm?.resolutionEscalation?.level4EscalateMinutes ?? ''}
                                        onChange={(e) => setSlaForm(prev => ({
                                          ...prev,
                                          resolutionEscalation: { ...(prev?.resolutionEscalation || {}), level4EscalateMinutes: e.target.value }
                                        }))}
                                        placeholder="0"
                                        min="0"
                                        max="59"
                                      />
                                    </div>
                                  </div>
                                  <div className="text-sm text-purple-600">
                                    Level 4 Escalation Trigger: {(() => {
                                      const days = slaForm?.resolutionEscalation?.level4EscalateDays ?? '';
                                      const hours = slaForm?.resolutionEscalation?.level4EscalateHours ?? '';
                                      const minutes = slaForm?.resolutionEscalation?.level4EscalateMinutes ?? '';
                                      const type = slaForm?.resolutionEscalation?.level4EscalateType ?? 'before';
                                      
                                      const parts = [];
                                      if (days && parseInt(days) > 0) parts.push(`${days} day${parseInt(days) === 1 ? '' : 's'}`);
                                      if (hours && parseInt(hours) > 0) parts.push(`${hours} hour${parseInt(hours) === 1 ? '' : 's'}`);
                                      if (minutes && parseInt(minutes) > 0) parts.push(`${minutes} minute${parseInt(minutes) === 1 ? '' : 's'}`);
                                      
                                      const timeStr = parts.length > 0 ? parts.join(' ') : 'immediate';
                                      return `${timeStr} ${type} resolution due time`;
                                    })()}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-6 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      resetForm();
                      setIsEditMode(false);
                      setEditingSLAId(null);
                      setIsCreateModalOpen(false);
                    }}
                    className="flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSave}
                    className="bg-slate-800 hover:bg-slate-900 text-white flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {isEditMode ? 'Update Service SLA' : 'Create Service SLA'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
    </SessionWrapper>
  );
}
