import React, { useState, useEffect } from 'react';
import { UserPlus, Eye, Trash2, CheckCircle, XCircle, Clock, Filter, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import Layout from '@/components/layout/layout';

interface AccountRequest {
  id: number;
  name: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

const AccountRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<AccountRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<AccountRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedRequest, setSelectedRequest] = useState<AccountRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof AccountRequest | null;
    direction: 'ascending' | 'descending';
  }>({ key: 'created_at', direction: 'descending' });

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await fetch('/api/admin/account-requests', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch account requests');
      }

      const data = await response.json();
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch account requests');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchRequests();
  }, []);

  // Apply filters, search, and sort
  useEffect(() => {
    let result = [...requests];

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter((req) => req.status === statusFilter);
    }

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (req) =>
          req.name.toLowerCase().includes(term) ||
          req.email.toLowerCase().includes(term) ||
          req.id.toString().includes(term)
      );
    }

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        if (a[sortConfig.key!] < b[sortConfig.key!]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key!] > b[sortConfig.key!]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    setFilteredRequests(result);
  }, [requests, statusFilter, searchTerm, sortConfig]);

  const requestSort = (key: keyof AccountRequest) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortDirectionIcon = (key: keyof AccountRequest) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? '↑' : '↓';
  };

  const resetFilters = () => {
    setStatusFilter('all');
    setSearchTerm('');
    setSortConfig({ key: 'created_at', direction: 'descending' });
  };

  const handleViewRequest = (request: AccountRequest) => {
    setSelectedRequest(request);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this request?')) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await fetch(`/api/admin/account-requests/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to delete account request');
      }

      setRequests(requests.filter((req) => req.id !== id));
      toast.success('Request deleted successfully. Email notification sent.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete request. Email not sent.');
    }
  };

  const handleApprove = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await fetch(`/api/admin/account-requests/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to approve account request');
      }

      // Update the request status in the state
      setRequests(
        requests.map((req) =>
          req.id === id ? { ...req, status: 'approved' as const } : req
        )
      );
      
      toast.success('Account request approved successfully. Email notification sent.');
      setShowModal(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve request. Email not sent.');
    }
  };

  const handleReject = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await fetch(`/api/admin/account-requests/${id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to reject account request');
      }

      // Update the request status in the state
      setRequests(
        requests.map((req) =>
          req.id === id ? { ...req, status: 'rejected' as const } : req
        )
      );
      
      toast.success('Account request rejected successfully. Email notification sent.');
      setShowModal(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject request. Email not sent.');
    }
  };

  const handleSetPending = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      // Note: You would need to add this endpoint to your backend
      const response = await fetch(`/api/admin/account-requests/${id}/set-pending`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to update account request status');
      }

      // Update the request status in the state
      setRequests(
        requests.map((req) =>
          req.id === id ? { ...req, status: 'pending' as const } : req
        )
      );
      
      toast.success('Account request status updated to pending. Email notification sent.');
      setShowModal(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update request status. Email not sent.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-screen py-16">
        <span className="animate-spin h-12 w-12 border-b-2 border-amber-400 rounded-full mb-4"></span>
        <p className="text-amber-400 text-lg">Loading account requests...</p>
      </div>
    </Layout>
  );

  if (error) return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-900/30 border border-red-500 text-red-300 px-6 py-4 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
          <button 
            onClick={fetchRequests}
            className="mt-4 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-md flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Retry
          </button>
        </div>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gray-700 px-6 py-4 border-b border-gray-600">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between">
              <div className="flex items-center mb-4 sm:mb-0">
                <UserPlus className="h-6 w-6 text-amber-400 mr-2" />
                <h1 className="text-2xl font-bold text-white">Account Requests</h1>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                <button 
                  onClick={fetchRequests}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-md flex items-center text-sm"
                >
                  <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                </button>
                <button 
                  onClick={resetFilters}
                  className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded-md flex items-center text-sm"
                >
                  <Filter className="h-4 w-4 mr-1" /> Reset Filters
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 bg-gray-750 border-b border-gray-600">
            <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4">
              <div className="flex-grow">
                <input
                  type="text"
                  placeholder="Search by name, email or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-gray-300 whitespace-nowrap">Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {filteredRequests.length === 0 ? (
              <div className="bg-gray-700/50 rounded-lg p-8 text-center">
                <p className="text-gray-400 mb-2">No account requests found</p>
                <p className="text-gray-500 text-sm">
                  {requests.length > 0 ? 'Try adjusting your filters' : 'When users request accounts, they will appear here'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-700">
                    <tr>
                      <th 
                        className="px-4 py-3 text-left text-gray-300 cursor-pointer hover:text-white"
                        onClick={() => requestSort('id')}
                      >
                        ID {getSortDirectionIcon('id')}
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-gray-300 cursor-pointer hover:text-white"
                        onClick={() => requestSort('name')}
                      >
                        Name {getSortDirectionIcon('name')}
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-gray-300 cursor-pointer hover:text-white"
                        onClick={() => requestSort('email')}
                      >
                        Email {getSortDirectionIcon('email')}
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-gray-300 cursor-pointer hover:text-white"
                        onClick={() => requestSort('status')}
                      >
                        Status {getSortDirectionIcon('status')}
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-gray-300 cursor-pointer hover:text-white"
                        onClick={() => requestSort('created_at')}
                      >
                        Date {getSortDirectionIcon('created_at')}
                      </th>
                      <th className="px-4 py-3 text-left text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-600">
                    {filteredRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-700/70">
                        <td className="px-4 py-3 text-white">{request.id}</td>
                        <td className="px-4 py-3 text-white">{request.name}</td>
                        <td className="px-4 py-3 text-gray-300">{request.email}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center w-fit ${
                            request.status === 'pending' ? 'bg-yellow-900/50 text-yellow-200' :
                            request.status === 'approved' ? 'bg-green-900/50 text-green-200' :
                            'bg-red-900/50 text-red-200'
                          }`}>
                            {request.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                            {request.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {request.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                            {request.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-300">{formatDate(request.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleViewRequest(request)}
                              className="p-1 text-blue-400 hover:text-blue-300" 
                              title="View details"
                            >
                              <Eye className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(request.id)}
                              className="p-1 text-red-400 hover:text-red-300"
                              title="Delete request"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination would go here */}
        </div>
      </div>

      {/* Modal for viewing request details */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-gray-700 border-b border-gray-600 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-white">Account Request Details</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <p className="text-gray-400 text-sm">ID</p>
                  <p className="text-white">{selectedRequest.id}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Name</p>
                  <p className="text-white">{selectedRequest.name}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Email</p>
                  <p className="text-white">{selectedRequest.email}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Status</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center w-fit ${
                    selectedRequest.status === 'pending' ? 'bg-yellow-900/50 text-yellow-200' :
                    selectedRequest.status === 'approved' ? 'bg-green-900/50 text-green-200' :
                    'bg-red-900/50 text-red-200'
                  }`}>
                    {selectedRequest.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                    {selectedRequest.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                    {selectedRequest.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                    {selectedRequest.status}
                  </span>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Created At</p>
                  <p className="text-white">{formatDate(selectedRequest.created_at)}</p>
                </div>
              </div>
              
              <div className="mt-6 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                {selectedRequest.status !== 'approved' && (
                  <button
                    onClick={() => handleApprove(selectedRequest.id)}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-md flex items-center justify-center"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" /> Approve
                  </button>
                )}
                
                {selectedRequest.status !== 'rejected' && (
                  <button
                    onClick={() => handleReject(selectedRequest.id)}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-md flex items-center justify-center"
                  >
                    <XCircle className="h-4 w-4 mr-2" /> Reject
                  </button>
                )}
                
                {selectedRequest.status !== 'pending' && (
                  <button
                    onClick={() => handleSetPending(selectedRequest.id)}
                    className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-md flex items-center justify-center"
                  >
                    <Clock className="h-4 w-4 mr-2" /> Set Pending
                  </button>
                )}
              </div>
              
              <div className="mt-2">
                <button
                  onClick={() => handleDelete(selectedRequest.id)}
                  className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md flex items-center justify-center"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default AccountRequestsPage;