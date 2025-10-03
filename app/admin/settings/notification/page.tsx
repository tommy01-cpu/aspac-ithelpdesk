'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Mail, FileText, Server, Bell, Edit, Megaphone, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { SessionWrapper } from '@/components/session-wrapper';
import dynamic from 'next/dynamic';

interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

// Dynamically import the components to avoid SSR issues
const MailServerSettings = dynamic(() => import('./mail-server-settings/page'), { ssr: false });

// Create announcements management component
const AnnouncementsList = () => {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: ''
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch('/api/announcements');
      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data.announcements || []);
      } else {
        console.error('Failed to fetch announcements:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) return;

    setCreating(true);
    try {
      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newAnnouncement),
      });

      if (response.ok) {
        setNewAnnouncement({ title: '', content: '' });
        fetchAnnouncements(); // Refresh the list
        alert('Announcement created successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create announcement');
      }
    } catch (error) {
      console.error('Error creating announcement:', error);
      alert('Failed to create announcement');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      const response = await fetch(`/api/announcements/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (response.ok) {
        fetchAnnouncements(); // Refresh the list
      } else {
        alert('Failed to update announcement');
      }
    } catch (error) {
      console.error('Error updating announcement:', error);
      alert('Failed to update announcement');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      const response = await fetch(`/api/announcements/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchAnnouncements(); // Refresh the list
        alert('Announcement deleted successfully!');
      } else {
        alert('Failed to delete announcement');
      }
    } catch (error) {
      console.error('Error deleting announcement:', error);
      alert('Failed to delete announcement');
    }
  };

  const filteredAnnouncements = announcements.filter(announcement =>
    announcement.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    announcement.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-slate-600">Loading announcements...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create New Announcement */}
      <Card className="border border-blue-200 bg-blue-50/50">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            Create New Announcement
          </h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Title
              </label>
              <Input
                type="text"
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter announcement title..."
                className="w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Content
              </label>
              <textarea
                value={newAnnouncement.content}
                onChange={(e) => setNewAnnouncement(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter announcement content..."
                className="w-full min-h-[100px] px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                required
              />
            </div>
            <div className="flex gap-2">
              <Button 
                type="submit" 
                disabled={creating || !newAnnouncement.title.trim() || !newAnnouncement.content.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {creating ? 'Creating...' : 'Create Announcement'}
              </Button>
              <Button 
                type="button"
                variant="outline"
                onClick={() => setNewAnnouncement({ title: '', content: '' })}
              >
                Clear
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      {/* Announcements List */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Announcement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredAnnouncements.map((announcement, index) => (
                <tr key={announcement.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="px-6 py-4">
                    <div className="flex items-start">
                      <Megaphone className="w-4 h-4 text-slate-400 mr-3 mt-1 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">
                          {announcement.title}
                        </div>
                        <div className="text-sm text-slate-600 line-clamp-2 mt-1">
                          {announcement.content}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      announcement.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {announcement.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    <div>{new Date(announcement.createdAt).toLocaleDateString()}</div>
                    <div className="text-xs text-slate-500">
                      by {announcement.creator?.emp_fname} {announcement.creator?.emp_lname}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleActive(announcement.id, announcement.isActive)}
                        className="text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50"
                      >
                        {announcement.isActive ? (
                          <><EyeOff className="w-4 h-4 mr-1" /> Hide</>
                        ) : (
                          <><Eye className="w-4 h-4 mr-1" /> Show</>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(announcement.id)}
                        className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredAnnouncements.length === 0 && !loading && (
          <div className="text-center py-12">
            <Megaphone className="w-16 h-16 mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              {searchQuery ? 'No announcements found' : 'No announcements yet'}
            </h3>
            <p className="text-slate-600">
              {searchQuery 
                ? 'Try adjusting your search query.' 
                : 'Create your first announcement using the form above.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Create a comprehensive email template list with full functionality
const EmailTemplatesList = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
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

  const filteredTemplates = templates
    .filter(template =>
      template.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.type?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => a.id - b.id);

  const handleEdit = (templateId: number) => {
    router.push(`/admin/settings/notification/email-template/${templateId}`);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-slate-600">Loading email templates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      {/* Templates Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Template Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredTemplates.map((template, index) => (
                <tr key={template.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 text-slate-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-slate-900">{template.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(template.id)}
                      className="text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredTemplates.length === 0 && !loading && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              {searchQuery ? 'No templates found' : 'No email templates available'}
            </h3>
            <p className="text-slate-600">
              {searchQuery 
                ? 'Try adjusting your search query or browse all templates.' 
                : 'Email templates are managed by the system.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Tab configuration
const notificationTabs: TabItem[] = [
  {
    id: 'announcements',
    label: 'Announcements',
    icon: Megaphone,
    path: '/admin/settings/notification/announcements'
  },
  {
    id: 'email-template',
    label: 'Email Templates',
    icon: FileText,
    path: '/admin/settings/notification/email-template'
  },
  {
    id: 'mail-server-settings',
    label: 'Mail Server Settings',
    icon: Server,
    path: '/admin/settings/notification/mail-server-settings'
  }
];

export default function NotificationSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('announcements');

  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab && notificationTabs.find(t => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: string) => {
    const tab = notificationTabs.find(t => t.id === tabId);
    if (tab) {
      setActiveTab(tabId);
      // Update URL with tab parameter for all tabs to maintain the side panel
      router.push(`/admin/settings/notification?tab=${tabId}`);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'announcements':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Megaphone className="w-6 h-6 text-blue-600" />
              Announcements Management
            </h2>
            <p className="text-slate-600 mb-6">Create and manage system announcements that appear on the homepage.</p>
            <AnnouncementsList />
          </div>
        );
      case 'email-template':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Email Templates</h2>
            <EmailTemplatesList />
          </div>
        );
      case 'mail-server-settings':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Mail Server Settings</h2>
            <MailServerSettings />
          </div>
        );
      default:
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Notification Settings</h2>
            <div className="text-center py-12">
              <Bell className="w-16 h-16 mx-auto text-indigo-600 mb-4" />
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Select a Setting</h3>
              <p className="text-slate-600 mb-6">Choose a setting category from the sidebar to get started</p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Button 
                  onClick={() => handleTabChange('announcements')}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Megaphone className="w-4 h-4" />
                  Announcements
                </Button>
                <Button 
                  onClick={() => handleTabChange('email-template')}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Email Templates
                </Button>
                <Button 
                  onClick={() => handleTabChange('mail-server-settings')}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Server className="w-4 h-4" />
                  Mail Server Settings
                </Button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <SessionWrapper>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-16 z-40">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Link href="/admin/settings">
                  <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Settings
                  </Button>
                </Link>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                    Notification Settings
                  </h1>
                  <p className="text-sm text-slate-600">Configure email templates and notification settings</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-8">
          <div className="flex gap-6 min-h-screen">
            {/* Side Panel */}
            <div className="w-80 flex-shrink-0">
              <Card className="bg-white border border-slate-200 shadow-sm sticky top-40 z-30 max-h-[calc(100vh-12rem)] overflow-y-auto">
                <CardContent className="p-0">
                  <div className="p-6 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Bell className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">Notification</h3>
                        <p className="text-xs text-slate-600">Configuration</p>
                      </div>
                    </div>
                  </div>
                  
                  <nav className="p-4">
                    {notificationTabs.map((tab) => {
                      const IconComponent = tab.icon;
                      const isActive = activeTab === tab.id;
                      
                      return (
                        <button
                          key={tab.id}
                          onClick={() => handleTabChange(tab.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200 mb-2 ${
                            isActive
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                          }`}
                        >
                          <IconComponent className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                          <span className="text-left font-normal">{tab.label}</span>
                        </button>
                      );
                    })}
                  </nav>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-0">
                  {renderTabContent()}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </SessionWrapper>
  );
}
