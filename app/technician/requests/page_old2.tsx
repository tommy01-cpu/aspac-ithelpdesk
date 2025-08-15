"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { SessionWrapper } from '@/components/session-wrapper';
import { toast } from '@/hooks/use-toast';

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
  dueBy?: string;
  requesterName?: string;
  requesterEmail?: string;
  assignedTechnicianName?: string;
  assignedTechnicianEmail?: string;
}

interface PaginationData {
  current: number;
  pages: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function TechnicianRequestsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [requests, setRequests] = useState<RequestData[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<RequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequests, setSelectedRequests] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationData>({
    current: 1,
    pages: 1,
    total: 0,
    hasNext: false,
    hasPrev: false
  });

  // Fetch requests from API
  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching requests for user:', session?.user);
      const response = await fetch(`/api/technician/requests?page=${currentPage}&limit=25`);
      
      console.log('API Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('API Error:', errorData);
        throw new Error(`Failed to fetch requests: ${response.status} ${errorData}`);
      }
      
      const data = await response.json();
      console.log('API Response data:', data);
      
      setRequests(data.requests || []);
      setFilteredRequests(data.requests || []);
      setPagination(data.pagination || {
        current: 1,
        pages: 1,
        total: 0,
        hasNext: false,
        hasPrev: false
      });
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError(err instanceof Error ? err.message : 'Failed to load requests. Please try again.');
      toast({
        title: "Error",
        description: "Failed to load requests. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle page changes
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setCurrentPage(newPage);
    }
  };

  // Toggle select all requests
  const toggleSelectAll = () => {
    if (selectedRequests.length === filteredRequests.length) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(filteredRequests.map(r => r.id));
    }
  };

  // Toggle select individual request
  const toggleSelectRequest = (requestId: number) => {
    setSelectedRequests(prev => 
      prev.includes(requestId) 
        ? prev.filter(id => id !== requestId)
        : [...prev, requestId]
    );
  };

  // Load initial data
  useEffect(() => {
    if (status === 'authenticated') {
      fetchRequests();
    }
  }, [status, currentPage]);

  // Loading state for authentication
  if (status === 'loading') {
    return (
      <SessionWrapper>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </SessionWrapper>
    );
  }

  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  return (
    <SessionWrapper>
      <div className="min-h-screen bg-white">
        <div className="bg-white">
          {/* Header */}
          <div className="border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  📋 All Requests 
                  <span className="bg-gray-100 text-gray-600 text-sm px-2 py-1 rounded">
                    {pagination.total}
                  </span>
                </h1>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={fetchRequests}>
                    🔄
                  </Button>
                  <Button variant="ghost" size="sm">
                    ❓
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">My All Tasks</span>
                <span className="bg-gray-100 text-gray-600 text-sm px-2 py-1 rounded">0</span>
                <Button variant="ghost" size="sm">
                  📊
                </Button>
                <Button variant="ghost" size="sm">
                  ⋯
                </Button>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="border-b px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  🔍
                </Button>
                <Button variant="ghost" size="sm">
                  📋
                </Button>
                <Button variant="ghost" size="sm">
                  🔄
                </Button>
                <div className="text-sm text-gray-600">
                  1 - {Math.min(25, pagination.total)} of {pagination.total}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  ‹
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= pagination.pages}
                >
                  ›
                </Button>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Debug Info - Remove in production */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-gray-100 p-4 text-xs">
              <p><strong>Session User:</strong> {JSON.stringify(session?.user)}</p>
              <p><strong>Requests Count:</strong> {filteredRequests.length}</p>
              <p><strong>Loading:</strong> {loading.toString()}</p>
              <p><strong>Error:</strong> {error || 'None'}</p>
            </div>
          )}

          {/* Table */}
          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-12 px-4 py-3 text-left">
                      <Checkbox
                        checked={selectedRequests.length === filteredRequests.length && filteredRequests.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Subject</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Requester</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Assigned To</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">DueBy Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        No requests found
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((request) => (
                      <tr 
                        key={request.id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/technician/requests/${request.id}`)}
                      >
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={selectedRequests.includes(request.id)}
                            onCheckedChange={() => toggleSelectRequest(request.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-blue-600">
                          {request.id}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div className="max-w-xs truncate" title={request.templateName}>
                            {request.templateName}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {request.requesterName || request.formData?.requesterName || 'Unknown'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {request.assignedTechnicianName || session?.user?.name || 'You'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {request.dueBy 
                            ? new Date(request.dueBy).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : '-'
                          }
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span 
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              request.status === 'resolved' 
                                ? 'bg-green-100 text-green-800'
                                : request.status === 'open'
                                ? 'bg-blue-100 text-blue-800' 
                                : request.status === 'on-hold'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {request.status === 'on-hold' ? 'On-hold' : 
                             request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(request.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </SessionWrapper>
  );
}
