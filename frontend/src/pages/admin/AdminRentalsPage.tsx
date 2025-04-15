import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/layout';
import { format } from 'date-fns';

interface Rental {
    id: number;
    user_id: number;
    book_id: number;
    rented_at: string;
    returned_at: string | null;
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

interface RentalsResponse {
    rentals: Rental[];
    total_count: number;
    total_pages: number;
}

const AdminRentalsPage: React.FC = () => {
    const [rentals, setRentals] = useState<Rental[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState<number>(1);
    const [perPage] = useState<number>(10);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [actionLoading, setActionLoading] = useState<{ [key: number]: string }>({});
    const [viewRental, setViewRental] = useState<Rental | null>(null);
    const [editRental, setEditRental] = useState<Rental | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [toast, setToast] = useState<string | null>(null);

    // Fetch rentals
    const fetchRentals = async () => {
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

        const response = await fetch(`/api/rentals?${params.toString()}`, {
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

        const data: RentalsResponse = await response.json();
        if (!data.rentals || !Array.isArray(data.rentals)) {
            throw new Error('Invalid response format');
        }

        setRentals(data.rentals);
        setTotalPages(data.total_pages || 1);
        } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch rentals');
        console.error('Error fetching rentals:', err);
        setRentals([]);
        } finally {
        setLoading(false);
        }
    };

    // Handle actions (return, delete)
    const handleAction = async (rentalId: number, action: 'return' | 'delete') => {
        if (!window.confirm(`Are you sure you want to ${action} this rental?`)) {
        return;
        }

        try {
        setActionLoading((prev) => ({ ...prev, [rentalId]: action }));
        setError(null);

        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No authentication token found');
        }

        const method = action === 'delete' ? 'DELETE' : 'PUT';
        const url = action === 'delete' ? `/api/rentals/${rentalId}` : `/api/rentals/${rentalId}/return`;

        const response = await fetch(url, {
            method,
            headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            if (response.status === 403) {
            throw new Error('Forbidden: Admin access required');
            }
            if (response.status === 400 || response.status === 404) {
            const data = await response.json();
            throw new Error(data.error || `Failed to ${action} rental`);
            }
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        if (action === 'delete') {
            setRentals((prev) => prev.filter((r) => r.id !== rentalId));
            setSelectedIds((prev) => prev.filter((id) => id !== rentalId));
            setToast('Rental deleted successfully');
        } else {
            const updatedRental = await response.json();
            setRentals((prev) =>
            prev.map((r) => (r.id === rentalId ? { ...r, ...updatedRental } : r))
            );
            setToast('Rental marked as returned');
        }
        } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to ${action} rental`);
        console.error(`Error ${action}ing rental:`, err);
        } finally {
        setActionLoading((prev) => ({ ...prev, [rentalId]: '' }));
        }
    };

    // Handle edit submission
    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editRental) return;

        try {
        setError(null);
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No authentication token found');
        }

        const updateData = {
            user_id: editRental.user_id,
            book_id: editRental.book_id,
            rented_at: editRental.rented_at,
            returned_at: editRental.returned_at,
        };

        const response = await fetch(`/api/rentals/${editRental.id}`, {
            method: 'PUT',
            headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
        });

        if (!response.ok) {
            if (response.status === 403) {
            throw new Error('Forbidden: Admin access required');
            }
            if (response.status === 400 || response.status === 404) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to update rental');
            }
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const updatedRental = await response.json();
        setRentals((prev) =>
            prev.map((r) => (r.id === editRental.id ? { ...r, ...updatedRental } : r))
        );
        setEditRental(null);
        setToast('Rental updated successfully');
        } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update rental');
        console.error('Error updating rental:', err);
        }
    };

    // Handle bulk delete
    const handleBulkDelete = async () => {
        if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} rentals?`)) {
        return;
        }

        try {
        setError(null);
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No authentication token found');
        }

        const response = await fetch('/api/rentals/bulk', {
            method: 'DELETE',
            headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            },
            body: JSON.stringify({ rental_ids: selectedIds }),
        });

        if (!response.ok) {
            if (response.status === 403) {
            throw new Error('Forbidden: Admin access required');
            }
            if (response.status === 400) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to delete rentals');
            }
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        setRentals((prev) => prev.filter((r) => !selectedIds.includes(r.id)));
        setSelectedIds([]);
        setToast(`Deleted ${selectedIds.length} rentals`);
        } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete rentals');
        console.error('Error deleting rentals:', err);
        }
    };

    // Export as CSV
    const exportToCSV = () => {
        const headers = ['ID', 'User', 'Email', 'Book', 'Authors', 'Rented At', 'Returned At', 'Status'];
        const rows = rentals.map((r) => [
        r.id,
        r.user?.name || 'Unknown',
        r.user?.email || '',
        r.book?.title || 'Unknown',
        r.book?.authors.join(', ') || '',
        r.rented_at,
        r.returned_at || '',
        r.returned_at ? 'Returned' : isOverdue(r.rented_at) ? 'Overdue' : 'Active',
        ]);

        const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'rentals.csv');
        link.click();
        URL.revokeObjectURL(url);
    };

    // Check if rental is overdue (14 days)
    const isOverdue = (rentedAt: string) => {
        const rentedDate = new Date(rentedAt);
        const now = new Date();
        const diffDays = (now.getTime() - rentedDate.getTime()) / (1000 * 3600 * 24);
        return diffDays > 14;
    };

    // Fetch on mount and when filters change
    useEffect(() => {
        fetchRentals();
    }, [page, statusFilter, searchQuery]);

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

    // Clear toast after 3s
    useEffect(() => {
        if (toast) {
        const timer = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(timer);
        }
    }, [toast]);

    return (
        <Layout>
        <div className="container mx-auto px-4 py-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-gray-800">Rentals</h1>
                <div className="flex gap-4">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by user or book..."
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="returned">Returned</option>
                </select>
                <button
                    onClick={exportToCSV}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                    Export CSV
                </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
                </div>
            )}

            {toast && (
                <div className="fixed top-4 right-4 bg-green-100 text-green-700 p-4 rounded shadow-lg">
                {toast}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
            ) : (
                <>
                <div className="flex justify-between items-center mb-4">
                    <div>
                    {selectedIds.length > 0 && (
                        <button
                        onClick={handleBulkDelete}
                        className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                        >
                        Delete Selected ({selectedIds.length})
                        </button>
                    )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full table-auto">
                    <thead>
                        <tr className="border-b border-dotted border-gray-300">
                        <th className="text-left py-2 px-4 text-sm text-gray-600">
                            <input
                            type="checkbox"
                            checked={selectedIds.length === rentals.length && rentals.length > 0}
                            onChange={(e) => {
                                if (e.target.checked) {
                                setSelectedIds(rentals.map((r) => r.id));
                                } else {
                                setSelectedIds([]);
                                }
                            }}
                            />
                        </th>
                        <th className="text-left py-2 px-4 text-sm text-gray-600">ID</th>
                        <th className="text-left py-2 px-4 text-sm text-gray-600">User</th>
                        <th className="text-left py-2 px-4 text-sm text-gray-600">Book</th>
                        <th className="text-left py-2 px-4 text-sm text-gray-600">Rented At</th>
                        <th className="text-left py-2 px-4 text-sm text-gray-600">Returned At</th>
                        <th className="text-left py-2 px-4 text-sm text-gray-600">Status</th>
                        <th className="text-left py-2 px-4 text-sm text-gray-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rentals.length === 0 ? (
                        <tr>
                            <td colSpan={8} className="text-center py-4 text-gray-500">
                            No rentals found
                            </td>
                        </tr>
                        ) : (
                        rentals.map((rental) => (
                            <tr key={rental.id} className="border-b border-dotted border-gray-300 hover:bg-gray-50">
                            <td className="py-4 px-4">
                                <input
                                type="checkbox"
                                checked={selectedIds.includes(rental.id)}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                    setSelectedIds((prev) => [...prev, rental.id]);
                                    } else {
                                    setSelectedIds((prev) => prev.filter((id) => id !== rental.id));
                                    }
                                }}
                                />
                            </td>
                            <td className="py-4 px-4 text-sm">{rental.id}</td>
                            <td className="py-4 px-4 text-sm">
                                {rental.user ? (
                                <div>
                                    <div>{rental.user.name}</div>
                                    <div className="text-gray-500 text-xs">{rental.user.email}</div>
                                </div>
                                ) : (
                                'Unknown User'
                                )}
                            </td>
                            <td className="py-4 px-4">
                                {rental.book ? (
                                <div className="flex items-center">
                                    <div
                                    className={`w-10 h-14 ${getCoverColor(
                                        rental.book.title
                                    )} rounded flex items-center justify-center mr-3 text-white text-xs`}
                                    >
                                    {rental.book.cover_url ? (
                                        <img
                                        src={rental.book.cover_url}
                                        alt={rental.book.title}
                                        className="w-full h-full object-cover rounded"
                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                        />
                                    ) : (
                                        <span>BOOK</span>
                                    )}
                                    </div>
                                    <div className="font-medium">{rental.book.title}</div>
                                </div>
                                ) : (
                                'Unknown Book'
                                )}
                            </td>
                            <td className="py-4 px-4 text-sm">{rental.rented_at}</td>
                            <td className="py-4 px-4 text-sm">{rental.returned_at || '—'}</td>
                            <td className="py-4 px-4 text-sm">
                                <span
                                className={`px-2 py-1 rounded text-xs ${
                                    rental.returned_at
                                    ? 'bg-gray-100 text-gray-800'
                                    : isOverdue(rental.rented_at)
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-green-100 text-green-800'
                                }`}
                                >
                                {rental.returned_at
                                    ? 'Returned'
                                    : isOverdue(rental.rented_at)
                                    ? 'Overdue'
                                    : 'Active'}
                                </span>
                            </td>
                            <td className="py-4 px-4 text-sm">
                                <div className="flex gap-2">
                                <button
                                    onClick={() => setViewRental(rental)}
                                    className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs"
                                >
                                    View
                                </button>
                                <button
                                    onClick={() => setEditRental(rental)}
                                    className="px-3 py-1 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-xs"
                                >
                                    Edit
                                </button>
                                {!rental.returned_at && (
                                    <button
                                    onClick={() => handleAction(rental.id, 'return')}
                                    disabled={!!actionLoading[rental.id]}
                                    className={`px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs disabled:bg-green-400 disabled:cursor-not-allowed`}
                                    >
                                    {actionLoading[rental.id] === 'return' ? 'Processing...' : 'Return'}
                                    </button>
                                )}
                                <button
                                    onClick={() => handleAction(rental.id, 'delete')}
                                    disabled={!!actionLoading[rental.id]}
                                    className={`px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-xs disabled:bg-red-400 disabled:cursor-not-allowed`}
                                >
                                    {actionLoading[rental.id] === 'delete' ? 'Processing...' : 'Delete'}
                                </button>
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

            {/* View Modal */}
            {viewRental && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                <h2 className="text-xl font-semibold mb-4">Rental Details</h2>
                <div className="space-y-2">
                    <p><strong>ID:</strong> {viewRental.id}</p>
                    <p><strong>User:</strong> {viewRental.user?.name || 'Unknown'} ({viewRental.user?.email || ''})</p>
                    <p><strong>Book:</strong> {viewRental.book?.title || 'Unknown'}</p>
                    <p><strong>Authors:</strong> {viewRental.book?.authors.join(', ') || 'None'}</p>
                    <p><strong>Categories:</strong> {viewRental.book?.categories.join(', ') || 'None'}</p>
                    <p><strong>Rented At:</strong> {viewRental.rented_at}</p>
                    <p><strong>Returned At:</strong> {viewRental.returned_at || 'Not returned'}</p>
                    <p>
                    <strong>Status:</strong>{' '}
                    {viewRental.returned_at
                        ? 'Returned'
                        : isOverdue(viewRental.rented_at)
                        ? 'Overdue'
                        : 'Active'}
                    </p>
                </div>
                <div className="mt-6 flex justify-end">
                    <button
                    onClick={() => setViewRental(null)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                    >
                    Close
                    </button>
                </div>
                </div>
            </div>
            )}

            {/* Edit Modal */}
            {editRental && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                <h2 className="text-xl font-semibold mb-4">Edit Rental</h2>
                <form onSubmit={handleEditSubmit} className="space-y-4">
                    <div>
                    <label className="block text-sm font-medium text-gray-700">User ID</label>
                    <input
                        type="number"
                        value={editRental.user_id}
                        onChange={(e) =>
                        setEditRental((prev) => prev && { ...prev, user_id: parseInt(e.target.value) })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-gray-700">Book ID</label>
                    <input
                        type="number"
                        value={editRental.book_id}
                        onChange={(e) =>
                        setEditRental((prev) => prev && { ...prev, book_id: parseInt(e.target.value) })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-gray-700">Rented At</label>
                    <input
                        type="datetime-local"
                        value={format(new Date(editRental.rented_at), "yyyy-MM-dd'T'HH:mm")}
                        onChange={(e) =>
                        setEditRental((prev) => prev && { ...prev, rented_at: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-gray-700">Returned At</label>
                    <input
                        type="datetime-local"
                        value={editRental.returned_at ? format(new Date(editRental.returned_at), "yyyy-MM-dd'T'HH:mm") : ''}
                        onChange={(e) =>
                        setEditRental((prev) => prev && { ...prev, returned_at: e.target.value || null })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    </div>
                    <div className="flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={() => setEditRental(null)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Save
                    </button>
                    </div>
                </form>
                </div>
            </div>
            )}
        </div>
        </Layout>
    );
};

export default AdminRentalsPage;