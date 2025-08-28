"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, X } from "lucide-react";

interface ReportTemplate {
  id?: number;
  name: string;
  description?: string;
  selectedFields: string[];
  filters: any;
  isShared: boolean;
}

interface ReportTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: Omit<ReportTemplate, 'id'>) => Promise<void>;
  template?: ReportTemplate;
  availableFields: Array<{ id: string; label: string; category: string }>;
  currentSelectedFields: string[];
  currentFilters: any;
}

export function ReportTemplateModal({
  isOpen,
  onClose,
  onSave,
  template,
  availableFields,
  currentSelectedFields,
  currentFilters
}: ReportTemplateModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    selectedFields: [] as string[],
    filters: {},
    isShared: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useCurrentSelection, setUseCurrentSelection] = useState(true);

  // Initialize form data
  useEffect(() => {
    if (isOpen) {
      if (template) {
        // Editing existing template
        setFormData({
          name: template.name,
          description: template.description || '',
          selectedFields: template.selectedFields,
          filters: template.filters || {},
          isShared: template.isShared
        });
        setUseCurrentSelection(false);
      } else {
        // Creating new template - use current selection
        setFormData({
          name: '',
          description: '',
          selectedFields: currentSelectedFields,
          filters: currentFilters || {},
          isShared: false
        });
        setUseCurrentSelection(true);
      }
      setError('');
    }
  }, [isOpen, template, currentSelectedFields, currentFilters]);

  // Update fields when useCurrentSelection changes
  useEffect(() => {
    if (useCurrentSelection && !template) {
      setFormData(prev => ({
        ...prev,
        selectedFields: currentSelectedFields,
        filters: currentFilters || {}
      }));
    }
  }, [useCurrentSelection, currentSelectedFields, currentFilters, template]);

  const handleFieldToggle = (fieldId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedFields: prev.selectedFields.includes(fieldId)
        ? prev.selectedFields.filter(id => id !== fieldId)
        : [...prev.selectedFields, fieldId]
    }));
  };

  const handleCategoryToggle = (category: string) => {
    const categoryFields = availableFields.filter(field => field.category === category).map(field => field.id);
    const allSelected = categoryFields.every(fieldId => formData.selectedFields.includes(fieldId));
    
    if (allSelected) {
      setFormData(prev => ({
        ...prev,
        selectedFields: prev.selectedFields.filter(fieldId => !categoryFields.includes(fieldId))
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        selectedFields: Array.from(new Set([...prev.selectedFields, ...categoryFields]))
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Template name is required');
      return;
    }

    if (formData.selectedFields.length === 0) {
      setError('Please select at least one field');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSave({
        name: formData.name.trim(),
        description: formData.description.trim(),
        selectedFields: formData.selectedFields,
        filters: formData.filters,
        isShared: formData.isShared
      });
      onClose();
    } catch (error: any) {
      console.error('Error saving template:', error);
      setError(error.message || 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const getFieldLabel = (fieldId: string) => {
    return availableFields.find(field => field.id === fieldId)?.label || fieldId;
  };

  // Group fields by category
  const fieldsByCategory = availableFields.reduce((acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, typeof availableFields>);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            {template ? 'Edit Report Template' : 'Save Report Template'}
          </DialogTitle>
          <DialogDescription>
            {template ? 'Update your report template settings' : 'Save your current field selection and filters as a reusable template'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {/* Template Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                placeholder="Enter template name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description for this template"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isShared"
                checked={formData.isShared}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isShared: Boolean(checked) }))}
              />
              <Label htmlFor="isShared" className="text-sm">
                Share with other technicians
              </Label>
            </div>
          </div>

          {/* Field Selection Toggle */}
          {!template && (
            <div className="space-y-3">
              <Label>Field Selection</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="useCurrentSelection"
                  checked={useCurrentSelection}
                  onCheckedChange={(checked) => setUseCurrentSelection(Boolean(checked))}
                />
                <Label htmlFor="useCurrentSelection" className="text-sm">
                  Use current field selection ({currentSelectedFields.length} fields)
                </Label>
              </div>
            </div>
          )}

          {/* Field Selection */}
          <div className="space-y-3">
            <Label>Selected Fields ({formData.selectedFields.length})</Label>
            
            {useCurrentSelection && !template ? (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700 mb-2">
                  Using your current field selection:
                </p>
                <div className="flex flex-wrap gap-1">
                  {formData.selectedFields.map(fieldId => (
                    <Badge key={fieldId} variant="secondary" className="text-xs">
                      {getFieldLabel(fieldId)}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <ScrollArea className="h-64 border rounded-lg p-4">
                <div className="space-y-4">
                  {Object.entries(fieldsByCategory).map(([category, fields]) => {
                    const categoryFields = fields.map(field => field.id);
                    const allSelected = categoryFields.every(fieldId => formData.selectedFields.includes(fieldId));
                    const someSelected = categoryFields.some(fieldId => formData.selectedFields.includes(fieldId));
                    
                    return (
                      <div key={category} className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`category-${category}`}
                            checked={allSelected}
                            onCheckedChange={() => handleCategoryToggle(category)}
                            className={someSelected && !allSelected ? 'data-[state=checked]:bg-blue-600' : ''}
                          />
                          <Label
                            htmlFor={`category-${category}`}
                            className="text-sm font-medium text-gray-700 cursor-pointer"
                          >
                            {category}
                          </Label>
                          <Badge variant="secondary" className="text-xs">
                            {categoryFields.filter(fieldId => formData.selectedFields.includes(fieldId)).length}/{categoryFields.length}
                          </Badge>
                        </div>
                        <div className="ml-6 space-y-1">
                          {fields.map((field) => (
                            <div key={field.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={field.id}
                                checked={formData.selectedFields.includes(field.id)}
                                onCheckedChange={() => handleFieldToggle(field.id)}
                              />
                              <Label
                                htmlFor={field.id}
                                className="text-sm text-gray-600 cursor-pointer"
                              >
                                {field.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>

          <DialogFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || formData.selectedFields.length === 0}
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : (template ? 'Update Template' : 'Save Template')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
