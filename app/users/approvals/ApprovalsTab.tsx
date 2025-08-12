"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Search,
  ShoppingCart,
  Calendar,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { getPriorityColor, getApprovalStatusColor } from '@/lib/status-colors';

// Normalize status locally to avoid importing helpers from another page
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

interface ApprovalRequest {
  id: string;
  requestId: number;
  requestTitle: string;
  requestType: string;
  requesterName: string;
  requesterEmail: string;
  department: string;
  createdDate: string;
  dueBy: string | null;
  priority: string;
  status: string;
  level: number;
  levelName: string;
  description?: string;
  comments?: string;
}

export default function ApprovalsTab() {
  const { data: session } = useSession();
  const router = useRouter();
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (session) {
      fetchApprovals();
    }
  }, [session]);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/approvals/pending');
      
      if (!response.ok) {
        throw new Error('Failed to fetch approvals');
      }

      const data = await response.json();
      console.log('Fetched approvals data:', data);
      setApprovals(data.approvals || []);
    } catch (error) {
      console.error('Error fetching approvals:', error);
      toast({
        title: "Error",
        description: "Failed to load approvals",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalClick = (approvalId: string, requestId: number) => {
    console.log('Clicking approval:', { approvalId, requestId });
    console.log('Navigating to:', `/users/approvals/${requestId}`);
    router.push(`/users/approvals/${requestId}`);
  };

  const filteredApprovals = approvals.filter(approval =>
    approval.requestTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    approval.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    approval.requestId.toString().includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (approvals.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No Pending Approvals</h3>
            <p className="text-gray-500">All caught up! No approval requests at this time.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">My Approvals</h2>
            <p className="text-sm text-gray-600">Review and process pending approval requests</p>
          </div>
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            {approvals.length} Pending
          </Badge>
        </div>
        
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search approvals by title, requester, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Approvals List */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="divide-y divide-slate-200">
          {filteredApprovals.map((approval) => (
            <div 
              key={approval.id} 
              className="p-6 hover:bg-slate-50 transition-colors cursor-pointer"
              onClick={() => handleApprovalClick(approval.id, approval.requestId)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-slate-900">
                          #{approval.requestId} {approval.requestTitle}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          APR-{String(approval.requestId).padStart(4, '0')}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">
                        {approval.description || `Requested by ${approval.requesterName} from ${approval.department}`}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>Level: {approval.levelName}</span>
                        <span>Type: {approval.requestType || 'Request'}</span>
                        <span>Submitted: {new Date(approval.createdDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                        <span>Due: {approval.dueBy ? new Date(approval.dueBy).toLocaleDateString() : 'No deadline'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-3">
                    {(() => {
                      const norm = normalizeStatus(approval.status);
                      return (
                        <Badge className={`text-xs ${getApprovalStatusColor(norm)}`}>
                          {norm.toUpperCase()}
                        </Badge>
                      );
                    })()}
                    <Badge className={`text-xs ${getPriorityColor(approval.priority)}`}>
                      {approval.priority.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {(approval.requestType || 'REQUEST').toUpperCase()}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApprovalClick(approval.id, approval.requestId);
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Review
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {filteredApprovals.length === 0 && searchTerm && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              No approvals found matching "{searchTerm}"
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
