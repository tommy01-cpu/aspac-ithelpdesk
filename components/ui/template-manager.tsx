"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  BookTemplate, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Share, 
  Download,
  User,
  Clock,
  Eye,
  Copy
} from "lucide-react";
import { format } from "date-fns";

interface ReportTemplate {
  id: number;
  name: string;
  description?: string;
  selectedFields: string[];
  filters: any;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
  isOwner: boolean;
  creator: {
    name: string;
    email: string;
  };
}

interface TemplateManagerProps {
  templates: ReportTemplate[];
  onLoadTemplate: (template: ReportTemplate) => void;
  onEditTemplate: (template: ReportTemplate) => void;
  onDeleteTemplate: (templateId: number) => Promise<void>;
  onDuplicateTemplate: (template: ReportTemplate) => void;
  availableFields: Array<{ id: string; label: string; category: string }>;
  loading?: boolean;
}

export function TemplateManager({
  templates,
  onLoadTemplate,
  onEditTemplate,
  onDeleteTemplate,
  onDuplicateTemplate,
  availableFields,
  loading = false
}: TemplateManagerProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<ReportTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  const getFieldLabel = (fieldId: string) => {
    return availableFields.find(field => field.id === fieldId)?.label || fieldId;
  };

  const handleDeleteClick = (template: ReportTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;

    setDeleting(true);
    try {
      await onDeleteTemplate(templateToDelete.id);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (error) {
      console.error('Error deleting template:', error);
    } finally {
      setDeleting(false);
    }
  };

  const getFiltersCount = (filters: any) => {
    if (!filters || typeof filters !== 'object') return 0;
    
    let count = 0;
    if (filters.priority?.length > 0) count++;
    if (filters.status?.length > 0) count++;
    if (filters.assignedTechnician) count++;
    if (filters.supportGroup) count++;
    if (filters.searchTerm) count++;
    if (filters.startDate || filters.endDate) count++;
    
    return count;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500">Loading templates...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center space-y-2">
            <BookTemplate className="h-12 w-12 text-gray-400 mx-auto" />
            <h3 className="text-lg font-medium text-gray-900">No templates yet</h3>
            <p className="text-gray-500">Save your first report template to get started</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate flex items-center gap-2">
                    <BookTemplate className="h-5 w-5 text-blue-600" />
                    {template.name}
                  </CardTitle>
                  {template.description && (
                    <CardDescription className="mt-1 line-clamp-2">
                      {template.description}
                    </CardDescription>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onLoadTemplate(template)}>
                      <Download className="h-4 w-4 mr-2" />
                      Load Template
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDuplicateTemplate(template)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    {template.isOwner && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onEditTemplate(template)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(template)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Template Stats */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-xs">
                  {template.selectedFields.length} fields
                </Badge>
                {getFiltersCount(template.filters) > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {getFiltersCount(template.filters)} filters
                  </Badge>
                )}
                {template.isShared && (
                  <Badge variant="outline" className="text-xs">
                    <Share className="h-3 w-3 mr-1" />
                    Shared
                  </Badge>
                )}
              </div>

              {/* Selected Fields Preview */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Fields:</div>
                <div className="flex flex-wrap gap-1">
                  {template.selectedFields.slice(0, 3).map(fieldId => (
                    <Badge key={fieldId} variant="outline" className="text-xs">
                      {getFieldLabel(fieldId)}
                    </Badge>
                  ))}
                  {template.selectedFields.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{template.selectedFields.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>

              {/* Creator and Date Info */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {template.isOwner ? 'You' : template.creator.name}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(template.updatedAt), 'MMM dd, yyyy')}
                </div>
              </div>

              {/* Load Button */}
              <Button
                onClick={() => onLoadTemplate(template)}
                className="w-full"
                size="sm"
              >
                <Eye className="h-4 w-4 mr-2" />
                Load Template
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
