"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  ArrowLeft, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  User, 
  Mail,
  Calendar,
  FileText,
  Tag,
  Users,
  Download,
  Paperclip,
  Eye,
  RefreshCw,
  MessageSquare,
  Settings,
  History,
  CheckSquare,
  Phone,
  Building,
  UserCheck,
  Edit,
  Reply,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SessionWrapper } from '@/components/session-wrapper';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { getStatusColor, getApprovalStatusColor, getPriorityColor, normalizeApprovalStatus } from '@/lib/status-colors';
import { formatPhilippineTime, getApiTimestamp, formatPhilippineTimeRelative, formatPhilippineTimeDisplay } from '@/lib/time-utils';

interface RequestData {
  id: number;
  templateId: string;
  templateName: string;
  type: string;
  status: string;
  priority: string;
  formData: any;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    emp_email: string;
    emp_fname: string;
    emp_lname: string;
    emp_mid?: string;
    emp_suffix?: string;
    emp_code?: string;
    post_des?: string;
    emp_cell?: string;
    department: string;
    emp_status?: string;
    profile_image?: string;
    reportingToId?: number;
    departmentHeadId?: number;
    isServiceApprover: boolean;
    isTechnician: boolean;
    reportingTo?: {
      id: number;
      emp_fname: string;
      emp_lname: string;
      emp_email: string;
      post_des?: string;
    };
    departmentHead?: {
      id: number;
      emp_fname: string;
      emp_lname: string;
      emp_email: string;
      post_des?: string;
    };
  };
}

interface TemplateData {
  id: number;
  name: string;
  description?: string;
  type: string;
  fields: any;
  approvalWorkflow?: any;
  category?: {
    id: number;
    name: string;
    description?: string;
    icon?: string;
  };
  slaService?: {
    id: number;
    name: string;
    priority: string;
    responseTime: number;
    resolutionTime: number;
    escalationTime: number;
    operationalHours: boolean;
    autoEscalate: boolean;
  };
  supportGroups?: Array<{
    supportGroup: {
      id: number;
      name: string;
      description?: string;
    };
  }>;
}

interface AttachmentFile {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

interface ConversationEntry {
  id: string;
  type: 'system' | 'user' | 'technician';
  message: string;
  author: string;
  timestamp: string;
}

interface ApprovalLevel {
  id: string;
  level: number;
  name: string;
  status: 'pending' | 'approved' | 'rejected' | 'not_sent';
  approver: string;
  sentOn?: string;
  actedOn?: string;
  comments?: string;
}

interface HistoryEntry {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  actor: string;
  actorType?: string;
}

export default function RequestViewPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const [requestData, setRequestData] = useState<RequestData | null>(null);
  const [templateData, setTemplateData] = useState<TemplateData | null>(null);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [conversations, setConversations] = useState<ConversationEntry[]>([]);
  const [approvals, setApprovals] = useState<ApprovalLevel[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('details');
  const [newComment, setNewComment] = useState('');
  const [conversationStates, setConversationStates] = useState<{[approvalId: string]: boolean}>({});
  const [approvalConversations, setApprovalConversations] = useState<{[approvalId: string]: ConversationEntry[]}>({});
  const [newConversationMessage, setNewConversationMessage] = useState<{[approvalId: string]: string}>({});
  const [unreadCounts, setUnreadCounts] = useState<{[approvalId: string]: number}>({});
  const conversationRefs = useRef<{[approvalId: string]: HTMLDivElement | null}>({});

  const requestId = params?.id as string;

  useEffect(() => {
    if (requestId && session) {
      fetchRequestData();
      fetchUnreadCounts(); // Fetch unread conversation counts
    }
  }, [requestId, session]);

  const fetchRequestData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/requests/${requestId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch request data');
      }

      const data = await response.json();
      console.log('Fetched request data:', data); // Debug log
      
      setRequestData(data.request);
      setTemplateData(data.template);
      setAttachments(data.attachments || []);
      setConversations(data.conversations || []);
      setApprovals(data.approvals || []);
      setHistory(data.history || []);
    } catch (error) {
      console.error('Error fetching request:', error);
      toast({
        title: "Error",
        description: "Failed to load request data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAttachment = async (attachmentId: string, originalName: string) => {
    try {
      setDownloading(attachmentId);
      const response = await fetch(`/api/attachments/${attachmentId}`);
      
      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: `Downloaded ${originalName}`,
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive"
      });
    } finally {
      setDownloading(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderFormField = (key: string, value: any) => {
    // Skip certain system fields
    if (['status', 'priority'].includes(key.toLowerCase())) {
      return null;
    }

    // Handle different value types
    if (Array.isArray(value)) {
      if (value.length === 0) return null;
      return (
        <div key={key} className="space-y-2">
          <label className="text-sm font-medium text-slate-700 capitalize">
            {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
          </label>
          <div className="flex flex-wrap gap-2">
            {value.map((item, index) => (
              <Badge key={index} variant="outline" className="bg-slate-50">
                {String(item)}
              </Badge>
            ))}
          </div>
        </div>
      );
    }

    if (typeof value === 'object' && value !== null) {
      return null; // Skip complex objects for now
    }

    if (!value || value === '') return null;

    // Check if it's HTML content (rich text)
    const isHTML = /<[^>]*>/g.test(String(value));

    return (
      <div key={key} className="space-y-2">
        <label className="text-sm font-medium text-slate-700 capitalize">
          {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
        </label>
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          {isHTML ? (
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: String(value) }}
            />
          ) : (
            <p className="text-sm text-slate-900 whitespace-pre-wrap">
              {String(value)}
            </p>
          )}
        </div>
      </div>
    );
  };

  // Conversation functions
  const toggleConversation = (approvalId: string) => {
    setConversationStates(prev => ({
      ...prev,
      [approvalId]: !prev[approvalId]
    }));
    
    // Load conversations for this approval if not already loaded
    if (!approvalConversations[approvalId]) {
      fetchApprovalConversations(approvalId);
    }
  };

  const fetchApprovalConversations = async (approvalId: string) => {
    try {
      const response = await fetch(`/api/approvals/${approvalId}/conversations`);
      if (response.ok) {
        const data = await response.json();
        setApprovalConversations(prev => ({
          ...prev,
          [approvalId]: data.conversations || []
        }));
        // Update unread count to 0 since user is viewing the conversation
        setUnreadCounts(prev => ({
          ...prev,
          [approvalId]: 0
        }));
        
        // Scroll to bottom when conversations are loaded
        setTimeout(() => {
          const conversationContainer = conversationRefs.current[approvalId];
          if (conversationContainer) {
            conversationContainer.scrollTop = conversationContainer.scrollHeight;
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchUnreadCounts = async () => {
    try {
      const response = await fetch('/api/approvals/conversations/unread');
      if (response.ok) {
        const data = await response.json();
        setUnreadCounts(data.unreadCounts || {});
      }
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  };

  const sendConversationMessage = async (approvalId: string) => {
    const message = newConversationMessage[approvalId]?.trim();
    if (!message) return;

    try {
      const response = await fetch(`/api/approvals/${approvalId}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          type: 'user',
          timestamp: getApiTimestamp() // Send Philippine Time to backend
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setApprovalConversations(prev => ({
          ...prev,
          [approvalId]: [...(prev[approvalId] || []), data.conversation]
        }));
        setNewConversationMessage(prev => ({
          ...prev,
          [approvalId]: ''
        }));
        
        // Scroll to bottom after sending message
        setTimeout(() => {
          const conversationContainer = conversationRefs.current[approvalId];
          if (conversationContainer) {
            conversationContainer.scrollTop = conversationContainer.scrollHeight;
          }
        }, 100);
        
        // Refresh request data to get updated approval statuses
        await fetchRequestData();
        
        toast({
          title: "Message sent",
          description: "Your message has been added to the conversation",
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  const requestClarification = async (approvalId: string) => {
    const message = newConversationMessage[approvalId]?.trim();
    if (!message) return;

    try {
      // First, update the approval status to for_clarification
      const statusResponse = await fetch('/api/approvals/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approvalId: approvalId,
          action: 'clarification',
          comments: message,
        }),
      });

      if (!statusResponse.ok) {
        const errorData = await statusResponse.json();
        throw new Error(errorData.error || 'Failed to request clarification');
      }

      // Then, create a conversation message
      const conversationResponse = await fetch(`/api/approvals/${approvalId}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          type: 'approver',
          timestamp: getApiTimestamp()
        }),
      });

      if (conversationResponse.ok) {
        const data = await conversationResponse.json();
        setApprovalConversations(prev => ({
          ...prev,
          [approvalId]: [...(prev[approvalId] || []), data.conversation]
        }));
      }

      setNewConversationMessage(prev => ({
        ...prev,
        [approvalId]: ''
      }));
      
      // Scroll to bottom after sending message
      setTimeout(() => {
        const conversationContainer = conversationRefs.current[approvalId];
        if (conversationContainer) {
          conversationContainer.scrollTop = conversationContainer.scrollHeight;
        }
      }, 100);
      
      // Refresh request data to get updated approval statuses
      await fetchRequestData();
      
      toast({
        title: "Clarification Requested",
        description: "Your clarification request has been sent and the approval status updated",
      });
    } catch (error) {
      console.error('Error requesting clarification:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to request clarification",
        variant: "destructive"
      });
    }
  };

  const sendMainConversationReply = async () => {
    const message = newComment.trim();
    if (!message) return;

    try {
      const response = await fetch(`/api/requests/${requestId}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Add the new conversation to the existing list without refreshing
        setConversations(prev => [...prev, data.conversation]);
        setNewComment(''); // Clear the input
        
        toast({
          title: "Reply sent",
          description: "Your reply has been added to the conversation",
        });
      } else {
        throw new Error('Failed to send reply');
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      toast({
        title: "Error",
        description: "Failed to send reply",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <SessionWrapper>
        <div className="container mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </SessionWrapper>
    );
  }

  if (!requestData) {
    return (
      <SessionWrapper>
        <div className="container mx-auto p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Request not found or failed to load.
            </AlertDescription>
          </Alert>
        </div>
      </SessionWrapper>
    );
  }

  return (
    <SessionWrapper>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="w-full px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => router.push('/users?tab=requests')} 
                  className="text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">
                      #{requestData.id} {requestData.templateName}
                    </h1>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>by {requestData.user.emp_fname} {requestData.user.emp_lname}</span>
                      <span>•</span>
                      <span>{formatPhilippineTime(requestData.createdAt, { dateOnly: true })}</span>
                      <span>•</span>
                      <span>DueBy: N/A</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge 
                  className={`${getStatusColor(requestData.status)} px-3 py-1 text-sm font-medium`}
                  variant="outline"
                >
                  {requestData.status.charAt(0).toUpperCase() + requestData.status.slice(1)}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchRequestData}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="w-full px-6 lg:px-8 py-6">
          <div className="grid grid-cols-12 gap-6">
            {/* Main Content */}
            <div className="col-span-8">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-6">
                  <TabsTrigger value="details" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="resolution" className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Resolution
                  </TabsTrigger>
                  <TabsTrigger value="approvals" className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4" />
                    Approvals
                  </TabsTrigger>
                  <TabsTrigger value="history" className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    History
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-6">
                  {/* Description */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose max-w-none">
                        {(() => {
                          // Try to find description from multiple possible field names and numbered fields
                          const formData = requestData.formData || {};
                          let description = null;
                          
                          // Check common description field names
                          const descriptionFields = [
                            'description', 'Description', 'details', 'Details', 
                            'content', 'Content', 'notes', 'Notes', 'comments', 'Comments',
                            'message', 'Message', 'problem', 'Problem', 'issue', 'Issue'
                          ];
                          
                          // First check named fields
                          for (const field of descriptionFields) {
                            if (formData[field]) {
                              description = formData[field];
                              break;
                            }
                          }
                          
                          // If not found, check numbered fields (like "2", "3", etc.)
                          if (!description) {
                            for (const [key, value] of Object.entries(formData)) {
                              if (value && typeof value === 'string' && value.length > 10) {
                                // Check if it's a textarea or richtext field based on content length and structure
                                if (value.includes('\n') || value.length > 50 || /<[^>]*>/g.test(value)) {
                                  description = value;
                                  break;
                                }
                              }
                            }
                          }
                          
                          if (description) {
                            // Check if description contains HTML tags (from Quill editor)
                            if (/<[^>]*>/g.test(description)) {
                              return (
                                <div 
                                  className="text-gray-700 leading-relaxed"
                                  dangerouslySetInnerHTML={{ __html: description }}
                                />
                              );
                            } else {
                              return (
                                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                  {description}
                                </p>
                              );
                            }
                          }
                          
                          return <p className="text-gray-500 italic">No description provided.</p>;
                        })()}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Attachments */}
                  {attachments.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Attachments</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {attachments.map((attachment) => (
                            <div 
                              key={attachment.id} 
                              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
                            >
                              <Paperclip className="h-4 w-4 text-gray-500" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {attachment.originalName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatFileSize(attachment.size)}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadAttachment(attachment.id, attachment.originalName)}
                                disabled={downloading === attachment.id}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Properties */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Properties</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <Tag className="h-4 w-4 text-red-500" />
                            <div>
                              <p className="text-sm font-medium text-gray-700">Priority</p>
                              <Badge className={getPriorityColor(requestData.priority)}>
                                {requestData.priority.charAt(0).toUpperCase() + requestData.priority.slice(1)}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-sm font-medium text-gray-700">E-mail Id(s) To Notify</p>
                              <p className="text-sm text-gray-600">
                                {(() => {
                                  const formData = requestData.formData || {};
                                  // Check for email fields
                                  const emails = formData['10'] || formData.emails || formData['email-list'] || formData.emailsToNotify;
                                  if (emails && Array.isArray(emails) && emails.length > 0) {
                                    return emails.join(', ');
                                  }
                                  return '-';
                                })()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Tag className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-sm font-medium text-gray-700">Request Type</p>
                              <p className="text-sm text-gray-600 capitalize">{requestData.type}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Settings className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-sm font-medium text-gray-700">Mode</p>
                              <p className="text-sm text-gray-600">Self-Service Portal</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Tag className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-sm font-medium text-gray-700">Service Category</p>
                              <p className="text-sm text-gray-600">{requestData.formData?.category || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <UserCheck className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-sm font-medium text-gray-700">Technician</p>
                              <p className="text-sm text-gray-600">
                                {(() => {
                                  const formData = requestData.formData || {};
                                  // Check for technician fields
                                  const technician = formData.technician || formData.assignedTechnician || formData.technicianId;
                                  if (technician) {
                                    return technician;
                                  }
                                  return 'Not Assigned';
                                })()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Tag className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-sm font-medium text-gray-700">Category</p>
                              <p className="text-sm text-gray-600">{requestData.formData?.category || requestData.formData?.['6'] || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Conversations */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Conversations</CardTitle>
                        <Button variant="outline" size="sm">
                          Add Notes
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Display conversations from API */}
                        {conversations.map((conversation) => (
                          <div key={conversation.id} className="flex gap-3">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              {conversation.type === 'system' ? (
                                <Settings className="h-4 w-4 text-gray-600" />
                              ) : conversation.type === 'user' ? (
                                <User className="h-4 w-4 text-blue-600" />
                              ) : (
                                <UserCheck className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-medium">{conversation.author}</span>
                                <span className="text-gray-500">
                                  {formatPhilippineTimeRelative(conversation.timestamp)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                {conversation.message}
                              </p>
                            </div>
                          </div>
                        ))}
                        
                        {/* Reply form */}
                        <div className="border-t pt-4">
                          <div className="space-y-3">
                            <Textarea
                              placeholder="Add a reply..."
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              className="min-h-[100px]"
                            />
                            <div className="flex justify-end">
                              <Button onClick={sendMainConversationReply}>
                                <Reply className="h-4 w-4 mr-2" />
                                Reply
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="resolution" className="space-y-6">
                  <Card>
                    <CardContent className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No Resolution Available</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="approvals" className="space-y-6">
                  <Card>
                    <CardContent className="py-6">
                      <div className="space-y-6">
                        {/* Dynamic Approval Levels - Group approvals by level */}
                        {(() => {
                          // Group approvals by level
                          const approvalsByLevel: Record<number, any[]> = approvals.reduce((acc: Record<number, any[]>, approval: any) => {
                            const level = approval.level;
                            if (!acc[level]) {
                              acc[level] = [];
                            }
                            acc[level].push(approval);
                            return acc;
                          }, {});

                          // Get all unique levels and sort them
                          const levels = Object.keys(approvalsByLevel).sort((a, b) => parseInt(a) - parseInt(b));

                          // If no approvals, show a message
                          if (levels.length === 0) {
                            return (
                              <div className="text-center py-8">
                                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-500">No approval workflow configured for this request</p>
                              </div>
                            );
                          }

                          return levels.map((level) => {
                            const levelApprovals = approvalsByLevel[parseInt(level)];
                            const levelName = levelApprovals[0]?.name || `Level ${level}`;
                            
                            // Determine level status based on all approvals in this level
                            const hasApproved = levelApprovals.some((app: any) => app.status === 'approved');
                            const hasPending = levelApprovals.some((app: any) => app.status === 'not_sent' || app.status === 'pending');
                            const hasRejected = levelApprovals.some((app: any) => app.status === 'rejected');
                            
                            let levelStatus = 'Yet to Progress';
                            let levelIcon = Clock;
                            let levelBgColor = 'bg-gray-400';
                            
                            if (hasRejected) {
                              levelStatus = 'Rejected';
                              levelIcon = AlertCircle;
                              levelBgColor = 'bg-red-500';
                            } else if (hasApproved && !hasPending) {
                              levelStatus = 'Approved';
                              levelIcon = CheckCircle;
                              levelBgColor = 'bg-green-500';
                            } else if (hasPending) {
                              levelStatus = 'In Progress';
                              levelIcon = Clock;
                              levelBgColor = 'bg-orange-500';
                            }
                            
                            const IconComponent = levelIcon;

                            return (
                              <div key={level} className="space-y-4">
                                {/* Level Header */}
                                <div className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${levelBgColor}`}>
                                    <IconComponent className="h-5 w-5 text-white" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <h3 className="font-medium text-gray-900">
                                          Level {level}: {levelName}
                                        </h3>
                                        <p className="text-sm text-gray-600">{levelStatus}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button className="p-1 hover:bg-gray-200 rounded">
                                          <Eye className="h-4 w-4 text-gray-400" />
                                        </button>
                                        {levelStatus === 'In Progress' && (
                                          <Button size="sm" variant="outline" className="text-xs">
                                            Send for Approval
                                          </Button>
                                        )}
                                        {levelStatus === 'In Progress' && (
                                          <Button size="sm" variant="outline" className="text-xs">
                                            + Add Approvals
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Approvals Table for this level */}
                                <div className="bg-white border rounded-lg overflow-hidden">
                                  <div className="grid grid-cols-6 gap-3 p-2 bg-gray-100 text-xs font-medium text-gray-700 border-b">
                                    <div>Status</div>
                                    <div>Approvers</div>
                                    <div>Sent On</div>
                                    <div>Acted On</div>
                                    <div>Comments</div>
                                    <div>Conversation</div>
                                  </div>
                                  
                                  {/* Render each approval in this level */}
                                  {levelApprovals.map((approval: any, index: number) => (
                                    <div key={approval.id || index}>
                                      <div className="grid grid-cols-6 gap-3 p-2 text-xs border-b last:border-b-0">
                                        <div className="flex items-center gap-1.5">
                                          {approval.status === 'approved' ? (
                                            <>
                                              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                                              <span className="text-green-700 text-xs">Approved</span>
                                            </>
                                          ) : approval.status === 'rejected' ? (
                                            <>
                                              <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                                              <span className="text-red-700 text-xs">Rejected</span>
                                            </>
                                          ) : approval.status === 'for-clarification' ? (
                                              <>
                                                <Clock className="h-3.5 w-3.5 text-sky-500" />
                                                <span className="text-sky-700 text-xs">For Clarification</span>
                                              </>

                                          ) : (
                                            <>
                                              <Clock className="h-3.5 w-3.5 text-orange-500" />
                                              <span className="text-orange-500 text-xs">Pending Approval</span>
                                            </>
                                          )}
                                        </div>
                                        <div className="text-gray-700 text-xs">
                                          {approval.approver?.emp_fname && approval.approver?.emp_lname 
                                            ? `${approval.approver.emp_fname} ${approval.approver.emp_lname}` 
                                            : approval.approver || approval.approverName || 'Unknown Approver'
                                          }
                                          {(approval.approver?.emp_email || approval.approverEmail) && (
                                            <div className="text-xs text-gray-500">({approval.approver?.emp_email || approval.approverEmail})</div>
                                          )}
                                        </div>
                                        <div className="text-gray-700 text-xs">
                                          {(() => {
                                            // Calculate "Sent On" based on level logic
                                            if (approval.sentOn) {
                                              // If we have an explicit sentOn date, use it
                                              return formatPhilippineTime(approval.sentOn);
                                            } else if (approval.level === 1) {
                                              // Level 1 uses request creation date
                                              return requestData?.createdAt ? formatPhilippineTime(requestData.createdAt) : '-';
                                            } else {
                                              // For subsequent levels, use previous level's approval date
                                              const previousLevel = approval.level - 1;
                                              const previousApproval = approvals.find((app: any) => 
                                                app.level === previousLevel && app.status === 'approved'
                                              );
                                              return previousApproval?.actedOn ? formatPhilippineTime(previousApproval.actedOn) : '-';
                                            }
                                          })()}
                                        </div>
                                        <div className="text-gray-700 text-xs">
                                          {approval.actedOn ? formatPhilippineTime(approval.actedOn) : '-'}
                                        </div>
                                        <div className="text-gray-700 text-xs">{approval.comments || '-'}</div>
                                        <div className="text-gray-700">
                                          <div className="flex items-center gap-1">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => toggleConversation(approval.id)}
                                              className="h-6 w-6 p-0 hover:bg-blue-50 relative"
                                            >
                                              <MessageSquare className="h-3 w-3 text-blue-600" />
                                              
                                              {/* Unread Messages Badge - positioned better */}
                                              {unreadCounts[approval.id] > 0 && (
                                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-3.5 w-3.5 flex items-center justify-center font-medium">
                                                  {unreadCounts[approval.id]}
                                                </span>
                                              )}
                                            </Button>
                                            
                                            {/* Total Messages Badge (when no unread) - separate from button */}
                                            {unreadCounts[approval.id] === 0 && approvalConversations[approval.id] && approvalConversations[approval.id].length > 0 && (
                                              <span className="text-xs bg-blue-100 text-blue-800 rounded-full px-1.5 py-0.5 ml-1">
                                                {approvalConversations[approval.id].length}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* Conversation Panel */}
                                      {conversationStates[approval.id] && (
                                        <div className="col-span-6 border-t bg-gray-50">
                                          <div className="p-4 space-y-3">
                                            <div className="flex items-center gap-2 mb-3">
                                              <MessageSquare className="h-4 w-4 text-blue-600" />
                                              <h4 className="text-sm font-medium text-gray-900">
                                                Conversation with {approval.approver?.emp_fname || approval.approverName || 'Approver'}
                                              </h4>
                                            </div>
                                            
                                            {/* Messages Container */}
                                            <div 
                                              ref={(el) => {
                                                conversationRefs.current[approval.id] = el;
                                              }}
                                              className="max-h-64 overflow-y-auto space-y-2 mb-3 bg-white border rounded-lg p-3"
                                            >
                                              {approvalConversations[approval.id] && approvalConversations[approval.id].length > 0 ? (
                                                approvalConversations[approval.id].map((conv: ConversationEntry, convIndex: number) => (
                                                  <div key={convIndex} className={`p-3 rounded-lg max-w-xs ${
                                                    conv.type === 'user' 
                                                      ? 'bg-blue-100 ml-auto text-right' 
                                                      : 'bg-gray-100 mr-auto text-left'
                                                  }`}>
                                                    <div className="flex items-center justify-between mb-1">
                                                      <span className="text-xs font-medium text-gray-900">
                                                        {conv.author}
                                                      </span>
                                                      <span className="text-xs text-gray-500">
                                                        {formatPhilippineTimeDisplay(conv.timestamp)}
                                                      </span>
                                                    </div>
                                                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                                      {conv.message}
                                                    </p>
                                                  </div>
                                                ))
                                              ) : (
                                                <div className="text-center py-6 text-gray-500 text-sm">
                                                  No conversation yet. Start the discussion!
                                                </div>
                                              )}
                                            </div>
                                            
                                            {/* Message Input */}
                                            <div className="flex gap-2">
                                              <Textarea
                                                placeholder="Type your message..."
                                                value={newConversationMessage[approval.id] || ''}
                                                onChange={(e) => setNewConversationMessage(prev => ({
                                                  ...prev,
                                                  [approval.id]: e.target.value
                                                }))}
                                                className="flex-1 min-h-[60px] text-sm resize-none"
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    if (newConversationMessage[approval.id]?.trim()) {
                                                      sendConversationMessage(approval.id);
                                                    }
                                                  }
                                                }}
                                              />
                                              <div className="flex flex-col gap-2">
                                                <Button
                                                  onClick={() => sendConversationMessage(approval.id)}
                                                  disabled={!newConversationMessage[approval.id]?.trim()}
                                                  size="sm"
                                                  className="self-end"
                                                >
                                                  <Reply className="h-4 w-4" />
                                                </Button>
                                                {approval.status === 'pending_approval' && (
                                                  <Button
                                                    onClick={() => requestClarification(approval.id)}
                                                    disabled={!newConversationMessage[approval.id]?.trim()}
                                                    size="sm"
                                                    variant="outline"
                                                    className="self-end border-orange-300 text-orange-600 hover:bg-orange-50"
                                                  >
                                                    <AlertCircle className="h-4 w-4" />
                                                  </Button>
                                                )}
                                              </div>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                              Press Enter to send, Shift+Enter for new line. Use 🔵 for regular message or ⚠️ to request clarification (changes approval status).
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="history" className="space-y-6">
                  <Card>
                    <CardContent className="py-6">
                      {/* 🎯 STANDARDIZED HISTORY SYSTEM - Scrollable Chat-like Timeline */}
                      <div className="h-96 overflow-y-auto border rounded-lg bg-gray-50 p-4">
                        <div className="space-y-4">
                          {history && history.length > 0 ? (
                            (() => {
                              // Helper function to get standardized icon for each action
                              const getActionIcon = (action: string) => {
                                switch (action) {
                                  case 'Created':
                                    return <div className="w-3 h-3 bg-blue-600 rounded-full"></div>; // Blue dot
                                  case 'Approvals Initiated':
                                  case 'Next Level Activated':
                                    return <Mail className="h-4 w-4 text-orange-600" />; // Orange mail icon
                                  case 'Approved':
                                  case 'Request Approved - Ready for Work':
                                  case 'Resolved':
                                    return <CheckCircle className="h-4 w-4 text-green-600" />; // Green check circle
                                  case 'Rejected':
                                    return <X className="h-4 w-4 text-red-600" />; // Red X circle
                                  case 'Requested Clarification':
                                    return <AlertCircle className="h-4 w-4 text-orange-600" />; // Orange question circle
                                  case 'Updated':
                                  case 'Status Change':
                                  case 'Request Closed':
                                    return <Settings className="h-4 w-4 text-purple-600" />; // Purple settings icon
                                  case 'Start Timer':
                                  case 'SLA Timer Started':
                                    return <Clock className="h-4 w-4 text-gray-600" />; // Clock icon
                                  case 'WorkLog Added':
                                  case 'Work Log Added':
                                    return <Edit className="h-4 w-4 text-gray-600" />; // Edit/pencil icon
                                  case 'Assigned':
                                    return <User className="h-4 w-4 text-blue-600" />; // User icon
                                  case 'Reopened':
                                    return <ArrowLeft className="h-4 w-4 text-orange-600" />; // Refresh icon
                                  case 'Closed':
                                    return <X className="h-4 w-4 text-gray-600" />; // Lock icon
                                  case 'Conversation Message':
                                    return <Settings className="h-4 w-4 text-gray-600" />; // Settings icon for conversation
                                  default:
                                    return <Settings className="h-4 w-4 text-gray-600" />; // Default settings icon
                                }
                              };

                              // Helper function to get priority for sorting (lower number = higher priority)
                              const getActionPriority = (action: string) => {
                                switch (action) {
                                  case 'Created': return 1;
                                  case 'Approvals Initiated': return 2;
                                  case 'Next Level Activated': return 2;
                                  case 'Approved': return 10;
                                  case 'Rejected': return 10;
                                  case 'Requested Clarification': return 10;
                                  case 'Assigned': return 15;
                                  case 'Updated': return 20;
                                  case 'Status Change': return 20;
                                  case 'Start Timer': return 20;
                                  case 'SLA Timer Started': return 20;
                                  case 'WorkLog Added': return 30;
                                  case 'Work Log Added': return 30;
                                  case 'Conversation Message': return 35;
                                  case 'Resolved': return 40;
                                  case 'Request Approved - Ready for Work': return 40;
                                  case 'Reopened': return 20;
                                  case 'Closed': return 40;
                                  case 'Request Closed': return 40;
                                  default: return 100; // API/External entries
                                }
                              };

                              // Sort by timestamp (newest first for display - latest at top)
                              const sortedHistory = [...history].sort((a, b) => {
                                return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
                              });

                              // Group by date
                              const groupedByDate = sortedHistory.reduce((acc: any, entry: any) => {
                                const date = formatPhilippineTime(entry.timestamp, { 
                                  dateOnly: true, 
                                  shortFormat: true 
                                });
                                
                                if (!acc[date]) {
                                  acc[date] = [];
                                }
                                acc[date].push({
                                  ...entry,
                                  priority: getActionPriority(entry.action)
                                });
                                return acc;
                              }, {});

                              // Create date groups with newest dates first (latest dates at top)
                              const dateGroups = Object.keys(groupedByDate)
                                .sort((a, b) => new Date(b).getTime() - new Date(a).getTime()) // Newest dates first
                                .map((date) => (
                                <div key={date} className="space-y-4">
                                  {/* 📅 Date Header with Calendar Badge */}
                                  <div className="flex items-center gap-3 py-2">
                                    <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full">
                                      <Calendar className="h-4 w-4 text-blue-600" />
                                      <span className="text-sm font-medium text-blue-700">{date}</span>
                                    </div>
                                    <div className="flex-1 h-px bg-gray-200"></div>
                                  </div>

                                  {/* 📋 History Entries for this Date */}
                                  <div className="space-y-4 ml-6">
                                    {groupedByDate[date]
                                      .sort((a: any, b: any) => {
                                        // Sort by timestamp within same date (newest first within day)
                                        return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
                                      })
                                      .map((entry: any, index: number) => (
                                      <div key={entry.id} className="flex gap-4">
                                        {/* 🎯 Standardized Icon */}
                                        <div className="flex flex-col items-center">
                                          <div className="w-8 h-8 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center shadow-sm">
                                            {getActionIcon(entry.action)}
                                          </div>
                                          {index < groupedByDate[date].length - 1 && (
                                            <div className="w-px h-8 bg-gray-200 mt-2"></div>
                                          )}
                                        </div>
                                        
                                        {/* 📝 Entry Content */}
                                        <div className="flex-1 pb-4">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-medium text-gray-900">
                                              {formatPhilippineTimeDisplay(entry.timestamp, { timeOnly: true })}
                                            </span>
                                            <span className="text-sm font-medium text-gray-700">{entry.action}</span>
                                          </div>
                                          <p className="text-sm text-gray-600 mb-1">
                                            by <span className="font-medium text-blue-600">{entry.actor || entry.actorName}</span>
                                          </p>
                                          {entry.details && (
                                            <div className="text-sm text-gray-500 whitespace-pre-line">
                                              {entry.details}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ));
                              
                              // Return date groups as is (newest dates and entries at top)
                              return dateGroups;
                            })()
                          ) : (
                            <div className="text-center py-8">
                              <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                              <p className="text-gray-500">No history entries found for this request</p>
                              <p className="text-sm text-gray-400 mt-2">History will appear here as actions are taken on the request</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="col-span-4 space-y-6">
              {/* Status Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckSquare className="h-4 w-4" />
                    Request Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Status</span>
                      <Badge className={getStatusColor(requestData.status)} variant="outline">
                        {requestData.status.charAt(0).toUpperCase() + requestData.status.slice(1)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Approval Status</span>
                      {(() => {
                        const rawApprovalStatus = requestData.formData?.['5'] || 'pending approval';
                        const { normalized, display } = normalizeApprovalStatus(rawApprovalStatus);
                        
                        return (
                          <Badge className={getApprovalStatusColor(normalized)} variant="outline">
                            {display}
                          </Badge>
                        );
                      })()}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Priority</span>
                      <Badge className={getPriorityColor(requestData.priority)} variant="outline">
                        {requestData.priority.charAt(0).toUpperCase() + requestData.priority.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* User Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    More Properties
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {requestData.user.emp_fname} {requestData.user.emp_lname}
                      </p>
                      <p className="text-sm text-blue-600">{requestData.user.emp_email}</p>
                      
                      <div className="mt-4 space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Employee ID</span>
                          <span className="font-medium">{requestData.user.emp_code || '16-024'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Department Name</span>
                          <span className="font-medium">{requestData.user.department}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Phone</span>
                          <span className="font-medium">{requestData.user.emp_cell || '+639998668296'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Job title</span>
                          <span className="font-medium">{requestData.user.post_des || 'Software Development Manager'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Reporting To</span>
                          <span className="font-medium">
                            {requestData.user.reportingTo 
                              ? `${requestData.user.reportingTo.emp_fname} ${requestData.user.reportingTo.emp_lname}`
                              : 'Robert E. Baluyot'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Mobile</span>
                          <span className="font-medium">{requestData.user.emp_cell || '+639998668296'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status</span>
                          <span className="font-medium capitalize">{requestData.user.emp_status || 'active'}</span>
                        </div>
                        {requestData.user.departmentHead && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Department Head</span>
                            <span className="font-medium">
                              {requestData.user.departmentHead.emp_fname} {requestData.user.departmentHead.emp_lname}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Assets */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Assets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Building className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="font-medium text-sm">Lenovo IdeaPad 3 15ITL6</p>
                      <p className="text-xs text-gray-500">Laptop</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Template and SLA Information */}
              {templateData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Template Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Template</span>
                        <span className="font-medium">{templateData.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type</span>
                        <span className="font-medium capitalize">{templateData.type}</span>
                      </div>
                      {templateData.category && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Category</span>
                          <span className="font-medium">{templateData.category.name}</span>
                        </div>
                      )}
                      {templateData.slaService && (
                        <>
                          <div className="border-t pt-3 mt-3">
                            <p className="font-medium text-gray-900 mb-2">SLA Information</p>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Response Time</span>
                                <span className="font-medium">{templateData.slaService.responseTime}h</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Resolution Time</span>
                                <span className="font-medium">{templateData.slaService.resolutionTime}h</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Auto Escalate</span>
                                <span className="font-medium">{templateData.slaService.autoEscalate ? 'Yes' : 'No'}</span>
                              </div>
                              {templateData.slaService.autoEscalate && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Escalation Time</span>
                                  <span className="font-medium">{templateData.slaService.escalationTime}h</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                      {templateData.supportGroups && templateData.supportGroups.length > 0 && (
                        <div className="border-t pt-3 mt-3">
                          <p className="font-medium text-gray-900 mb-2">Support Groups</p>
                          <div className="space-y-1">
                            {templateData.supportGroups.map((sg) => (
                              <div key={sg.supportGroup.id} className="text-sm">
                                <Badge variant="outline">{sg.supportGroup.name}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </SessionWrapper>
  );
}
