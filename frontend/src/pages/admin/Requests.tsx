import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/layout';

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

      // Update request status locally
      setRequests((prev) =>
        prev.map((req) =>
          req.id === requestId ? { ...req, status: action === 'approve' ? 'approved' : 'rejected' } : req
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} request`);
      console.error(`Error ${action}ing request:`, err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  // Fetch on mount and when page/status changes
  useEffect(() => {
    fetchRequests();
  }, [page, statusFilter]);

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  // Get cover color for fallback
  const getCoverColor = (title: string = '') => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500'];
    const index = title.length % colors.length;
    return colors[index];
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-800">Rental Requests</h1>
            <div className="flex gap-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b border-dotted border-gray-300">
                      <th className="text-left py-2 px-4 text-sm text-gray-600">ID</th>
                      <th className="text-left py-2 px-4 text-sm text-gray-600">User</th>
                      <th className="text-left py-2 px-4 text-sm text-gray-600">Book</th>
                      <th className="text-left py-2 px-4 text-sm text-gray-600">Authors</th>
                      <th className="text-left py-2 px-4 text-sm text-gray-600">Categories</th>
                      <th className="text-left py-2 px-4 text-sm text-gray-600">Requested At</th>
                      <th className="text-left py-2 px-4 text-sm text-gray-600">Status</th>
                      <th className="text-left py-2 px-4 text-sm text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-4 text-gray-500">
                          No rental requests found
                        </td>
                      </tr>
                    ) : (
                      requests.map((request) => (
                        <tr key={request.id} className="border-b border-dotted border-gray-300 hover:bg-gray-50">
                          <td className="py-4 px-4 text-sm">{request.id}</td>
                          <td className="py-4 px-4 text-sm">
                            {request.user ? (
                              <div>
                                <div>{request.user.name}</div>
                                <div className="text-gray-500 text-xs">{request.user.email}</div>
                              </div>
                            ) : (
                              'Unknown User'
                            )}
                          </td>
                          <td className="py-4 px-4">
                            {request.book ? (
                              <div className="flex items-center">
                                <div
                                  className={`w-10 h-14 ${getCoverColor(
                                    request.book.title
                                  )} rounded flex items-center justify-center mr-3 text-white text-xs`}
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
                                <div className="font-medium">{request.book.title}</div>
                              </div>
                            ) : (
                              'Unknown Book'
                            )}
                          </td>
                          <td className="py-4 px-4 text-sm">
                            {request.book?.authors.length ? request.book.authors.join(', ') : 'Unknown'}
                          </td>
                          <td className="py-4 px-4 text-sm">
                            {request.book?.categories.length ? request.book.categories.join(', ') : 'None'}
                          </td>
                          <td className="py-4 px-4 text-sm">{request.requested_at}</td>
                          <td className="py-4 px-4 text-sm">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                request.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : request.status === 'approved'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-sm">
                            {request.status === 'pending' ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleAction(request.id, 'approve')}
                                  disabled={actionLoading[request.id]}
                                  className={`px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-xs disabled:bg-green-400 disabled:cursor-not-allowed`}
                                >
                                  {actionLoading[request.id] ? 'Processing...' : 'Approve'}
                                </button>
                                <button
                                  onClick={() => handleAction(request.id, 'reject')}
                                  disabled={actionLoading[request.id]}
                                  className={`px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs disabled:bg-red-400 disabled:cursor-not-allowed`}
                                >
                                  {actionLoading[request.id] ? 'Processing...' : 'Reject'}
                                </button>
                              </div>
                            ) : (
                              '—'
                            )}
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
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AdminRequestsPage;