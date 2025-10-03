"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { SessionWrapper } from '@/components/session-wrapper';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  FileText, 
  Clock, 
  AlertCircle, 
  CheckCircle,
  Users,
  Calendar,
  Plus,
  BarChart3,
  RefreshCw,
  Search,
  Filter,
  UserCheck,
  Settings,
  ArrowRight,
  MoreHorizontal,
  Timer,
  TrendingUp,
  Eye,
  Edit,
  UserPlus
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalRequests: number;
  pendingRequests: number;
  overdueRequests: number;
  myOverdueRequests: number; // Personal overdue requests for My Summary
  resolvedToday: number;
  myAssignedRequests: number;
  needClarification: number;
  avgResolutionTime?: number;
  slaCompliance?: number;
}

interface TechnicianStats {
  name: string;
  id?: number;
  onHold: number;
  open: number;
  overdue: number;
  totalAssigned?: number;
}

interface RecentRequest {
  id: number;
  title: string;
  subject: string;
  requester: string;
  status: string;
  priority: string;
  createdAt: string;
  assignedTo?: string;
  category?: string;
  dueDate?: string;
  slaStatus?: 'on-time' | 'at-risk' | 'overdue';
}

interface QuickAssignRequest {
  id: number;
  title: string;
  subject: string;
  requester: string;
  status: string;
  priority: string;
  createdAt: string;
  category?: string;
  dueDate?: string;
  slaStatus?: 'on-time' | 'at-risk' | 'overdue';
}

interface BackupTechnicianConfig {
  id: number;
  original_technician_id: number;
  backup_technician_id: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  divert_existing: boolean;
  reason?: string;
  created_at: string;
  updated_at: string;
  original_technician_name: string;
  original_technician_email: string;
  backup_technician_name: string;
  backup_technician_email: string;
  created_by_name?: string;
  current_status: 'scheduled' | 'active' | 'expired';
  days_remaining: number;
}

interface BackupTechnicianLog {
  id: number;
  backup_config_id: number;
  original_technician_id: number;
  backup_technician_id: number;
  original_technician_name: string;
  backup_technician_name: string;
  action_type: string;
  details?: any;
  performed_by?: number;
  performed_at: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [technicianStats, setTechnicianStats] = useState<TechnicianStats[]>([]);
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);
  const [unassignedRequests, setUnassignedRequests] = useState<QuickAssignRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showQuickAssign, setShowQuickAssign] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Backup Approver state
  const [backupConfigs, setBackupConfigs] = useState([]);
  const [approversList, setApproversList] = useState<any[]>([]);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [upcomingExpirations, setUpcomingExpirations] = useState([]);
  const [backupLogs, setBackupLogs] = useState([]);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [backupForm, setBackupForm] = useState({
    originalApproverId: '',
    backupApproverId: '',
    startDate: '',
    endDate: '',
    divertPending: false,
    reason: ''
  });

  // Backup Technician state
  const [backupTechConfigs, setBackupTechConfigs] = useState<BackupTechnicianConfig[]>([]);
  const [techniciansList, setTechniciansList] = useState<any[]>([]);
  const [showBackupTechDialog, setShowBackupTechDialog] = useState(false);
  const [upcomingTechExpirations, setUpcomingTechExpirations] = useState<BackupTechnicianConfig[]>([]);
  const [backupTechLogs, setBackupTechLogs] = useState<BackupTechnicianLog[]>([]);
  const [editingTechConfig, setEditingTechConfig] = useState<BackupTechnicianConfig | null>(null);
  const [backupTechForm, setBackupTechForm] = useState({
    originalTechnicianId: '',
    backupTechnicianId: '',
    startDate: '',
    endDate: '',
    divertExisting: false,
    reason: ''
  });

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'default' as 'default' | 'destructive'
  });

  // Auto-refresh functionality
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchDashboardData(true);
      }, 30000); // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  useEffect(() => {
    fetchDashboardData();
    fetchBackupApproverData();
    fetchBackupTechnicianData();
  }, []);

  const fetchBackupApproverData = async () => {
    try {
      const [configsRes, approversRes, expirationsRes, logsRes] = await Promise.all([
        fetch('/api/backup-approvers'),
        fetch('/api/users/approvers'),
        fetch('/api/backup-approvers/auto-revert?days=7'),
        fetch('/api/backup-approvers/logs?limit=10')
      ]);

      if (configsRes.ok) {
        const configs = await configsRes.json();
        setBackupConfigs(configs);
      }

      if (approversRes.ok) {
        const approvers = await approversRes.json();
        setApproversList(approvers);
      }

      if (expirationsRes.ok) {
        const expirations = await expirationsRes.json();
        setUpcomingExpirations(expirations.upcomingExpirations || []);
      }

      if (logsRes && logsRes.ok) {
        const logs = await logsRes.json();
        setBackupLogs(logs.slice(0, 10));
      }
    } catch (error) {
      console.error('Error fetching backup approver data:', error);
    }
  };

  const fetchBackupTechnicianData = async () => {
    try {
      const [configsRes, techniciansRes, logsRes] = await Promise.all([
        fetch('/api/backup-technicians'),
        fetch('/api/users/technicians'),
        fetch('/api/backup-technicians/logs?limit=10').catch(() => ({ ok: false })) // Will fail initially, that's ok
      ]);

      if (configsRes.ok) {
        const configs = await configsRes.json();
        setBackupTechConfigs(configs);
        
        // Filter upcoming expirations (active configs expiring within 7 days)
        const upcomingExpiring = configs.filter((config: BackupTechnicianConfig) => 
          config.current_status === 'active' && config.days_remaining <= 7 && config.days_remaining > 0
        );
        setUpcomingTechExpirations(upcomingExpiring);
      }

      if (techniciansRes.ok) {
        const techniciansData = await techniciansRes.json();
        setTechniciansList(techniciansData.data || []);
      }

      if (logsRes && logsRes.ok && 'json' in logsRes) {
        const logs = await logsRes.json();
        setBackupTechLogs(logs.slice(0, 10));
      }
    } catch (error) {
      console.error('Error fetching backup technician data:', error);
    }
  };

  const fetchDashboardData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setRefreshing(silent);
      
      // Fetch dashboard statistics
      const [statsRes, techStatsRes, recentRes, unassignedRes] = await Promise.all([
        fetch('/api/technician/dashboard/stats'),
        fetch('/api/technician/dashboard/technician-stats'),
        fetch('/api/technician/dashboard/recent-requests'),
        fetch('/api/technician/dashboard/unassigned-requests')
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (techStatsRes.ok) {
        const techData = await techStatsRes.json();
        setTechnicianStats(Array.isArray(techData) ? techData : []);
      } else {
        setTechnicianStats([]);
      }

      if (recentRes.ok) {
        const recentData = await recentRes.json();
        setRecentRequests(recentData);
      }

      if (unassignedRes.ok) {
        const unassignedData = await unassignedRes.json();
        setUnassignedRequests(unassignedData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Quick assignment function
  const quickAssignRequest = async (requestId: number, technicianId: number) => {
    try {
      const response = await fetch(`/api/requests/${requestId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ technicianId }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Request assigned successfully",
        });
        fetchDashboardData(true);
      } else {
        throw new Error('Failed to assign request');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign request",
        variant: "destructive",
      });
    }
  };

  // Bulk action functions
  const handleBulkStatusUpdate = async (status: string) => {
    if (selectedRequests.length === 0) return;

    try {
      const response = await fetch('/api/requests/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestIds: selectedRequests,
          updates: { status },
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `${selectedRequests.length} requests updated`,
        });
        setSelectedRequests([]);
        fetchDashboardData(true);
      } else {
        throw new Error('Failed to update requests');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update requests",
        variant: "destructive",
      });
    }
  };

  const handleBulkAssignment = async (technicianId: number) => {
    if (selectedRequests.length === 0) return;

    try {
      const response = await fetch('/api/requests/bulk-assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestIds: selectedRequests,
          technicianId,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `${selectedRequests.length} requests assigned`,
        });
        setSelectedRequests([]);
        fetchDashboardData(true);
      } else {
        throw new Error('Failed to assign requests');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign requests",
        variant: "destructive",
      });
    }
  };

  // Backup Technician Management Functions
  const handleCreateBackupTechnician = async () => {
    // Client-side validation first
    if (!backupTechForm.originalTechnicianId || !backupTechForm.backupTechnicianId || 
        !backupTechForm.startDate || !backupTechForm.endDate) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (From Technician, To Backup Technician, Start Date, and End Date)",
        variant: "destructive",
      });
      return;
    }

    if (backupTechForm.originalTechnicianId === backupTechForm.backupTechnicianId) {
      toast({
        title: "Validation Error",
        description: "Original technician and backup technician cannot be the same person",
        variant: "destructive",
      });
      return;
    }

    const startDate = new Date(backupTechForm.startDate);
    const endDate = new Date(backupTechForm.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (endDate < startDate) {
      toast({
        title: "Validation Error",
        description: "End date cannot be before start date",
        variant: "destructive",
      });
      return;
    }

    if (endDate < today) {
      toast({
        title: "Validation Error",
        description: "End date cannot be in the past",
        variant: "destructive",
      });
      return;
    }

    // Get technician names for confirmation
    const originalTechnician = techniciansList.find(t => t.id === parseInt(backupTechForm.originalTechnicianId));
    const backupTechnician = techniciansList.find(t => t.id === parseInt(backupTechForm.backupTechnicianId));

    console.log("tommy", originalTechnician,backupTechnician)
    // Show confirmation dialog
    setConfirmDialog({
      open: true,
      title: 'Create Backup Technician Configuration',
      description: `Are you sure you want to create this backup technician configuration?

Configuration Details:
• Original Technician: ${originalTechnician ? `${originalTechnician.emp_fname} ${originalTechnician.emp_lname}` : 'Unknown'}
• Backup Technician: ${backupTechnician ? `${backupTechnician.emp_fname} ${backupTechnician.emp_lname}` : 'Unknown'}
• Period: ${new Date(backupTechForm.startDate).toLocaleDateString()} - ${new Date(backupTechForm.endDate).toLocaleDateString()}
• Transfer Existing Requests: ${backupTechForm.divertExisting ? 'Yes' : 'No'}
${backupTechForm.reason ? `• Reason: ${backupTechForm.reason}` : ''}

This will ${backupTechForm.divertExisting ? 'immediately transfer existing open/on-hold requests and ' : ''}redirect new request assignments to the backup technician during the specified period.`,
      confirmText: 'Create Configuration',
      cancelText: 'Cancel',
      variant: 'default',
      onConfirm: performCreateBackupTechnician
    });
  };

  const performCreateBackupTechnician = async () => {
    try {
      const response = await fetch('/api/backup-technicians', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backupTechForm),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Success",
          description: result.message,
        });
        setShowBackupTechDialog(false);
        setBackupTechForm({
          originalTechnicianId: '',
          backupTechnicianId: '',
          startDate: '',
          endDate: '',
          divertExisting: false,
          reason: ''
        });
        fetchBackupTechnicianData();
      } else {
        const error = await response.json();
        let errorMessage = "Failed to create backup technician";
        
        if (error.error) {
          errorMessage = error.error;
        }

        // Show specific error messages with helpful context
        if (errorMessage.includes('overlapping') || errorMessage.includes('already exists')) {
          toast({
            title: "Configuration Conflict",
            description: "A backup technician configuration already exists for this technician during the specified period. Please choose different dates or technician.",
            variant: "destructive",
          });
        } else if (errorMessage.includes('same')) {
          toast({
            title: "Invalid Selection",
            description: "Original technician and backup technician cannot be the same person. Please select different technicians.",
            variant: "destructive",
          });
        } else if (errorMessage.includes('past')) {
          toast({
            title: "Invalid Date",
            description: "End date cannot be in the past. Please select a future date.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Error creating backup technician:', error);
      toast({
        title: "Connection Error",
        description: "Unable to connect to the server. Please check your internet connection and try again.",
        variant: "destructive",
      });
    } finally {
      setConfirmDialog(prev => ({ ...prev, open: false }));
    }
  };

  const handleDeactivateBackupTechnician = async (config: BackupTechnicianConfig) => {
    // Show confirmation dialog first
    setConfirmDialog({
      open: true,
      title: 'Deactivate Backup Technician',
      description: `Are you sure you want to deactivate the backup technician configuration for ${config.original_technician_name} → ${config.backup_technician_name}? 

This will:
• Stop the backup technician from receiving new request assignments
• Revert any open/on-hold requests back to ${config.original_technician_name}
• End the backup configuration immediately

This action cannot be undone.`,
      confirmText: 'Deactivate',
      cancelText: 'Cancel',
      variant: 'destructive',
      onConfirm: () => performTechnicianDeactivation(config.id)
    });
  };

  const performTechnicianDeactivation = async (configId: number) => {
    try {
      const response = await fetch(`/api/backup-technicians/${configId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: false }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Success",
          description: result.message,
        });
        fetchBackupTechnicianData();
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || "Failed to deactivate backup technician",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to deactivate backup technician",
        variant: "destructive",
      });
    } finally {
      setConfirmDialog(prev => ({ ...prev, open: false }));
    }
  };

  const handleEditBackupTechnician = (config: BackupTechnicianConfig) => {
    setEditingTechConfig(config);
    setBackupTechForm({
      originalTechnicianId: config.original_technician_id.toString(),
      backupTechnicianId: config.backup_technician_id.toString(),
      startDate: new Date(config.start_date).toISOString().split('T')[0],
      endDate: new Date(config.end_date).toISOString().split('T')[0],
      divertExisting: config.divert_existing || false,
      reason: config.reason || ''
    });
    setShowBackupTechDialog(true);
  };

  const handleUpdateBackupTechnician = async () => {
    if (!editingTechConfig) return;

    try {
      // Client-side validation
      if (!backupTechForm.originalTechnicianId || !backupTechForm.backupTechnicianId || 
          !backupTechForm.startDate || !backupTechForm.endDate) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`/api/backup-technicians/${editingTechConfig.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backupTechForm),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Backup technician configuration updated successfully",
        });
        setShowBackupTechDialog(false);
        setEditingTechConfig(null);
        setBackupTechForm({
          originalTechnicianId: '',
          backupTechnicianId: '',
          startDate: '',
          endDate: '',
          divertExisting: false,
          reason: ''
        });
        fetchBackupTechnicianData();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to update backup technician",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating backup technician:', error);
      toast({
        title: "Connection Error",
        description: "Unable to connect to the server. Please check your internet connection and try again.",
        variant: "destructive",
      });
    }
  };
  const handleCreateBackupApprover = async () => {
    // Client-side validation first
    if (!backupForm.originalApproverId || !backupForm.backupApproverId || 
        !backupForm.startDate || !backupForm.endDate) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (From Approver, To Backup Approver, Start Date, and End Date)",
        variant: "destructive",
      });
      return;
    }

    if (backupForm.originalApproverId === backupForm.backupApproverId) {
      toast({
        title: "Validation Error",
        description: "Original approver and backup approver cannot be the same person",
        variant: "destructive",
      });
      return;
    }

    const startDate = new Date(backupForm.startDate);
    const endDate = new Date(backupForm.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (endDate < startDate) {
      toast({
        title: "Validation Error",
        description: "End date cannot be before start date",
        variant: "destructive",
      });
      return;
    }

    if (endDate < today) {
      toast({
        title: "Validation Error",
        description: "End date cannot be in the past",
        variant: "destructive",
      });
      return;
    }

    // Get approver names for confirmation
    const originalApprover = approversList.find(a => a.id === parseInt(backupForm.originalApproverId));
    const backupApprover = approversList.find(a => a.id === parseInt(backupForm.backupApproverId));

    console.log("tommy",originalApprover,backupApprover)
    // Show confirmation dialog
    setConfirmDialog({
      open: true,
      title: 'Create Backup Approver Configuration',
      description: `Are you sure you want to create this backup approver configuration?

Configuration Details:
• Original Approver: ${originalApprover?.name || 'Unknown'}
• Backup Approver: ${backupApprover?.name || 'Unknown'}
• Period: ${new Date(backupForm.startDate).toLocaleDateString()} - ${new Date(backupForm.endDate).toLocaleDateString()}
• Divert Pending Approvals: ${backupForm.divertPending ? 'Yes' : 'No'}
${backupForm.reason ? `• Reason: ${backupForm.reason}` : ''}

This will ${backupForm.divertPending ? 'immediately divert existing pending approvals and ' : ''}redirect new approvals to the backup approver during the specified period.`,
      confirmText: 'Create Configuration',
      cancelText: 'Cancel',
      variant: 'default',
      onConfirm: performCreateBackupApprover
    });
  };

  const performCreateBackupApprover = async () => {
    try {
      const response = await fetch('/api/backup-approvers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backupForm),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Backup approver configuration created successfully",
        });
        setShowBackupDialog(false);
        setBackupForm({
          originalApproverId: '',
          backupApproverId: '',
          startDate: '',
          endDate: '',
          divertPending: false,
          reason: ''
        });
        fetchBackupApproverData();
      } else {
        const error = await response.json();
        let errorMessage = "Failed to create backup approver";
        
        if (error.error) {
          errorMessage = error.error;
        } else if (error.message) {
          errorMessage = error.message;
        }

        // Show specific error messages with helpful context
        if (errorMessage.includes('overlapping') || errorMessage.includes('already exists')) {
          toast({
            title: "Configuration Conflict",
            description: "A backup approver configuration already exists for this approver during the specified period. Please choose different dates or approver.",
            variant: "destructive",
          });
        } else if (errorMessage.includes('same')) {
          toast({
            title: "Invalid Selection",
            description: "Original approver and backup approver cannot be the same person. Please select different approvers.",
            variant: "destructive",
          });
        } else if (errorMessage.includes('past')) {
          toast({
            title: "Invalid Date",
            description: "End date cannot be in the past. Please select a future date.",
            variant: "destructive",
          });
        } else if (errorMessage.includes('before')) {
          toast({
            title: "Invalid Date Range",
            description: "End date must be on or after the start date. Please check your date selection.",
            variant: "destructive",
          });
        } else if (errorMessage.includes('Missing required fields')) {
          toast({
            title: "Missing Information",
            description: "Please fill in all required fields: From Approver, To Backup Approver, Start Date, and End Date.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Error creating backup approver:', error);
      toast({
        title: "Connection Error",
        description: "Unable to connect to the server. Please check your internet connection and try again.",
        variant: "destructive",
      });
    } finally {
      setConfirmDialog(prev => ({ ...prev, open: false }));
    }
  };

  const handleDeactivateBackupApprover = async (config: any) => {
    // Show confirmation dialog first
    setConfirmDialog({
      open: true,
      title: 'Deactivate Backup Approver',
      description: `Are you sure you want to deactivate the backup approver configuration for ${config.original_approver_name} → ${config.backup_approver_name}? 

This will:
• Stop the backup approver from receiving new approvals
• Revert any pending approvals back to ${config.original_approver_name}
• End the backup configuration immediately

This action cannot be undone.`,
      confirmText: 'Deactivate',
      cancelText: 'Cancel',
      variant: 'destructive',
      onConfirm: () => performDeactivation(config.id)
    });
  };

  const performDeactivation = async (configId: number) => {
    try {
      const response = await fetch(`/api/backup-approvers/${configId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: false }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Backup approver configuration deactivated and pending approvals reverted",
        });
        fetchBackupApproverData();
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || "Failed to deactivate backup approver",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to deactivate backup approver",
        variant: "destructive",
      });
    } finally {
      setConfirmDialog(prev => ({ ...prev, open: false }));
    }
  };

  const handleManualReversion = async () => {
    try {
      const response = await fetch('/api/backup-approvers/auto-revert', {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Success",
          description: `Processed ${result.result.processedConfigs} expired configurations`,
        });
        fetchBackupApproverData();
      } else {
        toast({
          title: "Error",
          description: "Failed to process expired configurations",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process expired configurations",
        variant: "destructive",
      });
    }
  };

  const handleEditBackupApprover = (config: any) => {
    setEditingConfig(config);
    setBackupForm({
      originalApproverId: config.original_approver_id.toString(),
      backupApproverId: config.backup_approver_id.toString(),
      startDate: new Date(config.start_date).toISOString().split('T')[0],
      endDate: new Date(config.end_date).toISOString().split('T')[0],
      divertPending: config.divert_pending || false,
      reason: config.reason || ''
    });
    setShowBackupDialog(true);
  };

  const handleUpdateBackupApprover = async () => {
    if (!editingConfig) return;

    try {
      // Client-side validation
      if (!backupForm.originalApproverId || !backupForm.backupApproverId || 
          !backupForm.startDate || !backupForm.endDate) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields (From Approver, To Backup Approver, Start Date, and End Date)",
          variant: "destructive",
        });
        return;
      }

      if (backupForm.originalApproverId === backupForm.backupApproverId) {
        toast({
          title: "Validation Error",
          description: "Original approver and backup approver cannot be the same person",
          variant: "destructive",
        });
        return;
      }

      const startDate = new Date(backupForm.startDate);
      const endDate = new Date(backupForm.endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (endDate < startDate) {
        toast({
          title: "Validation Error",
          description: "End date cannot be before start date",
          variant: "destructive",
        });
        return;
      }

      if (endDate < today) {
        toast({
          title: "Validation Error",
          description: "End date cannot be in the past",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`/api/backup-approvers/${editingConfig.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backupForm),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Backup approver configuration updated successfully",
        });
        setShowBackupDialog(false);
        setEditingConfig(null);
        setBackupForm({
          originalApproverId: '',
          backupApproverId: '',
          startDate: '',
          endDate: '',
          divertPending: false,
          reason: ''
        });
        fetchBackupApproverData();
      } else {
        const error = await response.json();
        let errorMessage = "Failed to update backup approver";
        
        if (error.error) {
          errorMessage = error.error;
        } else if (error.message) {
          errorMessage = error.message;
        }

        // Show specific error messages with helpful context
        if (errorMessage.includes('overlapping') || errorMessage.includes('already exists')) {
          toast({
            title: "Configuration Conflict",
            description: "A backup approver configuration already exists for this approver during the specified period. Please choose different dates or approver.",
            variant: "destructive",
          });
        } else if (errorMessage.includes('same')) {
          toast({
            title: "Invalid Selection",
            description: "Original approver and backup approver cannot be the same person. Please select different approvers.",
            variant: "destructive",
          });
        } else if (errorMessage.includes('past')) {
          toast({
            title: "Invalid Date",
            description: "End date cannot be in the past. Please select a future date.",
            variant: "destructive",
          });
        } else if (errorMessage.includes('before')) {
          toast({
            title: "Invalid Date Range",
            description: "End date must be on or after the start date. Please check your date selection.",
            variant: "destructive",
          });
        } else if (errorMessage.includes('Missing required fields')) {
          toast({
            title: "Missing Information",
            description: "Please fill in all required fields: From Approver, To Backup Approver, Start Date, and End Date.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Error updating backup approver:', error);
      toast({
        title: "Connection Error",
        description: "Unable to connect to the server. Please check your internet connection and try again.",
        variant: "destructive",
      });
    }
  };

  // Filter functions
  const filteredRequests = recentRequests.filter(request => {
    const matchesSearch = request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.requester.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || request.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Navigation functions for My Summary and Technician stats
  const navigateToRequests = (filter: string) => {
    const params = new URLSearchParams();
    
    switch (filter) {
      case 'clarification':
        params.set('status', 'on_hold');
        params.set('assignedToCurrentUser', 'true');
        break;
      case 'overdue':
        params.set('filter', 'overdue');
        // Show all overdue requests, not just assigned to current user
        break;
      case 'due-today':
        params.set('filter', 'due-today');
        params.set('assignedToCurrentUser', 'true');
        break;
      case 'pending':
        params.set('status', 'open');
        params.set('assignedToCurrentUser', 'true');
        break;
      case 'my-assigned':
        params.set('assignedToCurrentUser', 'true');
        params.set('status', 'on_hold,open'); // Show both on_hold and open requests
        break;
    }
    
    window.location.href = `/technician/requests?${params.toString()}`;
  };

  const navigateToTechnicianRequests = (technicianId: number | string, technicianName: string, status?: string) => {
    const params = new URLSearchParams();
    
    if (technicianName === 'View All') {
      // Just go to technician requests page without filters
      window.location.href = '/technician/requests';
      return;
    }
    
    if (technicianName !== 'Total' && technicianName !== 'Unassigned') {
      if (technicianName === 'Others') {
        params.set('assignedTechnicianId', 'others');
        params.set('technicianName', 'Others');
      } else {
        params.set('assignedTechnicianId', technicianId.toString());
        params.set('technicianName', technicianName);
      }
    } else if (technicianName === 'Unassigned') {
      params.set('assignedTechnicianId', 'unassigned');
      params.set('technicianName', 'Unassigned');
    }
    
    if (status) {
      // Handle special filter types
      if (status === 'overdue') {
        params.set('filter', 'overdue');
      } else {
        params.set('status', status);
      }
    }
    
    window.location.href = `/technician/requests?${params.toString()}`;
  };

  // Navigate to current user's assigned requests (on_hold + open)
  const navigateToMyAssignedRequests = () => {
    const params = new URLSearchParams();
    params.set('assignedToCurrentUser', 'true'); // Use a flag for current user
    params.set('status', 'on_hold,open'); // Multiple statuses
    window.location.href = `/technician/requests?${params.toString()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'top': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-sm text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated" || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-sm text-gray-600">Please log in to view the dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <SessionWrapper>
      <div className="p-4 space-y-4">
        {/* Enhanced Header with Quick Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
            <p className="text-xs text-gray-600">Welcome back, {session.user.name}</p>
          </div>
        <div className="flex items-center gap-2">
         

          <Link href="/requests/new">
            <Button className="bg-blue-600 hover:bg-blue-700 text-xs px-3 py-1 h-7">
              <Plus className="h-3 w-3 mr-1" />
              New Request
            </Button>
          </Link>
        </div>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">Need Clarification</CardTitle>
            <AlertCircle className="h-3 w-3 text-blue-600" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-lg font-bold text-blue-600">
              {stats?.needClarification || 1}
            </div>
            <p className="text-xs text-gray-500">Waiting for response</p>
          </CardContent>
        </Card> */}

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateToRequests('overdue')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">All Requests Overdue</CardTitle>
            <Clock className="h-3 w-3 text-red-600" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-lg font-bold text-red-600">
              {stats?.overdueRequests || 0}
            </div>
            <p className="text-xs text-gray-500">Past SLA deadline</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateToRequests('due-today')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">My Due Today</CardTitle>
            <Calendar className="h-3 w-3 text-orange-600" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-lg font-bold text-orange-600">
              {stats?.resolvedToday || 0}
            </div>
            <p className="text-xs text-gray-500">Need attention today</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateToRequests('my-assigned')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">My Assigned</CardTitle>
            <UserCheck className="h-3 w-3 text-blue-600" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-lg font-bold text-blue-600">
              {stats?.myAssignedRequests || 0}
            </div>
            <p className="text-xs text-gray-500">Assigned to me (on-hold + open)</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">Avg Resolution</CardTitle>
            <Timer className="h-3 w-3 text-green-600" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-lg font-bold text-green-600">
              {stats?.avgResolutionTime ? `${stats.avgResolutionTime}h` : '-'}
            </div>
            <p className="text-xs text-gray-500">Average time</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">SLA Compliance</CardTitle>
            <TrendingUp className="h-3 w-3 text-green-600" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-lg font-bold text-green-600">
              {stats?.slaCompliance ? `${stats.slaCompliance}%` : '-'}
            </div>
            <p className="text-xs text-gray-500">On-time completion</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-3">
        <TabsList className="grid w-full grid-cols-3 h-8">
          <TabsTrigger value="overview" className="text-xs px-2">My View</TabsTrigger>
          <TabsTrigger value="backup" className="text-xs px-2">Backup Approver</TabsTrigger>
          <TabsTrigger value="resource" className="text-xs px-2">Backup Technician</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* My Summary */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">My Summary</CardTitle>
                  <BarChart3 className="h-4 w-4 text-gray-500" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {/* <div 
                    className="flex items-center justify-between p-2 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer transition-colors"
                    onClick={() => navigateToRequests('clarification')}
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-3 w-3 text-blue-600" />
                      <span className="text-xs">Need Clarification</span>
                    </div>
                    <span className="font-semibold text-blue-600 text-xs">
                      {stats?.needClarification || 0}
                    </span>
                  </div> */}
                  
                  <div 
                    className="flex items-center justify-between p-2 bg-red-50 rounded-lg hover:bg-red-100 cursor-pointer transition-colors"
                    onClick={() => navigateToRequests('overdue')}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-red-600" />
                      <span className="text-xs">All Requests Overdue</span>
                    </div>
                    <span className="font-semibold text-red-600 text-xs">
                      {stats?.myOverdueRequests || 0}
                    </span>
                  </div>
                  
                  <div 
                    className="flex items-center justify-between p-2 bg-orange-50 rounded-lg hover:bg-orange-100 cursor-pointer transition-colors"
                    onClick={() => navigateToRequests('due-today')}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-orange-600" />
                      <span className="text-xs">My Requests Due Today</span>
                    </div>
                    <span className="font-semibold text-orange-600 text-xs">
                      {stats?.resolvedToday || 0}
                    </span>
                  </div>
                  
                  <div 
                    className="flex items-center justify-between p-2 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer transition-colors"
                    onClick={() => navigateToRequests('my-assigned')}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-3 w-3 text-blue-600" />
                      <span className="text-xs">My Assigned Requests</span>
                    </div>
                    <span className="font-semibold text-blue-600 text-xs">
                      {stats?.myAssignedRequests || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            

             {/* Requests by Technician */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Requests by Technician</CardTitle>
             
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1 text-xs">Technician</th>
                      <th className="text-center py-1 text-xs">On-Hold</th>
                      <th className="text-center py-1 text-xs">Open</th>
                      <th className="text-center py-1 text-xs">OverDue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {technicianStats.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-4 text-xs text-gray-500">
                          No technician data available
                        </td>
                      </tr>
                    ) : (
                      technicianStats.map((tech, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="py-1 text-xs">{tech.name}</td>
                          <td
                            className="text-center py-1 text-orange-600 font-medium text-xs cursor-pointer hover:underline"
                            onClick={() => tech.id && navigateToTechnicianRequests(tech.id, tech.name, 'on_hold')}
                          >
                            {tech.onHold}
                          </td>
                          <td 
                            className="text-center py-1 text-blue-600 font-medium text-xs cursor-pointer hover:underline"
                            onClick={() => tech.id && navigateToTechnicianRequests(tech.id, tech.name, 'open')}
                          >
                            {tech.open}
                          </td>
                          <td 
                            className="text-center py-1 text-red-600 font-medium text-xs cursor-pointer hover:underline"
                            onClick={() => tech.id && navigateToTechnicianRequests(tech.id, tech.name, 'overdue')}
                          >
                            {tech.overdue}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
           
            </CardContent>
          </Card>
          </div>
        </TabsContent>

        <TabsContent value="backup">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Backup Approver Management</CardTitle>
                <Dialog open={showBackupDialog} onOpenChange={setShowBackupDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-7 text-xs">
                      <Plus className="h-3 w-3 mr-1" />
                      New Backup
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingConfig ? 'Edit Backup Approver' : 'Create Backup Approver'}
                      </DialogTitle>
                      <DialogDescription>
                        {editingConfig ? 
                          'Update the backup approver configuration.' : 
                          'Set up a backup approver to handle approvals during specified periods.'
                        }
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium">From Approver</label>
                          <Select value={backupForm.originalApproverId} onValueChange={(value) => setBackupForm({...backupForm, originalApproverId: value})}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select approver" />
                            </SelectTrigger>
                            <SelectContent>
                              {approversList.map((approver: any) => (
                                <SelectItem key={approver.id} value={approver.id.toString()} className="text-xs">
                                  {approver.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs font-medium">To Backup Approver</label>
                          <Select value={backupForm.backupApproverId} onValueChange={(value) => setBackupForm({...backupForm, backupApproverId: value})}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select backup" />
                            </SelectTrigger>
                            <SelectContent>
                              {approversList.filter((approver: any) => approver.id.toString() !== backupForm.originalApproverId).map((approver: any) => (
                                <SelectItem key={approver.id} value={approver.id.toString()} className="text-xs">
                                  {approver.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium">Start Date</label>
                          <Input 
                            type="date" 
                            className="h-8 text-xs" 
                            value={backupForm.startDate}
                            onChange={(e) => setBackupForm({...backupForm, startDate: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium">End Date</label>
                          <Input 
                            type="date" 
                            className="h-8 text-xs" 
                            value={backupForm.endDate}
                            onChange={(e) => setBackupForm({...backupForm, endDate: e.target.value})}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium">Reason (Optional)</label>
                        <Input 
                          placeholder="e.g., Vacation, Medical leave" 
                          className="h-8 text-xs" 
                          value={backupForm.reason}
                          onChange={(e) => setBackupForm({...backupForm, reason: e.target.value})}
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="divert-pending" 
                          checked={backupForm.divertPending}
                          onCheckedChange={(checked) => setBackupForm({...backupForm, divertPending: !!checked})}
                        />
                        <label htmlFor="divert-pending" className="text-xs font-medium">
                          Divert all pending approvals
                        </label>
                      </div>

                      <div className="bg-blue-50 p-3 rounded-lg">
                        <h4 className="text-xs font-medium text-blue-800 mb-1">How it works:</h4>
                        <ul className="text-xs text-blue-700 space-y-1">
                          <li>• New approvals will go to backup approver during the period</li>
                          <li>• Backup approver receives all notifications (email + bell)</li>
                          <li>• Pending approvals auto-revert after the period ends</li>
                          <li>• Already approved/rejected requests remain unchanged</li>
                          <li>• Both approvers get notified about reversions</li>
                          <li>• Normal approval process applies during diversion</li>
                        </ul>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => {
                        setShowBackupDialog(false);
                        setEditingConfig(null);
                        setBackupForm({
                          originalApproverId: '',
                          backupApproverId: '',
                          startDate: '',
                          endDate: '',
                          divertPending: false,
                          reason: ''
                        });
                      }}>Cancel</Button>
                      <Button size="sm" className="text-xs" onClick={editingConfig ? handleUpdateBackupApprover : handleCreateBackupApprover}>
                        {editingConfig ? 'Update Backup' : 'Create Backup'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Tabs defaultValue="active" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="active" className="text-xs">Active</TabsTrigger>
                  <TabsTrigger value="scheduled" className="text-xs">Scheduled</TabsTrigger>
                  <TabsTrigger value="expiring" className="text-xs">Expiring</TabsTrigger>
                  <TabsTrigger value="logs" className="text-xs">Backup Approver Logs</TabsTrigger>
                </TabsList>

                {/* Active Tab Content */}
                <TabsContent value="active" className="space-y-2">
                  {backupConfigs.filter((config: any) => config.current_status === 'active').length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      <p className="text-xs">No active backup configurations</p>
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-green-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-green-800">Status</th>
                            <th className="px-3 py-2 text-left font-medium text-green-800">Original → Backup</th>
                            <th className="px-3 py-2 text-left font-medium text-green-800">Period</th>
                            <th className="px-3 py-2 text-left font-medium text-green-800">Days Left</th>
                            <th className="px-3 py-2 text-left font-medium text-green-800">Settings</th>
                            <th className="px-3 py-2 text-center font-medium text-green-800">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {backupConfigs.filter((config: any) => config.current_status === 'active').map((config: any) => (
                            <tr key={config.id} className="hover:bg-green-25">
                              <td className="px-3 py-2">
                                <Badge className="bg-green-100 text-green-800 text-xs px-2 py-0">Active</Badge>
                              </td>
                              <td className="px-3 py-2 font-medium">
                                {config.original_approver_name} → {config.backup_approver_name}
                              </td>
                              <td className="px-3 py-2 text-gray-600">
                                {new Date(config.start_date).toLocaleDateString()} - {new Date(config.end_date).toLocaleDateString()}
                              </td>
                              <td className="px-3 py-2 text-gray-600">
                                {config.days_remaining} days
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex flex-col gap-1">
                                  <span className="text-green-600">
                                    ✓ {config.divert_pending ? 'Diverting pending' : 'New approvals only'}
                                  </span>
                                  {config.reason && <span className="text-gray-500 text-xs">• {config.reason}</span>}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                      <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem className="text-xs" onClick={() => handleEditBackupApprover(config)}>
                                      <Edit className="h-3 w-3 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-xs text-red-600" onClick={() => handleDeactivateBackupApprover(config)}>
                                      <Settings className="h-3 w-3 mr-2" />
                                      Deactivate
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>

                {/* Scheduled Tab Content */}
                <TabsContent value="scheduled" className="space-y-2">
                  {backupConfigs.filter((config: any) => config.current_status === 'scheduled').length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      <p className="text-xs">No scheduled backup configurations</p>
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-blue-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-blue-800">Status</th>
                            <th className="px-3 py-2 text-left font-medium text-blue-800">Original → Backup</th>
                            <th className="px-3 py-2 text-left font-medium text-blue-800">Period</th>
                            <th className="px-3 py-2 text-left font-medium text-blue-800">Starts In</th>
                            <th className="px-3 py-2 text-left font-medium text-blue-800">Settings</th>
                            <th className="px-3 py-2 text-center font-medium text-blue-800">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {backupConfigs.filter((config: any) => config.current_status === 'scheduled').map((config: any) => (
                            <tr key={config.id} className="hover:bg-blue-25">
                              <td className="px-3 py-2">
                                <Badge className="bg-blue-100 text-blue-800 text-xs px-2 py-0">Scheduled</Badge>
                              </td>
                              <td className="px-3 py-2 font-medium">
                                {config.original_approver_name} → {config.backup_approver_name}
                              </td>
                              <td className="px-3 py-2 text-gray-600">
                                {new Date(config.start_date).toLocaleDateString()} - {new Date(config.end_date).toLocaleDateString()}
                              </td>
                              <td className="px-3 py-2 text-gray-600">
                                {Math.abs(config.days_remaining)} days
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex flex-col gap-1">
                                  <span className="text-blue-600">
                                    ⏱ Will {config.divert_pending ? 'divert pending' : 'handle new only'}
                                  </span>
                                  {config.reason && <span className="text-gray-500 text-xs">• {config.reason}</span>}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                      <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem className="text-xs" onClick={() => handleEditBackupApprover(config)}>
                                      <Edit className="h-3 w-3 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-xs text-red-600" onClick={() => handleDeactivateBackupApprover(config)}>
                                      <Settings className="h-3 w-3 mr-2" />
                                      Cancel
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>

                {/* Expiring Tab Content */}
                <TabsContent value="expiring" className="space-y-2">
                  {upcomingExpirations.filter((config: any) => {
                    const daysRemaining = Math.ceil((new Date(config.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    return daysRemaining > 0;
                  }).length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      <p className="text-xs">No configurations expiring soon</p>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="space-y-2">
                        {upcomingExpirations.filter((config: any) => {
                          const daysRemaining = Math.ceil((new Date(config.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                          return daysRemaining > 0;
                        }).map((config: any) => {
                          const daysRemaining = Math.ceil((new Date(config.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                          return (
                            <div key={config.id} className="flex items-center justify-between text-xs">
                              <span className="text-yellow-700">
                                {config.original_approver.emp_fname} {config.original_approver.emp_lname} → {config.backup_approver.emp_fname} {config.backup_approver.emp_lname}
                              </span>
                              <span className="text-yellow-600 font-medium">
                                {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-2 text-xs text-yellow-700">
                        💡 Pending approvals will auto-revert to original approvers after expiration
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Backup Approver Logs Tab Content */}
                <TabsContent value="logs" className="space-y-2">
                  <div className="max-h-64 overflow-y-auto">
                    {backupLogs.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        <p className="text-xs">No backup approver activity</p>
                      </div>
                    ) : (
                      backupLogs.map((log: any) => (
                        <div key={log.id} className="border rounded-lg p-3 bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="text-xs px-2 py-0 capitalize">
                                {log.action_type}
                              </Badge>
                              <span className="text-xs font-medium">
                                {/* Show correct direction based on action type */}
                                {(log.action_type === 'reversion' || (log.action_type === 'deactivated' && log.details?.revertedDiversions > 0)) ? 
                                  `${log.backup_approver_name} → ${log.original_approver_name}` :
                                  `${log.original_approver_name} → ${log.backup_approver_name}`
                                }
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(log.performed_at).toLocaleDateString()} {new Date(log.performed_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                          
                          {/* Show period dates directly */}
                          {(log.details?.startDate || log.details?.endDate) && (
                            <div className="text-xs text-gray-600 mb-2">
                              <span className="font-medium">Period: </span>
                              {log.details.startDate && new Date(log.details.startDate).toLocaleDateString()}
                              {log.details.startDate && log.details.endDate && ' - '}
                              {log.details.endDate && new Date(log.details.endDate).toLocaleDateString()}
                            </div>
                          )}

                          {/* Show reversion information for deactivated configs */}
                          {log.action_type === 'deactivated' && log.details?.revertedDiversions > 0 && (
                            <div className="text-xs text-gray-600 mb-1">
                              <span className="font-medium">Reverted: </span>
                              {log.details.revertedDiversions} pending approvals back to original approver
                            </div>
                          )}

                          {/* Show reason if available */}
                          {log.details?.reason && (
                            <div className="text-xs text-gray-600">
                              <span className="font-medium">Reason: </span>
                              {log.details.reason}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              {/* System Information */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="text-xs font-medium text-gray-700 mb-2">📋 How Auto-Reversion Works</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• System checks for expired backup configurations daily at 6 AM</li>
                  <li>• Any pending approvals are automatically reverted to original approvers</li>
                  <li>• Both approvers receive notifications about the reversion</li>
                  <li>• Already processed approvals remain unchanged</li>
                  <li>• Manual processing available via "Process Expired" button</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resource">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Backup Technician Management</CardTitle>
                <Dialog open={showBackupTechDialog} onOpenChange={setShowBackupTechDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-7 text-xs">
                      <Plus className="h-3 w-3 mr-1" />
                      New Backup
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingTechConfig ? 'Edit Backup Technician' : 'Create Backup Technician'}
                      </DialogTitle>
                      <DialogDescription>
                        {editingTechConfig ? 
                          'Update the backup technician configuration.' : 
                          'Set up a backup technician to handle requests during specified periods.'
                        }
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium">From Technician</label>
                          <Select value={backupTechForm.originalTechnicianId} onValueChange={(value) => setBackupTechForm({...backupTechForm, originalTechnicianId: value})}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select technician" />
                            </SelectTrigger>
                            <SelectContent>
                              {techniciansList.map((technician: any) => (
                                <SelectItem key={technician.id} value={technician.id.toString()} className="text-xs">
                                  {technician.emp_fname} {technician.emp_lname}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs font-medium">To Backup Technician</label>
                          <Select value={backupTechForm.backupTechnicianId} onValueChange={(value) => setBackupTechForm({...backupTechForm, backupTechnicianId: value})}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select backup" />
                            </SelectTrigger>
                            <SelectContent>
                              {techniciansList.filter((technician: any) => technician.id.toString() !== backupTechForm.originalTechnicianId).map((technician: any) => (
                                <SelectItem key={technician.id} value={technician.id.toString()} className="text-xs">
                                  {technician.emp_fname} {technician.emp_lname}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium">Start Date</label>
                          <Input 
                            type="date" 
                            className="h-8 text-xs" 
                            value={backupTechForm.startDate}
                            onChange={(e) => setBackupTechForm({...backupTechForm, startDate: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium">End Date</label>
                          <Input 
                            type="date" 
                            className="h-8 text-xs" 
                            value={backupTechForm.endDate}
                            onChange={(e) => setBackupTechForm({...backupTechForm, endDate: e.target.value})}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium">Reason (Optional)</label>
                        <Input 
                          placeholder="e.g., Vacation, Medical leave" 
                          className="h-8 text-xs" 
                          value={backupTechForm.reason}
                          onChange={(e) => setBackupTechForm({...backupTechForm, reason: e.target.value})}
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="divert-existing" 
                          checked={backupTechForm.divertExisting}
                          onCheckedChange={(checked) => setBackupTechForm({...backupTechForm, divertExisting: !!checked})}
                        />
                        <label htmlFor="divert-existing" className="text-xs font-medium">
                          Transfer existing open/on-hold requests
                        </label>
                      </div>

                      <div className="bg-blue-50 p-3 rounded-lg">
                        <h4 className="text-xs font-medium text-blue-800 mb-1">How it works:</h4>
                        <ul className="text-xs text-blue-700 space-y-1">
                          <li>• New request assignments will go to backup technician during the period</li>
                          <li>• Backup technician receives all notifications for assigned requests</li>
                          <li>• Open/on-hold requests auto-revert after the period ends</li>
                          <li>• Resolved/closed requests remain unchanged</li>
                          <li>• Both technicians get notified about transfers and reversions</li>
                          <li>• Normal request handling process applies during backup period</li>
                        </ul>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => {
                        setShowBackupTechDialog(false);
                        setEditingTechConfig(null);
                        setBackupTechForm({
                          originalTechnicianId: '',
                          backupTechnicianId: '',
                          startDate: '',
                          endDate: '',
                          divertExisting: false,
                          reason: ''
                        });
                      }}>Cancel</Button>
                      <Button size="sm" className="text-xs" onClick={editingTechConfig ? handleUpdateBackupTechnician : handleCreateBackupTechnician}>
                        {editingTechConfig ? 'Update Backup' : 'Create Backup'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Tabs defaultValue="active" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="active" className="text-xs">Active</TabsTrigger>
                  <TabsTrigger value="scheduled" className="text-xs">Scheduled</TabsTrigger>
                  <TabsTrigger value="expiring" className="text-xs">Expiring</TabsTrigger>
                  <TabsTrigger value="logs" className="text-xs">Activity Logs</TabsTrigger>
                </TabsList>

                {/* Active Tab Content */}
                <TabsContent value="active" className="space-y-2">
                  {backupTechConfigs.filter((config: BackupTechnicianConfig) => config.current_status === 'active').length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      <p className="text-xs">No active backup technician configurations</p>
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-green-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-green-800">Status</th>
                            <th className="px-3 py-2 text-left font-medium text-green-800">Original → Backup</th>
                            <th className="px-3 py-2 text-left font-medium text-green-800">Period</th>
                            <th className="px-3 py-2 text-left font-medium text-green-800">Days Left</th>
                            <th className="px-3 py-2 text-left font-medium text-green-800">Settings</th>
                            <th className="px-3 py-2 text-center font-medium text-green-800">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {backupTechConfigs.filter((config: BackupTechnicianConfig) => config.current_status === 'active').map((config: BackupTechnicianConfig) => (
                            <tr key={config.id} className="hover:bg-green-25">
                              <td className="px-3 py-2">
                                <Badge className="bg-green-100 text-green-800 text-xs px-2 py-0">Active</Badge>
                              </td>
                              <td className="px-3 py-2 font-medium">
                                {config.original_technician_name} → {config.backup_technician_name}
                              </td>
                              <td className="px-3 py-2 text-gray-600">
                                {new Date(config.start_date).toLocaleDateString()} - {new Date(config.end_date).toLocaleDateString()}
                              </td>
                              <td className="px-3 py-2 text-gray-600">
                                {config.days_remaining} days
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex flex-col gap-1">
                                  <span className="text-green-600">
                                    ✓ {config.divert_existing ? 'Transfers existing' : 'New assignments only'}
                                  </span>
                                  {config.reason && <span className="text-gray-500 text-xs">• {config.reason}</span>}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                      <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem className="text-xs" onClick={() => handleEditBackupTechnician(config)}>
                                      <Edit className="h-3 w-3 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-xs text-red-600" onClick={() => handleDeactivateBackupTechnician(config)}>
                                      <Settings className="h-3 w-3 mr-2" />
                                      Deactivate
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>

                {/* Scheduled Tab Content */}
                <TabsContent value="scheduled" className="space-y-2">
                  {backupTechConfigs.filter((config: BackupTechnicianConfig) => config.current_status === 'scheduled').length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      <p className="text-xs">No scheduled backup technician configurations</p>
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-blue-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-blue-800">Status</th>
                            <th className="px-3 py-2 text-left font-medium text-blue-800">Original → Backup</th>
                            <th className="px-3 py-2 text-left font-medium text-blue-800">Period</th>
                            <th className="px-3 py-2 text-left font-medium text-blue-800">Starts In</th>
                            <th className="px-3 py-2 text-left font-medium text-blue-800">Settings</th>
                            <th className="px-3 py-2 text-center font-medium text-blue-800">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {backupTechConfigs.filter((config: BackupTechnicianConfig) => config.current_status === 'scheduled').map((config: BackupTechnicianConfig) => (
                            <tr key={config.id} className="hover:bg-blue-25">
                              <td className="px-3 py-2">
                                <Badge className="bg-blue-100 text-blue-800 text-xs px-2 py-0">Scheduled</Badge>
                              </td>
                              <td className="px-3 py-2 font-medium">
                                {config.original_technician_name} → {config.backup_technician_name}
                              </td>
                              <td className="px-3 py-2 text-gray-600">
                                {new Date(config.start_date).toLocaleDateString()} - {new Date(config.end_date).toLocaleDateString()}
                              </td>
                              <td className="px-3 py-2 text-gray-600">
                                {Math.abs(config.days_remaining)} days
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex flex-col gap-1">
                                  <span className="text-blue-600">
                                    ⏱ Will {config.divert_existing ? 'transfer existing' : 'handle new only'}
                                  </span>
                                  {config.reason && <span className="text-gray-500 text-xs">• {config.reason}</span>}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                      <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem className="text-xs" onClick={() => handleEditBackupTechnician(config)}>
                                      <Edit className="h-3 w-3 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-xs text-red-600" onClick={() => handleDeactivateBackupTechnician(config)}>
                                      <Settings className="h-3 w-3 mr-2" />
                                      Cancel
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>

                {/* Expiring Tab Content */}
                <TabsContent value="expiring" className="space-y-2">
                  {upcomingTechExpirations.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      <p className="text-xs">No configurations expiring soon</p>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="space-y-2">
                        {upcomingTechExpirations.map((config: BackupTechnicianConfig) => (
                          <div key={config.id} className="flex items-center justify-between text-xs">
                            <span className="text-yellow-700">
                              {config.original_technician_name} → {config.backup_technician_name}
                            </span>
                            <span className="text-yellow-600 font-medium">
                              {config.days_remaining} {config.days_remaining === 1 ? 'day' : 'days'}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-yellow-700">
                        💡 Open/on-hold requests will auto-revert to original technicians after expiration
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Activity Logs Tab Content */}
                <TabsContent value="logs" className="space-y-2">
                  <div className="max-h-64 overflow-y-auto">
                    {backupTechLogs.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        <p className="text-xs">No backup technician activity</p>
                      </div>
                    ) : (
                      backupTechLogs.map((log: BackupTechnicianLog) => (
                        <div key={log.id} className="border rounded-lg p-3 bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="text-xs px-2 py-0 capitalize">
                                {log.action_type.replace('_', ' ')}
                              </Badge>
                              <span className="text-xs font-medium">
                                {/* Show correct direction based on action type */}
                                {(log.action_type === 'auto_reversion' || (log.action_type === 'deactivated' && log.details?.revertedDiversions > 0)) ? 
                                  `${log.backup_technician_name} → ${log.original_technician_name}` :
                                  `${log.original_technician_name} → ${log.backup_technician_name}`
                                }
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(log.performed_at).toLocaleDateString()} {new Date(log.performed_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                          
                          {/* Show period dates directly */}
                          {(log.details?.startDate || log.details?.endDate) && (
                            <div className="text-xs text-gray-600 mb-2">
                              <span className="font-medium">Period: </span>
                              {log.details.startDate && new Date(log.details.startDate).toLocaleDateString()}
                              {log.details.startDate && log.details.endDate && ' - '}
                              {log.details.endDate && new Date(log.details.endDate).toLocaleDateString()}
                            </div>
                          )}

                          {/* Show transfer information */}
                          {log.action_type === 'created' && log.details?.transferredRequests > 0 && (
                            <div className="text-xs text-gray-600 mb-1">
                              <span className="font-medium">Transferred: </span>
                              {log.details.transferredRequests} existing requests to backup technician
                            </div>
                          )}

                          {/* Show reversion information for deactivated configs */}
                          {log.action_type === 'deactivated' && log.details?.revertedDiversions > 0 && (
                            <div className="text-xs text-gray-600 mb-1">
                              <span className="font-medium">Reverted: </span>
                              {log.details.revertedDiversions} requests back to original technician
                            </div>
                          )}

                          {/* Show reason if available */}
                          {log.details?.reason && (
                            <div className="text-xs text-gray-600">
                              <span className="font-medium">Reason: </span>
                              {log.details.reason}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              {/* System Information */}
              <div className="bg-gray-50 p-3 rounded-lg mt-4">
                <h4 className="text-xs font-medium text-gray-700 mb-2">📋 How Auto-Reversion Works</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• System checks for expired backup configurations daily at 6 AM</li>
                  <li>• Any open/on-hold requests are automatically reverted to original technicians</li>
                  <li>• Both technicians receive notifications about the reversion</li>
                  <li>• Already resolved/closed requests remain unchanged</li>
                  <li>• New request assignments resume normal flow to original technicians</li>
                  <li>• Scheduled endpoint: <code className="bg-white px-1 rounded text-xs">/api/scheduled-tasks/backup-technician-reversion</code></li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {confirmDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>
              {confirmDialog.cancelText}
            </AlertDialogCancel>
            <AlertDialogAction
              className={confirmDialog.variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''}
              onClick={confirmDialog.onConfirm}
            >
              {confirmDialog.confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </SessionWrapper>
  );
}
