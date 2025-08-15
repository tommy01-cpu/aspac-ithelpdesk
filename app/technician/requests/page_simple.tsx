"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { RefreshCw, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  requesterName?: string;
  requesterEmail?: string;
  assignedTechnicianName?: string;
  assignedTechnicianEmail?: string;
  dueBy?: string;
}

interface PaginationData {
  total: number;
  pages: number;
  current: number;
}

export default function TechnicianRequestsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({ total: 0, pages: 0, current: 1 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  useEffect(() => {
    if (session) {
      fetchRequests();
    }
  }, [session, currentPage]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/requests?page=${currentPage}&limit=25`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }

      const data = await response.json();
      setRequests(data.requests || []);
      setPagination(data.pagination || { total: 0, pages: 0, current: 1 });
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: "Error",
        description: "Failed to load requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter(request => {
    if (!searchTerm) return true;
    return (
      request.templateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.id.toString().includes(searchTerm) ||
      (request.requesterName && request.requesterName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const handleSelectAll = () => {
    if (selectedRows.length === filteredRequests.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredRequests.map(r => r.id));
    }
  };

  const handleSelectRow = (id: number) => {
    setSelectedRows(prev => 
      prev.includes(id) 
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setCurrentPage(newPage);
    }
  };

  if (!session) {
    return (
      <SessionWrapper>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </SessionWrapper>
    );
  }

  return (
    <SessionWrapper>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="border-b bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg">📋</span>
              <h1 className="text-lg font-medium text-gray-900">All Requests</h1>
              <span className="bg-gray-100 text-gray-600 text-sm px-2 py-1 rounded">
                {pagination.total}
              </span>
              <Button variant="ghost" size="sm" onClick={fetchRequests}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">My All Tasks</span>
              <span className="bg-gray-100 text-gray-600 text-sm px-2 py-1 rounded">0</span>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="border-b bg-white px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm">
                <Search className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600">
                1 - {Math.min(25, pagination.total)} of {pagination.total}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= pagination.pages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="w-12 px-4 py-3 text-left">
                    <Checkbox
                      checked={selectedRows.length === filteredRequests.length && filteredRequests.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Subject</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Requester</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Assigned To</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">DueBy Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
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
                          checked={selectedRows.includes(request.id)}
                          onCheckedChange={() => handleSelectRow(request.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-blue-600">
                        {request.id}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="max-w-md truncate" title={request.templateName}>
                          {request.templateName}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {request.requesterName || request.formData?.requesterName || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {request.assignedTechnicianName || 'Unassigned'}
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
                          className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                            request.status === 'resolved' 
                              ? 'bg-green-100 text-green-800'
                              : request.status === 'on-hold'
                              ? 'bg-yellow-100 text-yellow-800'
                              : request.status === 'open'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {request.status === 'on-hold' ? 'On-hold' : 
                           request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </SessionWrapper>
  );
}
