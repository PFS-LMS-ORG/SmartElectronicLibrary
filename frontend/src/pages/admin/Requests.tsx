import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/layout';
import { format } from 'date-fns';

interface RentalRequest {
  id: number;
  user_id: number;
  book_id: number;
  requested_at: string;
  status: 'pending' | 'approved' | 'rejected';
  user: {
    id: number;
    name: string;
    email: string;
  } | null;
  book: {
    id: number;
    title: string;
    cover_url: string;
    authors: string[];
    categories: string[];
  } | null;
}

interface RequestsResponse {
  requests: RentalRequest[];
  total_count: number;
  total_pages: number;
}

const AdminRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [perPage] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<{ [key: number]: boolean }>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [viewRequest, setViewRequest] = useState<RentalRequest | null>(null);

  // Fetch rental requests
  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
      });
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`/api/rental_requests?${params.toString()}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Forbidden: Admin access required');
        }
        if (response.status === 401) {
          throw new Error('Unauthorized: Please log in again');
        }
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data: RequestsResponse = await response.json();
      if (!data.requests || !Array.isArray(data.requests)) {
        throw new Error('Invalid response format');
      }

      setRequests(data.requests);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rental requests');
      console.error('Error fetching requests:', err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle approve/reject actions
  const handleAction = async (requestId: number, action: 'approve' | 'reject') => {
    if (!window.confirm(`Are you sure you want to ${action} this rental request?`)) {
      return;
    }

    try {
      setActionLoading((prev) => ({ ...prev, [requestId]: true }));
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/rental_requests/${requestId}/${action}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Forbidden: Admin access required');
        }
        if (response.status === 400) {
          const data = await response.json();
          throw new Error(data.error || `Failed to ${action} request`);
        }
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      setRequests((prev) =>
        prev.map((req) =>
          req.id === requestId ? { ...req, status: action === 'approve' ? 'approved' : 'rejected' } : req
        )
      );
      setToast({ 
        message: `Request ${action === 'approve' ? 'approved' : 'rejected'} successfully. Email notification sent.`,
        type: 'success' 
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} request`);
      setToast({ 
        message: err instanceof Error ? err.message : `Failed to ${action} request. Email not sent.`,
        type: 'error' 
      });
      console.error(`Error ${action}ing request:`, err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  // Export as CSV
  const exportToCSV = () => {
    const headers = ['ID', 'User', 'Email', 'Book', 'Authors', 'Categories', 'Requested At', 'Status'];
    const rows = requests.map((r) => [
      r.id,
      r.user?.name || 'Unknown',
      r.user?.email || '',
      r.book?.title || 'Unknown',
      r.book?.authors.join(', ') || '',
      r.book?.categories.join(', ') || '',
      r.requested_at,
      r.status.charAt(0).toUpperCase() + r.status.slice(1),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'rental_requests.csv');
    link.click();
    URL.revokeObjectURL(url);
  };

  // Fetch on mount and when page/status changes
  useEffect(() => {
    fetchRequests();
  }, [page, statusFilter, searchQuery]);

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  // Get cover color for fallback
  const getCoverColor = (title: string = '') => {
    const colors = ['bg-indigo-700', 'bg-emerald-700', 'bg-violet-700'];
    const index = title.length % colors.length;
    return colors[index];
  };

  // Clear toast after 3s
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-900 text-gray-100">
        <div className="container mx-auto px-4 py-6">
          <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-semibold text-gray-100 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Rental Requests
              </h1>
              <div className="flex gap-4">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by user or book..."
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-100 placeholder-gray-400 w-64"
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute right-3 top-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-100"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <button
                  onClick={exportToCSV}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-all duration-200 text-sm flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export CSV
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-800 text-red-200 px-4 py-3 rounded mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            )}

            {toast && (
              <div className={`fixed top-4 right-4 p-4 rounded shadow-lg z-50 flex items-center ${
                toast.type === 'success' ? 'bg-green-900/80 text-green-200 border border-green-700' : 
                toast.type === 'error' ? 'bg-red-900/80 text-red-200 border border-red-700' : 
                'bg-yellow-900/80 text-yellow-200 border border-yellow-700'
              }`}>
                {toast.type === 'success' && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {toast.type === 'error' && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                {toast.type === 'warning' && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
                {toast.message}
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-lg border border-gray-700">
                  <table className="w-full table-auto">
                    <thead>
                      <tr className="bg-gray-900/80 border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">ID</th>
                        <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">User</th>
                        <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">Book</th>
                        <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">Authors</th>
                        <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">Categories</th>
                        <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">Requested At</th>
                        <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">Status</th>
                        <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-4 text-gray-400 bg-gray-800/30">
                            <div className="flex flex-col items-center justify-center p-6">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              <p>No rental requests found</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        requests.map((request) => (
                          <tr key={request.id} className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors duration-150">
                            <td className="py-4 px-4 text-sm font-mono">{request.id}</td>
                            <td className="py-4 px-4 text-sm">
                              {request.user ? (
                                <div>
                                  <div className="text-gray-200">{request.user.name}</div>
                                  <div className="text-indigo-400 text-xs">{request.user.email}</div>
                                </div>
                              ) : (
                                <span className="text-gray-500">Unknown User</span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              {request.book ? (
                                <div className="flex items-center">
                                  <div
                                    className={`w-10 h-14 flex-shrink-0 ${getCoverColor(
                                      request.book.title
                                    )} rounded flex items-center justify-center mr-3 text-white text-xs shadow-inner border border-gray-600`}
                                  >
                                    {request.book.cover_url ? (
                                      <img
                                        src={request.book.cover_url}
                                        alt={request.book.title}
                                        className="w-full h-full object-cover rounded"
                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                      />
                                    ) : (
                                      <span>BOOK</span>
                                    )}
                                  </div>
                                  <div className="font-medium text-gray-200 hover:text-indigo-300 transition-colors">{request.book.title}</div>
                                </div>
                              ) : (
                                <span className="text-gray-500">Unknown Book</span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-sm text-gray-300">
                              {request.book?.authors.length ? request.book.authors.join(', ') : 'Unknown'}
                            </td>
                            <td className="py-4 px-4">
                              {request.book?.categories.length ? (
                                <div className="flex flex-wrap gap-1">
                                  {request.book.categories.slice(0, 2).map((category, idx) => (
                                    <span 
                                      key={idx} 
                                      className="inline-block bg-gray-700 rounded-xs px-2 py-0.5 text-xs text-gray-300"
                                    >
                                      {category}
                                    </span>
                                  ))}
                                  {request.book.categories.length > 2 && (
                                    <span className="inline-block bg-gray-700 rounded-full px-2 py-0.5 text-xs text-gray-300">
                                      +{request.book.categories.length - 2} more
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-500">None</span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-sm text-gray-400">{format(new Date(request.requested_at), "PPP")}</td>
                            <td className="py-4 px-4 text-sm">
                              <span
                                className={`px-2 py-1 rounded-full text-xs flex items-center w-fit ${
                                  request.status === 'pending'
                                    ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-700'
                                    : request.status === 'approved'
                                    ? 'bg-green-900/30 text-green-300 border border-green-700'
                                    : 'bg-red-900/30 text-red-300 border border-red-700'
                                }`}
                              >
                                {request.status === 'pending' ? (
                                  <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </>
                                ) : request.status === 'approved' ? (
                                  <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </>
                                ) : (
                                  <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </>
                                )}
                                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-sm">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setViewRequest(request)}
                                  className="p-1.5 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 hover:text-white transition-all duration-200 border border-gray-600"
                                  title="View Details"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                                
                                {request.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => handleAction(request.id, 'approve')}
                                      disabled={actionLoading[request.id]}
                                      className={`p-1.5 bg-emerald-700 text-emerald-300 rounded hover:bg-emerald-600 hover:text-white transition-all duration-200 border border-emerald-600 disabled:bg-emerald-900 disabled:text-emerald-700 disabled:cursor-not-allowed`}
                                      title="Approve Request"
                                    >
                                      {actionLoading[request.id] ? (
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                        </svg>
                                      ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                    </button>
                                    <button
                                      onClick={() => handleAction(request.id, 'reject')}
                                      disabled={actionLoading[request.id]}
                                      className={`p-1.5 bg-red-700 text-red-300 rounded hover:bg-red-600 hover:text-white transition-all duration-200 border border-red-600 disabled:bg-red-900 disabled:text-red-700 disabled:cursor-not-allowed`}
                                      title="Reject Request"
                                    >
                                      {actionLoading[request.id] ? (
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                        </svg>
                                      ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      )}
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-6">
                    <button
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1}
                      className="px-4 py-2 bg-gray-800 text-gray-300 rounded-md hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-600 disabled:cursor-not-allowed border border-gray-700 transition-colors duration-200"
                    >
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Previous
                      </div>
                    </button>
                    <span className="text-sm text-gray-400 bg-gray-800 px-4 py-2 rounded-md border border-gray-700">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page === totalPages}
                      className="px-4 py-2 bg-gray-800 text-gray-300 rounded-md hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-600 disabled:cursor-not-allowed border border-gray-700 transition-colors duration-200"
                    >
                      <div className="flex items-center">
                        Next
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* View Request Modal */}
        {viewRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-lg shadow-2xl">
              <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Rental Request Details
                </h2>
                <button 
                  onClick={() => setViewRequest(null)}
                  className="text-gray-400 hover:text-white focus:outline-none"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:gap-4">
                  <div className="w-full sm:w-1/2 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                    <h3 className="text-indigo-400 text-sm font-medium mb-3">Request Information</h3>
                    <div className="space-y-2 text-sm">
                      <p className="flex justify-between">
                        <span className="text-gray-400">ID:</span>
                        <span className="text-white font-mono">{viewRequest.id}</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-gray-400">Status:</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          viewRequest.status === 'pending'
                            ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-700'
                            : viewRequest.status === 'approved'
                            ? 'bg-green-900/30 text-green-300 border border-green-700'
                            : 'bg-red-900/30 text-red-300 border border-red-700'
                        }`}>
                          {viewRequest.status.charAt(0).toUpperCase() + viewRequest.status.slice(1)}
                        </span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-gray-400">Requested At:</span>
                        <span className="text-white">{format(new Date(viewRequest.requested_at), "PPP p")}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="w-full sm:w-1/2 bg-gray-900/50 p-4 rounded-lg border border-gray-700 mt-4 sm:mt-0">
                    <h3 className="text-indigo-400 text-sm font-medium mb-3">User Information</h3>
                    <div className="space-y-2 text-sm">
                      <p className="flex justify-between">
                        <span className="text-gray-400">Name:</span>
                        <span className="text-white">{viewRequest.user?.name || 'Unknown'}</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-gray-400">Email:</span>
                        <span className="text-indigo-300">{viewRequest.user?.email || '-'}</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-gray-400">User ID:</span>
                        <span className="text-white font-mono">{viewRequest.user_id}</span>
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                  <h3 className="text-indigo-400 text-sm font-medium mb-3">Book Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center mb-3">
                      {viewRequest.book && (
                        <div className={`w-12 h-16 ${getCoverColor(viewRequest.book.title)} rounded flex items-center justify-center mr-3 text-white text-xs shadow-md border border-gray-600`}>
                          {viewRequest.book.cover_url ? (
                            <img src={viewRequest.book.cover_url} alt={viewRequest.book.title} className="w-full h-full object-cover rounded" onError={(e) => (e.currentTarget.style.display = 'none')} />
                          ) : <span>BOOK</span>}
                        </div>
                      )}
                      <div>
                        <h4 className="text-white text-base font-medium">{viewRequest.book?.title || 'Unknown Book'}</h4>
                        <p className="text-gray-400 text-xs">Book ID: <span className="font-mono">{viewRequest.book_id}</span></p>
                      </div>
                    </div>
                    <p className="flex justify-between">
                      <span className="text-gray-400">Authors:</span>
                      <span className="text-white">{viewRequest.book?.authors.join(', ') || 'None'}</span>
                    </p>
                    <div className="mt-2">
                      <span className="text-gray-400 block mb-1">Categories:</span>
                      <div className="flex flex-wrap gap-1">
                        {viewRequest.book?.categories.map((category, idx) => (
                          <span key={idx} className="inline-block bg-gray-700 rounded-full px-2 py-0.5 text-xs text-gray-300">
                            {category}
                          </span>
                        )) || 'None'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-between">
                <div>
                  {viewRequest.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          handleAction(viewRequest.id, 'approve');
                          setViewRequest(null);
                        }}
                        className="px-4 py-2 bg-emerald-700 text-white rounded-md hover:bg-emerald-600 transition-colors duration-200 border border-emerald-600 flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          handleAction(viewRequest.id, 'reject');
                          setViewRequest(null);
                        }}
                        className="px-4 py-2 bg-red-700 text-white rounded-md hover:bg-red-600 transition-colors duration-200 border border-red-600 flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Reject
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setViewRequest(null)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors duration-200 border border-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminRequestsPage;