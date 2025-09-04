"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams, useSearchParams, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import { 
  ArrowLeft, 
  Clock, 
  AlertCircle, 
  AlertTriangle,
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
  X,
  ChevronDown,
  ChevronUp,
  Upload,
  Plus,
  Info,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { Search as SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SessionWrapper } from '@/components/session-wrapper';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { getStatusColor, getApprovalStatusColor, getPriorityColor, normalizeApprovalStatus } from '@/lib/status-colors';
import { getApiTimestamp } from '@/lib/time-utils';

// Display timestamp in Asia/Manila (PHT) when source has timezone (ISO/Z);
// if it's a plain 'YYYY-MM-DD HH:mm:ss' assume already PHT.
function parseDbTimestamp(input?: string | null) {
  if (!input) return null;
  const s = String(input).trim();
  let dateStr = '';
  let timeStr = '';
  if (s.includes('T')) {
    const [d, t] = s.split('T');
    dateStr = d;
    timeStr = (t || '').replace('Z', '').replace(/\..+$/, '');
  } else if (s.includes(' ')) {
    const [d, ...rest] = s.split(' ');
    dateStr = d;
    timeStr = rest.join(' ').replace(/\..+$/, '');
  } else {
    // Fallback if only date is provided
    dateStr = s;
  }
  return { dateStr, timeStr };
}

function formatMonthDayYear(dateStr: string) {
  // Expecting YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mi = Math.max(1, Math.min(12, parseInt(m || '1', 10))) - 1;
  const dd = d?.padStart(2, '0');
  return `${monthNames[mi]} ${dd}, ${y}`;
}

function formatTo12Hour(timeStr: string) {
  // Expecting HH:mm or HH:mm:ss
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  if (h == null || m == null) return timeStr;
  let hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${String(hour).padStart(2, '0')}:${m.padStart(2, '0')} ${ampm}`;
}

function formatDbTimestamp(input?: string | null, opts?: { dateOnly?: boolean; timeOnly?: boolean }) {
  if (!input) return '-';
  
  // Convert UTC timestamp to Philippine time
  const date = new Date(input);
  const philippineTime = date.toLocaleString('en-PH', { 
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  
  if (opts?.dateOnly) {
    const dateOnly = date.toLocaleDateString('en-PH', { 
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'short', 
      day: '2-digit'
    });
    return dateOnly;
  }
  
  if (opts?.timeOnly) {
    const timeOnly = date.toLocaleTimeString('en-PH', { 
      timeZone: 'Asia/Manila',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return timeOnly;
  }
  
  return philippineTime;
}

// Enhanced timestamp formatting with shortFormat support for consistency with approval system
function formatDbTimestampDisplay(
  input: string | null | undefined,
  opts?: { shortFormat?: boolean; dateOnly?: boolean }
): string {
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

  // Format time
  const hour = parseInt(hhStr, 10);
  const minute = parseInt(mmStr, 10);
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const timePart = `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;

  if (opts?.shortFormat) {
    return `${monthLabel} ${day}, ${timePart}`;
  }

  return `${datePart}, ${timePart}`;
}

// Convert HTML content to plain text (for compact table cells)
function htmlToText(html?: string | null) {
  if (!html) return '';
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(html), 'text/html');
    return (doc.body.textContent || '').trim();
  } catch {
    // Fallback: naive strip tags
    return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

// Format file size for display
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(
  () => import('react-quill').then((mod) => mod.default),
  { 
    ssr: false,
    loading: () => <div className="h-32 bg-slate-50 rounded border animate-pulse" />
  }
);

// Rich Text Editor Component
interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  value = '', 
  onChange, 
  placeholder = 'Enter text...', 
  disabled = false,
  className = ''
}) => {
  const [editorKey, setEditorKey] = useState(0);

  // Force re-render when placeholder changes
  useEffect(() => {
    setEditorKey(prev => prev + 1);
  }, [placeholder]);

  // Enhanced modules with more formatting options
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'align': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      ['blockquote', 'code-block'],
      ['link', 'image', 'video'],
      [{ 'direction': 'rtl' }],
      ['clean']
    ],
    clipboard: {
      matchVisual: false,
    }
  };

  const formats = [
    'header', 'font', 'size', 'bold', 'italic', 'underline', 'strike',
    'color', 'background', 'script', 'align', 'list', 'bullet', 'indent',
    'blockquote', 'code-block', 'link', 'image', 'video', 'direction'
  ];

  return (
    <div className={`rich-text-editor ${disabled ? 'disabled' : ''} ${className}`}>
      <ReactQuill
        key={`quill-${editorKey}-${placeholder}`}
        theme="snow"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={disabled}
        modules={disabled ? { toolbar: false } : modules}
        formats={formats}
        style={{
          backgroundColor: disabled ? '#f8fafc' : 'white',
        }}
      />
    </div>
  );
};

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
    landline_no: string;
    local_no: string;
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
  attachments?: Array<string | {
    id: string;
    originalName: string;
    size: number;
    mimeType?: string;
  }>;
}

interface ApprovalLevel {
  id: string;
  level: number;
  name: string;
  status: 'pending_approval' | 'approved' | 'rejected' | 'for_clarification' | 'not_sent';
  approverId?: number; // Added to support filtering users already in approver list
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

// Helper function to determine current approval status from approvals array
function getCurrentApprovalStatus(approvals: ApprovalLevel[]): string {
  if (!approvals || approvals.length === 0) {
    return 'pending approval';
  }

  // Check if any approval is rejected
  const hasRejected = approvals.some(approval => approval.status === 'rejected');
  if (hasRejected) {
    return 'rejected';
  }

  // Check if any approval is for clarification
  const hasForClarification = approvals.some(approval => approval.status === 'for_clarification');
  if (hasForClarification) {
    return 'for_clarification';
  }

  // Check if all approvals are approved
  const allApproved = approvals.every(approval => approval.status === 'approved');
  if (allApproved) {
    return 'approved';
  }

  // Check if any approval is in progress (approved at least one level)
  const hasAnyApproved = approvals.some(approval => approval.status === 'approved');
  if (hasAnyApproved) {
    return 'pending approval'; // Partially approved, still pending
  }

  // Default to pending approval
  return 'pending approval';
}

export default function RequestViewPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [requestData, setRequestData] = useState<RequestData | null>(null);
  const [templateData, setTemplateData] = useState<TemplateData | null>(null);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [resolutionAttachments, setResolutionAttachments] = useState<AttachmentFile[]>([]);
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
  const [collapsedLevels, setCollapsedLevels] = useState<{[level: string]: boolean}>({});
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [noteAttachments, setNoteAttachments] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const noteFileInputRef = useRef<HTMLInputElement>(null);
  const conversationRefs = useRef<{[approvalId: string]: HTMLDivElement | null}>({});
  // Loading states for conversation actions
  const [sendingMessage, setSendingMessage] = useState<{[approvalId: string]: boolean}>({});
  const [sendingClarification, setSendingClarification] = useState<{[approvalId: string]: boolean}>({});
  const [sendingMainReply, setSendingMainReply] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  // Work Logs state (technician-only)
  const [workLogs, setWorkLogs] = useState<any[]>([]);
  const [loadingWorkLogs, setLoadingWorkLogs] = useState(false);
  const [showWorkLogModal, setShowWorkLogModal] = useState(false);
  const [editingWorkLog, setEditingWorkLog] = useState<any | null>(null);
  const [wlOwnerName, setWlOwnerName] = useState('');
  const [wlOwnerId, setWlOwnerId] = useState<number | null>(null);
  const [wlOwnerPickerOpen, setWlOwnerPickerOpen] = useState(false);
  const [techSearch, setTechSearch] = useState('');
  const [techOptions, setTechOptions] = useState<any[]>([]);
  const [techLoading, setTechLoading] = useState(false);
  const [wlStartTime, setWlStartTime] = useState('');
  const [wlEndTime, setWlEndTime] = useState('');
  const [wlHours, setWlHours] = useState('');
  const [wlMinutes, setWlMinutes] = useState('');
  const [wlIncludeNonOp, setWlIncludeNonOp] = useState(false);
  const [wlDescription, setWlDescription] = useState('');
  // Resolution tab state (per provided UI)
  const [resNotes, setResNotes] = useState<string>('');
  const [resFiles, setResFiles] = useState<File[]>([]);
  const [resDragActive, setResDragActive] = useState(false);
  const resFileInputRef = useRef<HTMLInputElement>(null);
  const [resStatus, setResStatus] = useState<string>('open');
  const [resAddWorkLog, setResAddWorkLog] = useState<boolean>(false);
  const [savingResolution, setSavingResolution] = useState(false);
  const [isEditingResolution, setIsEditingResolution] = useState(false);
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<string[]>([]);
  // Resolve modal state
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveFcr, setResolveFcr] = useState(false);
  const [resolveClosureCode, setResolveClosureCode] = useState('');
  const [resolveComments, setResolveComments] = useState('');
  const [savingResolve, setSavingResolve] = useState(false);
  
  // Add approval modal states
  const [showAddApprovalModal, setShowAddApprovalModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [addingApprovers, setAddingApprovers] = useState(false);

  // Edit request states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    priority: '',
    status: '',
    type: '',
    emailNotify: '',
    technician: '',
    template: '',
    category: ''
  });
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [availableTechnicians, setAvailableTechnicians] = useState<any[]>([]);
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<any[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  
  // Email notification states (like in creation form)
  const [emailUsers, setEmailUsers] = useState<any[]>([]);
  const [emailSearch, setEmailSearch] = useState('');
  const [emailSearchResults, setEmailSearchResults] = useState<any[]>([]);
  const [emailInputValue, setEmailInputValue] = useState('');
  
  // Technician states (like in creation form)  
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>('');
  const [technicianSearch, setTechnicianSearch] = useState('');
  const [technicianResults, setTechnicianResults] = useState<any[]>([]);
  const [showTechnicianDropdown, setShowTechnicianDropdown] = useState(false);
  
  // Template dependency states
  const [templatePriority, setTemplatePriority] = useState('');
  const [templateStatus, setTemplateStatus] = useState('');
  
  // Approval modal states
  const [approverSearch, setApproverSearch] = useState('');
  const [approverResults, setApproverResults] = useState<any[]>([]);

  // New action modal states
  const [showChangeTypeModal, setShowChangeTypeModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categoryTemplates, setCategoryTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [assignedTechnician, setAssignedTechnician] = useState('');
  const [newRequestStatus, setNewRequestStatus] = useState('');
  const [slaAction, setSlaAction] = useState(''); // 'start' or 'stop'
  const [isAssigning, setIsAssigning] = useState(false);

  // Change Status modal states
  const [showChangeStatusModal, setShowChangeStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // SLA Timer modal states
  const [showSlaTimerModal, setShowSlaTimerModal] = useState(false);
  const [slaTimerAction, setSlaTimerAction] = useState<'start' | 'stop'>('stop');
  const [slaStopReason, setSlaStopReason] = useState('');
  const [isUpdatingSla, setIsUpdatingSla] = useState(false);

  // Close request loading state
  const [isClosingRequest, setIsClosingRequest] = useState(false);

  // Resolution attachment deletion - mark for deletion (don't delete until save)
  const handleDeleteResolutionAttachment = async (attachmentId: string, attachmentName: string) => {
    if (!confirm(`Are you sure you want to remove "${attachmentName}"? It will be deleted when you save.`)) {
      return;
    }
    
    // Just mark for deletion - don't actually delete until save
    setAttachmentsToDelete(prev => [...prev, attachmentId]);
    
    toast({ 
      title: 'Marked for deletion', 
      description: `"${attachmentName}" will be deleted when you save the resolution.` 
    });
  };

  const requestId = params?.id as string;

  // Persisted read-state helpers (avoid unread reappearing after refresh)
  const getLastSeenKey = (approvalId: string) => `convSeen:${requestId}:${approvalId}`;
  const getLastSeenTs = (approvalId: string): string | null => {
    if (typeof window === 'undefined') return null;
    try { return localStorage.getItem(getLastSeenKey(approvalId)); } catch { return null; }
  };
  const setLastSeenTs = (approvalId: string, ts: string) => {
    if (typeof window === 'undefined') return;
    try { localStorage.setItem(getLastSeenKey(approvalId), ts); } catch {}
  };
  const normalizeTsKey = (ts?: string) => {
    if (!ts) return '';
    const s = String(ts).trim().replace('T', ' ').replace('Z', '').replace(/\..+$/, '');
    const m = s.match(/(\d{4})[-/](\d{2})[-/](\d{2})(?: (\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (!m) return s;
    const [, y, mo, d, hh = '00', mi = '00', ss = '00'] = m;
    return `${y}-${mo}-${d} ${hh}:${mi}:${ss}`;
  };
  const getLatestConvTs = (list: ConversationEntry[] | undefined): string => {
    if (!list || list.length === 0) return '';
    let latest = '';
    for (const c of list) {
      const k = normalizeTsKey(c.timestamp);
      if (k > latest) latest = k;
    }
    return latest;
  };
  const computeUnreadFromLocal = (approvalId: string, list: ConversationEntry[] | undefined): number => {
    const lastSeen = normalizeTsKey(getLastSeenTs(approvalId) || '');
    if (!list || list.length === 0) return 0;
    // Count only incoming messages from approvers/technicians; exclude my own ('user') and system events
    return list.filter(c => (c.type !== 'user' && c.type !== 'system') && normalizeTsKey(c.timestamp) > lastSeen).length;
  };

  // Helper: format current date to datetime-local (YYYY-MM-DDTHH:mm)
  const formatForDatetimeLocal = (d = new Date()) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  };

  // Keep current tab in URL so refresh restores it
  useEffect(() => {
    const urlTab = searchParams?.get('tab');
    if (!urlTab) return;
    const allowed = ['details', 'resolution', 'approvals', 'history', 'worklogs'];
    const nextTab = allowed.includes(urlTab) ? urlTab : 'details';
    if (nextTab !== activeTab) {
      // If worklogs requested but user isn't technician, fallback
      if (nextTab === 'worklogs' && !session?.user?.isTechnician) {
        setActiveTab('details');
      } else {
        setActiveTab(nextTab);
      }
    }
  }, [searchParams, session?.user?.isTechnician]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    const paramsObj = new URLSearchParams(searchParams ? Array.from(searchParams.entries()) : []);
    paramsObj.set('tab', val);
    router.replace(`${pathname}?${paramsObj.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (requestId && session) {
      fetchRequestData();
      fetchUnreadCounts(); // Fetch unread conversation counts
    }
  }, [requestId, session]);

  // Initialize resolution state with existing data when request data is loaded
  useEffect(() => {
    if (requestData && session?.user?.isTechnician) {
      const fd: any = requestData.formData || {};
      const resBlock = fd.resolution || {};
      
      // Get existing resolution data - check both new structure and fallback
      const existingResolution = String(resBlock.closureComments || fd.closureComments || '').trim();
      const existingClosureCode = String(resBlock.closureCode || '').trim();
      const existingRequestClosureComments = String(resBlock.requestClosureComments || '').trim();
      
      // Initialize resolution notes with existing data if available
      if (existingResolution && resNotes === '') {
        setResNotes(existingResolution);
      }
      
      // Initialize closure code with existing data if available
      if (existingClosureCode && resolveClosureCode === '') {
        setResolveClosureCode(existingClosureCode);
      }
      
      // Initialize request closure comments with existing data if available
      if (existingRequestClosureComments && resolveComments === '') {
        setResolveComments(existingRequestClosureComments);
      }
      
      // Initialize status with current request status
      if (requestData.status && resStatus === 'open') {
        setResStatus(requestData.status);
      }
    }
  }, [requestData, session?.user?.isTechnician]);

  // Load conversation counts for all approvals after approvals are loaded
  useEffect(() => {
    if (approvals.length > 0) {
      loadAllConversationCounts();
    }
  }, [approvals]);

  // Debounced user search effect
  useEffect(() => {
    if (!userSearchTerm.trim()) {
      setAvailableUsers([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      searchUsers(userSearchTerm);
    }, 300); // 300ms debounce delay

    return () => clearTimeout(timeoutId);
  }, [userSearchTerm, approvals, selectedUsers, session]);

  // Initialize work log owner with current user when modal opens
  useEffect(() => {
    if (showWorkLogModal && session?.user) {
      // Set current user as default owner when opening work log modal
      const currentUserName = session.user.name || session.user.email || '';
      const currentUserId = parseInt(session.user.id) || null;
      
      setWlOwnerName(currentUserName);
      setWlOwnerId(currentUserId);
    }
  }, [showWorkLogModal, session?.user]);

  const fetchRequestData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/requests/${requestId}`);
      
      if (!response.ok) {
        // If request not found (404), redirect to homepage
        if (response.status === 404) {
          toast({
            title: "Request Not Found",
            description: "The request you're looking for doesn't exist or you don't have permission to view it.",
            variant: "destructive"
          });
          router.push('/'); // Redirect to homepage
          return;
        }
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
      
      // Debug resolution attachments after fetch
      const fd: any = data.request?.formData || {};
      const resBlock = fd.resolution || {};
      const resAttIds = Array.isArray(resBlock.attachments) ? resBlock.attachments : [];
      console.log('AFTER FETCH DEBUG - Resolution attachments in formData:', resAttIds);
      console.log('AFTER FETCH DEBUG - All attachments loaded:', (data.attachments || []).map((a: any) => ({ id: a.id, name: a.originalName })));
      
      // Load work logs for technician
      if (session?.user?.isTechnician) {
        loadWorkLogs();
      }
      
      // Load resolution attachments separately
      await loadResolutionAttachments();
    } catch (error) {
      console.error('Error fetching request:', error);
      toast({
        title: "Error",
        description: "Failed to load request data",
        variant: "destructive"
      });
      // If there's any other error, also redirect to homepage after a delay
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  // Load resolution attachments separately
  const loadResolutionAttachments = async () => {
    if (!requestId) return;
    try {
      const response = await fetch(`/api/requests/${requestId}/attachments/resolution`);
      if (response.ok) {
        const data = await response.json();
        setResolutionAttachments(data.attachments || []);
        console.log('Resolution attachments loaded:', data.attachments?.length || 0);
      } else {
        console.error('Failed to fetch resolution attachments:', response.status);
      }
    } catch (error) {
      console.error('Error fetching resolution attachments:', error);
    }
  };

  // Work Logs functions
  const loadWorkLogs = async () => {
    if (!requestId) return;
    try {
      setLoadingWorkLogs(true);
      const res = await fetch(`/api/requests/${requestId}/worklogs`);
      if (res.ok) {
        const data = await res.json();
        setWorkLogs(Array.isArray(data.worklogs) ? data.worklogs : []);
      } else {
        setWorkLogs([]);
      }
    } catch (e) {
      console.error('Failed to load worklogs', e);
    } finally {
      setLoadingWorkLogs(false);
    }
  };

  // Edit functions
  const loadCategories = async () => {
    try {
      const res = await fetch('/api/service-categories');
      if (res.ok) {
        const data = await res.json();
        setAvailableCategories(data.categories || []);
      }
    } catch (e) {
      console.error('Failed to load categories', e);
    }
  };

  const loadTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      if (res.ok) {
        const data = await res.json();
        setAvailableTemplates(data.templates || []);
      }
    } catch (e) {
      console.error('Failed to load templates', e);
    }
  };

  const loadTechnicians = async () => {
    try {
      const res = await fetch('/api/technicians?limit=100');
      if (res.ok) {
        const data = await res.json();
        let technicians = data.technicians || [];
        
        // Filter out currently assigned technician if one is assigned
        if (requestData?.formData?.assignedTechnicianId) {
          const assignedUserId = requestData.formData.assignedTechnicianId;
          technicians = technicians.filter((tech: any) => tech.userId !== assignedUserId);
        }
        
        setAvailableTechnicians(technicians);
      }
    } catch (e) {
      console.error('Failed to load technicians', e);
    }
  };

  // Load templates by category for change type modal
  const loadTemplatesByCategory = async (categoryId: string) => {
    try {
      // Only load service type templates for change type modal (changing to service)
      const res = await fetch(`/api/templates?categoryId=${categoryId}&type=service`);
      if (res.ok) {
        const data = await res.json();
        setCategoryTemplates(data.templates || []);
        console.log(`Loaded ${data.templates?.length || 0} service templates for category ${categoryId}`);
      } else {
        setCategoryTemplates([]);
      }
    } catch (e) {
      console.error('Failed to load templates by category', e);
      setCategoryTemplates([]);
    }
  };

  // Filter templates based on request type and category
  useEffect(() => {
    console.log('Filtering templates:', {
      availableTemplatesCount: availableTemplates.length,
      selectedType: editForm.type,
      selectedCategory: editForm.category,
      templates: availableTemplates.map(t => ({ name: t.name, type: t.type, category: t.category }))
    });
    
    if (!availableTemplates.length) {
      console.log('No available templates to filter');
      setFilteredTemplates([]);
      return;
    }
    
    let filtered = availableTemplates.filter(template => {
      // Filter by request type (must match) - case insensitive comparison
      const typeMatch = template.type.toLowerCase() === editForm.type.toLowerCase();
      console.log(`Template ${template.name}: type ${template.type} vs ${editForm.type} = ${typeMatch}`);
      
      // Filter by category if selected
      let categoryMatch = true;
      if (editForm.category) {
        const categoryId = parseInt(editForm.category);
        categoryMatch = template.category && (
          template.category.id === categoryId || 
          template.category === categoryId ||
          template.categoryId === categoryId
        );
        console.log(`Template ${template.name}: category check`, {
          templateCategory: template.category,
          templateCategoryId: template.categoryId,
          selectedCategoryId: categoryId,
          match: categoryMatch
        });
      }
      
      const shouldInclude = typeMatch && categoryMatch;
      console.log(`Template ${template.name}: final decision = ${shouldInclude}`);
      return shouldInclude;
    });
    
    console.log('Filtered templates result:', filtered.length, filtered.map(t => t.name));
    setFilteredTemplates(filtered);
  }, [availableTemplates, editForm.type, editForm.category]);

  // Email search functionality (from creation form)
  const searchEmailUsers = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setEmailSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/users?search=${encodeURIComponent(searchTerm)}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setEmailSearchResults(data.users || []);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setEmailSearchResults([]);
    }
  };

  // Technician search functionality (from creation form)
  const searchTechnicians = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setTechnicianResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/users/technicians?search=${encodeURIComponent(searchTerm)}`);
      if (response.ok) {
        const data = await response.json();
        setTechnicianResults(data.users || []);
      }
    } catch (error) {
      console.error('Error searching technicians:', error);
      setTechnicianResults([]);
    }
  };

  // Debounced search effects
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (emailSearch) {
        searchEmailUsers(emailSearch);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [emailSearch]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (technicianSearch) {
        searchTechnicians(technicianSearch);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [technicianSearch]);

  // Update priority and status when template is selected
  useEffect(() => {
    if (editForm.template && availableTemplates.length > 0) {
      const selectedTemplate = availableTemplates.find(t => t.id === parseInt(editForm.template));
      if (selectedTemplate && selectedTemplate.fields) {
        // Find priority and status from template fields
        const priorityField = selectedTemplate.fields.find((f: any) => f.type === 'priority');
        const statusField = selectedTemplate.fields.find((f: any) => f.type === 'status');
        
        // FIXED: Apply template logic based on request type
        if (editForm.type.toLowerCase() === 'incident') {
          // For incidents: Get priority from template, set status to 'open'
          if (priorityField && priorityField.defaultValue) {
            setTemplatePriority(priorityField.defaultValue);
            setEditForm(prev => ({...prev, priority: priorityField.defaultValue, status: 'open'}));
          } else {
            setEditForm(prev => ({...prev, status: 'open'}));
          }
        } else if (editForm.type.toLowerCase() === 'service') {
          // For services: Priority is selectable, status becomes 'for_approval'  
          if (priorityField && priorityField.defaultValue) {
            setTemplatePriority(priorityField.defaultValue);
            setEditForm(prev => ({...prev, priority: priorityField.defaultValue, status: 'for_approval'}));
          } else {
            setEditForm(prev => ({...prev, status: 'for_approval'}));
          }
        }
        
        // Copy template details (approver, SLA, support group, etc.)
        if (selectedTemplate.approvalWorkflow) {
          console.log('Copying approval workflow from template:', selectedTemplate.approvalWorkflow);
        }
        if (selectedTemplate.slaId) {
          console.log('Copying SLA from template:', selectedTemplate.slaId);
        }
        if (selectedTemplate.supportGroupId) {
          console.log('Copying support group from template:', selectedTemplate.supportGroupId);
        }
      }
    }
  }, [editForm.template, availableTemplates, editForm.type]);

  // Initialize resolution data when entering edit mode or when request data changes
  useEffect(() => {
    if (requestData && isEditingResolution) {
      const fd: any = requestData.formData || {};
      const resBlock = fd.resolution || {};
      const existingResolution = String(resBlock.closureComments || fd.closureComments || '').trim();
      
      if (existingResolution) {
        setResNotes(existingResolution);
      }
      
      // Set status to current request status when entering edit mode
      setResStatus(requestData.status || 'open');
    }
  }, [requestData, isEditingResolution]);

  // Initialize assigned technician when assign modal opens
  useEffect(() => {
    if (showAssignModal) {
      // Load technicians when assign modal opens
      loadTechnicians();
    }
  }, [showAssignModal, requestData]);

  // Set the selected technician after technicians are loaded
  useEffect(() => {
    if (showAssignModal && requestData?.formData?.assignedTechnicianId && availableTechnicians.length > 0) {
      // The assignedTechnicianId is actually a userId, so find the technician with matching userId
      const assignedUserId = requestData.formData.assignedTechnicianId;
      const matchingTechnician = availableTechnicians.find(tech => tech.userId === assignedUserId);
      
      if (matchingTechnician) {
        const technicianId = String(matchingTechnician.id);
        setAssignedTechnician(technicianId);
      } else {
        setAssignedTechnician('');
      }
    } else if (showAssignModal && !requestData?.formData?.assignedTechnicianId) {
      setAssignedTechnician(''); // Reset if no technician assigned
    }
  }, [showAssignModal, requestData, availableTechnicians]);

  // Load categories when change type modal opens
  useEffect(() => {
    if (showChangeTypeModal) {
      loadCategories();
      setSelectedCategory('');
      setSelectedTemplate('');
      setCategoryTemplates([]);
    }
  }, [showChangeTypeModal]);

  // Load templates when a category is selected
  useEffect(() => {
    if (selectedCategory) {
      loadTemplatesByCategory(selectedCategory);
      setSelectedTemplate(''); // Reset template selection when category changes
    } else {
      setCategoryTemplates([]);
    }
  }, [selectedCategory]);

  const handleEditRequest = () => {
    // Don't open modal if data isn't loaded yet
    if (!requestData) {
      toast({
        title: "Please wait",
        description: "Request data is still loading...",
        variant: "default"
      });
      return;
    }

    console.log('handleEditRequest - requestData:', requestData);
    console.log('handleEditRequest - templateData:', templateData);
    
    // Initialize form with current values
    const currentPriority = requestData?.formData?.['2'] || requestData?.formData?.priority || 'Medium';
    
    // FIXED: Get request type from formData[4] first (where type is actually stored)
    let currentType = 'Service'; // default
    if (requestData?.formData?.['4']) {
      currentType = requestData.formData['4'];
    } else if (requestData?.type) {
      currentType = requestData.type;
    } else if (requestData?.formData?.type) {
      currentType = requestData.formData.type;
    }
    
    console.log('handleEditRequest - detected currentType:', currentType);
    
    // Get category and template IDs directly from request table data
    let currentCategory = '';
    if ((templateData as any)?.categoryId) {
      currentCategory = String((templateData as any).categoryId);
    } else {
      currentCategory = String((requestData as any)?.categoryId || '');
    }
    const currentTemplate = String((requestData as any)?.templateId || '');
    
    const currentTechnician = requestData?.formData?.assignedTechnician || '';
    const currentEmails = requestData?.formData?.emailNotify || '';
    
    console.log('handleEditRequest - Setting form values:', {
      priority: currentPriority,
      status: requestData?.status || 'for_approval',
      type: currentType,
      template: currentTemplate,
      category: currentCategory,
      technician: currentTechnician,
      emailNotify: currentEmails
    });
    
    setEditForm({
      priority: currentPriority,
      status: requestData?.status || 'for_approval',
      type: currentType,
      emailNotify: currentEmails,
      technician: currentTechnician,
      template: currentTemplate,
      category: currentCategory
    });

    // Initialize email users if they exist
    if (currentEmails) {
      const emailArray = currentEmails.split(',').map((email: string) => ({
        emp_email: email.trim(),
        emp_fname: email.trim().split('@')[0],
        emp_lname: ''
      }));
      setEmailUsers(emailArray);
    }

    // Initialize technician selection
    if (currentTechnician) {
      setSelectedTechnicianId(currentTechnician);
    }

    setShowEditModal(true);
    loadCategories();
    loadTemplates();
    loadTechnicians();
  };

  const handleSaveEdit = async () => {
    try {
      setSavingEdit(true);
      
      const res = await fetch(`/api/requests/${requestId}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priority: editForm.priority,
          status: editForm.status,
          type: editForm.type,
          emailNotify: editForm.emailNotify,
          technician: editForm.technician,
          templateId: editForm.template ? parseInt(editForm.template) : null,
          categoryId: editForm.category ? parseInt(editForm.category) : null
        })
      });

      if (!res.ok) {
        throw new Error('Failed to save changes');
      }

      toast({
        title: 'Success',
        description: 'Request updated successfully'
      });

      setShowEditModal(false);
      await fetchRequestData(); // Refresh data
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: 'Error',
        description: 'Failed to save changes',
        variant: 'destructive'
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const resetWorkLogForm = (prefillOwner = true) => {
    setEditingWorkLog(null);
    setWlOwnerName(prefillOwner ? `${session?.user?.name || ''}` : '');
    setWlOwnerId(prefillOwner ? (session?.user?.id ? parseInt(String(session.user.id)) : null) : null);
    setWlOwnerPickerOpen(!prefillOwner); // if owner prefilled, keep picker closed
    setTechSearch('');
    // Prefill with current local date/time
    const nowStr = formatForDatetimeLocal(new Date());
    setWlStartTime(nowStr);
    setWlEndTime(nowStr);
    setWlHours('00');
    setWlMinutes('00');
    setWlIncludeNonOp(false);
    setWlDescription(''); // Reset description field
  };

  const openAddWorkLog = () => {
    resetWorkLogForm();
    setShowWorkLogModal(true);
  };

  // Effect to ensure work log form is properly initialized when modal opens for new work log
  useEffect(() => {
    if (showWorkLogModal && !editingWorkLog) {
      // For new work logs, ensure the form is properly initialized with current time
      const nowStr = formatForDatetimeLocal(new Date());
      setWlStartTime(nowStr);
      setWlEndTime(nowStr);
      setWlOwnerName(session?.user?.name || '');
      setWlOwnerId(session?.user?.id ? parseInt(String(session.user.id)) : null);
    }
  }, [showWorkLogModal, editingWorkLog, session?.user]);

  const openEditWorkLog = (wl: any) => {
    setEditingWorkLog(wl);
    setShowWorkLogModal(true);
    setWlOwnerName(wl.ownerName || '');
    setWlOwnerId(typeof wl.ownerId === 'number' ? wl.ownerId : null);
    setWlOwnerPickerOpen(false);
    setTechSearch('');
    
    // Set times with proper formatting for datetime-local inputs
    if (wl.startTime) {
      const startDate = new Date(wl.startTime);
      setWlStartTime(formatForDatetimeLocal(startDate));
    } else {
      setWlStartTime(formatForDatetimeLocal(new Date()));
    }
    
    if (wl.endTime) {
      const endDate = new Date(wl.endTime);
      setWlEndTime(formatForDatetimeLocal(endDate));
    } else {
      setWlEndTime(formatForDatetimeLocal(new Date()));
    }
    
    const hrs = Math.floor((wl.timeTakenMinutes || 0) / 60);
    const mins = (wl.timeTakenMinutes || 0) % 60;
    setWlHours(hrs ? String(hrs).padStart(2, '0') : '00');
    setWlMinutes(mins ? String(mins).padStart(2, '0') : '00');
    setWlIncludeNonOp(!!wl.includeNonOperational);
    setWlDescription(wl.description || '');
  };

  // Auto-calc hours/mins on time change
  useEffect(() => {
    if (wlStartTime && wlEndTime) {
      const start = new Date(wlStartTime).getTime();
      const end = new Date(wlEndTime).getTime();
      const diff = Math.max(0, end - start);
      const mins = Math.floor(diff / 60000);
      const hrs = Math.floor(mins / 60);
      const rem = mins % 60;
      setWlHours(String(hrs).padStart(2, '0'));
      setWlMinutes(String(rem).padStart(2, '0'));
    } else {
      setWlHours('');
      setWlMinutes('');
    }
  }, [wlStartTime, wlEndTime]);

  const saveWorkLog = async () => {
    // Auto-calc minutes from start/end
    let minutes = (parseInt(wlHours || '0') * 60) + (parseInt(wlMinutes || '0') || 0);
    if (wlStartTime && wlEndTime) {
      const startMs = new Date(wlStartTime).getTime();
      const endMs = new Date(wlEndTime).getTime();
      const diff = Math.max(0, endMs - startMs);
      minutes = Math.floor(diff / 60000);
    }
    try {
      const isEdit = !!editingWorkLog;
      const res = await fetch(`/api/requests/${requestId}/worklogs`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEdit ? { id: editingWorkLog.id } : {}),
          ownerId: wlOwnerId,
          startTime: wlStartTime || null,
          endTime: wlEndTime || null,
          timeTakenMinutes: minutes,
          includeNonOperational: wlIncludeNonOp,
          description: wlDescription,
        })
      });
      if (!res.ok) throw new Error('Failed to save work log');
      toast({ 
        title: 'Saved', 
        description: isEdit ? 'Work log updated successfully' : 'Work log saved successfully',
        className: "bg-yellow-50 border-yellow-200 text-yellow-800"
      });
      setShowWorkLogModal(false);
      resetWorkLogForm(); // Clear form data for next entry
      await loadWorkLogs();
      await fetchRequestData(); // refresh history
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to save work log', variant: 'destructive' });
    }
  };

  const deleteWorkLog = async (wl: any) => {
    if (!wl?.id) return;
    try {
      const res = await fetch(`/api/requests/${requestId}/worklogs`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: wl.id })
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast({ 
        title: 'Deleted', 
        description: 'Work log removed',
        className: "bg-yellow-50 border-yellow-200 text-yellow-800"
      });
      await loadWorkLogs();
      await fetchRequestData();
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to delete work log', variant: 'destructive' });
    }
  };

  // Technician search for owner selector
  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!techSearch.trim()) { setTechOptions([]); return; }
      try {
        setTechLoading(true);
        const res = await fetch(`/api/users/technicians?search=${encodeURIComponent(techSearch)}`);
        if (active && res.ok) {
          const data = await res.json();
          setTechOptions(Array.isArray(data.data) ? data.data : []);
        }
      } catch (e) {
        if (active) setTechOptions([]);
      } finally {
        if (active) setTechLoading(false);
      }
    };
    const t = setTimeout(run, 300);
    return () => { active = false; clearTimeout(t); };
  }, [techSearch]);

  // When opening the owner picker with no search, load a default list
  useEffect(() => {
    let stop = false;
    const loadDefault = async () => {
      if (!wlOwnerPickerOpen) return;
      try {
        setTechLoading(true);
        const res = await fetch(`/api/users/technicians?search=`);
        if (!stop && res.ok) {
          const data = await res.json();
          setTechOptions(Array.isArray(data.data) ? data.data : []);
        }
      } catch {
        if (!stop) setTechOptions([]);
      } finally {
        if (!stop) setTechLoading(false);
      }
    };
    loadDefault();
    return () => { stop = true; };
  }, [wlOwnerPickerOpen]);

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
  const toggleConversation = async (approvalId: string) => {
    const wasOpen = !!conversationStates[approvalId];
    setConversationStates(prev => ({ ...prev, [approvalId]: !prev[approvalId] }));
    
    // If opening, load first (await) then mark as read using the freshly fetched list
    if (!wasOpen) {
      let list: ConversationEntry[] | undefined = approvalConversations[approvalId];
      if (!list) {
        list = await fetchApprovalConversations(approvalId);
      }
      await markConversationAsRead(approvalId, list);
    }
  };

  const markConversationAsRead = async (approvalId: string, list?: ConversationEntry[]) => {
    try {
      // Mark all unread messages for this approval as read
      const response = await fetch(`/api/approvals/${approvalId}/conversations/mark-read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Update unread count to 0 for this approval and persist last seen (use freshest list)
      const src = list || approvalConversations[approvalId] || [];
      const latest = getLatestConvTs(src);
      if (latest) setLastSeenTs(approvalId, latest);
      if (response.ok) {
        setUnreadCounts(prev => ({ ...prev, [approvalId]: 0 }));
      }
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  };

  const fetchApprovalConversations = async (approvalId: string): Promise<ConversationEntry[]> => {
    try {
      const response = await fetch(`/api/approvals/${approvalId}/conversations`);
      if (response.ok) {
        const data = await response.json();
        const list: ConversationEntry[] = data.conversations || [];
        setApprovalConversations(prev => ({ ...prev, [approvalId]: list }));
        // If panel is open, persist last seen and clear unread
        if (conversationStates[approvalId]) {
          const latest = getLatestConvTs(list);
          if (latest) setLastSeenTs(approvalId, latest);
          setUnreadCounts(prev => ({ ...prev, [approvalId]: 0 }));
        } else {
          // Otherwise compute unread from local last seen
          const unread = computeUnreadFromLocal(approvalId, list);
          setUnreadCounts(prev => ({ ...prev, [approvalId]: unread }));
        }
        
        // Scroll to bottom when conversations are loaded
        setTimeout(() => {
          const conversationContainer = conversationRefs.current[approvalId];
          if (conversationContainer) {
            conversationContainer.scrollTop = conversationContainer.scrollHeight;
          }
        }, 100);
        return list;
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
    return [];
  };

  const fetchUnreadCounts = async () => {
    try {
      const response = await fetch('/api/approvals/conversations/unread');
      if (response.ok) {
        const data = await response.json();
        const serverCounts: {[k: string]: number} = data.unreadCounts || {};
        // Prefer local last-seen based counts when available to prevent flicker
        setUnreadCounts(prev => {
          const merged: {[k: string]: number} = { ...prev };
          for (const approval of approvals as any[]) {
            const id = approval.id;
            const list = approvalConversations[id];
            if (!list) {
              // Only set from server when we have no local basis yet
              merged[id] = serverCounts[id] ?? merged[id] ?? 0;
            } else {
              // Keep local computation
              merged[id] = computeUnreadFromLocal(id, list);
            }
          }
          return merged;
        });
      }
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  };

  // Load conversation counts for all approvals without opening conversations
  const loadAllConversationCounts = async () => {
    try {
      const conversationPromises = approvals.map(async (approval: any) => {
        const response = await fetch(`/api/approvals/${approval.id}/conversations`);
        if (response.ok) {
          const data = await response.json();
          return {
            approvalId: approval.id,
            conversations: data.conversations || [],
            count: (data.conversations || []).length
          };
        }
        return { approvalId: approval.id, conversations: [], count: 0 };
      });

      const results = await Promise.all(conversationPromises);
      
      // Update approval conversations counts without auto-opening panels
      const newApprovalConversations: {[key: string]: ConversationEntry[]} = {};
      const newUnread: {[key: string]: number} = {};
      
      results.forEach(result => {
        newApprovalConversations[result.approvalId] = result.conversations;
        newUnread[result.approvalId] = computeUnreadFromLocal(result.approvalId, result.conversations);
      });
      
  setApprovalConversations(newApprovalConversations);
  setUnreadCounts(prev => ({ ...prev, ...newUnread }));
  // Avoid immediate server reconciliation to prevent flicker back to old counts.
    } catch (error) {
      console.error('Error loading conversation counts:', error);
    }
  };

  const sendConversationMessage = async (approvalId: string) => {
    const message = newConversationMessage[approvalId]?.trim();
    if (!message || sendingMessage[approvalId]) return;

    try {
      setSendingMessage(prev => ({ ...prev, [approvalId]: true }));
      
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
          className: "bg-green-50 border-green-200 text-green-800"
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setSendingMessage(prev => ({ ...prev, [approvalId]: false }));
    }
  };

  const requestClarification = async (approvalId: string) => {
    const message = newConversationMessage[approvalId]?.trim();
    if (!message || sendingClarification[approvalId]) return;

    try {
      setSendingClarification(prev => ({ ...prev, [approvalId]: true }));
      
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
        className: "bg-green-50 border-green-200 text-green-800"
      });
    } catch (error) {
      console.error('Error requesting clarification:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to request clarification",
        variant: "destructive"
      });
    } finally {
      setSendingClarification(prev => ({ ...prev, [approvalId]: false }));
    }
  };

  const sendMainConversationReply = async () => {
    const message = newComment.trim();
    if (!message || sendingMainReply) return;

    try {
      setSendingMainReply(true);
      
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
          className: "bg-green-50 border-green-200 text-green-800"
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
    } finally {
      setSendingMainReply(false);
    }
  };

  // File upload handlers for notes
  const handleNoteDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleNoteDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleNoteDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    handleNoteFiles(files);
  }, []);

  const handleNoteFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      if (file.size > 20 * 1024 * 1024) { // 20MB limit
        toast({
          title: "File too large",
          description: `File ${file.name} is too large. Maximum size is 20MB.`,
          variant: "destructive"
        });
        return false;
      }
      return true;
    });
    
    setNoteAttachments(prev => [...prev, ...validFiles]);
  };

  const removeNoteFile = useCallback((index: number) => {
    setNoteAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const addNote = async () => {
    const message = newNote.trim();
    if (!message || addingNote) return;

    try {
      setAddingNote(true);
      
      // First, upload files if any
      let uploadedFileData: any[] = [];
      if (noteAttachments.length > 0) {
        const fileFormData = new FormData();
        noteAttachments.forEach(file => {
          fileFormData.append('files', file);
        });
        fileFormData.append('type', 'conversation'); // Mark as conversation attachment
        
        const fileUploadResponse = await fetch('/api/attachments', {
          method: 'POST',
          body: fileFormData
        });

        if (fileUploadResponse.ok) {
          const fileResult = await fileUploadResponse.json();
          uploadedFileData = fileResult.files || [];
          console.log('Note files uploaded successfully:', uploadedFileData);
        } else {
          throw new Error('Failed to upload note attachments');
        }
      }

      const response = await fetch(`/api/requests/${requestId}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          attachments: uploadedFileData, // Pass full attachment data with id, originalName, size, etc.
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Add the new note to the existing conversations list
        setConversations(prev => [...prev, data.conversation]);
        setNewNote(''); // Clear the input
        setNoteAttachments([]); // Clear attachments
        setShowNotesModal(false); // Close the modal
        
        toast({
          title: "Note added",
          description: "Your note has been added successfully",
          className: "bg-green-50 border-green-200 text-green-800"
        });
        
        // Refresh the entire page to ensure all data is up to date
        // This will reload the page and stay on the current tab
        window.location.reload();
      } else {
        throw new Error('Failed to add note');
      }
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        title: "Error",
        description: "Failed to add note",
        variant: "destructive"
      });
    } finally {
      setAddingNote(false);
    }
  };

  const toggleApprovalLevel = (level: string) => {
    setCollapsedLevels(prev => ({
      ...prev,
      [level]: !prev[level]
    }));
  };

  // Add approval functions
  const searchUsers = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 1) {
      setAvailableUsers([]);
      return;
    }

    setLoadingUsers(true);
    try {
      const response = await fetch(`/api/users?search=${encodeURIComponent(searchTerm)}`);
      if (response.ok) {
        const data = await response.json();
        
        // Get ALL approver IDs from the current request (all levels)
        const allApproverIds = approvals
          .map((app: any) => app.approverId)
          .filter(Boolean);
        
        // Get already selected user IDs
        const selectedUserIds = selectedUsers.map(user => user.id);
        
        // Filter out users who are:
        // 1. Current user
        // 2. Already in ANY approval level for this request
        // 3. Already selected in the modal
        const filteredUsers = (data.users || []).filter((user: any) => {
          // Exclude current user
          if (session?.user?.email && user.emp_email === session.user.email) {
            return false;
          }
          
          // Exclude users already in ANY approval level of this request
          if (allApproverIds.includes(user.id)) {
            return false;
          }
          
          // Exclude users already selected in the modal
          if (selectedUserIds.includes(user.id)) {
            return false;
          }
          
          return true;
        });
        
        setAvailableUsers(filteredUsers);
      } else {
        setAvailableUsers([]);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setAvailableUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Helper function to get current in-progress level
  const getCurrentInProgressLevel = () => {
    const levels = Object.keys(approvals.reduce((acc: any, app: any) => {
      acc[app.level] = true;
      return acc;
    }, {}));
    
    const currentLevel = levels.find(level => {
      const levelApprovals = approvals.filter((app: any) => app.level === parseInt(level));
      const allPreviousLevelsApproved = levels
        .filter(l => parseInt(l) < parseInt(level))
        .every(prevLevel => {
          const prevLevelApprovals = approvals.filter((app: any) => app.level === parseInt(prevLevel));
          return prevLevelApprovals.every((app: any) => app.status === 'approved');
        });
      
      const hasPending = levelApprovals.some((app: any) => 
        app.status === 'not_sent' || app.status === 'pending_approval' || app.status === 'for_clarification'
      );
      
      return hasPending && allPreviousLevelsApproved;
    });
    
    return currentLevel;
  };

  const addUserToSelection = (user: any) => {
    // Check if user is already selected
    if (selectedUsers.find(u => u.id === user.id)) {
      toast({
        title: "User already selected",
        description: `${user.emp_fname} ${user.emp_lname} is already in the selected approvers list`,
        variant: "destructive"
      });
      return;
    }
    
    // Check if user is current user
    if (session?.user?.email && user.emp_email === session.user.email) {
      toast({
        title: "Cannot add yourself",
        description: "You cannot add yourself as an approver",
        variant: "destructive"
      });
      return;
    }
    
    // Check if user is already an approver in ANY level of this request
    const allApproverIds = approvals.map((app: any) => app.approverId).filter(Boolean);
    if (allApproverIds.includes(user.id)) {
      toast({
        title: "User already an approver",
        description: `${user.emp_fname} ${user.emp_lname} is already an approver in this request`,
        variant: "destructive"
      });
      return;
    }
    
    setSelectedUsers(prev => [...prev, user]);
    setUserSearchTerm('');
    setAvailableUsers([]);
  };

  const removeUserFromSelection = (userId: number) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleAddApprovals = async () => {
    if (selectedUsers.length === 0) {
      toast({
        title: "No users selected",
        description: "Please select at least one user to add as an approver",
        variant: "destructive"
      });
      return;
    }

    try {
      setAddingApprovers(true);
      
      // Find the current level that's in progress
      const currentLevel = getCurrentInProgressLevel();

      if (!currentLevel) {
        toast({
          title: "Cannot add approvals",
          description: "No level is currently in progress to add approvals to",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch(`/api/requests/${requestId}/approvals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          users: selectedUsers.map(user => ({
            userId: user.id,
            level: parseInt(currentLevel),
            name: `${user.emp_fname} ${user.emp_lname}`,
            email: user.emp_email
          }))
        }),
      });

      if (response.ok) {
        toast({
          title: "Approver(s) added successfully",
          description: `Added ${selectedUsers.map(u => `${u.emp_fname} ${u.emp_lname}`).join(', ')} to Level ${currentLevel}. Email notifications have been sent.`,
        });
        
        // Refresh the request data to show new approvals
        fetchRequestData();
        
        // Reset modal state
        setShowAddApprovalModal(false);
        setSelectedUsers([]);
        setUserSearchTerm('');
        setAvailableUsers([]);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add approvals');
      }
    } catch (error) {
      console.error('Error adding approvals:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add approvals",
        variant: "destructive"
      });
    } finally {
      setAddingApprovers(false);
    }
  };

  // Debounced user search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (userSearchTerm) {
        searchUsers(userSearchTerm);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [userSearchTerm]);

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
      <style jsx global>{`
        .ql-editor {
          min-height: 150px;
          font-family: inherit;
          font-size: 14px;
          line-height: 1.5;
          color: #334155;
        }
        .ql-toolbar {
          border-top: none;
          border-left: none;
          border-right: none;
          border-bottom: 1px solid #cbd5e1;
          background-color: #f8fafc;
        }
        .ql-container {
          border: none;
        }
        .ql-toolbar .ql-stroke {
          fill: none;
          stroke: #64748b;
        }
        .ql-toolbar .ql-fill {
          fill: #64748b;
          stroke: none;
        }
        .ql-toolbar button:hover .ql-stroke {
          stroke: #334155;
        }
        .ql-toolbar button:hover .ql-fill {
          fill: #334155;
        }
      `}</style>
      <div className="min-h-screen bg-gray-50" style={{ transform: 'scale(0.9)', transformOrigin: 'top left', width: '111.11%', height: '111.11%' }}>
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="w-full px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    // Check if there's history to go back to
                    if (window.history.length > 1) {
                      router.back();
                    } else {
                      // Fallback: try to determine the appropriate page based on user role
                      if (session?.user?.isTechnician) {
                        router.push('/technician/requests');
                      } else {
                        router.push('/requests/view');
                      }
                    }
                  }} 
                  className="text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">
                      #{requestData.id} {requestData.formData?.[8] || 'Request'}
                    </h1>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>by {requestData.user.emp_fname} {requestData.user.emp_lname}</span>
                      <span> on </span>
                          <span>{formatDbTimestamp(requestData.createdAt)}</span>
                      <span> / </span>
                      <span>
                        Due By: {requestData.formData?.slaDueDate
                          ? formatDbTimestamp(String(requestData.formData.slaDueDate))
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
             
            </div>
          </div>
        </header>

        <div className="w-full px-6 lg:px-8 py-6">
          <div className="grid grid-cols-12 gap-6">
            {/* Main Content */}
            <div className="col-span-8">
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className={`grid w-full mb-6 ${session?.user?.isTechnician ? 'grid-cols-5' : 'grid-cols-4'}`}>
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
                  {session?.user?.isTechnician && (
                    <TabsTrigger value="worklogs" className="flex items-center gap-2">
                      <Edit className="h-4 w-4" />
                      Work Logs
                    </TabsTrigger>
                  )}
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
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <div className="prose max-w-none">
                          {(() => {
                            // Try to find description from multiple possible field names and numbered fields
                            const formData = requestData.formData || {};
                            let description = null;
                            
                            // First check field 9 which is the actual description field
                            if (formData['9']) {
                              description = formData['9'];
                            } else {
                              // Check common description field names as fallback
                              const descriptionFields = [
                                'description', 'Description', 'details', 'Details', 
                                'content', 'Content', 'notes', 'Notes', 'comments', 'Comments',
                                'message', 'Message', 'problem', 'Problem', 'issue', 'Issue'
                              ];
                              
                              // Check named fields
                              for (const field of descriptionFields) {
                                if (formData[field]) {
                                  description = formData[field];
                                  break;
                                }
                              }
                              
                              // If still not found, check numbered fields (like "2", "3", etc.)
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

                  {/* Notes - Only show if there are conversations OR allow adding notes for authenticated users */}
                  {(conversations.length > 0 || session?.user) && (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Notes</CardTitle>
                          {session?.user && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setShowNotesModal(true)}
                            >
                              Add Notes
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {conversations.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                              No Notes
                            </div>
                          ) : (
                            <>
                              {/* Display conversations from API */}
                              {conversations.map((conversation) => (
                              <div key={conversation.id} className="border rounded-lg p-4 bg-gray-50">
                                <div className="flex gap-3">
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
                                        {/* Keep relative for main notes which are ISO; no DB conversion applied */}
                                        {/* If needed to be raw, switch to formatDbTimestamp */}
                                        {formatDbTimestamp(conversation.timestamp)}
                                      </span>
                                    </div>
                                    <div className="mt-1">
                                      {(() => {
                                        // Check if message contains HTML tags (from rich text editor)
                                        const isHTML = /<[^>]*>/g.test(conversation.message);
                                        
                                        if (isHTML) {
                                          return (
                                            <div 
                                              className="text-sm text-gray-600 prose prose-sm max-w-none"
                                              dangerouslySetInnerHTML={{ __html: conversation.message }}
                                            />
                                          );
                                        } else {
                                          return (
                                            <p className="text-sm text-gray-600 whitespace-pre-wrap">
                                              {conversation.message}
                                            </p>
                                          );
                                        }
                                      })()}
                                      {/* Display attachments if they exist */}
                                      {conversation.attachments && conversation.attachments.length > 0 && (
                                        <div className="mt-3 space-y-2">
                                          <p className="text-xs font-medium text-gray-500 mb-2">Attachments:</p>
                                          {conversation.attachments.map((attachment, index) => (
                                            <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border">
                                              <Paperclip className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                              <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                  {typeof attachment === 'string' ? attachment : attachment.originalName}
                                                </p>
                                                {typeof attachment === 'object' && attachment.size && (
                                                  <p className="text-xs text-gray-500">
                                                    {formatFileSize(attachment.size)}
                                                  </p>
                                                )}
                                              </div>
                                              {typeof attachment === 'object' && attachment.id && (
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => handleDownloadAttachment(attachment.id, attachment.originalName)}
                                                  disabled={downloading === attachment.id}
                                                  className="h-8 w-8 p-0"
                                                >
                                                  {downloading === attachment.id ? (
                                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
                                                  ) : (
                                                    <Download className="h-4 w-4" />
                                                  )}
                                                </Button>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  )}

                  {/* Properties */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Request Details</CardTitle>
                        <div className="flex items-center gap-2">
                          {/* Only show Close button if current user is the requester and status is resolved */}
                          {session?.user?.id && String(session.user.id) === String(requestData.user.id) && requestData.status === 'resolved' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setShowActionsModal(true)}
                            >
                              Close This Request
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-700">Request Status</span>
                            <Badge className={getStatusColor(requestData.status)} variant="outline">
                              {requestData.status === 'for_approval' 
                                ? 'For Approval' 
                                : requestData.status.charAt(0).toUpperCase() + requestData.status.slice(1)}
                            </Badge>
                          </div>
                         
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-700">Mode</span>
                            <span className="text-sm text-gray-600">Self-Service Portal</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-700">Request Type</span>
                            <span className="text-sm text-gray-600 capitalize">{requestData.formData?.['4'] || requestData.formData?.type || 'Request'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-700">Service Category</span>
                            <span className="text-sm text-gray-600">{requestData.formData?.['6'] || ''}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-700">Template</span>
                            <span className="text-sm text-gray-600">{templateData?.name || 'Unknown Template'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-700">SLA</span>
                            <span className="text-sm text-gray-600">
                              {requestData.formData?.slaName
                                ? String(requestData.formData.slaName)
                                : templateData?.slaService?.name || 'Not specified'}
                            </span>
                          </div>  
                       
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-700">E-mail Id(s) To Notify</span>
                            <span className="text-sm text-gray-600">
                              {(() => {
                                const emailsToNotify = requestData.formData?.['10'];
                                if (Array.isArray(emailsToNotify) && emailsToNotify.length > 0) {
                                  return emailsToNotify.join(', ');
                                } else if (typeof emailsToNotify === 'string' && emailsToNotify.trim()) {
                                  return emailsToNotify;
                                }
                                return 'None';
                              })()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-700">Technician</span>
                            <span className="text-sm text-gray-600">
                              {requestData.formData?.assignedTechnician && String(requestData.formData.assignedTechnician).trim() !== ''
                                ? String(requestData.formData.assignedTechnician)
                                : 'Not Assigned'}
                            </span>
                          </div>
                          
                        
                        
                        
                        </div>
                        
                        <div className="space-y-4">
                          
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-700">Priority</span>
                            <Badge className={getPriorityColor(requestData.formData?.['2'] || requestData.formData?.priority || 'medium')}>
                              {(requestData.formData?.['2'] || requestData.formData?.priority || 'medium').charAt(0).toUpperCase() + (requestData.formData?.['2'] || requestData.formData?.priority || 'medium').slice(1)}
                            </Badge>
                          </div>
                        
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-700">Created By</span>
                            <span className="text-sm text-gray-600">{requestData.user.emp_fname} {requestData.user.emp_lname}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-700">Department</span>
                            <span className="text-sm text-gray-600">{requestData.user.department}</span>
                          </div>
                            <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-700">Created Date</span>
                            <span className="text-sm text-gray-600">{formatDbTimestamp(requestData.createdAt)}</span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-700">Due By Date</span>
                            <span className="text-sm text-gray-600">
                              {requestData.formData?.slaDueDate
                                ? formatDbTimestampDisplay(String(requestData.formData.slaDueDate))
                                : '-'}
                            </span>
                          </div>
                        
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-700">SLA Start Time</span>
                            <span className="text-sm text-gray-600">
                              {requestData.formData?.slaStartAt
                                ? formatDbTimestampDisplay(String(requestData.formData.slaStartAt))
                                : '-'}

                                {}
                            </span>
                          </div>     
                        
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-700">Resolution Date</span>
                            <span className="text-sm text-gray-600">
                              {requestData.formData?.resolution?.resolvedAt
                                ? formatDbTimestamp(String(requestData.formData.resolution.resolvedAt))
                                : '-'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-700">Closed Date</span>
                            <span className="text-sm text-gray-600">
                              {requestData.formData?.closedDate
                                ? formatDbTimestamp(String(requestData.formData.closedDate))
                                : '-'}
                            </span>
                          </div>
                          {requestData.status === 'cancelled' && (
                            <div className="flex justify-between">
                              <span className="text-sm font-medium text-gray-700">Cancelled Date</span>
                              <span className="text-sm text-gray-600">
                                {formatDbTimestamp(requestData.updatedAt)}
                              </span>
                            </div>
                          )}
                          {/* <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-700">Last Update Time</span>
                            <span className="text-sm text-gray-600">
                              { formatDbTimestamp(requestData.updatedAt)}
                            </span>s
                          </div> */}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="resolution" className="space-y-6">
                  {session?.user?.isTechnician ? (
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">Resolution</CardTitle>
                        {(() => {
                          const fd: any = requestData.formData || {};
                          const resBlock = fd.resolution || {};
                          const html = String(resBlock.closureComments || fd.closureComments || '').trim();
                          const hasExistingResolution = html.length > 0;
                          const isResolved = requestData?.status?.toLowerCase() === 'resolved';
                          
                          if (hasExistingResolution && !isEditingResolution && isResolved) {
                            return (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsEditingResolution(true)}
                                className="flex items-center gap-2"
                              >
                                <Edit className="h-4 w-4" />
                                Edit
                              </Button>
                            );
                          } else if (isEditingResolution) {
                            // Show Save/Cancel buttons when editing
                            return (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={async () => {
                                    if (!session?.user?.isTechnician) { 
                                      toast({ title: 'Not allowed', description: 'Only technicians can update resolution.', variant: 'destructive' }); 
                                      return; 
                                    }
                                    
                                    // Basic validation for resolution notes
                                    if (!resNotes || htmlToText(resNotes).trim().length === 0) {
                                      toast({ title: 'Validation Error', description: 'Please provide resolution notes before saving.', variant: 'destructive' });
                                      return;
                                    }
                                    
                                    try {
                                      setSavingResolution(true);
                                      // 1) Upload files if any
                                      let uploaded: any[] = [];
                                      console.log('New files to upload:', resFiles.length);
                                      if (resFiles.length > 0) {
                                        const fd = new FormData();
                                        resFiles.forEach(f => fd.append('files', f));
                                        fd.append('requestId', requestId);
                                        fd.append('type', 'resolution'); // Mark as resolution attachment
                                        console.log('Uploading resolution files with requestId:', requestId);
                                        const up = await fetch('/api/attachments', { method: 'POST', body: fd });
                                        if (up.ok) { 
                                          const j = await up.json(); 
                                          uploaded = j.files || [];
                                          console.log('Uploaded files:', uploaded);
                                        } else {
                                          console.error('File upload failed:', up.status);
                                        }
                                      }
                                      const attachmentIds: string[] = uploaded.map((f: any) => f.id).filter(Boolean);
                                      
                                      // Also include existing resolution attachments that are not marked for deletion
                                      const existingResolutionAttachments = resolutionAttachments.map(att => att.id);
                                      const existingAttachmentsNotDeleted = existingResolutionAttachments.filter(
                                        (id: string) => !attachmentsToDelete.includes(id)
                                      );
                                      
                                      // Combine new and existing attachments
                                      const combinedAttachments = new Set([...attachmentIds, ...existingAttachmentsNotDeleted]);
                                      const allAttachmentIds = Array.from(combinedAttachments);
                                      
                                      console.log('Attachment IDs - New:', attachmentIds);
                                      console.log('Attachment IDs - Existing (not deleted):', existingAttachmentsNotDeleted);
                                      console.log('Attachment IDs - All combined:', allAttachmentIds);
                                      
                                      // Delete attachments marked for deletion
                                      if (attachmentsToDelete.length > 0) {
                                        console.log('Deleting marked attachments:', attachmentsToDelete);
                                        for (const attachmentId of attachmentsToDelete) {
                                          try {
                                            const deleteResponse = await fetch(`/api/requests/${requestId}/attachments/${attachmentId}`, {
                                              method: 'DELETE'
                                            });
                                            if (!deleteResponse.ok) {
                                              console.error('Failed to delete attachment:', attachmentId);
                                            }
                                          } catch (error) {
                                            console.error('Error deleting attachment:', attachmentId, error);
                                          }
                                        }
                                      }
                                      
                                      // Check if request is already resolved - if so, just update resolution content
                                      const isAlreadyResolved = requestData?.status === 'resolved';
                                      
                                      console.log('RESOLUTION SAVE DEBUG - About to send to resolve API:', {
                                        requestId,
                                        attachmentIds: allAttachmentIds,
                                        resNotesLength: resNotes?.length || 0,
                                        isFirstTimeResolving: resStatus === 'resolved' && !isAlreadyResolved,
                                        isUpdatingExisting: isAlreadyResolved
                                      });
                                      
                                      if (resStatus === 'resolved' && !isAlreadyResolved) {
                                        // Only enforce mandatory fields when resolving for the first time
                                        const fd: any = requestData?.formData || {};
                                        const missing: string[] = [];
                                        if (!fd.category && !fd.serviceCategory && !fd.ServiceCategory) missing.push('Service Category');
                                        if (!requestData?.priority) missing.push('Priority');
                                        if (!requestData?.type) missing.push('Request Type');
                                        if (!fd.assignedTechnician && !fd.assignedTechnicianId) missing.push('Technician');
                                        if (!resNotes || htmlToText(resNotes).trim().length === 0) missing.push('Resolution');
                                        if (!resolveClosureCode || resolveClosureCode.trim().length === 0) missing.push('Closure Code');
                                        const worklogs = Array.isArray(fd.worklogs) ? fd.worklogs : [];
                                        if (worklogs.length === 0) missing.push('Work Log');
                                        if (missing.length > 0) {
                                          toast({ title: 'Missing required fields', description: `Please provide: ${missing.join(', ')}` , variant: 'destructive' });
                                          throw new Error('Validation failed');
                                        }
                                        
                                        console.log('Creating new resolution with:', { 
                                          resNotes: resNotes.substring(0, 50) + '...', 
                                          attachmentIds: allAttachmentIds,
                                          newFilesCount: resFiles.length 
                                        });
                                        
                                        const resR = await fetch(`/api/requests/${requestId}/resolve`, {
                                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ 
                                            fcr: false, 
                                            closureCode: resolveClosureCode, 
                                            closureComments: resNotes, // Resolution notes
                                            requestClosureComments: resolveComments || '', // Request closure comments (if any)
                                            attachmentIds: allAttachmentIds 
                                          })
                                        });
                                        
                                        console.log('Resolve response status:', resR.status);
                                        const responseData = await resR.json();
                                        console.log('Resolve response data:', responseData);
                                        
                                        if (!resR.ok) {
                                          console.error('Resolve error response:', responseData);
                                          
                                          let msg = 'Failed to resolve';
                                          if (responseData?.error) {
                                            msg = responseData.error;
                                            if (Array.isArray(responseData.details)) {
                                              msg += `: ${responseData.details.join(', ')}`;
                                            }
                                          }
                                          throw new Error(msg);
                                        }
                                      } else if (isAlreadyResolved) {
                                        // For already resolved requests, call resolve endpoint again to update resolution
                                        console.log('Updating already resolved request with:', { 
                                          resNotes: resNotes.substring(0, 50) + '...', 
                                          attachmentIds: allAttachmentIds,
                                          newFilesCount: resFiles.length 
                                        });
                                        
                                        const resR = await fetch(`/api/requests/${requestId}/resolve`, {
                                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ 
                                            fcr: false, 
                                            closureCode: resolveClosureCode, 
                                            closureComments: resNotes, // Resolution notes
                                            requestClosureComments: resolveComments || '', // Request closure comments (if any)
                                            attachmentIds: allAttachmentIds 
                                          })
                                        });
                                        
                                        console.log('Resolve response status:', resR.status);
                                        const responseData = await resR.json();
                                        console.log('Resolve response data:', responseData);
                                        
                                        if (!resR.ok) {
                                          console.error('Resolve error response:', responseData);
                                          
                                          let msg = 'Failed to update resolution';
                                          if (responseData?.error) {
                                            msg = responseData.error;
                                            if (Array.isArray(responseData.details)) {
                                              msg += `: ${responseData.details.join(', ')}`;
                                            }
                                          }
                                          throw new Error(msg);
                                        }
                                      } else {
                                        // For other status updates
                                        const resS = await fetch(`/api/requests/${requestId}/status`, {
                                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ status: resStatus, notes: resNotes, attachmentIds: allAttachmentIds })
                                        });
                                        if (!resS.ok) {
                                          let msg = 'Failed to update status';
                                          try { 
                                            const j = await resS.json(); 
                                            if (j?.error) msg = j.error; 
                                          } catch {}
                                          throw new Error(msg);
                                        }
                                      }
                                      toast({ title: 'Saved', description: 'Resolution updated.' });
                                      // reset - clear new files, deletion list, keep resolution notes, exit edit mode
                                      setResFiles([]); 
                                      setAttachmentsToDelete([]);
                                      setIsEditingResolution(false);
                                      await fetchRequestData();
                                      await loadResolutionAttachments(); // Reload resolution attachments
                                      
                                      // Redirect to resolution tab if this was a new resolution
                                      if (resStatus === 'resolved' && !isAlreadyResolved) {
                                        setTimeout(() => {
                                          window.location.href = `http://192.168.1.85:3000/requests/view/${requestId}?tab=resolution`;
                                        }, 1000);
                                      }
                                    } catch (e) {
                                      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed to save resolution', variant: 'destructive' });
                                    } finally {
                                      setSavingResolution(false);
                                    }
                                  }}
                                  disabled={savingResolution}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  {savingResolution ? 'Saving...' : 'Save'}
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => { 
                                    // Reset to original values instead of clearing
                                    const fd: any = requestData?.formData || {};
                                    const resBlock = fd.resolution || {};
                                    const originalResolution = String(resBlock.closureComments || fd.closureComments || '').trim();
                                    const originalClosureCode = String(resBlock.closureCode || '').trim();
                                    const originalRequestClosureComments = String(resBlock.requestClosureComments || '').trim();
                                    
                                    setResNotes(originalResolution); 
                                    setResolveClosureCode(originalClosureCode);
                                    setResolveComments(originalRequestClosureComments);
                                    setResFiles([]);
                                    setAttachmentsToDelete([]);
                                    setResStatus(requestData?.status || 'open'); 
                                    setIsEditingResolution(false);
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {(() => {
          const fd: any = requestData.formData || {};
          const resBlock = fd.resolution || {};
          const html = String(resBlock.closureComments || fd.closureComments || '').trim();
          const requestClosureComments = String(resBlock.requestClosureComments || '').trim();
          const closureCode = String(resBlock.closureCode || '').trim();
          // Use resolution attachments from database instead of filtering from general attachments
          const resAtts: AttachmentFile[] = (resolutionAttachments || []).filter(a => 
            !attachmentsToDelete.includes(a.id)
          );
          const hasExistingResolution = html.length > 0 || resAtts.length > 0 || closureCode.length > 0 || requestClosureComments.length > 0;                          // Show existing resolution in read-only mode if not editing
                          if (hasExistingResolution && !isEditingResolution) {
                            return (
                              <div className="space-y-4">
                                {/* Resolution Content */}
                                {html && (
                                  <div>
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">Resolution Notes</label>
                                    <div
                                      className="bg-gray-50 border rounded p-3 prose max-w-none"
                                      dangerouslySetInnerHTML={{ __html: html }}
                                    />
                                  </div>
                                )}
                                {/* Request Closure Comments */}
                                {/* {requestClosureComments && (
                                  <div>
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">Request Closure Comments</label>
                                    <div className="bg-blue-50 border rounded p-3 text-sm text-gray-700">
                                      {requestClosureComments}
                                    </div>
                                  </div>
                                )} */}
                                {/* Attachments */}
                                <div className="border rounded">
                                  <div className="px-3 py-2 border-b bg-gray-50 text-sm font-medium text-gray-700">Attachments</div>
                                  <div className="p-3 space-y-2">
                                    {resAtts.length === 0 ? (
                                      <div className="text-sm text-gray-500">There are no files attached</div>
                                    ) : (
                                      resAtts.map((a) => (
                                        <div key={a.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border">
                                          <Paperclip className="h-4 w-4 text-gray-400" />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{a.originalName}</p>
                                            <p className="text-xs text-gray-500">{formatFileSize(a.size)}</p>
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDownloadAttachment(a.id, a.originalName)}
                                            disabled={downloading === a.id}
                                          >
                                            <Download className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          // Show editing interface (either no existing resolution or in edit mode)
                          return (
                            <>
                              {/* Rich editor for resolution notes */}
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">Resolution Notes</label>
                                <RichTextEditor
                                  value={resNotes}
                                  onChange={setResNotes}
                                  placeholder="Type resolution notes here..."
                                  className="min-h-[180px]"
                                />
                              </div>

                              {/* Attachments section */}
                              <div className="border rounded">
                                <div className="px-3 py-2 border-b bg-gray-50 text-sm font-medium text-gray-700">Attachments</div>
                                <div className="p-3 space-y-3">
                                  {(() => {
                                    // Use resolution attachments from database instead of filtering from general attachments
                                    const existingAtts: AttachmentFile[] = (resolutionAttachments || []).filter(a => 
                                      !attachmentsToDelete.includes(a.id)
                                    );
                                    const hasExistingAttachments = existingAtts.length > 0;
                                    const hasNewFiles = resFiles.length > 0;

                                    return (
                                      <>
                                        {/* Existing Attachments */}
                                        {hasExistingAttachments && (
                                          <div className="space-y-2">
                                            <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Existing Attachments</div>
                                            {existingAtts.map((att) => (
                                              <div key={att.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                                                <div className="flex items-center gap-2">
                                                  <Paperclip className="h-4 w-4 text-gray-400" />
                                                  <span className="text-sm text-gray-700">{att.originalName}</span>
                                                  <span className="text-xs text-gray-500">({formatFileSize(att.size)})</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDownloadAttachment(att.id, att.originalName)}
                                                    disabled={downloading === att.id}
                                                    className="text-blue-600 hover:text-blue-700"
                                                  >
                                                    <Download className="h-4 w-4" />
                                                  </Button>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteResolutionAttachment(att.id, att.originalName)}
                                                    className="text-red-600 hover:text-red-700"
                                                  >
                                                    <X className="h-4 w-4" />
                                                  </Button>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                        {/* New Files Being Added */}
                                        {hasNewFiles && (
                                          <div className="space-y-2">
                                            <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">New Files to Add</div>
                                            {resFiles.map((file, idx) => (
                                              <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                                                <div className="flex items-center gap-2">
                                                  <Paperclip className="h-4 w-4 text-gray-400" />
                                                  <span className="text-sm text-gray-700">{file.name}</span>
                                                  <span className="text-xs text-gray-500">({(file.size/1024/1024).toFixed(2)} MB)</span>
                                                </div>
                                                <button 
                                                  className="text-red-500 hover:text-red-600 p-1" 
                                                  onClick={() => setResFiles(prev => prev.filter((_, i) => i !== idx))}
                                                >
                                                  <X className="h-4 w-4" />
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                        {/* No attachments message */}
                                        {!hasExistingAttachments && !hasNewFiles && (
                                          <div className="text-sm text-gray-500">There are no files attached</div>
                                        )}
                                      </>
                                    );
                                  })()}

                                  {/* File Upload Area */}
                                  <div
                                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${resDragActive ? 'border-gray-400 bg-gray-50' : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'}`}
                                    onDragOver={(e) => { e.preventDefault(); setResDragActive(true); }}
                                    onDragLeave={(e) => { e.preventDefault(); setResDragActive(false); }}
                                    onDrop={(e) => { e.preventDefault(); setResDragActive(false); const files = Array.from(e.dataTransfer.files).filter(f => f.size <= 20*1024*1024); setResFiles(prev => [...prev, ...files]); }}
                                    onClick={() => resFileInputRef.current?.click()}
                                  >
                                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                                      <Paperclip className="h-4 w-4" />
                                      <span className="text-blue-600 hover:underline cursor-pointer">Browse Files</span>
                                      <span>or Drag files here [ Max size: 20 MB ]</span>
                                    </div>
                                    <input ref={resFileInputRef} type="file" multiple className="hidden" onChange={(e) => { if (!e.target.files) return; const files = Array.from(e.target.files).filter(f => f.size <= 20*1024*1024); setResFiles(prev => [...prev, ...files]); }} />
                                  </div>
                                </div>
                              </div>

                          {/* Actions Section */}
                          <div className="border rounded">
                            <div className="px-3 py-2 border-b bg-gray-50 text-sm font-medium text-gray-700">Request Actions</div>
                            <div className="p-4">
                              {requestData?.status === 'resolved' ? (
                                <div className="w-full border rounded px-3 py-2 text-sm bg-green-50 border-green-200 text-green-800 font-medium text-center">
                                  ✓ Request Resolved
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <div className="flex flex-col sm:flex-row gap-3">
                                    <Button
                                      onClick={() => setShowWorkLogModal(true)}
                                      variant="outline"
                                      className="flex items-center justify-center gap-2 flex-1"
                                    >
                                      <Plus className="h-4 w-4" />
                                      Add Work Log
                                    </Button>
                                    <Button
                                      onClick={() => {
                                        // Check if resolution notes are provided first
                                        if (!resNotes || htmlToText(resNotes).trim().length === 0) {
                                          toast({
                                            title: "Resolution Notes Required",
                                            description: "Please provide resolution notes before resolving the request.",
                                            variant: "destructive",
                                          });
                                          return;
                                        }
                                        
                                        // Then check if there are worklogs
                                        const fd: any = requestData?.formData || {};
                                        const worklogs = Array.isArray(fd.worklogs) ? fd.worklogs : [];
                                        const hasWorkLogs = worklogs.length > 0;
                                        
                                        if (!hasWorkLogs) {
                                          toast({
                                            title: "Worklog Required",
                                            description: "You must add at least one worklog before resolving the request.",
                                            variant: "destructive",
                                          });
                                          
                                          // Show worklog modal
                                          setShowWorkLogModal(true);
                                          return;
                                        }
                                        
                                        // Show Resolve modal if both resolution notes and worklogs exist
                                        setShowResolveModal(true);
                                      }}
                                      className="bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2 flex-1"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                      Resolve Request
                                    </Button>
                                  </div>
                                  <div className="text-xs text-gray-500 text-center">
                                    Add work logs to document your progress, then resolve when complete
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </CardContent>
                    </Card>
                  ) : (
                    // Read-only Resolution for requesters (non-technicians)
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Resolution</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {(() => {
                          const fd: any = requestData.formData || {};
                          const resBlock = fd.resolution || {};
                          const html = String(resBlock.closureComments || fd.closureComments || '').trim();
                          const requestClosureComments = String(resBlock.requestClosureComments || '').trim();
                          // Use the same resolutionAttachments that technician view uses
                          const resAtts: AttachmentFile[] = resolutionAttachments || [];
                          const hasContent = html.length > 0 || resAtts.length > 0 || requestClosureComments.length > 0;

                          if (!hasContent) {
                            return (
                              <div className="w-full">
                                <div className="bg-gray-50 border rounded p-4 text-sm text-gray-600 flex items-center gap-2">
                                  <Info className="h-4 w-4 text-gray-500" />
                                  No Resolution Available
                                </div>
                              </div>
                            );
                          }

                          return (
                            <>
                              {/* Resolution HTML */}
                              {html && (
                                <div>
                                  <label className="text-sm font-medium text-gray-700 mb-2 block">Resolution Notes</label>
                                  <div
                                    className="bg-white border rounded p-3 prose max-w-none"
                                    dangerouslySetInnerHTML={{ __html: html }}
                                  />
                                </div>
                              )}
                              {/* Request Closure Comments */}
                              {requestClosureComments && (
                                <div>
                                  <label className="text-sm font-medium text-gray-700 mb-2 block">Request Closure Comments</label>
                                  <div className="bg-blue-50 border rounded p-3 text-sm text-gray-700">
                                    {requestClosureComments}
                                  </div>
                                </div>
                              )}
                              {/* Attachments */}
                              <div className="border rounded">
                                <div className="px-3 py-2 border-b bg-gray-50 text-sm font-medium text-gray-700">Attachments</div>
                                <div className="p-3 space-y-2">
                                  {resAtts.length === 0 ? (
                                    <div className="text-sm text-gray-500">There are no files attached</div>
                                  ) : (
                                    resAtts.map((a) => (
                                      <div key={a.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border">
                                        <Paperclip className="h-4 w-4 text-gray-400" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-gray-900 truncate">{a.originalName}</p>
                                          <p className="text-xs text-gray-500">{formatFileSize(a.size)}</p>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDownloadAttachment(a.id, a.originalName)}
                                          disabled={downloading === a.id}
                                        >
                                          <Download className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  )}
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
                            const hasPending = levelApprovals.some((app: any) => app.status === 'not_sent' || app.status === 'pending_approval' || app.status === 'for_clarification');
                            const hasRejected = levelApprovals.some((app: any) => app.status === 'rejected');
                            
                            // Check if all previous levels are approved
                            const currentLevelNumber = parseInt(level);
                            const previousLevels = levels.filter(l => parseInt(l) < currentLevelNumber);
                            const allPreviousLevelsApproved = previousLevels.every(prevLevel => {
                              const prevLevelApprovals = approvalsByLevel[parseInt(prevLevel)];
                              return prevLevelApprovals.every((app: any) => app.status === 'approved');
                            });
                            
                            let levelStatus = 'Yet to Progress';
                            let levelIcon = Clock;
                            let levelBgColor = 'bg-gray-400';
                            
                            // Check if request is closed or cancelled
                            if (requestData?.status === 'closed' || requestData?.status === 'cancelled') {
                              if (requestData?.status === 'closed') {
                                levelStatus = 'Yet to Progress ';
                              } else if (requestData?.status === 'cancelled') {
                                levelStatus = 'Yet to Progress ';
                              }
                              levelIcon = Clock;
                              levelBgColor = 'bg-gray-400';
                            } else if (hasRejected) {
                              levelStatus = 'Rejected';
                              levelIcon = AlertCircle;
                              levelBgColor = 'bg-red-500';
                            } else if (hasApproved && !hasPending) {
                              levelStatus = 'Approved';
                              levelIcon = CheckCircle;
                              levelBgColor = 'bg-green-500';
                            } else if (hasPending && allPreviousLevelsApproved) {
                              // Only show "In Progress" if previous levels are approved
                              levelStatus = 'In Progress';
                              levelIcon = Clock;
                              levelBgColor = 'bg-orange-500';
                            } else if (hasPending && !allPreviousLevelsApproved) {
                              // Keep "Yet to Progress" if previous levels aren't complete
                              levelStatus = 'Yet to Progress';
                              levelIcon = Clock;
                              levelBgColor = 'bg-gray-400';
                            }
                            
                            const IconComponent = levelIcon;

                            return (
                              <Card key={level} className="border-l-4 border-l-blue-500">
                                <CardHeader className="pb-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${levelBgColor}`}>
                                        <IconComponent className="h-5 w-5 text-white" />
                                      </div>
                                      <div>
                                        <h3 className="font-semibold text-gray-900">
                                          Level {level}: {levelName}
                                        </h3>
                                        <p className="text-sm text-gray-600">{levelStatus}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {levelStatus === 'In Progress' && session?.user?.isTechnician && (
                                        <>
                                          <Button size="sm" variant="outline" className="text-xs">
                                            Send for Approval
                                          </Button>
                                          <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="text-xs"
                                            onClick={() => setShowAddApprovalModal(true)}
                                          >
                                            + Add Approver
                                          </Button>
                                        </>
                                      )}
                                      <button 
                                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                                        onClick={() => toggleApprovalLevel(level)}
                                        title={collapsedLevels[level] ? 'Expand level' : 'Collapse level'}
                                      >
                                        {collapsedLevels[level] ? (
                                          <ChevronDown className="h-4 w-4 text-gray-600" />
                                        ) : (
                                          <ChevronUp className="h-4 w-4 text-gray-600" />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </CardHeader>
                                
                                {/* Individual Approvers Section */}
                                {!collapsedLevels[level] && (
                                  <CardContent className="pt-0">
                                    <div className="space-y-4">
                                      {levelApprovals.map((approval: any, index: number) => (
                                        <Card key={approval.id || index} className="bg-gray-50 border border-gray-200">
                                          <CardContent className="p-4">
                                            <div className="flex items-start justify-between mb-3">
                                              <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                  <User className="h-5 w-5 text-blue-600" />
                                                </div>
                                                <div>
                                                  <h4 className="font-medium text-gray-900">
                                                    {approval.approver?.emp_fname && approval.approver?.emp_lname 
                                                      ? `${approval.approver.emp_fname} ${approval.approver.emp_lname}` 
                                                      : approval.approver || approval.approverName || 'Unknown Approver'
                                                    }
                                                  </h4>
                                                  <p className="text-sm text-gray-600">
                                                    {approval.approver?.emp_email || approval.approverEmail || 'No email'}
                                                  </p>
                                                </div>
                                              </div>
                                              
                                              <div className="flex items-center gap-2">
                                                {/* Status Badge */}
                                                <div className="flex items-center gap-1.5 min-w-[190px] justify-end">
                                                  {(() => {
                                                    // Check if any approval has been rejected in the entire workflow
                                                    const hasAnyRejection = approvals.some((app: any) => app.status === 'rejected');
                                                    
                                                    // If there's a rejection and this approval is pending/for_clarification, show N/A
                                                    const isPendingOrForClarification = approval.status === 'pending_approval' || 
                                                                                       approval.status === 'for_clarification' || 
                                                                                       approval.status === 'not_sent';
                                                    
                                                    if (hasAnyRejection && isPendingOrForClarification && approval.status !== 'rejected') {
                                                      return (
                                                        <>
                                                        </>
                                                      );
                                                    }

                                                    // Original status logic
                                                    if (approval.status === 'approved') {
                                                      return (
                                                        <>
                                                          <CheckCircle className="h-4 w-4 text-green-500" />
                                                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                            Approved
                                                          </Badge>
                                                        </>
                                                      );
                                                    } else if (approval.status === 'rejected') {
                                                      return (
                                                        <>
                                                          <AlertCircle className="h-4 w-4 text-red-500" />
                                                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                                            Rejected
                                                          </Badge>
                                                        </>
                                                      );
                                                    } else if (approval.status === 'acknowledged') {
                                                      return (
                                                        <>
                                                          <CheckCircle className="h-4 w-4 text-gray-500" />
                                                          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                                                            Acknowledged
                                                          </Badge>
                                                        </>
                                                      );
                                                    } else if (approval.status === 'for_clarification') {
                                                      return (
                                                        <>
                                                          <Clock className="h-4 w-4 text-sky-500" />
                                                          <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                                                            For Clarification
                                                          </Badge>
                                                        </>
                                                      );
                                                    } else {
                                                      return (
                                                        <>
                                                          <Clock className="h-4 w-4 text-orange-500" />
                                                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                                            Pending Approval
                                                          </Badge>
                                                        </>
                                                      );
                                                    }
                                                  })()}
                                                </div>

                                                {/* Conversation Button */}
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => toggleConversation(approval.id)}
                                                  className="h-8 w-8 p-0 hover:bg-blue-50 relative shrink-0"
                                                >
                                                  <MessageSquare className="h-4 w-4 text-blue-600" />
                                                  
                                                  {/* Red Unread Messages Badge from Approvers */}
                                                  {unreadCounts[approval.id] > 0 && (
                                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-medium leading-none">
                                                      {unreadCounts[approval.id]}
                                                    </span>
                                                  )}
                                                </Button>

                                                {/* Message Count Display (always show total) */}
                                                <span className="text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-1 whitespace-nowrap">
                                                  {(approvalConversations[approval.id]?.length || 0)} messages
                                                </span>
                                              </div>
                                            </div>

                                            {/* Approval Details */}
                                            <div className="grid grid-cols-3 gap-4 text-sm">
                                              <div>
                                                <span className="text-gray-500">Sent On:</span>
                                                <p className="font-medium">
                                                  {(() => {
                                                    if (approval.sentOn) {
                                                      return formatDbTimestamp(approval.sentOn);
                                                    } else if (approval.level === 1) {
                                                      return requestData?.createdAt ? formatDbTimestamp(requestData.createdAt) : '-';
                                                    } else {
                                                      const previousLevel = approval.level - 1;
                                                      const previousApproval = approvals.find((app: any) => 
                                                        app.level === previousLevel && app.status === 'approved'
                                                      );
                                                      return previousApproval?.actedOn ? formatDbTimestamp(previousApproval.actedOn) : '-';
                                                    }
                                                  })()}
                                                </p>
                                              </div>
                                              <div>
                                                <span className="text-gray-500">Acted On:</span>
                                                <p className="font-medium">
                                                  {approval.actedOn ? formatDbTimestamp(approval.actedOn) : '-'}
                                                </p>
                                              </div>
                                              <div>
                                                <span className="text-gray-500">Comments:</span>
                                                <p className="font-medium">
                                                  {approval.comments || '-'}
                                                </p>
                                              </div>
                                            </div>

                                            {/* Conversation Panel */}
                                            {conversationStates[approval.id] && (
                                              <div className="mt-4 border-t pt-4 bg-white rounded-lg p-4">
                                                <div className="flex items-center gap-2 mb-3">
                                                  <MessageSquare className="h-4 w-4 text-blue-600" />
                                                  <h5 className="text-sm font-medium text-gray-900">
                                                    Conversation with {approval.approver?.emp_fname || approval.approverName || 'Approver'}
                                                  </h5>
                                                </div>
                                                
                                                {/* Messages Container */}
                                                <div 
                                                  ref={(el) => {
                                                    conversationRefs.current[approval.id] = el;
                                                  }}
                                                  className="max-h-64 overflow-y-auto space-y-2 mb-3 bg-gray-50 border rounded-lg p-3"
                                                >
                                                  {approvalConversations[approval.id] && approvalConversations[approval.id].length > 0 ? (
                                                    approvalConversations[approval.id].map((conv: ConversationEntry, convIndex: number) => (
                                                      <div key={convIndex} className={`w-full flex ${conv.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`p-3 rounded-lg max-w-[75%] ${
                                                          conv.type === 'user' 
                                                            ? 'bg-blue-100 text-right' 
                                                            : 'bg-gray-100 text-left'
                                                        }`}>
                                                          <div className="flex items-center justify-between mb-1 gap-3">
                                                            <span className="text-xs font-medium text-gray-900 truncate">
                                                              {conv.author}
                                                            </span>
                                                            <span className="text-xs text-gray-500 whitespace-nowrap">
                                                              {formatDbTimestamp(conv.timestamp)}
                                                            </span>
                                                          </div>
                                                          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                                            {conv.message}
                                                          </p>
                                                        </div>
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
                                                      disabled={!newConversationMessage[approval.id]?.trim() || sendingMessage[approval.id]}
                                                      size="sm"
                                                      className="self-end"
                                                    >
                                                      {sendingMessage[approval.id] ? (
                                                        <div className="flex items-center justify-center">
                                                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                                          Sending...
                                                        </div>
                                                      ) : (
                                                        <Reply className="h-4 w-4" />
                                                      )}
                                                    </Button>
                                                    {approval.status === 'pending_approval' && (
                                                      <Button
                                                        onClick={() => requestClarification(approval.id)}
                                                        disabled={!newConversationMessage[approval.id]?.trim() || sendingClarification[approval.id]}
                                                        size="sm"
                                                        variant="outline"
                                                        className="self-end border-orange-300 text-orange-600 hover:bg-orange-50"
                                                      >
                                                        {sendingClarification[approval.id] ? (
                                                          <div className="flex items-center justify-center">
                                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-600 border-t-transparent mr-2"></div>
                                                            Sending...
                                                          </div>
                                                        ) : (
                                                          <AlertCircle className="h-4 w-4" />
                                                        )}
                                                      </Button>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            )}
                                          </CardContent>
                                        </Card>
                                      ))}
                                    </div>
                                  </CardContent>
                                )}
                              </Card>
                            );
                          });
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {session?.user?.isTechnician && (
                  <TabsContent value="worklogs" className="space-y-6">
                    <Card>
                      <CardContent className="py-4">
                        {/* Header + Add New */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="font-medium text-gray-900">Work Logs</div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={openAddWorkLog}>
                              + New
                            </Button>
                          </div>
                        </div>

                        {/* Empty State */}
                        {loadingWorkLogs ? (
                          <div className="text-center text-gray-500 py-8">Loading...</div>
                        ) : (workLogs.length === 0 ? (
                          <div className="text-gray-500 text-sm p-3 border rounded bg-gray-50">
                            No work log is available. "Add New"
                          </div>
                        ) : (
                          <div className="overflow-x-auto border rounded">
                            <table className="min-w-full text-sm">
                              <thead className="bg-gray-50 text-gray-600">
                                <tr>
                                  <th className="text-left px-3 py-2">Owner</th>
                                  <th className="text-left px-3 py-2">Time Taken</th>
                                  <th className="text-left px-3 py-2">Start Time</th>
                                  <th className="text-left px-3 py-2">End Time</th>
                                  <th className="text-left px-3 py-2">Description</th>
                                  <th className="text-left px-3 py-2">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {workLogs.map((wl: any) => {
                                  const hrs = Math.floor((wl.timeTakenMinutes || 0) / 60);
                                  const mins = (wl.timeTakenMinutes || 0) % 60;
                                  return (
                                    <tr key={wl.id} className="border-t hover:bg-gray-50">
                                      <td className="px-3 py-2">{wl.ownerName || '-'}</td>
                                      <td className="px-3 py-2">{String(hrs).padStart(2,'0')} hr {String(mins).padStart(2,'0')} min</td>
                                      <td className="px-3 py-2">{wl.startTime ? formatDbTimestamp(wl.startTime) : '-'}</td>
                                      <td className="px-3 py-2">{wl.endTime ? formatDbTimestamp(wl.endTime) : '-'}</td>
                                      <td className="px-3 py-2 truncate max-w-[200px]" title={htmlToText(wl.description)}>{htmlToText(wl.description)}</td>
                                      <td className="px-3 py-2 space-x-1">
                                        <Button variant="outline" size="sm" onClick={() => openEditWorkLog(wl)} className="h-8 w-8 p-0" title="Edit work log">
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50 h-8 w-8 p-0" onClick={() => deleteWorkLog(wl)} title="Delete work log">
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}

                <TabsContent value="history" className="space-y-6">
                  <Card>
                    <CardContent className="py-6">
                      {/* 🎯 STANDARDIZED HISTORY SYSTEM - Scrollable Chat-like Timeline */}
                      <div className="h-[510px] overflow-y-auto border rounded-lg bg-gray-50 p-4">
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
                                  case 'WorkLog Updated':
                                  case 'WorkLog Deleted':
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
                                  case 'WorkLog Updated': return 30;
                                  case 'WorkLog Deleted': return 30;
                                  case 'Conversation Message': return 35;
                                  case 'Resolved': return 40;
                                  case 'Request Approved - Ready for Work': return 40;
                                  case 'Reopened': return 20;
                                  case 'Closed': return 40;
                                  case 'Request Closed': return 40;
                                  default: return 100; // API/External entries
                                }
                              };

                              // Hide conversations and internal noise from history
                              const HIDDEN_ACTIONS = new Set([
                                'Conversation Message',
                                // Hide internal/system noise entries not desired in UI
                                'SLA/Assignment Error',
                                'Request Approved - Ready for Work',
                                'Auto-Assignment Completed',
                              ]);

                              const visibleHistory = (history || []).filter((e: any) => !HIDDEN_ACTIONS.has(e.action));

                              // Sort by timestamp (newest first for display - latest at top)
                              const sortedHistory = [...visibleHistory].sort((a, b) => {
                                return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
                              });

                              // Group by date
                              const groupedByDate = sortedHistory.reduce((acc: any, entry: any) => {
                                const date = formatDbTimestamp(entry.timestamp, { dateOnly: true });
                                
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
                                      .map((entry: any, index: number) => {
                                        // Transform 'Next Level Activated' to detailed 'Approvals Initiated' style
                                        let displayAction = entry.action;
                                        let customDetails: JSX.Element | null = null;
                                        const actorLower = String(entry.actor || entry.actorName || '').toLowerCase();
                                        // Auto-approval note when an approver already approved in a previous level
                                        if (entry.action === 'Approved' && actorLower === 'system') {
                                          try {
                                            const entryTs = normalizeTsKey(entry.timestamp);
                                            const aList = (approvals as any[]) || [];
                                            // Find approvals approved at the same timestamp
                                            const sameTimeApproved = aList.filter(a => a.status === 'approved' && normalizeTsKey(a.actedOn) === entryTs);
                                            const getKey = (a: any) => (a.approver?.emp_email || a.approverEmail || a.approverId || a.approver || '').toString().toLowerCase();
                                            const names: string[] = [];
                                            for (const a of sameTimeApproved) {
                                              const key = getKey(a);
                                              if (!key) continue;
                                              // Did this approver approve any previous level before?
                                              const approvedBefore = aList.some(b => b.level < a.level && b.status === 'approved' && getKey(b) === key);
                                              if (approvedBefore) {
                                                const ap = a.approver;
                                                let name = '';
                                                if (ap && typeof ap === 'object') {
                                                  name = `${(ap.emp_fname || '').trim()} ${(ap.emp_lname || '').trim()}`.trim();
                                                  if (!name) name = ap.emp_email || '';
                                                }
                                                if (!name) name = (a.approverName || a.approver || a.approverEmail || '').toString();
                                                if (name) names.push(name);
                                              }
                                            }
                                            if (names.length > 0) {
                                              customDetails = (
                                                <div className="text-sm text-gray-500 whitespace-pre-line">
                                                  <div>
                                                    <span className="font-medium">Approved By :</span> {names.join(', ')}
                                                    <span className="font-medium">(Auto approved by System Since the Approver has already approved in one of the previous levels.)</span>
                                                  </div>
                                                </div>
                                              );
                                            }
                                          } catch (e) {
                                            // Silent fail; keep default details
                                          }
                                        }
                                        if (entry.action === 'Next Level Activated') {
                                          // Try to extract level number from details text e.g., 'Level 2 approvals activated'
                                          const m = String(entry.details || '').match(/Level\s+(\d+)/i);
                                          const targetLevel = m ? parseInt(m[1], 10) : undefined;
                                          if (targetLevel && Array.isArray(approvals) && approvals.length > 0) {
                                            const levelApprovals = (approvals as any[]).filter(a => a.level === targetLevel);
                                            const approverNames = levelApprovals.map(a => {
                                              const ap = a.approver;
                                              if (ap && typeof ap === 'object') {
                                                const fn = (ap.emp_fname || '').trim();
                                                const ln = (ap.emp_lname || '').trim();
                                                return `${fn} ${ln}`.trim() || (ap.emp_email || 'Unknown');
                                              }
                                              return (a.approverName || a.approver || 'Unknown');
                                            }).filter(Boolean);
                                            const levelName = levelApprovals[0]?.name || `Approval Stage ${targetLevel}`;
                                            displayAction = 'Approvals Initiated';
                                            customDetails = (
                                              <div className="text-sm text-gray-500 whitespace-pre-line">
                                                {approverNames.length > 0 && (
                                                  <div>Approver(s) : {approverNames.join(', ')}</div>
                                                )}
                                                <div>Level : {levelName}</div>
                                              </div>
                                            );
                                          }
                                        }
                                        return (
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
                                              {formatDbTimestamp(entry.timestamp, { timeOnly: true })}
                                            </span>
                                            <span className="text-sm font-medium text-gray-700">{displayAction}</span>
                                          </div>
                                          <p className="text-sm text-gray-600 mb-1">
                                            by <span className="font-medium text-blue-600">{entry.actor || entry.actorName}</span>
                                          </p>
                                          {customDetails ? customDetails : (entry.details && (
                                            <div className="text-sm text-gray-500 whitespace-pre-line">{entry.details}</div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                    })}
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
                    Request Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Request Status</span>
                      <Badge className={getStatusColor(requestData.status)} variant="outline">
                        {(() => {
                          const status = requestData.status;
                          if (status === 'for_approval') return 'For Approval';
                          if (status === 'on_hold') return 'On Hold';
                          if (status === 'in_progress') return 'In Progress';
                          return status.charAt(0).toUpperCase() + status.slice(1);
                        })()}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Approval Status</span>
                      {(() => {
                        // For cancelled requests, show N/A
                        if (requestData.status === 'cancelled') {
                          return (
                            <Badge className="bg-gray-100 text-gray-800 border-gray-200" variant="outline">
                              N/A
                            </Badge>
                          );
                        }
                        
                        // For incident templates, show N/A
                        if (templateData?.type === 'incident') {
                          return (
                            <Badge className="bg-gray-100 text-gray-800 border-gray-200" variant="outline">
                              N/A
                            </Badge>
                          );
                        }
                        
                        // For service templates, show actual approval status from approvals array
                        const currentApprovalStatus = getCurrentApprovalStatus(approvals);
                        const { normalized, display } = normalizeApprovalStatus(currentApprovalStatus);
                        
                        return (
                          <Badge className={getApprovalStatusColor(normalized)} variant="outline">
                            {display}
                          </Badge>
                        );
                      })()}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Priority</span>
                      <Badge className={getPriorityColor(requestData.formData?.['2'] || requestData.formData?.priority || 'medium')} variant="outline">
                        {(requestData.formData?.['2'] || requestData.formData?.priority || 'medium').charAt(0).toUpperCase() + (requestData.formData?.['2'] || requestData.formData?.priority || 'medium').slice(1)}
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
                    Requester Details
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
                          <span className="text-gray-600">Land Line No.</span>
                          <span className="font-medium">{requestData.user.landline_no || '-'}</span>
                        </div>
                         <div className="flex justify-between">
                          <span className="text-gray-600">Local No.</span>
                          <span className="font-medium">{requestData.user.local_no || '-'}</span>
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

              {/* Actions */}
              {session?.user?.isTechnician && requestData?.status !== 'cancelled' && requestData?.status !== 'closed' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(() => {
                        // Check if SLA timer should be shown
                        const formData = requestData?.formData || {};
                        const slaDueDate = formData.slaDueDate;
                        const slaStop = formData.slaStop;
                        const currentStatus = requestData?.status;
                        
                        // Hide SLA timer if:
                        // 1. Due date has passed AND status is not 'on_hold' (because on_hold should still allow starting)
                        // 2. SLA has been stopped (slaStop is true) AND status is not 'on_hold'
                        let shouldShowSlaTimer = true;
                        
                        if (slaDueDate) {
                          const dueDate = new Date(slaDueDate);
                          const now = new Date();
                          const hasPassedDueDate = now > dueDate;
                          
                          // Only hide if due date passed and not on_hold, or if slaStop is true and not on_hold
                          if ((hasPassedDueDate && currentStatus !== 'on_hold') || (slaStop === true && currentStatus !== 'on_hold')) {
                            shouldShowSlaTimer = false;
                          }
                        }
                        
                        // Only show SLA timer if conditions are met
                        if (shouldShowSlaTimer) {
                          return (
                            <Button
                              variant="outline"
                              onClick={() => {
                                if (!requestData) return;
                                
                                // Determine action based on current status
                                const currentStatus = requestData.status;
                                if (currentStatus === 'open') {
                                  setSlaTimerAction('stop');
                                } else if (currentStatus === 'on_hold') {
                                  setSlaTimerAction('start');
                                } else {
                                  toast({
                                    title: "Invalid Status",
                                    description: "SLA Timer can only be managed when status is 'Open' or 'On Hold'.",
                                    variant: "destructive"
                                  });
                                  return;
                                }
                                
                                setShowSlaTimerModal(true);
                              }}
                              className="w-full flex items-center justify-center gap-2"
                            >
                              <Clock className="h-4 w-4" />
                              SLA Timer
                            </Button>
                          );
                        }
                        return null;
                      })()}
                      <Button
                        variant="outline"
                        onClick={() => {
                          // Check if current status is resolved or closed
                          if (requestData?.status === 'resolved' || requestData?.status === 'closed') {
                            toast({
                              title: "Status Change Not Allowed",
                              description: "Cannot change status from resolved or closed state.",
                              variant: "destructive"
                            });
                            return;
                          }
                          setShowChangeStatusModal(true);
                        }}
                        className="w-full flex items-center justify-center gap-2"
                      >
                        <Settings className="h-4 w-4" />
                        Change Status
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          // Check if current status allows technician assignment
                          const allowedStatuses = ['open', 'on_hold', 'for_approval'];
                          if (!allowedStatuses.includes(requestData?.status)) {
                            toast({
                              title: "Assignment Not Allowed",
                              description: "Technician can only be assigned when status is Open, On Hold, or For Approval.",
                              variant: "destructive"
                            });
                            return;
                          }
                          setShowAssignModal(true);
                        }}
                        className="w-full flex items-center justify-center gap-2"
                      >
                        <UserCheck className="h-4 w-4" />
                        Assign Technician
                      </Button>
                      {/* Change Type button - with validation */}
                      <Button
                        variant="outline"
                        onClick={() => {
                          // Check if current status is resolved or closed
                          if (requestData?.status === 'resolved' || requestData?.status === 'closed') {
                            toast({
                              title: "Type Change Not Allowed",
                              description: "Cannot change type from resolved or closed state.",
                              variant: "destructive"
                            });
                            return;
                          }
                          setShowChangeTypeModal(true);
                        }}
                        className="w-full flex items-center justify-center gap-2"
                      >
                        <Tag className="h-4 w-4" />
                        Change Type
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Template and SLA Information */}
              {/* {templateData && (
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
                                <span className="text-gray-600">Resolution Time</span>
                                <span className="font-medium">
                                  {templateData.slaService.resolutionDays || 0}d {templateData.slaService.resolutionHours || 0}h
                                </span>
                              </div>
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
              )} */}
            </div>
          </div>
        </div>

        {/* Add Notes Modal */}
        <Dialog open={showNotesModal} onOpenChange={setShowNotesModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Add Notes</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              {/* Rich Text Editor */}
              <div className="border rounded-lg">
                <RichTextEditor
                  value={newNote}
                  onChange={setNewNote}
                  placeholder="Type your note here..."
                  className="min-h-[200px]"
                />
              </div>

              {/* File Upload Section */}
              <div className="space-y-4">
                <div 
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                    dragActive 
                      ? 'border-gray-400 bg-gray-50' 
                      : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
                  }`}
                  onDragOver={handleNoteDragOver}
                  onDragLeave={handleNoteDragLeave}
                  onDrop={handleNoteDrop}
                  onClick={() => noteFileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                    <Paperclip className="h-4 w-4" />
                    <span className="text-blue-600 hover:underline cursor-pointer">Browse Files</span>
                    <span>or Drag files here [ Max size: 20 MB ]</span>
                  </div>
                  <input
                    ref={noteFileInputRef}
                    type="file"
                    multiple
                    onChange={(e) => e.target.files && handleNoteFiles(Array.from(e.target.files))}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt,.zip"
                  />
                </div>

                {/* Display uploaded files */}
                {noteAttachments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Attached Files:</p>
                    {noteAttachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                        <div className="flex items-center gap-2">
                          <Paperclip className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-700">{file.name}</span>
                          <span className="text-xs text-gray-500">
                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeNoteFile(index)}
                          className="text-red-500 hover:text-red-600 p-1"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

           
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowNotesModal(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={addNote}
                disabled={!newNote.trim()}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Approval Modal */}
        <Dialog open={showAddApprovalModal} onOpenChange={setShowAddApprovalModal}>
          <DialogContent className="max-w-2xl max-h-[600px] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Approvers</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* User Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Users
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by name, email, or department..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {loadingUsers && (
                    <div className="absolute right-3 top-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                  )}
                  
                  {/* Search Results Dropdown */}
                  {userSearchTerm.length >= 1 && !loadingUsers && availableUsers.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-auto">
                      {availableUsers.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => addUserToSelection(user)}
                          className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {user.emp_fname} {user.emp_lname}
                              </p>
                              <p className="text-xs text-gray-500">{user.emp_email}</p>
                              {user.department && (
                                <p className="text-xs text-gray-400">{user.department}</p>
                              )}
                              {user.post_des && (
                                <p className="text-xs text-gray-400">{user.post_des}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* No Results Message */}
                  {userSearchTerm.length >= 1 && !loadingUsers && availableUsers.length === 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200">
                      <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        No available users found matching "{userSearchTerm}"
                      </div>
                    </div>
                  )}
                  
                 
                </div>
              </div>

              {/* Selected Users */}
              {selectedUsers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selected Approvers ({selectedUsers.length})
                  </label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-md"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {user.emp_fname} {user.emp_lname}
                            </p>
                            <p className="text-xs text-gray-500">{user.emp_email}</p>
                            {user.department && (
                              <p className="text-xs text-gray-400">{user.department}</p>
                            )}
                            {user.post_des && (
                              <p className="text-xs text-gray-400">{user.post_des}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeUserFromSelection(user.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedUsers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No approvers selected yet</p>
                  <p className="text-xs text-gray-400">Search and select users to add as approvers</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAddApprovalModal(false);
                  setSelectedUsers([]);
                  setUserSearchTerm('');
                  setAvailableUsers([]);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddApprovals}
                disabled={selectedUsers.length === 0 || addingApprovers}
              >
                {addingApprovers ? (
                  <div className="flex items-center">
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </div>
                ) : (
                  `Add ${selectedUsers.length} Approver${selectedUsers.length !== 1 ? 's' : ''}`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Work Log Modal (Add/Edit) */}
        {session?.user?.isTechnician && (
          <Dialog open={showWorkLogModal} onOpenChange={(open) => {
            setShowWorkLogModal(open);
            if (!open) {
              resetWorkLogForm(); // Clear form when modal closes
            }
          }}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>{editingWorkLog ? 'Edit Work Log' : 'New Work Log'}</DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-700">Owner</label>
                  {/* Compact selected-owner display; click to open selector */}
                  {!wlOwnerPickerOpen && (
                    <button
                      type="button"
                      className="w-full mt-1 border rounded px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                      onClick={() => setWlOwnerPickerOpen(true)}
                      title="Click to change owner"
                    >
                      <span className="text-sm text-gray-800 truncate">
                        {wlOwnerName ? wlOwnerName : 'Select owner'}
                      </span>
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    </button>
                  )}
                  {/* Expanded search selector */}
                  {wlOwnerPickerOpen && (
                    <div className="relative mt-1">
                      {/* Selected header like your screenshot */}
                      {wlOwnerName && (
                        <div className="px-3 py-2 text-xs text-gray-600 border rounded-t-md border-b-0 bg-white">
                          {wlOwnerName}
                        </div>
                      )}
                      {/* Search box with icon */}
                      <div className={`relative ${wlOwnerName ? '' : ''}`}>
                        <input
                          autoFocus
                          className={`w-full border ${wlOwnerName ? 'rounded-b-md' : 'rounded-md'} px-2 py-2 pr-8`}
                          placeholder=""
                          value={techSearch}
                          onChange={e => setTechSearch(e.target.value)}
                        />
                        <SearchIcon className="h-4 w-4 text-gray-400 absolute right-2 top-2.5" />
                        {techLoading && <div className="absolute right-8 top-2.5"><RefreshCw className="h-4 w-4 animate-spin text-gray-300"/></div>}
                      </div>
                      {/* Results list */}
                      <div className="absolute z-10 w-full bg-white shadow-lg rounded-b-md border border-t-0 max-h-60 overflow-auto">
                        {techOptions.map(u => {
                          const selected = wlOwnerId === u.id;
                          return (
                            <div
                              key={u.id}
                              className={`px-3 py-2 hover:bg-gray-50 cursor-pointer ${selected ? 'text-blue-600 italic' : ''}`}
                              onClick={() => {
                                setWlOwnerId(u.id);
                                setWlOwnerName(`${u.emp_fname} ${u.emp_lname}`.trim() || u.emp_email);
                                setTechSearch('');
                                setWlOwnerPickerOpen(false);
                              }}
                            >
                              <div className="text-sm font-medium">{u.emp_fname} {u.emp_lname}</div>
                              <div className="text-xs text-gray-500">{u.emp_email}</div>
                            </div>
                          );
                        })}
                        {(!techLoading && techOptions.length === 0) && (
                          <div className="px-3 py-2 text-sm text-gray-500">No technicians found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div></div>
                <div>
                  <label className="text-sm text-gray-700">Start Time</label>
                  <input type="datetime-local" className="w-full border rounded px-2 py-1" value={wlStartTime} onChange={e => setWlStartTime(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-gray-700">End Time</label>
                  <input type="datetime-local" className="w-full border rounded px-2 py-1" value={wlEndTime} onChange={e => setWlEndTime(e.target.value)} />
                </div>
                <div className="flex items-end gap-2">
                  <div>
                    <label className="text-sm text-gray-700">Time Taken</label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <input placeholder="00" className="w-16 border rounded px-2 py-1 text-center" value={wlHours} disabled />
                        <span className="text-sm text-gray-600">hours</span>
                      </div>
                      <span className="text-sm text-gray-400">,</span>
                      <div className="flex items-center gap-1">
                        <input placeholder="00" className="w-16 border rounded px-2 py-1 text-center" value={wlMinutes} disabled />
                        <span className="text-sm text-gray-600">minutes</span>
                      </div>
                    </div>
                  </div>
                  {/* <label className="ml-7 flex items-center gap-2 text-sm"><input type="checkbox" checked={wlIncludeNonOp} onChange={e => setWlIncludeNonOp(e.target.checked)} /> Include non-operational hours</label> */}
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-gray-700">Description</label>
                  <RichTextEditor value={wlDescription} onChange={setWlDescription} placeholder="Describe your work... paste screenshots/images if needed" className="min-h-[180px]" />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setShowWorkLogModal(false);
                  resetWorkLogForm(); // Clear form when Cancel is clicked
                }}>Cancel</Button>
                <Button onClick={saveWorkLog}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Resolve (Close Request) Modal */}
        {session?.user?.isTechnician && (
      <Dialog open={showResolveModal} onOpenChange={setShowResolveModal}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
        <DialogTitle>Resolve Request</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                 
                  <div>
                    <label className="text-sm text-gray-700">Closure Code</label>
                    <select
                      className="w-full border rounded px-2 py-2 mt-2 text-sm"
                      value={resolveClosureCode}
                      onChange={e => setResolveClosureCode(e.target.value)}
                    >
                      <option value="">Select closure code</option>
                      <option value="Resolved - Fixed">Resolved - Fixed</option>
                      <option value="Resolved - Workaround">Resolved - Workaround</option>
                      <option value="Resolved - Knowledge Provided">Resolved - Knowledge Provided</option>
                      <option value="Cancelled - User Request">Cancelled - User Request</option>
                      <option value="Not Reproducible">Not Reproducible</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-700">Resolution Comments</label>
                  <Textarea
                    value={resolveComments}
                    onChange={e => setResolveComments(e.target.value)}
                    placeholder="Add any comments for the requester (optional)"
                    className="min-h-[80px]"
                  />
                </div>
                <div className="text-xs text-gray-500">
      Status will change to Resolved (not Closed) and a history entry will be recorded.
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowResolveModal(false)}>Cancel</Button>
                <Button onClick={async () => {
                  try {
                    setSavingResolve(true);
                    
                    // Validate required fields
                    if (!resolveClosureCode.trim()) {
                      toast({
                        title: "Validation Error",
                        description: "Please select a closure code before resolving.",
                        variant: "destructive"
                      });
                      return;
                    }
                    
                    // Check if resolution notes are provided in the Resolution tab
                    if (!resNotes || htmlToText(resNotes).trim().length === 0) {
                      toast({
                        title: "Validation Error", 
                        description: "Please provide resolution notes in the Resolution tab before resolving.",
                        variant: "destructive"
                      });
                      setShowResolveModal(false);
                      handleTabChange('resolution'); // Switch to resolution tab
                      return;
                    }
                    
                    // Include uploaded attachments from the Resolution tab
                    let uploaded: any[] = [];
                    console.log('Resolve Modal - Checking for new files to upload:', resFiles.length);
                    if (resFiles.length > 0) {
                      const fd = new FormData();
                      resFiles.forEach(f => fd.append('files', f));
                      fd.append('requestId', requestId);
                      fd.append('type', 'resolution'); // Mark as resolution attachment
                      console.log('Resolve Modal - Uploading files with requestId:', requestId);
                      const up = await fetch('/api/attachments', { method: 'POST', body: fd });
                      if (up.ok) { 
                        const j = await up.json(); 
                        uploaded = j.files || [];
                        console.log('Resolve Modal - Uploaded files:', uploaded);
                      } else {
                        console.error('Resolve Modal - File upload failed:', up.status);
                      }
                    }
                    
                    // Get new attachment IDs
                    const newAttachmentIds: string[] = uploaded.map((f: any) => f.id).filter(Boolean);
                    
                    // Also include existing resolution attachments that are not marked for deletion
                    const existingResolutionAttachments = resolutionAttachments.map(att => att.id);
                    const existingAttachmentsNotDeleted = existingResolutionAttachments.filter(
                      (id: string) => !attachmentsToDelete.includes(id)
                    );
                    
                    // Combine new and existing attachments
                    const allAttachmentIds = Array.from(new Set([...newAttachmentIds, ...existingAttachmentsNotDeleted]));
                    
                    console.log('Resolve Modal - New attachment IDs:', newAttachmentIds);
                    console.log('Resolve Modal - Existing attachments (not deleted):', existingAttachmentsNotDeleted);
                    console.log('Resolve Modal - All combined attachment IDs:', allAttachmentIds);
                    
                    // Delete attachments marked for deletion
                    if (attachmentsToDelete.length > 0) {
                      console.log('Resolve Modal - Deleting marked attachments:', attachmentsToDelete);
                      for (const attachmentId of attachmentsToDelete) {
                        try {
                          const deleteResponse = await fetch(`/api/requests/${requestId}/attachments/${attachmentId}`, {
                            method: 'DELETE'
                          });
                          if (!deleteResponse.ok) {
                            console.error('Resolve Modal - Failed to delete attachment:', attachmentId);
                          }
                        } catch (error) {
                          console.error('Resolve Modal - Error deleting attachment:', attachmentId, error);
                        }
                      }
                    }
                    
                    // Don't merge comments - send them separately to preserve both
                    const resolutionNotes = resNotes || ''; // Resolution notes from Resolution tab
                    const requestClosureComments = resolveComments || ''; // Request closure comments from modal
                    
                    const res = await fetch(`/api/requests/${requestId}/resolve`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        fcr: resolveFcr,
                        closureCode: resolveClosureCode,
                        closureComments: resolutionNotes, // Resolution notes
                        requestClosureComments: requestClosureComments, // Request closure comments
                        attachmentIds: allAttachmentIds  // Include attachment IDs
                      })
                    });
                    if (!res.ok) throw new Error('Failed to resolve');
                    toast({ title: 'Resolved', description: 'Request marked as Resolved.' });
                    setShowResolveModal(false);
                    // Reset fields
                    setResolveFcr(false);
                    setResolveClosureCode('');
                    setResolveComments('');
                    // Reset resolution tab files and attachments
                    setResFiles([]);
                    setAttachmentsToDelete([]);
                    await fetchRequestData();
                    await loadResolutionAttachments(); // Reload resolution attachments
                    handleTabChange('history');
                  } catch (e) {
                    toast({ title: 'Error', description: 'Failed to resolve request', variant: 'destructive' });
                  } finally {
                    setSavingResolve(false);
                  }
                }} disabled={savingResolve}>{savingResolve ? 'Saving...' : 'Resolve'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

     
       

        {/* Change Type Modal */}
        {showChangeTypeModal && (
          <Dialog open={showChangeTypeModal} onOpenChange={setShowChangeTypeModal}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Change Type</DialogTitle>
                <DialogDescription>
                 Change Incident to Service Template
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-700 mb-2 block">Service Category</label>
                  <select
                    className="w-full border rounded px-2 py-2 text-sm"
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      // Load templates for selected category
                      const categoryTemplates = availableTemplates.filter(template => 
                        template.category?.id === parseInt(e.target.value)
                      );
                      setCategoryTemplates(categoryTemplates);
                      setSelectedTemplate('');
                    }}
                  >
                    <option value="">Select Category</option>
                    {availableCategories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {selectedCategory && categoryTemplates.length > 0 && (
                  <div>
                    <label className="text-sm text-gray-700 mb-2 block">Templates</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {categoryTemplates.map(template => (
                        <div 
                          key={template.id}
                          className={`p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                            selectedTemplate === template.id.toString() ? 'border-blue-500 bg-blue-50' : ''
                          }`}
                          onClick={() => setSelectedTemplate(template.id.toString())}
                        >
                          <div className="font-medium text-sm">{template.name}</div>
                          {template.description && (
                            <div className="text-xs text-gray-500 mt-1">{template.description}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowChangeTypeModal(false)}>
                  Cancel
                </Button>
                <Button 
                  disabled={!selectedTemplate}
                  onClick={() => {
                    // Handle change type logic here
                    toast({
                      title: "Type Changed",
                      description: "Request type has been updated successfully.",
                      className: "bg-yellow-50 border-yellow-200 text-yellow-800"
                    });
                    setShowChangeTypeModal(false);
                    setSelectedCategory('');
                    setSelectedTemplate('');
                  }}
                >
                  Change Type
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Assign Modal */}
        {showAssignModal && (
          <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Assign Technician</DialogTitle>
                {requestData?.formData?.assignedTechnician && (
                  <div className="text-sm text-gray-600 mt-2">
                    Currently assigned to: <span className="font-medium">{requestData.formData.assignedTechnician}</span>
                  </div>
                )}
              </DialogHeader>
              <div className="space-y-4">
                <div>
                
                  <select
                    className="w-full border rounded px-2 py-2 text-sm"
                    value={assignedTechnician}
                    onChange={(e) => setAssignedTechnician(e.target.value)}
                  >
                    <option value="">Not Assigned</option>
                    {availableTechnicians.map(tech => (
                      <option key={tech.id} value={tech.id}>
                        {tech.displayName || `${tech.user?.emp_fname || ''} ${tech.user?.emp_lname || ''}`.trim() || tech.user?.emp_email || 'Unknown Technician'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAssignModal(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={async () => {
                    try {
                      setIsAssigning(true);
                      
                      // Find the selected technician and get their userId
                      const selectedTech = availableTechnicians.find(tech => tech.id === assignedTechnician);
                      
                      if (!selectedTech) {
                        toast({
                          title: "Error",
                          description: "Please select a valid technician.",
                          variant: "destructive"
                        });
                        return;
                      }
                      
                      const userIdToSave = selectedTech.userId;
                      const technicianName = selectedTech.displayName || `${selectedTech.user?.emp_fname || ''} ${selectedTech.user?.emp_lname || ''}`.trim();
                      const technicianEmail = selectedTech.user?.emp_email;
                      
                      // Use the dedicated assign endpoint
                      const response = await fetch(`/api/requests/${requestId}/assign`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          technicianId: userIdToSave
                        }),
                      });
                      
                      if (response.ok) {
                        toast({
                          title: "Assigned",
                          description: "Technician has been assigned successfully.",
                          className: "bg-yellow-50 border-yellow-200 text-yellow-800"
                        });
                        // Refresh request data
                        await fetchRequestData();
                        setShowAssignModal(false);
                        setAssignedTechnician('');
                      } else {
                        throw new Error('Failed to assign technician');
                      }
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "Failed to assign technician.",
                        variant: "destructive"
                      });
                    } finally {
                      setIsAssigning(false);
                    }
                  }}
                  disabled={isAssigning}
                >
                  {isAssigning ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Assigning Technician...
                    </div>
                  ) : (
                    "Assign"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Actions Modal */}
        {showActionsModal && (
          <Dialog open={showActionsModal} onOpenChange={setShowActionsModal}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Close Request</DialogTitle>
                <DialogDescription>
                  Do you want to close this request?
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <span className="font-medium text-amber-800">Confirm Close Request</span>
                  </div>
                  <p className="text-sm text-amber-700">
                    This action will close the request and mark it as completed. 
                  </p>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowActionsModal(false)}>
                  No, Cancel
                </Button>
                <Button 
                  disabled={isClosingRequest}
                  onClick={async () => {
                    try {
                      setIsClosingRequest(true);
                      
                      // Update request status to closed and send email notification
                      const response = await fetch(`/api/requests/${requestId}/status`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          status: 'closed',
                          sendEmail: true,
                          emailTemplate: 'acknowledge-cc-closed'
                        }),
                      });
                      
                      if (response.ok) {
                        toast({
                          title: "Request Closed",
                          description: "The request has been successfully closed and notification emails sent.",
                          className: "bg-green-50 border-green-200 text-green-800"
                        });
                        // Refresh request data
                        await fetchRequestData();
                        setShowActionsModal(false);
                      } else {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to close request');
                      }
                    } catch (error) {
                      console.error('Error closing request:', error);
                      toast({
                        title: "Error",
                        description: error instanceof Error ? error.message : "Failed to close request.",
                        variant: "destructive"
                      });
                    } finally {
                      setIsClosingRequest(false);
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isClosingRequest ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Closing...
                    </div>
                  ) : (
                    "Yes, Close Request"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Change Type Modal */}
        {showChangeTypeModal && (
          <Dialog open={showChangeTypeModal} onOpenChange={setShowChangeTypeModal}>
            <DialogContent className="max-w-4xl max-h-[85vh] bg-white border border-gray-200 shadow-xl flex flex-col">
              <DialogHeader className="bg-white border-b border-gray-100 pb-4 flex-shrink-0">
                <DialogTitle className="flex items-center gap-2 text-gray-900">
                  <Tag className="h-5 w-5 text-blue-600" />
                  Change Request Type
                </DialogTitle>
                <DialogDescription className="text-gray-600">
                  Select a service category and then choose a template to change the request type.
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex flex-1 min-h-0 bg-white pt-4">
                {/* Categories List */}
                <div className="w-1/2 border-r border-gray-200 pr-4 bg-white flex flex-col">
                  <div className="mb-3 flex-shrink-0">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Service Categories</h3>
                    <div className="relative">
                      <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search categories..."
                        className="pl-10 text-sm bg-white border-gray-300 text-gray-900"
                        value=""
                        onChange={() => {}}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2 overflow-y-auto flex-1 bg-white pb-4">
                      {availableCategories.map((category: any) => (
                        <div
                          key={category.id}
                          className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                            selectedCategory === String(category.id)
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : 'hover:bg-gray-50 border-gray-200 bg-white'
                          }`}
                          onClick={() => setSelectedCategory(String(category.id))}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              {category.icon ? (
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center p-1">
                                  <img 
                                    src={`/serviceicons/${category.icon}`} 
                                    alt={category.name}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                              ) : (
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                  <Tag className="h-4 w-4 text-blue-600" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-gray-900">{category.name}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {availableCategories.length === 0 && (
                        <div className="text-center py-8 text-gray-500 bg-white">
                          <Tag className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                          <p className="text-sm">No categories available</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Templates List */}
                  <div className="w-1/2 pl-4 bg-white flex flex-col">
                    <div className="mb-3 flex-shrink-0">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Templates</h3>
                      {selectedCategory ? (
                        <p className="text-xs text-gray-500">
                          {categoryTemplates.length} template(s) available
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500">Select a category to view templates</p>
                      )}
                    </div>
                    
                    <div className="space-y-2 overflow-y-auto flex-1 bg-white pb-4">
                      {selectedCategory ? (
                        categoryTemplates.length > 0 ? (
                          categoryTemplates.map((template: any) => (
                            <div
                              key={template.id}
                              className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                                selectedTemplate === String(template.id)
                                  ? 'bg-green-50 border-green-200 text-green-700'
                                  : 'hover:bg-gray-50 border-gray-200 bg-white'
                              }`}
                              onClick={() => setSelectedTemplate(String(template.id))}
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex-shrink-0">
                                  {template.icon ? (
                                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center p-1">
                                      <img 
                                        src={`/serviceicons/${template.icon}`} 
                                        alt={template.name}
                                        className="w-full h-full object-contain"
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                      <FileText className="h-4 w-4 text-green-600" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm text-gray-900">{template.name}</div>
                                  {template.description && (
                                    <div className="text-xs text-gray-500 mt-1">{template.description}</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-gray-500 bg-white">
                            <FileText className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                            <p className="text-sm">No templates in this category</p>
                          </div>
                        )
                      ) : (
                        <div className="text-center py-8 text-gray-500 bg-white">
                          <FileText className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                          <p className="text-sm">Select a category first</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <DialogFooter className="bg-white border-t border-gray-200 pt-4 mt-4 flex-shrink-0">
                  <Button variant="outline" onClick={() => setShowChangeTypeModal(false)} className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50">
                    Cancel
                  </Button>
                  <Button 
                    disabled={!selectedTemplate}
                    onClick={async () => {
                      // Show confirmation dialog
                      const confirmed = window.confirm(
                        'Are you sure you want to change the request type?\n\n' +
                        'This will:\n' +
                        '• Change the request template and type\n' +
                        '• Update the request status\n' +
                        '• Reset approvals if the new template requires them\n' +
                        '• All existing request data will be updated\n\n' +
                        'This action cannot be undone. Do you want to continue?'
                      );
                      
                      if (!confirmed) {
                        return;
                      }

                      try {
                        const response = await fetch(`/api/requests/${requestId}/change-type`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            templateId: selectedTemplate,
                            categoryId: selectedCategory
                          }),
                        });
                        
                        if (response.ok) {
                          const result = await response.json();
                          toast({
                            title: "Type Changed Successfully",
                            description: `Request type changed to ${result.newType}. Status updated to ${result.newStatus === 'for_approval' ? 'For Approval' : 'Open'}.`,
                            className: "bg-green-50 border-green-200 text-green-800"
                          });
                          
                          // Refresh request data to show changes
                          await fetchRequestData();
                          setShowChangeTypeModal(false);
                          setSelectedCategory('');
                          setSelectedTemplate('');
                        } else {
                          const errorData = await response.json();
                          throw new Error(errorData.error || 'Failed to change request type');
                        }
                      } catch (error) {
                        console.error('Error changing request type:', error);
                        toast({
                          title: "Error",
                          description: error instanceof Error ? error.message : "Failed to change request type.",
                          variant: "destructive"
                        });
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:text-gray-500"
                  >
                    <Tag className="h-4 w-4 mr-2" />
                    Change Request Type
                  </Button>
                </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Change Status Modal */}
        <Dialog open={showChangeStatusModal} onOpenChange={setShowChangeStatusModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Change Status</DialogTitle>
              <DialogDescription>
                Update the status of this request.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-700 mb-2 block">Request Status</label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="">Select Status</option>
                  <option value="on_hold">On Hold</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="open">Open</option>
                </select>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowChangeStatusModal(false)}>
                Cancel
              </Button>
              <Button 
                disabled={!selectedStatus || isUpdatingStatus}
                onClick={async () => {
                  // Show confirmation dialog
                  const statusLabels: { [key: string]: string } = {
                    'on_hold': 'On Hold',
                    'cancelled': 'Cancelled',
                    'open': 'Open'
                  };
                  
                  const confirmed = window.confirm(
                    `Are you sure you want to change the status to "${statusLabels[selectedStatus]}"?\n\n` +
                    'This will update the request status and create a history entry.\n\n' +
                    'Do you want to continue?'
                  );
                  
                  if (!confirmed) {
                    return;
                  }

                  try {
                    setIsUpdatingStatus(true);
                    
                    // Prepare request body with notifications for cancelled status
                    const requestBody: any = {
                      status: selectedStatus
                    };
                    
                    // Add notifications when status is cancelled
                    if (selectedStatus === 'cancelled') {
                      requestBody.sendEmail = true;
                      requestBody.emailTemplate = 'email-user-cancelled'; // Use template name for cancellation
                      requestBody.sendAppNotification = true;
                    }
                    
                    const response = await fetch(`/api/requests/${requestId}/status`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(requestBody),
                    });
                    
                    if (response.ok) {
                      const notificationMessage = selectedStatus === 'cancelled' 
                        ? `Request status has been changed to ${statusLabels[selectedStatus]}. Notification emails sent and app notifications created.`
                        : `Request status has been changed to ${statusLabels[selectedStatus]}.`;
                        
                      toast({
                        title: "Status Updated",
                        description: notificationMessage,
                        className: "bg-green-50 border-green-200 text-green-800"
                      });
                      
                      // Refresh request data to show changes
                      await fetchRequestData();
                      setShowChangeStatusModal(false);
                      setSelectedStatus('');
                    } else {
                      const errorData = await response.json();
                      throw new Error(errorData.error || 'Failed to update status');
                    }
                  } catch (error) {
                    console.error('Error updating status:', error);
                    toast({
                      title: "Error",
                      description: error instanceof Error ? error.message : "Failed to update status.",
                      variant: "destructive"
                    });
                  } finally {
                    setIsUpdatingStatus(false);
                  }
                }}
              >
                {isUpdatingStatus ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </div>
                ) : (
                  "Update Status"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* SLA Timer Modal */}
        <Dialog open={showSlaTimerModal} onOpenChange={setShowSlaTimerModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>SLA Timer</DialogTitle>
              <DialogDescription>
                {slaTimerAction === 'stop' 
                  ? 'This will pause the SLA timer and change status to On Hold.'
                  : 'This will resume the SLA timer and change status to Open.'
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <span className="font-medium text-yellow-800">
                    {slaTimerAction === 'stop' ? 'Stop SLA Timer?' : 'Start SLA Timer?'}
                  </span>
                </div>
                <p className="text-sm text-yellow-700">
                  {slaTimerAction === 'stop' 
                    ? 'The remaining SLA time will be calculated and saved. The request status will change to "On Hold".'
                    : 'The SLA timer will resume with the remaining time. The request status will change to "Open".'
                  }
                </p>
                {requestData?.formData?.slaDueDate && (
                  <div className="mt-2 text-xs text-yellow-600">
                    <strong>Current SLA Due:</strong> {formatDbTimestamp(requestData.formData.slaDueDate)}
                  </div>
                )}
              </div>
              
              {slaTimerAction === 'stop' && (
                <div className="space-y-2">
                  <label htmlFor="slaStopReason" className="text-sm font-medium">
                    Reason for stopping <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="slaStopReason"
                    value={slaStopReason}
                    onChange={(e) => setSlaStopReason(e.target.value)}
                    placeholder="Please provide a reason for stopping the SLA timer..."
                    className="w-full p-3 border border-gray-300 rounded-md resize-none"
                    rows={3}
                    required
                  />
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowSlaTimerModal(false);
                setSlaStopReason(''); // Clear reason when canceling
              }}>
                Cancel
              </Button>
              <Button 
                disabled={isUpdatingSla || (slaTimerAction === 'stop' && !slaStopReason.trim())}
                onClick={async () => {
                  try {
                    setIsUpdatingSla(true);
                    
                    const response = await fetch(`/api/requests/${requestId}/sla-timer`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        action: slaTimerAction,
                        ...(slaTimerAction === 'stop' && { reason: slaStopReason.trim() })
                      }),
                    });
                    
                    if (response.ok) {
                      const result = await response.json();
                      toast({
                        title: "SLA Timer Updated",
                        description: `SLA timer has been ${slaTimerAction === 'stop' ? 'paused' : 'resumed'}. Status changed to ${result.newStatus}.`,
                        className: "bg-green-50 border-green-200 text-green-800"
                      });
                      
                      // Refresh request data to show changes
                      await fetchRequestData();
                      setShowSlaTimerModal(false);
                      setSlaStopReason(''); // Clear reason after successful action
                    } else {
                      const errorData = await response.json();
                      throw new Error(errorData.error || 'Failed to update SLA timer');
                    }
                  } catch (error) {
                    console.error('Error updating SLA timer:', error);
                    toast({
                      title: "Error",
                      description: error instanceof Error ? error.message : "Failed to update SLA timer.",
                      variant: "destructive"
                    });
                  } finally {
                    setIsUpdatingSla(false);
                  }
                }}
                className={slaTimerAction === 'stop' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}
              >
                {isUpdatingSla ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </div>
                ) : (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    {slaTimerAction === 'stop' ? 'Stop Timer' : 'Start Timer'}
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
