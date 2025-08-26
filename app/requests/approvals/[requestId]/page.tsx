"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  Search,
  X,
  ShoppingCart,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  User,
  Eye,
  ArrowLeft,
  MessageSquare,
  History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SessionWrapper } from '@/components/session-wrapper';
import { toast } from '@/hooks/use-toast';
import { getStatusColor, getPriorityColor, getApprovalStatusColor } from '@/lib/status-colors';

// Component for individual approval message input
const ApprovalMessageInput = ({ 
  approvalId, 
  onSendMessage 
}: { 
  approvalId: string; 
  onSendMessage: (approvalId: string, message: string) => Promise<void>; 
}) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || sending) return;

    setSending(true);
    try {
      await onSendMessage(approvalId, message.trim());
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <Textarea
        data-approval-id={approvalId}
        placeholder="Type your message or clarification response..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="min-h-[80px] text-sm resize-none border-gray-200 focus:border-blue-300 focus:ring-blue-200"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (message.trim()) {
              handleSend();
            }
          }
        }}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Press Enter to send, Shift+Enter for new line
        </p>
        <Button
          onClick={handleSend}
          disabled={!message.trim() || sending}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700"
        >
          {sending ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Sending...
            </>
          ) : (
            <>
              <MessageSquare className="h-4 w-4 mr-2" />
              Send Message
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

interface PendingApproval {
  id: string;
  requestId: number;
  requestTitle: string;
  requesterName: string;
  createdDate: string;
  dueDate?: string;
  priority: string;
  status: string;
  description?: string;
  level: number;
  levelName: string;
}

interface RequestDetails {
  id: number;
  templateName: string;
  type: string;
  status: string;
  priority: string;
  description: string;
  createdAt: string;
  dueDate?: string;
  user: {
    emp_fname: string;
    emp_lname: string;
    emp_email: string;
    department: string;
  };
  formData: any;
}

interface ApprovalRecord {
  id: string;
  level: number;
  levelName: string;
  approverName: string;
  approverEmail: string;
  status: string;
  actedOn: string | null;
  comments: string | null;
}

interface HistoryRecord {
  id: string;
  action: string;
  actorName: string;
  actorType: string;
  details: string;
  createdAt: string;
}

export default function ApprovalDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const requestId = params?.requestId as string;
  const { data: session } = useSession();
  
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const [requestDetails, setRequestDetails] = useState<RequestDetails | null>(null);
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [allApprovals, setAllApprovals] = useState<any[]>([]); // full list for duplicate detection
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [comments, setComments] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [conversations, setConversations] = useState<{[approvalId: string]: any[]}>({});
  const [conversationLoading, setConversationLoading] = useState<{[approvalId: string]: boolean}>({});
  const [expandedApprovals, setExpandedApprovals] = useState<{[approvalId: string]: boolean}>({});
  const [viewedConversations, setViewedConversations] = useState<{[approvalId: string]: boolean}>({});
  const [showClarificationModal, setShowClarificationModal] = useState(false);
  const [clarificationMessage, setClarificationMessage] = useState('');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  // Mounted ref to prevent state updates after navigation/unmount
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchPendingApprovals();
    }
  }, [session]);

  useEffect(() => {
    if (requestId && pendingApprovals.length > 0) {
      const approval = pendingApprovals.find(a => a.requestId.toString() === requestId);
      if (approval) {
        setSelectedApproval(approval);
        fetchRequestDetails(approval.requestId);
        fetchApprovals(approval.requestId).then(() => {
          // Auto-expand conversations that have clarification status or messages
          fetchHistory(approval.requestId);
        });
      }
    }
  }, [requestId, pendingApprovals]);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/approvals/pending');
      
      if (!response.ok) {
        throw new Error('Failed to fetch pending approvals');
      }

      const data = await response.json();
      setPendingApprovals(data.approvals || []);
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      toast({
        title: "Error",
        description: "Failed to load pending approvals",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRequestDetails = async (reqId: number) => {
    try {
      const response = await fetch(`/api/requests/${reqId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch request details');
      }

      const data = await response.json();
      setRequestDetails(data.request);
    } catch (error) {
      console.error('Error fetching request details:', error);
      toast({
        title: "Error",
        description: "Failed to load request details",
        variant: "destructive"
      });
    }
  };

  const fetchApprovals = async (reqId: number) => {
    try {
      const response = await fetch(`/api/requests/${reqId}/approvals`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch approvals');
      }

  const data = await response.json();
      console.log('Fetched approvals:', data.approvals); // Debug log
  setAllApprovals(data.approvals || []);
      
      // Filter to show only approvals where the current user is the assigned approver
      const userApprovals = data.approvals?.filter((approval: any) => 
        session?.user?.email && approval.approverEmail === session.user.email
      ) || [];
      
      // Further filter to show ONLY the current active approval level for this request.
      // Determine current level: the smallest level in any non-final state (pending/clarification) across ALL approvals.
      const activeStatuses = new Set(['pending approval', 'for clarification', 'pending clarification']);
      const activeLevels = (data.approvals || [])
        .filter((a: any) => activeStatuses.has(normalizeStatus(a.status)))
        .map((a: any) => a.level);
      const currentActiveLevel = activeLevels.length > 0 ? Math.min(...activeLevels) : undefined;

      // Keep only the user's approvals that are both active-status AND at the current active level
      const activeUserApprovals = userApprovals.filter((approval: any) => {
        const st = normalizeStatus(approval.status);
        return activeStatuses.has(st) && (currentActiveLevel === undefined || approval.level === currentActiveLevel);
      });
      
      console.log('User-specific approvals:', userApprovals); // Debug log
      console.log('Active user approvals:', activeUserApprovals); // Debug log
      setApprovals(activeUserApprovals);

      // Auto-expand conversations for approvals that need clarification or have messages
  const approvalsWithClarification = activeUserApprovals.filter((approval: any) => {
        const st = normalizeStatus(approval.status);
        return st === 'for clarification' || st === 'pending clarification';
      });

      if (approvalsWithClarification.length > 0) {
        const expansions: {[key: string]: boolean} = {};
        for (const approval of approvalsWithClarification) {
          expansions[approval.id] = true;
          // Load conversations for these approvals
          await fetchConversations(approval.id);
        }
        setExpandedApprovals(prev => ({ ...prev, ...expansions }));
      }

  // Load conversations for current user's active approvals (current level only)
  for (const approval of activeUserApprovals) {
        await fetchConversations(approval.id);
      }

      // Attempt auto-approve for duplicate approvers in later levels (system-like behavior)
      try {
        await maybeAutoApproveDuplicates(data.approvals || []);
      } catch (e) {
        console.warn('Auto-approve duplicates skipped:', e);
      }
    } catch (error) {
      console.error('Error fetching approvals:', error);
    }
  };

  // Guard to avoid concurrent auto-approve runs; allows sequential runs after refresh
  const [autoApproveInProgress, setAutoApproveInProgress] = useState(false);

  // Detect and auto-approve ONLY the immediate next level where the approver already approved in a previous level
  const maybeAutoApproveDuplicates = async (all: any[]) => {
    if (autoApproveInProgress || !Array.isArray(all) || all.length === 0) return;
    // Build map of approver -> lowest approved level
    const keyOf = (a: any) => (a.approverEmail || a.approver?.emp_email || a.approverId || a.approverName || '').toString().toLowerCase();
    const approvedByApprover: Record<string, number> = {};
    for (const a of all) {
      if (normalizeStatus(a.status) === 'approved') {
        const k = keyOf(a);
        if (!k) continue;
        if (!(k in approvedByApprover) || a.level < approvedByApprover[k]) {
          approvedByApprover[k] = a.level;
        }
      }
    }

    // Determine the next active approval level (smallest level currently pending)
    const pending = all.filter(a => normalizeStatus(a.status) === 'pending approval');
    if (pending.length === 0) return;
    const nextLevel = Math.min(...pending.map(a => a.level));

    // Candidates: only pending approvals at the next level whose approver previously approved a lower level
    const duplicates = pending.filter(a => {
      if (a.level !== nextLevel) return false;
      const k = keyOf(a);
      if (!k) return false;
      const prev = approvedByApprover[k];
      return typeof prev === 'number' && prev < a.level;
    });

    if (duplicates.length === 0) return;
    setAutoApproveInProgress(true);

    // Try to approve each duplicate approval record
    const note = 'Auto approved by System since the approver has already approved in one of the previous levels.';
    await Promise.all(duplicates.map(async (a) => {
      try {
        const res = await fetch('/api/approvals/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approvalId: a.id, action: 'approve', comments: note })
        });
        if (!res.ok) {
          // Ignore errors silently to avoid blocking other updates
          console.warn('Auto-approve failed for', a.id);
        }
      } catch (e) {
        console.warn('Auto-approve error for', a.id, e);
      }
    }));

    // Refresh approvals and history to reflect changes
    if (selectedApproval) {
      await fetchApprovals(selectedApproval.requestId);
      await fetchHistory(selectedApproval.requestId);
    }
    toast({
      title: 'Auto-approved duplicates',
      description: `${duplicates.length} approval(s) auto-approved`,
    });
    setAutoApproveInProgress(false);
  };

  const fetchHistory = async (reqId: number) => {
    try {
      const response = await fetch(`/api/requests/${reqId}/history`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }

      const data = await response.json();
      setHistory(data.history || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const fetchConversations = async (approvalId: string) => {
    if (conversationLoading[approvalId]) return;

    try {
      setConversationLoading(prev => ({ ...prev, [approvalId]: true }));
      const response = await fetch(`/api/approvals/${approvalId}/conversations`);
      
      if (response.ok) {
        const data = await response.json();
        const newConversations = data.conversations || [];
        
        // Get current conversations
        const currentConversations = conversations[approvalId] || [];
        
        // If this is the first time loading conversations, don't show notifications
        // Only show notifications for truly new messages after initial load
        if (currentConversations.length === 0) {
          // First load - mark as viewed to prevent showing notifications for existing messages
          setViewedConversations(prev => ({
            ...prev,
            [approvalId]: true
          }));
        } else {
          // Check if there are truly new messages from requester that we haven't seen before
          const newRequesterMessages = newConversations.filter((conv: any) => 
            (conv.type === 'requester' || conv.type === 'user') && 
            !currentConversations.find((existing: any) => 
              existing.timestamp === conv.timestamp && 
              existing.message === conv.message &&
              existing.author === conv.author
            )
          );
          
          // Only mark as unviewed if there are actually new requester messages
          if (newRequesterMessages.length > 0) {
            setViewedConversations(prev => ({
              ...prev,
              [approvalId]: false
            }));
          }
        }
        
        setConversations(prev => ({
          ...prev,
          [approvalId]: newConversations
        }));
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setConversationLoading(prev => ({ ...prev, [approvalId]: false }));
    }
  };

  const handleSendConversationMessage = async (approvalId: string, message: string) => {
    if (!message.trim()) return;

    try {
      const response = await fetch(`/api/approvals/${approvalId}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.trim(),
          type: 'technician',
          isClarificationRequest: false
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update conversations state
        setConversations(prev => ({
          ...prev,
          [approvalId]: [...(prev[approvalId] || []), data.conversation]
        }));
        
        toast({
          title: "Message sent",
          description: "Your message has been added to the conversation",
        });
        
        // Refresh the request details to update history
        if (requestDetails) {
          await fetchRequestDetails(requestDetails.id);
          await fetchHistory(requestDetails.id);
        }
      } else {
        throw new Error('Failed to send message');
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

  const handleSendConversationMessageForSelectedApproval = async () => {
    if (!selectedApproval || !comments.trim()) return;

    await handleSendConversationMessage(selectedApproval.id, comments.trim());
    setComments(''); // Clear the input after sending
  };

  const toggleConversation = async (approvalId: string) => {
    const wasExpanded = expandedApprovals[approvalId];
    
    setExpandedApprovals(prev => ({
      ...prev,
      [approvalId]: !prev[approvalId]
    }));

    // Load conversations if expanding and not already loaded
    if (!wasExpanded && !conversations[approvalId]) {
      await fetchConversations(approvalId);
    }
    
    // Mark conversation as viewed when expanding (reading messages)
    if (!wasExpanded) {
      setViewedConversations(prev => ({
        ...prev,
        [approvalId]: true
      }));
      
      // Scroll to latest message after a brief delay to ensure content is rendered
      setTimeout(() => {
        const conversationPanel = document.querySelector(`[data-conversation-id="${approvalId}"]`);
        if (conversationPanel) {
          conversationPanel.scrollTop = conversationPanel.scrollHeight;
        }
      }, 100);
    }
  };

  const handleRequestSelect = (approval: PendingApproval) => {
    router.push(`/requests/approvals/${approval.requestId}`);
  };

  const filteredApprovals = pendingApprovals.filter(approval =>
    approval.requestTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    approval.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    approval.requestId.toString().includes(searchTerm)
  );

  const handleClarificationRequest = async () => {
    if (!selectedApproval || !clarificationMessage.trim()) return;

    try {
      setActionLoading('clarification');
      
      // First, update the approval status to for_clarification
      const statusResponse = await fetch('/api/approvals/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approvalId: selectedApproval.id,
          action: 'clarification',
          comments: undefined, // Don't add to request comments
        }),
      });

      if (!statusResponse.ok) {
        const errorData = await statusResponse.json();
        throw new Error(errorData.error || 'Failed to update approval status');
      }

      // Then, create a conversation message
      const conversationResponse = await fetch(`/api/approvals/${selectedApproval.id}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: clarificationMessage.trim(),
          type: 'approver',
          isClarificationRequest: true
        }),
      });

      if (!conversationResponse.ok) {
        throw new Error('Failed to create conversation message');
      }

      const conversationData = await conversationResponse.json();
      
      // Update conversations state
      setConversations(prev => ({
        ...prev,
        [selectedApproval.id]: [...(prev[selectedApproval.id] || []), conversationData.conversation]
      }));

      // Auto-expand the conversation to show the new message
      setExpandedApprovals(prev => ({
        ...prev,
        [selectedApproval.id]: true
      }));

      // Scroll to latest message after a brief delay
      setTimeout(() => {
        const conversationPanel = document.querySelector(`[data-conversation-id="${selectedApproval.id}"]`);
        if (conversationPanel) {
          conversationPanel.scrollTop = conversationPanel.scrollHeight;
        }
      }, 200);

      toast({
        title: "Clarification Requested",
        description: "Your clarification request has been sent to the requester",
      });

      // Navigate back to the approvals list to avoid intermediate re-renders
      router.replace('/requests/approvals');
      return;
      
    } catch (error) {
      console.error('Error requesting clarification:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to request clarification",
        variant: "destructive"
      });
    } finally {
      if (isMounted.current) setActionLoading(null);
    }
  };

  const handleApprovalAction = async (action: 'approve' | 'reject' | 'clarification') => {
    if (!selectedApproval) return;

    try {
      setActionLoading(action);
      
      // Generate system message if no comment provided
      let finalComment = approvalComment.trim();
      
      if (!finalComment) {
        if (action === 'approve') {
          finalComment = `Request approved by ${session?.user?.name || 'Approver'} on ${new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}`;
        } else if (action === 'reject') {
          // For reject, this shouldn't happen as comment is mandatory
          finalComment = `Request rejected by ${session?.user?.name || 'Approver'} on ${new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}`;
        }
      }
      
      const response = await fetch('/api/approvals/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approvalId: selectedApproval.id,
          action,
          comments: finalComment || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process approval');
      }

      const actionText = action === 'approve' ? 'approved' : 
                        action === 'reject' ? 'rejected' : 
                        'sent for clarification';

      toast({
        title: "Success",
        description: `Request ${actionText} successfully`,
      });

      // Navigate immediately to approvals list to avoid transient UI churn
      router.replace('/requests/approvals');
      return;
      
    } catch (error) {
      console.error('Error processing approval:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process approval",
        variant: "destructive"
      });
    } finally {
      if (isMounted.current) setActionLoading(null);
    }
  };

  // Format DB timestamp string without timezone conversion.
  // Supports: "YYYY-MM-DD HH:mm[:ss]", "YYYY/MM/DD HH:mm[:ss]", and ISO-like strings; ignores trailing timezone markers like 'Z' or offsets.
  const formatDbTimestampDisplay = (
    input: string | null | undefined,
    opts?: { shortFormat?: boolean; dateOnly?: boolean }
  ): string => {
    if (!input) return '-';
    const raw = String(input).trim();

    // Normalize common ISO separators but avoid actual Date parsing to prevent TZ conversion
    const normalized = raw
      .replace('T', ' ')
      .replace(/Z$/, '')
      // Drop timezone offsets like +08:00 or -0500 if present
      .replace(/[\+\-]\d{2}:?\d{2}$/i, '');

    const match = normalized.match(/(\d{4})[-\/](\d{2})[-\/](\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (!match) {
      return raw; // Fallback to raw if unknown format
    }

    const [, yStr, mStr, dStr, hhStr, mmStr] = match;
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10); // 1-12
    const day = parseInt(dStr, 10);
    const hasTime = hhStr !== undefined && mmStr !== undefined;

    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthLabel = monthsShort[Math.max(0, Math.min(11, month - 1))];

    const datePart = `${monthLabel} ${day}, ${year}`;

    if (opts?.dateOnly || !hasTime) return datePart;

    let hour = parseInt(hhStr!, 10);
    const minute = parseInt(mmStr!, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;
    const hh = hour.toString().padStart(2, '0');
    const mi = minute.toString().padStart(2, '0');

    // Match en-US "Mon DD, YYYY, hh:mm AM/PM"
    return `${datePart}, ${hh}:${mi} ${ampm}`;
  };

  const formatDate = (dateString: string) => {
    return formatDbTimestampDisplay(dateString, { shortFormat: true });
  };

  // Normalize approval status strings to a consistent set for safe rendering
  const normalizeStatus = (val: unknown): string => {
    if (!val) return 'pending approval';
    const s = String(val).trim().toLowerCase().replace(/[_-]+/g, ' ');
    if (s.includes('reject')) return 'rejected';
    if (s.includes('approve') && !s.includes('pending')) return 'approved';
    if (s.includes('pending clarification')) return 'pending clarification';
    if (s.includes('for clarification')) return 'for clarification';
    if (s.includes('pending')) return 'pending approval';
    return s || 'pending approval';
  };

  const titleCaseStatus = (s: string): string => {
    const n = normalizeStatus(s);
    return n.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const getApprovalStatusDisplay = () => {
    if (!requestDetails) return { text: 'Pending Approval', color: getApprovalStatusColor('pending approval') };
    
    // Check the overall request approval status first
    const formData = requestDetails.formData || {};
    const overallApprovalStatus = normalizeStatus(formData['5'] || 'pending approval');
    
    // If all approvals are complete, show the overall status
    if (overallApprovalStatus === 'approved') {
      return { text: 'Approved', color: getApprovalStatusColor('approved') };
    }
    
    // If there's a selected approval, show its specific status with more context
    if (selectedApproval) {
      const norm = normalizeStatus(selectedApproval.status);
      if (norm === 'for clarification' || norm === 'pending clarification') {
        return { text: 'For Clarification', color: getApprovalStatusColor('for clarification') };
      }
      if (norm === 'approved') {
        return { text: 'Level Approved', color: getApprovalStatusColor('approved') };
      }
      if (norm === 'rejected') {
        return { text: 'Rejected', color: getApprovalStatusColor('rejected') };
      }
      return { text: 'Pending Approval', color: getApprovalStatusColor('pending approval') };
    }
    
    // Fallback to overall status from formData
    switch (overallApprovalStatus) {
      case 'approved':
        return { text: 'Approved', color: getApprovalStatusColor('approved') };
      case 'rejected':
        return { text: 'Rejected', color: getApprovalStatusColor('rejected') };
      case 'for clarification':
        return { text: 'For Clarification', color: getApprovalStatusColor('for clarification') };
      default:
        return { text: 'Pending Approval', color: getApprovalStatusColor('pending approval') };
    }
  };

  const getDescriptionContent = () => {
    if (!requestDetails) return '<p class="text-gray-500 italic">No description provided</p>';
    
    // Try to find description from multiple possible field names and numbered fields
    const formData = requestDetails.formData || {};
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
    
    // Also check the main description field if exists
    if (!description && requestDetails.description) {
      description = requestDetails.description;
    }
    
    if (description && description.trim()) {
      return description;
    }
    
    return '<p class="text-gray-500 italic">No description provided</p>';
  };

  const getTechnicianInfo = () => {
    if (!requestDetails) return 'Not Assigned';
    
    const formData = requestDetails.formData || {};
    
    // Check for auto-assigned technician info first
    if (formData.assignedTechnicianName && formData.assignedTechnicianEmail) {
      const autoAssignInfo = formData.loadBalanceType ? ` (Auto-assigned via ${formData.loadBalanceType} load balancing)` : ' (Auto-assigned)';
      return `${formData.assignedTechnicianName} (${formData.assignedTechnicianEmail})${autoAssignInfo}`;
    }
    
    // Check various possible technician field names
    const technicianFields = [
      'assignedTechnician', 'technician', 'technicianName', 'assigned_technician',
      'technician_name', 'technicianEmail', 'assignedTo', 'assigned_to',
      'Technician', 'AssignedTechnician', 'TechnicianName'
    ];
    
    for (const field of technicianFields) {
      if (formData[field] && formData[field].trim()) {
        return formData[field];
      }
    }
    
    // Check numbered fields for technician info
    for (const [key, value] of Object.entries(formData)) {
      if (value && typeof value === 'string' && value.trim()) {
        // Look for email patterns or names that might be technicians
        if (value.includes('@') && value.includes('.')) {
          return value; // Likely an email
        }
        // Look for fields that contain names (first name + last name pattern)
        if (value.includes(' ') && value.length > 5 && value.length < 50 && 
            !value.includes('\n') && !/<[^>]*>/g.test(value)) {
          // Check if it looks like a person's name
          const words = value.trim().split(' ');
          if (words.length >= 2 && words.every(word => /^[A-Za-z]+$/.test(word))) {
            return value;
          }
        }
      }
    }
    
    return 'Not Assigned';
  };

  if (!session?.user) {
    return (
      <SessionWrapper>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
          <Card className="w-96">
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
              <p className="text-gray-600 mb-4">Please sign in to access approvals.</p>
              <Button onClick={() => router.push('/login')}>
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </SessionWrapper>
    );
  }

  return (
    <SessionWrapper>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => router.push('/requests/approvals')}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Approvals
                </Button>
                <div className="h-6 w-px bg-gray-300"></div>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">Request Approval</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    {pendingApprovals.length} pending approval{pendingApprovals.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="p-6">
          <div className="grid grid-cols-12 gap-6">
            {/* Left Panel - Approvals List */}
            <div className="col-span-4">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">REQUESTS</CardTitle>
                      {pendingApprovals.length > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-xs text-red-600 font-medium">
                            {pendingApprovals.length}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Search */}
                  <div className="relative mt-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search Approvals"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </CardHeader>
                
                <CardContent className="p-0">
                  <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                    {filteredApprovals.length === 0 ? (
                      <div className="p-6 text-center">
                        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">
                          {pendingApprovals.length === 0 ? 'No pending approvals' : 'No approvals match your search'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {filteredApprovals.map((approval) => (
                          <div
                            key={approval.id}
                            className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                              selectedApproval?.id === approval.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                            }`}
                            onClick={() => handleRequestSelect(approval)}
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center flex-shrink-0 mt-1">
                                <ShoppingCart className="h-3 w-3 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-gray-500">
                                    Request ID - #{approval.requestId}
                                  </p>
                                </div>
                                <h3 className="font-medium text-gray-900 text-sm truncate mt-1">
                                  {approval.requestTitle}
                                </h3>
                                <p className="text-xs text-gray-600 mt-1">
                                  by {approval.requesterName} on {formatDbTimestampDisplay(approval.createdDate, { shortFormat: true })}
                                </p>
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-xs text-gray-500">
                                    DueBy: {approval.dueDate ? formatDbTimestampDisplay(approval.dueDate, { dateOnly: true }) : 'N/A'}
                                  </span>
                                </div>
                                <div className="mt-2">
                                  <Button
                                    size="sm"
                                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRequestSelect(approval);
                                    }}
                                  >
                                    Take Action
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Panel - Request Details */}
            <div className="col-span-8">
              {selectedApproval && requestDetails ? (
                <div className="space-y-6">
                  {/* Request Overview Card */}
                  <Card>
                    <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <ShoppingCart className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <CardTitle className="text-xl font-semibold text-gray-900">
                              #{requestDetails.id} {requestDetails.templateName}
                            </CardTitle>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                              <span className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                {requestDetails.user.emp_fname} {requestDetails.user.emp_lname}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {formatDate(requestDetails.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={getApprovalStatusDisplay().color}>
                            <Clock className="h-3 w-3 mr-1" />
                            {getApprovalStatusDisplay().text}
                          </Badge>
                          <Badge className={getPriorityColor(requestDetails.formData?.['2'] || requestDetails.priority || 'medium')}>
                            {(requestDetails.formData?.['2'] || requestDetails.priority || 'medium').charAt(0).toUpperCase() + (requestDetails.formData?.['2'] || requestDetails.priority || 'medium').slice(1)} Priority
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="p-6">
                      <div className="space-y-6">
                        {/* Description */}
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <div className="w-1 h-5 bg-blue-600 rounded"></div>
                            Description
                          </h3>
                          <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                            <div className="prose prose-sm max-w-none">
                              {(() => {
                                const description = getDescriptionContent();
                                
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
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Request Details Grid */}
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <div className="w-1 h-5 bg-blue-600 rounded"></div>
                            Request Details
                          </h3>
                          <div className="grid grid-cols-2 gap-6 text-sm">
                            <div className="space-y-4">
                              <div className="bg-white p-3 rounded-lg border border-gray-100">
                                <label className="font-medium text-gray-700 text-xs uppercase tracking-wide">Request Type</label>
                                <p className="text-gray-900 mt-1 capitalize">{requestDetails.type}</p>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-gray-100">
                                <label className="font-medium text-gray-700 text-xs uppercase tracking-wide">Mode</label>
                                <p className="text-gray-900 mt-1">Self-Service Portal</p>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-gray-100">
                                <label className="font-medium text-gray-700 text-xs uppercase tracking-wide">Service Category</label>
                                <p className="text-gray-900 mt-1">Special Projects</p>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-gray-100">
                                <label className="font-medium text-gray-700 text-xs uppercase tracking-wide">Department</label>
                                <p className="text-gray-900 mt-1">{requestDetails.user.department || 'Information Technology'}</p>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-gray-100">
                                <label className="font-medium text-gray-700 text-xs uppercase tracking-wide">Created Date</label>
                                <p className="text-gray-900 mt-1">{formatDate(requestDetails.createdAt)}</p>
                              </div>
                              {/* <div className="bg-white p-3 rounded-lg border border-gray-100">
                                <label className="font-medium text-gray-700 text-xs uppercase tracking-wide">Last Update Time</label>
                                <p className="text-gray-900 mt-1">{formatDate(requestDetails.updatedAt)}</p>
                              </div> */}
                            </div>
                            
                            <div className="space-y-4">
                              <div className="bg-white p-3 rounded-lg border border-gray-100">
                                <label className="font-medium text-gray-700 text-xs uppercase tracking-wide">E-mail Id(s) To Notify</label>
                                <p className="text-gray-900 mt-1">
                                  {requestDetails.user.emp_email}
                                  {requestDetails.formData?.notifyEmails && (
                                    <><br /><span className="text-sm text-gray-600">Additional: {requestDetails.formData.notifyEmails}</span></>
                                  )}
                                </p>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-gray-100">
                                <label className="font-medium text-gray-700 text-xs uppercase tracking-wide">Status</label>
                                <div className="mt-1 space-y-2">
                                  <Badge className={getStatusColor(requestDetails.status)}>
                                    {requestDetails.status.replace('_', ' ')}
                                  </Badge>
                                  {requestDetails.status === 'open' && requestDetails.formData?.slaDueDate && (
                                    <div className="text-xs text-gray-600">
                                      <span className="font-medium">SLA Active:</span> Priority-based due date calculated
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-gray-100">
                                <label className="font-medium text-gray-700 text-xs uppercase tracking-wide">Technician</label>
                                <div className="mt-1 space-y-2">
                                  <p className="text-gray-900">
                                    {getTechnicianInfo()}
                                  </p>
                                  {requestDetails.formData?.assignedTechnicianName && requestDetails.formData?.supportGroupName && (
                                    <div className="text-xs text-gray-600">
                                      <span className="font-medium">Support Group:</span> {requestDetails.formData.supportGroupName}
                                      {requestDetails.formData.loadBalanceType && (
                                        <><br /><span className="font-medium">Assignment Method:</span> {requestDetails.formData.loadBalanceType} load balancing</>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-gray-100">
                                <label className="font-medium text-gray-700 text-xs uppercase tracking-wide">Category</label>
                                <p className="text-gray-900 mt-1">Special Projects</p>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-gray-100">
                                <label className="font-medium text-gray-700 text-xs uppercase tracking-wide">Created By</label>
                                <p className="text-gray-900 mt-1">{requestDetails.user.emp_fname} {requestDetails.user.emp_lname}</p>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-gray-100">
                                <label className="font-medium text-gray-700 text-xs uppercase tracking-wide">Template</label>
                                <p className="text-gray-900 mt-1">{requestDetails.templateName}</p>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-gray-100">
                                <label className="font-medium text-gray-700 text-xs uppercase tracking-wide">DueBy Date</label>
                                <div className="mt-1">
                                  {(() => {
                                    // Check for SLA due date in formData first (newly calculated)
                                    const formData = requestDetails.formData as any || {};
                                    const slaDueDate = formData.slaDueDate;
                                    const slaHours = formData.slaHours;
                                    
                                    if (slaDueDate && requestDetails.status === 'open') {
                                      const dueDate = new Date(slaDueDate);
                                      const now = new Date();
                                      const timeRemaining = dueDate.getTime() - now.getTime();
                                      const isOverdue = timeRemaining < 0;
                                      const hoursRemaining = Math.abs(Math.floor(timeRemaining / (1000 * 60 * 60)));
                                      const minutesRemaining = Math.abs(Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60)));
                                      
                                      return (
                                        <div className="space-y-2">
                                          <p className={`text-sm font-medium ${isOverdue ? 'text-red-600' : timeRemaining < 4 * 60 * 60 * 1000 ? 'text-amber-600' : 'text-green-600'}`}>
                                            {formatDbTimestampDisplay(slaDueDate, { shortFormat: true })}
                                          </p>
                                          <div className="flex items-center gap-2">
                                            <Badge 
                                              variant={isOverdue ? "destructive" : timeRemaining < 4 * 60 * 60 * 1000 ? "secondary" : "default"}
                                              className="text-xs"
                                            >
                                              SLA: {slaHours}h
                                            </Badge>
                                            <span className={`text-xs font-medium ${isOverdue ? 'text-red-600' : timeRemaining < 4 * 60 * 60 * 1000 ? 'text-amber-600' : 'text-gray-600'}`}>
                                              {isOverdue ? 'OVERDUE' : `${hoursRemaining}h ${minutesRemaining}m left`}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    } else {
                                      // Fallback to regular due date or placeholder
                                      return (
                                        <p className="text-gray-900">
                                          {requestDetails.dueDate ? formatDbTimestampDisplay(requestDetails.dueDate, { dateOnly: true }) : '-'}
                                        </p>
                                      );
                                    }
                                  })()}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>



                  {/* Approver Conversations - Only show if there are active conversations */}
                  {approvals.some((approval) => 
                    session?.user?.email && approval.approverEmail === session.user.email &&
                    conversations[approval.id] && conversations[approval.id].length > 0
                  ) && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <MessageSquare className="h-5 w-5 text-blue-600" />
                          Approver Conversations
                        </CardTitle>
                      </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {approvals.length > 0 ? (
                          approvals
                            .filter((approval) => {
                              // Only show conversations for approvals where current user is the approver
                              return session?.user?.email && approval.approverEmail === session.user.email;
                            }).length > 0 ? (
                          approvals
                            .filter((approval) => {
                              // Only show conversations for approvals where current user is the approver
                              return session?.user?.email && approval.approverEmail === session.user.email;
                            })
                            .map((approval) => (
                            <div key={approval.id} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-xs font-medium text-blue-600">{approval.level}</span>
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-900">{approval.levelName}</h4>
                                    <p className="text-xs text-gray-500">{approval.approverName}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {(() => {
                                    const norm = normalizeStatus(approval.status);
                                    return (
                                      <Badge className={getApprovalStatusColor(norm)}>
                                        {titleCaseStatus(norm)}
                                      </Badge>
                                    );
                                  })()}
                                  
                                  {/* Message Count and Notification - Only show if there are unread messages */}
                                  {conversations[approval.id] && conversations[approval.id].length > 0 && (
                                    (() => {
                                      // Only show notification if conversation hasn't been viewed and has messages from requester
                                      const requesterMessages = conversations[approval.id].filter((conv: any) => 
                                        conv.type === 'requester' || conv.type === 'user'
                                      );
                                      const hasRequesterMessages = requesterMessages.length > 0;
                                      const isUnviewed = !viewedConversations[approval.id];
                                      
                                      return hasRequesterMessages && isUnviewed ? (
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                            {requesterMessages.length} unread message{requesterMessages.length !== 1 ? 's' : ''}
                                          </Badge>
                                        </div>
                                      ) : null;
                                    })()
                                  )}

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleConversation(approval.id)}
                                    className="h-8 w-8 p-0 relative"
                                  >
                                    <MessageSquare className="h-4 w-4" />
                                    {/* Only show blue dot for unread messages from requester that haven't been viewed */}
                                    {conversations[approval.id] && 
                                     conversations[approval.id].some((conv: any) => conv.type === 'requester' || conv.type === 'user') && 
                                     !viewedConversations[approval.id] && (
                                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></span>
                                    )}
                                  </Button>
                                </div>
                              </div>
                              
                              {/* Conversation Panel */}
                              {expandedApprovals[approval.id] && (
                                <div className="mt-4 space-y-3">
                                  {/* Conversation Messages */}
                                  <div 
                                    className="bg-gray-50 rounded-lg p-3 max-h-64 overflow-y-auto"
                                    data-conversation-id={approval.id}
                                  >
                                    {conversationLoading[approval.id] ? (
                                      <div className="text-center py-4">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                                        <p className="text-sm text-gray-500 mt-2">Loading conversation...</p>
                                      </div>
                                    ) : conversations[approval.id] && conversations[approval.id].length > 0 ? (
                                      <div className="space-y-3">
                                        {conversations[approval.id].map((conv: any, index: number) => (
                                          <div
                                            key={index}
                                            className={`flex ${
                                              conv.type === 'requester' || conv.type === 'user'
                                                ? 'justify-start' // Requester messages on left
                                                : 'justify-end'   // Approver messages on right
                                            }`}
                                          >
                                            <div
                                              className={`p-3 rounded-lg max-w-xs ${
                                                conv.type === 'requester' || conv.type === 'user'
                                                  ? 'bg-gray-200 text-gray-800 text-left' // Requester: gray, left-aligned
                                                  : 'bg-blue-500 text-white text-right' // Approver: blue, right-aligned
                                              }`}
                                            >
                                              <div className="flex items-center justify-between mb-1">
                                                <span className={`text-xs font-medium ${
                                                  conv.type === 'requester' || conv.type === 'user'
                                                    ? 'text-gray-900' // Dark text for gray background
                                                    : 'text-white' // White text for blue background
                                                }`}>
                                                  {conv.author}
                                                </span>
                                                <span className={`text-xs ml-2 ${
                                                  conv.type === 'requester' || conv.type === 'user'
                                                    ? 'text-gray-500' // Gray text for gray background
                                                    : 'text-blue-100' // Light blue text for blue background
                                                }`}>
                                                  {formatDbTimestampDisplay(conv.timestamp, { shortFormat: true })}
                                                </span>
                                              </div>
                                              <p className={`text-sm ${
                                                conv.type === 'requester' || conv.type === 'user'
                                                  ? 'text-gray-700' // Dark text for gray background
                                                  : 'text-white' // White text for blue background
                                              }`}>{conv.message}</p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-center py-6">
                                        <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500 mb-3">No conversation yet</p>
                                        {(() => {
                                          const st = normalizeStatus(approval.status);
                                          return st === 'for clarification' || st === 'pending clarification';
                                        })() ? (
                                          <div className="text-sm text-orange-600 mb-3 font-medium">
                                            ⚠️ Clarification Requested
                                          </div>
                                        ) : null}
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            // Focus on the message input for this approval
                                            const textarea = document.querySelector(`[data-approval-id="${approval.id}"]`) as HTMLTextAreaElement;
                                            if (textarea) {
                                              textarea.focus();
                                              textarea.placeholder = 'Start a new clarification conversation...';
                                            }
                                          }}
                                          className="border-dashed border-blue-300 text-blue-600 hover:bg-blue-50"
                                        >
                                          + New Clarification
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Message Input */}
                                  <ApprovalMessageInput
                                    approvalId={approval.id}
                                    onSendMessage={handleSendConversationMessage}
                                  />
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-6 text-gray-500">
                            <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p>No conversations available for your approval level</p>
                            <p className="text-xs mt-1">You can only see conversations for approvals assigned to you</p>
                          </div>
                        )) : (
                          <div className="text-center py-6 text-gray-500">
                            <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p>No approval levels found for this request</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  )}

                  {/* Action Buttons */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex gap-4">
                        <Button
                          onClick={() => setShowApprovalModal(true)}
                          disabled={actionLoading !== null}
                          className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                          size="lg"
                        >
                          <CheckCircle className="h-5 w-5 mr-2" />
                          Approve Request
                        </Button>
                        
                        <Button
                          variant="destructive"
                          onClick={() => setShowRejectModal(true)}
                          disabled={actionLoading !== null}
                          className="px-8 py-3 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                          size="lg"
                        >
                          <X className="h-5 w-5 mr-2" />
                          Reject Request
                        </Button>
                        
                        {/* Only show Need Clarification button if approval status is NOT for_clarification */}
                        {(() => {
                          if (!selectedApproval) return false;
                          const st = normalizeStatus(selectedApproval.status);
                          return !(st === 'for clarification' || st === 'pending clarification');
                        })() && (
                          <Button
                            variant="outline"
                            onClick={() => setShowClarificationModal(true)}
                            disabled={actionLoading !== null}
                            className="px-8 py-3 text-base font-medium border-2 border-sky-600 text-sky-600 hover:bg-sky-50 shadow-lg hover:shadow-xl transition-all duration-200"
                            size="lg"
                          >
                            <AlertCircle className="h-5 w-5 mr-2" />
                            Need Clarification
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card className="h-full">
                  <CardContent className="flex items-center justify-center h-full">
                    <div className="text-center">
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                          <p className="text-gray-500">Loading request details...</p>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">Select a request to take action</p>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Clarification Modal */}
        <Dialog open={showClarificationModal} onOpenChange={setShowClarificationModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-sky-500" />
                Request Clarification
              </DialogTitle>
              <DialogDescription>
                Send a clarification request to the requester. This message will be added to the conversation.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Clarification Message
                </label>
                <Textarea
                  placeholder="What additional information do you need from the requester?"
                  value={clarificationMessage}
                  onChange={(e) => setClarificationMessage(e.target.value)}
                  className="min-h-[100px] text-sm resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      if (clarificationMessage.trim()) {
                        handleClarificationRequest();
                      }
                    }
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">Press Ctrl+Enter to send</p>
              </div>
              
              <div className="bg-sky-50 border border-sky-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-sky-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-sky-800">
                    <p className="font-medium">Note:</p>
                    <ul className="mt-1 space-y-1 text-xs">
                      <li>• This will change the approval status to "For Clarification"</li>
                      <li>• The request status will remain "For Approval"</li>
                      <li>• A conversation will be started with the requester</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowClarificationModal(false);
                  setClarificationMessage('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleClarificationRequest}
                disabled={!clarificationMessage.trim() || actionLoading === 'clarification'}
                className="bg-sky-600 hover:bg-sky-700"
              >
                {actionLoading === 'clarification' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Send Clarification Request
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Approval Modal */}
        <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Approve Request
              </DialogTitle>
              <DialogDescription>
                You are about to approve this request. Comments are optional.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Approval Comments (Optional)
                </label>
                <Textarea
                  placeholder="Add any comments about this approval..."
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  className="min-h-[100px] text-sm resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleApprovalAction('approve');
                    }
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">Press Ctrl+Enter to approve</p>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-green-800">
                    <p className="font-medium">Note:</p>
                    <ul className="mt-1 space-y-1 text-xs">
                      <li>• This will approve the request and move to the next level</li>
                      <li>• If no comment is provided, a system message will be generated</li>
                      <li>• The requester will be notified of the approval</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowApprovalModal(false);
                  setApprovalComment('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleApprovalAction('approve')}
                disabled={actionLoading === 'approve'}
                className="bg-green-600 hover:bg-green-700"
              >
                {actionLoading === 'approve' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Request
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Modal */}
        <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <X className="h-5 w-5 text-red-500" />
                Reject Request
              </DialogTitle>
              <DialogDescription>
                You are about to reject this request. Please provide a reason for rejection.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <Textarea
                  placeholder="Please explain why you are rejecting this request..."
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  className="min-h-[100px] text-sm resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      if (approvalComment.trim()) {
                        handleApprovalAction('reject');
                      }
                    }
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">Press Ctrl+Enter to reject (comment required)</p>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <X className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-800">
                    <p className="font-medium">Warning:</p>
                    <ul className="mt-1 space-y-1 text-xs">
                      <li>• This will reject the request permanently</li>
                      <li>• A rejection reason is required</li>
                      <li>• The requester will be notified of the rejection</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectModal(false);
                  setApprovalComment('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleApprovalAction('reject')}
                disabled={!approvalComment.trim() || actionLoading === 'reject'}
              >
                {actionLoading === 'reject' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Reject Request
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SessionWrapper>
  );
}
