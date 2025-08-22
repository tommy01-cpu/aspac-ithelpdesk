'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { SessionWrapper } from '@/components/session-wrapper';

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  type: string;
  status: 'active' | 'inactive';
  lastModified: string;
}

export default function EmailTemplatePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch email templates from API
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/admin/email-templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      } else {
        console.error('Failed to fetch templates:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (templateId: number) => {
    router.push(`/admin/settings/notification/email-template/${templateId}`);
  };

  const handleDelete = async (templateId: number) => {
    if (confirm('Are you sure you want to delete this template?')) {
      try {
        const response = await fetch(`/api/admin/email-templates/${templateId}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          setTemplates(templates.filter(t => t.id !== templateId));
        } else {
          console.error('Failed to delete template');
          alert('Failed to delete template. Please try again.');
        }
      } catch (error) {
        console.error('Error deleting template:', error);
        alert('Error deleting template. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <SessionWrapper>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading email templates...</p>
          </div>
        </div>
      </SessionWrapper>
    );
  }

  return (
    <SessionWrapper>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-16 z-40">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Link href="/admin/settings/notification">
                  <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Notification Settings
                  </Button>
                </Link>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                    Email Templates
                  </h1>
                  <p className="text-sm text-slate-600">Manage and customize email notification templates</p>
                </div>
              </div>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                New Template
              </Button>
            </div>
          </div>
        </div>

        <div className="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-8">
          <div className="max-w-6xl mx-auto">
            {/* Search and Filter */}
            <div className="mb-6">
              <Input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md bg-white"
              />
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        <CardTitle className="text-lg font-semibold text-slate-800">
                          {template.name}
                        </CardTitle>
                      </div>
                      <Badge variant={template.status === 'active' ? 'default' : 'secondary'}>
                        {template.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-slate-500 font-medium mb-1">Subject:</p>
                        <p className="text-sm text-slate-700 line-clamp-2">{template.subject}</p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-slate-500 font-medium mb-1">Type:</p>
                        <Badge variant="outline" className="text-xs">
                          {template.type.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div>
                        <p className="text-xs text-slate-500">Last modified: {template.lastModified}</p>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleEdit(template.id)}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(template.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Empty State */}
            {filteredTemplates.length === 0 && !loading && (
              <div className="text-center py-16">
                <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  {searchQuery ? 'No templates found' : 'No email templates yet'}
                </h3>
                <p className="text-slate-600 mb-6">
                  {searchQuery 
                    ? 'Try adjusting your search query or browse all templates.' 
                    : 'Create your first email template to get started with notifications.'
                  }
                </p>
                {!searchQuery && (
                  <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Template
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </SessionWrapper>
  );
}