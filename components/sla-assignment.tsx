"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Clock, AlertCircle, CheckCircle2, Plus } from 'lucide-react';

interface SLAService {
  id: number;
  name: string;
  description?: string;
  priority: string;
  category?: string;
  responseTime: number;
  resolutionDays: number;
  resolutionHours: number;
  resolutionMinutes: number;
  operationalHours: boolean;
  autoEscalate: boolean;
  escalationTime: number;
}

interface SLAAssignmentProps {
  templateType: 'incident' | 'service';
  selectedSLAId?: number;
  onSLAChange: (slaId: number | null) => void;
}

export default function SLAAssignment({ templateType, selectedSLAId, onSLAChange }: SLAAssignmentProps) {
  const [slaServices, setSlaServices] = useState<SLAService[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSLA, setSelectedSLA] = useState<SLAService | null>(null);

  useEffect(() => {
    if (templateType === 'service') {
      fetchSLAServices();
    }
  }, [templateType]);

  useEffect(() => {
    if (selectedSLAId && slaServices.length > 0) {
      const sla = slaServices.find(s => s.id === selectedSLAId);
      setSelectedSLA(sla || null);
    }
  }, [selectedSLAId, slaServices]);

  const fetchSLAServices = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sla-services');
      if (response.ok) {
        const data = await response.json();
        setSlaServices(data.slaServices || []);
      }
    } catch (error) {
      console.error('Error fetching SLA services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSLASelect = (slaId: string) => {
    if (slaId === 'none') {
      setSelectedSLA(null);
      onSLAChange(null);
      return;
    }
    
    const sla = slaServices.find(s => s.id === parseInt(slaId));
    setSelectedSLA(sla || null);
    onSLAChange(sla ? sla.id : null);
  };

  const formatDaysAndHours = (totalHours: number) => {
    if (!totalHours || totalHours <= 0) return '—';
    const days = Math.floor(totalHours / 24);
    const hours = Math.round(totalHours % 24);
    const parts: string[] = [];
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    return parts.length > 0 ? parts.join(' ') : '0 hours';
  };

  const formatSLATime = (sla: SLAService) => {
    const totalHours = (sla.resolutionDays || 0) * 24 + (sla.resolutionHours || 0) + (sla.resolutionMinutes || 0) / 60;
    return formatDaysAndHours(totalHours);
  };

  const filteredSLAs = slaServices.filter(sla =>
    sla.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sla.description && sla.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    sla.priority.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sla.category && sla.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (templateType === 'incident') {
    return (
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            SLA Assignment (Incident Templates)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-blue-600 space-y-2">
            <p>For incident templates, SLA is determined by the <strong>Priority</strong> field.</p>
            <p>Configure priority-based SLA mappings in the admin settings to automatically assign SLAs based on incident priority levels.</p>
            <div className="mt-3 p-3 bg-blue-100 rounded-lg">
              <p className="text-xs text-blue-700">
                <strong>How it works:</strong> When an incident is created with a specific priority (Low, Medium, High, Critical), 
                the system automatically assigns the corresponding SLA incident configuration.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          SLA Assignment (Service Templates)
        </CardTitle>
        <p className="text-xs text-slate-600 mt-1">
          Assign a Service Level Agreement for response and resolution times
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
     

        {/* SLA Selection */}
        <div>
          <Label className="text-xs font-medium text-slate-700 mb-2 block">
            Select SLA Service
          </Label>
          <Select
            value={selectedSLA ? selectedSLA.id.toString() : 'none'}
            onValueChange={handleSLASelect}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose an SLA service...">
                {selectedSLA ? selectedSLA.name : "Choose an SLA service..."}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value="none">
                <span className="text-slate-500">No SLA assigned</span>
              </SelectItem>
              {loading ? (
                <SelectItem value="loading" disabled>
                  <span className="text-slate-500">Loading SLA services...</span>
                </SelectItem>
              ) : (
                filteredSLAs.map((sla) => (
                  <SelectItem key={sla.id} value={sla.id.toString()}>
                    <div className="flex flex-col gap-1 py-1">
                      <span className="font-medium">{sla.name}</span>
                      <span className="text-xs text-blue-600">
                        SLA: Typically delivered within {formatSLATime(sla)} from full approval
                      </span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Selected SLA Details */}
        {selectedSLA && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 rounded-full p-2">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 space-y-2">
                <h4 className="font-medium text-blue-900 mb-1">{selectedSLA.name}</h4>
                <p className="text-blue-700 text-sm">
                  SLA: Typically delivered within {formatSLATime(selectedSLA)} from full approval
                </p>
       
              </div>
            </div>
          </div>
        )}

        {!loading && filteredSLAs.length === 0 && searchTerm && (
          <div className="text-center py-4 text-slate-500">
            <p className="text-sm">No SLA services found matching "{searchTerm}"</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
