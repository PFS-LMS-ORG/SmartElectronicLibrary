import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { UserPlus, Eye, Trash2, CheckCircle, XCircle, Clock, Filter, RefreshCw, 
         Search, ChevronDown, X } from 'lucide-react';
import { toast } from 'react-toastify';
import Layout from '@/components/layout/layout';
import axios from 'axios';
import Pagination from '@/components/common/Pagination';

interface AccountRequest {
  id: number;
  name: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}


const AccountRequestsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [requests, setRequests] = useState<AccountRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all');
  const [selectedRequest, setSelectedRequest] = useState<AccountRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>(searchParams.get('search') || '');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof AccountRequest | null;
    direction: 'ascending' | 'descending';
  }>({ key: 'created_at', direction: 'descending' });
  
  // Pagination states
  const [page, setPage] = useState<number>(parseInt(searchParams.get('page') || '1', 10));
  const [perPage, setPerPage] = useState<number>(parseInt(searchParams.get('per_page') || '10', 10));
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRequests, setTotalRequests] = useState<number>(0);
  
  // Update URL when parameters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (page !== 1) params.set('page', page.toString());
    if (perPage !== 10) params.set('per_page', perPage.toString());
    if (statusFilter !== 'all') params.set('status', statusFilter);
    setSearchParams(params);
  }, [page, perPage, statusFilter, searchTerm, setSearchParams]);
  
  const fetchRequests = async () => {
    try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No authentication token found');

        const params = new URLSearchParams({
          page: page.toString(),
          per_page: perPage.toString(),
          ...(statusFilter !== 'all' && { status: statusFilter }),
          ...(searchTerm && { search: searchTerm }),
        });

        const response = await axios.get(`/api/admin/account-requests?${params.toString()}`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        // If backend already supports pagination
        if (response.data.requests && response.data.total_count !== undefined && response.data.total_pages !== undefined) {
          setRequests(response.data.requests);
          setTotalRequests(response.data.total_count);
          setTotalPages(response.data.total_pages);
        } else {
          // Fallback to client-side pagination if backend doesn't support it yet
          const allRequests = response.data;
          setRequests(allRequests);
          setTotalRequests(allRequests.length);
          setTotalPages(Math.ceil(allRequests.length / perPage));
        }
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch account requests');
        setRequests([]);
        setTotalRequests(0);
        setTotalPages(1);
    } finally {
        setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchRequests();
  }, [page, perPage, statusFilter, searchTerm]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page on new search
    fetchRequests();
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setPage(1); // Reset to first page when filter changes
  };

  const handlePerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPerPage = parseInt(e.target.value, 10);
    setPerPage(newPerPage);
    setPage(1); // Reset to first page when items per page changes
  };

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

  const clearFilters = () => {
    setStatusFilter('all');
    setSearchTerm('');
    setPage(1);
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

        await axios.delete(`/api/admin/account-requests/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });

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

        await axios.post(`/api/admin/account-requests/${id}/approve`, {}, {
            headers: { Authorization: `Bearer ${token}` },
        });

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

        await axios.post(`/api/admin/account-requests/${id}/reject`, {}, {
            headers: { Authorization: `Bearer ${token}` },
        });

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

        await axios.post(`/api/admin/account-requests/${id}/set-pending`, {}, {
            headers: { Authorization: `Bearer ${token}` },
        });

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

  
  const handlePageChange = (newPage: number) => {
    // Ensure page number is within valid range
    const page = Math.max(1, Math.min(newPage, totalPages));
    setPage(page);
  };

  // Get displayed requests based on client-side filtering, sorting & pagination
  const getDisplayedRequests = () => {
    // If backend already handles filtering, sorting & pagination, just return the requests
    return requests;
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

  const displayedRequests = getDisplayedRequests();

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
                  onClick={clearFilters}
                  className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded-md flex items-center text-sm"
                >
                  <Filter className="h-4 w-4 mr-1" /> Reset Filters
                </button>
              </div>
            </div>
          </div>

          {/* Search and Filter Area */}
          <div className="px-6 py-4 bg-gray-750 border-b border-gray-600">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              {/* Search Form */}
              <div className="md:flex-grow">
                <form onSubmit={handleSearch} className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Search by name, email or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-md bg-amber-600 text-amber-100 hover:bg-amber-700 transition-colors"
                  >
                    <Search size={16} />
                  </button>
                </form>
              </div>

              {/* Status Filter */}
              <div className="relative w-full md:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter size={16} className="text-gray-400" />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusFilterChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 appearance-none"
                  style={{ backgroundImage: "none" }} // Remove default arrow
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <ChevronDown size={16} className="text-gray-400" />
                </div>
              </div>
            </div>
            
            {/* Active filters display */}
            {(searchTerm || statusFilter !== 'all') && (
              <div className="flex items-center flex-wrap gap-2 mt-3">
                <span className="text-xs text-gray-400">Active filters:</span>
                {searchTerm && (
                  <span className="inline-flex items-center px-2 py-1 bg-amber-900/30 text-amber-300 text-xs rounded border border-amber-700">
                    Search: {searchTerm}
                    <button 
                      onClick={() => { setSearchTerm(''); setPage(1); }}
                      className="ml-1.5 hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {statusFilter !== 'all' && (
                  <span className={`inline-flex items-center px-2 py-1 text-xs rounded border ${
                    statusFilter === 'pending' ? 'bg-yellow-900/30 text-yellow-300 border-yellow-700' :
                    statusFilter === 'approved' ? 'bg-green-900/30 text-green-300 border-green-700' :
                    'bg-red-900/30 text-red-300 border-red-700'
                  }`}>
                    Status: {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                    <button 
                      onClick={() => { setStatusFilter('all'); setPage(1); }}
                      className="ml-1.5 hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                <button
                  onClick={clearFilters}
                  className="text-xs text-gray-400 hover:text-gray-300 ml-2"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {displayedRequests.length === 0 ? (
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
                    {displayedRequests.map((request) => (
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

          {/* Enhanced Pagination */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onPerPageChange={handlePerPageChange}
            perPage={perPage}
            totalItems={totalRequests}
            colorScheme="amber"
            itemsPerPageOptions={[5, 10, 20, 50]}
            itemLabel="account requests"
          />
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
                <X size={18} />
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