"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Clock, User, Building, FileText, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PendingApproval {
  id: number;
  requestId: number;
  requestTitle: string;
  requesterName: string;
  requesterDepartment: string;
  submissionDate: string;
  priority: 'Low' | 'Medium' | 'High' | 'Top';
  description: string;
  status: 'pending' | 'approved' | 'rejected';
}

export default function ApprovalsTab() {
  const { data: session } = useSession();
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      // This is a placeholder - replace with actual API call
      const mockApprovals: PendingApproval[] = [
        {
          id: 1,
          requestId: 123,
          requestTitle: "New Laptop Request",
          requesterName: "John Doe",
          requesterDepartment: "IT Department",
          submissionDate: "2025-08-07",
          priority: "High",
          description: "Requesting a new laptop for development work",
          status: "pending"
        },
        {
          id: 2,
          requestId: 124,
          requestTitle: "Software License Request",
          requesterName: "Jane Smith",
          requesterDepartment: "Marketing",
          submissionDate: "2025-08-06",
          priority: "Medium",
          description: "Need Adobe Creative Suite license",
          status: "pending"
        }
      ];
      setApprovals(mockApprovals);
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (approvalId: number, action: 'approve' | 'reject') => {
    try {
      // This is a placeholder - replace with actual API call
      console.log(`${action}ing approval ${approvalId}`);
      
      // Update local state
      setApprovals(prev => 
        prev.map(approval => 
          approval.id === approvalId 
            ? { ...approval, status: action === 'approve' ? 'approved' : 'rejected' }
            : approval
        )
      );
    } catch (error) {
      console.error(`Error ${action}ing approval:`, error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Top': return 'text-red-600 bg-red-50';
      case 'High': return 'text-orange-600 bg-orange-50';
      case 'Medium': return 'text-yellow-600 bg-yellow-50';
      case 'Low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading approvals...</p>
        </div>
      </div>
    );
  }

  const pendingApprovals = approvals.filter(approval => approval.status === 'pending');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pending Approvals</h2>
          <p className="text-gray-600">Review and approve requests requiring your attention</p>
        </div>
        <div className="text-sm text-gray-500">
          {pendingApprovals.length} pending approval{pendingApprovals.length !== 1 ? 's' : ''}
        </div>
      </div>

      {pendingApprovals.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Approvals</h3>
            <p className="text-gray-600">You're all caught up! No requests require your approval at this time.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingApprovals.map((approval) => (
            <Card key={approval.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      {approval.requestTitle}
                    </CardTitle>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {approval.requesterName}
                      </div>
                      <div className="flex items-center">
                        <Building className="h-4 w-4 mr-1" />
                        {approval.requesterDepartment}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {new Date(approval.submissionDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(approval.priority)}`}>
                    {approval.priority}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <FileText className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-700">Description</span>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed ml-6">
                    {approval.description}
                  </p>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="text-xs text-gray-500">
                    Request ID: #{approval.requestId}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApproval(approval.id, 'reject')}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApproval(approval.id, 'approve')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
