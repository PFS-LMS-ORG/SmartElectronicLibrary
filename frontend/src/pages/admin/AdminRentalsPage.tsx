import React, { useState, useEffect, FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  BookOpen, Calendar, User, Search, Download, Trash2, 
  Eye, Edit, CheckCircle, X, 
  Filter, RefreshCw, ChevronDown
} from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/layout/layout';
import { motion } from 'framer-motion';
import Pagination from '@/components/common/Pagination';

// Types
interface User {
  id: number;
  name: string;
  email: string;
}

interface Book {
  id: number;
  title: string;
  cover_url: string;
  authors: string[];
  categories: string[];
}

interface Rental {
  id: number;
  user_id: number;
  book_id: number;
  rented_at: string;
  returned_at: string | null;
  user: User | null;
  book: Book | null;
}


// Reusable Components
const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-16">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500"></div>
  </div>
);

const ErrorMessage = ({ message }: { message: string }) => (
  <div className="mx-6 mt-4 bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
    <div className="flex">
      <X className="h-5 w-5 text-red-400" />
      <p className="ml-3 text-sm">{message}</p>
    </div>
  </div>
);

const ToastNotification = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => (
  <motion.div
    className={`fixed top-4 right-4 p-4 rounded-lg shadow-2xl z-50 flex items-center ${
      type === 'success' ? 'bg-green-900/90 text-green-100 border border-green-700' : 'bg-red-900/90 text-red-100 border border-red-700'
    }`}
    initial={{ opacity: 0, x: 50 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 50 }}
    transition={{ duration: 0.3 }}
    onAnimationComplete={() => setTimeout(onClose, 3000)} // Auto-close after 3 seconds
    onClick={onClose}
  >
    {type === 'success' ? <CheckCircle className="h-5 w-5 text-green-400 mr-3" /> : <X className="h-5 w-5 text-red-400 mr-3" />}
    <p>{message}</p>
  </motion.div>
);

interface EditRentalModalProps {
  rental: Rental;
  onClose: () => void;
  onSave: (updatedRental: Rental) => Promise<void>;
}

const EditRentalModal: React.FC<EditRentalModalProps> = ({ rental, onClose, onSave }) => {
  const [formData, setFormData] = useState<Rental>({ ...rental });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.user_id) newErrors.user_id = 'User ID is required';
    if (!formData.book_id) newErrors.book_id = 'Book ID is required';
    if (!formData.rented_at) newErrors.rented_at = 'Rented date is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setErrors({ server: err instanceof Error ? err.message : 'Failed to update rental' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputFields = [
    {
      label: 'User ID',
      name: 'user_id',
      type: 'number',
      icon: <User className="h-5 w-5 text-gray-500" />,
      value: formData.user_id,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setFormData({ ...formData, user_id: parseInt(e.target.value) || 0 }),
    },
    {
      label: 'Book ID',
      name: 'book_id',
      type: 'number',
      icon: (
        <BookOpen className="h-5 w-5 text-gray-500" />
      ),
      value: formData.book_id,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setFormData({ ...formData, book_id: parseInt(e.target.value) || 0 }),
    },
    {
      label: 'Rented At',
      name: 'rented_at',
      type: 'datetime-local',
      icon: <Calendar className="h-5 w-5 text-gray-500" />,
      value: formData.rented_at ? format(new Date(formData.rented_at), "yyyy-MM-dd'T'HH:mm") : '',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setFormData({ ...formData, rented_at: e.target.value }),
    },
    {
      label: 'Returned At',
      name: 'returned_at',
      type: 'datetime-local',
      icon: <Calendar className="h-5 w-5 text-gray-500" />,
      value: formData.returned_at ? format(new Date(formData.returned_at), "yyyy-MM-dd'T'HH:mm") : '',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setFormData({ ...formData, returned_at: e.target.value || null }),
      required: false,
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm">
      <motion.div
        className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-lg shadow-2xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <Edit className="h-5 w-5 mr-2 text-amber-400" />
            Edit Rental
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.server && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-2 rounded-lg">
              <p className="text-sm">{errors.server}</p>
            </div>
          )}

          {inputFields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-gray-300 mb-1">{field.label}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {field.icon}
                </div>
                <input
                  type={field.type}
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  required={field.required !== false}
                  className={`w-full pl-10 px-3 py-2 bg-gray-700 border ${
                    errors[field.name] ? 'border-red-600' : 'border-gray-600'
                  } rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-white`}
                />
              </div>
              {errors[field.name] && <p className="text-red-400 text-xs mt-1">{errors[field.name]}</p>}
            </div>
          ))}

          <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors border border-gray-600 flex items-center"
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors shadow-lg flex items-center disabled:bg-amber-900 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
              ) : (
                <CheckCircle className="h-4 w-4 mr-1" />
              )}
              Save Changes
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// Main Component
const AdminRentalsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(parseInt(searchParams.get('page') || '1', 10));
  const [perPage, setPerPage] = useState<number>(parseInt(searchParams.get('per_page') || '10', 10));
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRentals, setTotalRentals] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all');
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('search') || '');
  const [actionLoading, setActionLoading] = useState<{ [key: number]: string }>({});
  const [viewRental, setViewRental] = useState<Rental | null>(null);
  const [editRental, setEditRental] = useState<Rental | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Update URL when parameters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (page !== 1) params.set('page', page.toString());
    if (perPage !== 10) params.set('per_page', perPage.toString());
    if (statusFilter !== 'all') params.set('status', statusFilter);
    setSearchParams(params);
  }, [page, perPage, statusFilter, searchQuery, setSearchParams]);

  const fetchRentals = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchQuery && { search: searchQuery }),
      });

      const response = await axios.get(`/api/rentals?${params.toString()}`, {
        headers: { 
          Authorization: `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
      });

      if (!response.data.rentals || !Array.isArray(response.data.rentals)) {
        throw new Error('Invalid response format');
      }

      setRentals(response.data.rentals);
      setTotalRentals(response.data.total_count || 0);
      setTotalPages(response.data.total_pages || 1);
    } catch (err: any) {
      console.error('Error fetching rentals:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      setError(err instanceof Error ? err.message : 'Failed to fetch rentals');
      setRentals([]);
      setTotalRentals(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page on new search
    fetchRentals();
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setPage(1); // Reset to first page when filter changes
    fetchRentals();
  };

  const handlePerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPerPage = parseInt(e.target.value, 10);
    setPerPage(newPerPage);
    setPage(1); // Reset to first page when items per page changes
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPage(1);
    fetchRentals();
  };

  const refreshData = () => {
    fetchRentals();
  };

  const handleAction = async (rentalId: number, action: 'return' | 'delete') => {
    if (!window.confirm(`Are you sure you want to ${action} this rental?`)) return;

    try {
      setActionLoading((prev) => ({ ...prev, [rentalId]: action }));
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const url = action === 'delete' ? `/api/rentals/${rentalId}` : `/api/rentals/${rentalId}/return`;
      const response = await axios({
        method: action === 'delete' ? 'DELETE' : 'PUT',
        url,
        headers: { 
          Authorization: `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
      });

      if (action === 'delete') {
        setRentals((prev) => prev.filter((r) => r.id !== rentalId));
        setSelectedIds((prev) => prev.filter((id) => id !== rentalId));
        setToast({ message: 'Rental deleted successfully. Email notification sent.', type: 'success' });
      } else {
        setRentals((prev) => prev.map((r) => (r.id === rentalId ? { ...r, ...response.data } : r)));
        setToast({ message: 'Rental marked as returned. Email notification sent.', type: 'success' });
      }
    } catch (err: any) {
      console.error(`Error performing ${action} on rental:`, {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      setError(err instanceof Error ? err.message : `Failed to ${action} rental`);
      setToast({ message: err instanceof Error ? err.message : `Failed to ${action} rental. Email not sent.`, type: 'error' });
    } finally {
      setActionLoading((prev) => ({ ...prev, [rentalId]: '' }));
    }
  };

  const handleEditSave = async (updatedRental: Rental) => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await axios.put(`/api/rentals/${updatedRental.id}`, {
        user_id: updatedRental.user_id,
        book_id: updatedRental.book_id,
        rented_at: updatedRental.rented_at,
        returned_at: updatedRental.returned_at,
      }, {
        headers: { 
          Authorization: `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
      });

      setRentals((prev) => prev.map((r) => (r.id === updatedRental.id ? { ...r, ...response.data } : r)));
      setToast({ message: 'Rental updated successfully. Email notification sent.', type: 'success' });
    } catch (err: any) {
      console.error('Error updating rental:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      throw err;
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} rentals?`)) return;

    try {
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      await axios.delete('/api/rentals/bulk', {
        headers: { 
          Authorization: `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
        data: { rental_ids: selectedIds },
      });

      setRentals((prev) => prev.filter((r) => !selectedIds.includes(r.id)));
      setSelectedIds([]);
      setToast({ message: `Deleted ${selectedIds.length} rentals. Email notifications sent.`, type: 'success' });
    } catch (err: any) {
      console.error('Error bulk deleting rentals:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      setError(err instanceof Error ? err.message : 'Failed to delete rentals');
      setToast({ message: err instanceof Error ? err.message : 'Failed to delete rentals. Emails not sent.', type: 'error' });
    }
  };

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

    const csvContent = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'rentals.csv');
    link.click();
    URL.revokeObjectURL(url);
  };

  const isOverdue = (rentedAt: string) => {
    const rentedDate = new Date(rentedAt);
    const now = new Date();
    return (now.getTime() - rentedDate.getTime()) / (1000 * 3600 * 24) > 14;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
      return dateString;
    }
  };

  const getCoverColor = (title: string = '') => {
    const colors = ['bg-indigo-600', 'bg-emerald-600', 'bg-fuchsia-600', 'bg-amber-600'];
    return colors[title.length % colors.length];
  };
  

  const handlePageChange = (newPage: number) => {
    const page = Math.max(1, Math.min(newPage, totalPages));
    setPage(page);
  };

  useEffect(() => {
    fetchRentals();
  }, [page, perPage]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-900 text-gray-100">
        <div className="container mx-auto px-4 py-8">
          <motion.div
            className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-700">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl font-bold text-white flex items-center">
                  <BookOpen className="w-6 h-6 mr-2 text-amber-400" />
                  Rentals Management
                </h1>
                <div className="flex items-center gap-3">
                  <button
                    onClick={refreshData}
                    className="px-3 py-1.5 text-sm rounded-lg flex items-center bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                    title="Refresh data"
                  >
                    <RefreshCw size={14} className="mr-1" /> Refresh
                  </button>
                  <button
                    onClick={exportToCSV}
                    className="px-3 py-1.5 text-sm rounded-lg flex items-center bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                  >
                    <Download size={14} className="mr-1" /> Export CSV
                  </button>
                </div>
              </div>
            </div>
            
            {/* Search and Filter Area */}
            <div className="flex flex-col md:flex-row gap-4 px-6 pt-4">
              {/* Search Form */}
              <div className="md:flex-grow">
                <form onSubmit={handleSearch} className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Search users or books..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
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
                  <option value="active">Active</option>
                  <option value="returned">Returned</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <ChevronDown size={16} className="text-gray-400" />
                </div>
              </div>
            </div>
            
            {/* Active filters display */}
            {(searchQuery || statusFilter !== 'all') && (
              <div className="flex items-center flex-wrap gap-2 px-6 py-3">
                <span className="text-xs text-gray-400">Active filters:</span>
                {searchQuery && (
                  <span className="inline-flex items-center px-2 py-1 bg-amber-900/30 text-amber-300 text-xs rounded border border-amber-700">
                    Search: {searchQuery}
                    <button 
                      onClick={() => { setSearchQuery(''); setPage(1); }}
                      className="ml-1.5 hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {statusFilter !== 'all' && (
                  <span className={`inline-flex items-center px-2 py-1 text-xs rounded border ${
                    statusFilter === 'active' 
                      ? 'bg-green-900/30 text-green-300 border-green-700' 
                      : 'bg-gray-700 text-gray-300 border-gray-600'
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

            {error && <ErrorMessage message={error} />}
            {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {selectedIds.length > 0 && (
              <div className="mx-6 mt-4 p-2 bg-gray-700 rounded-lg flex items-center">
                <span className="text-sm text-gray-300 mr-3">Selected {selectedIds.length} items</span>
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm transition-colors flex items-center"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete Selected
                </button>
              </div>
            )}

            {loading ? (
              <LoadingSpinner />
            ) : (
              <>
                <div className="overflow-x-auto mt-4">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left border-b border-gray-700">
                        <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            className="rounded bg-gray-700 border-gray-600 text-amber-600 focus:ring-amber-500 focus:ring-offset-gray-800"
                            checked={selectedIds.length === rentals.length && rentals.length > 0}
                            onChange={(e) =>
                              setSelectedIds(e.target.checked ? rentals.map((r) => r.id) : [])
                            }
                          />
                        </th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">ID</th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Book</th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Dates</th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {rentals.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-10 text-center text-gray-400">
                            <div className="flex flex-col items-center justify-center">
                              <BookOpen className="h-12 w-12 text-gray-600 mb-2" strokeWidth={1} />
                              <p className="text-gray-400 mb-1">No rentals found</p>
                              <p className="text-sm text-gray-500">
                                {searchQuery || statusFilter !== 'all'
                                  ? 'Try different search criteria or clear filters'
                                  : 'No rentals available in the system'}
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        rentals.map((rental) => (
                          <motion.tr
                            key={rental.id}
                            className="hover:bg-gray-750 transition-colors"
                            whileHover={{ scale: 1.01 }}
                          >
                            <td className="px-6 py-4">
                              <input
                                type="checkbox"
                                className="rounded bg-gray-700 border-gray-600 text-amber-600 focus:ring-amber-500 focus:ring-offset-gray-800"
                                checked={selectedIds.includes(rental.id)}
                                onChange={(e) =>
                                  setSelectedIds(
                                    e.target.checked
                                      ? [...selectedIds, rental.id]
                                      : selectedIds.filter((id) => id !== rental.id)
                                  )
                                }
                              />
                            </td>
                            <td className="px-6 py-4 text-gray-300">{rental.id}</td>
                            <td className="px-6 py-4">
                              {rental.user ? (
                                <div className="flex items-center">
                                  <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center mr-3 text-white">
                                    <User className="h-4 w-4 text-gray-300" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-white">{rental.user.name}</div>
                                    <div className="text-sm text-gray-400">{rental.user.email}</div>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-400">Unknown User</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {rental.book ? (
                                <div className="flex items-center">
                                  <div
                                    className={`w-10 h-14 flex-shrink-0 ${getCoverColor(rental.book.title)} rounded flex items-center justify-center mr-3 text-white text-xs`}
                                  >
                                    {rental.book.cover_url ? (
                                      <img
                                        src={rental.book.cover_url}
                                        alt={rental.book.title}
                                        className="w-full h-full whitespace-nowrap object-cover rounded"
                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                      />
                                    ) : (
                                      <BookOpen className="h-4 w-4" />
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-medium text-white">{rental.book.title}</div>
                                    {rental.book.authors.length > 0 && (
                                      <div className="text-sm text-gray-400">
                                        {rental.book.authors[0]}
                                        {rental.book.authors.length > 1 && ' et al.'}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-400">Unknown Book</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <div className="flex items-center text-sm text-gray-300">
                                  <Calendar className="h-3 w-3 mr-1 text-amber-400" />
                                  Rented: {formatDate(rental.rented_at)}
                                </div>
                                <div className="flex items-center text-sm text-gray-400 mt-1">
                                  <Calendar className="h-3 w-3 mr-1 text-gray-500" />
                                  Returned: {rental.returned_at ? formatDate(rental.returned_at) : '—'}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  rental.returned_at
                                    ? 'bg-gray-700 text-gray-300 border border-gray-600'
                                    : isOverdue(rental.rented_at)
                                    ? 'bg-red-900/50 text-red-200 border border-red-700'
                                    : 'bg-green-900/50 text-green-200 border border-green-700'
                                }`}
                              >
                                {rental.returned_at ? 'Returned' : isOverdue(rental.rented_at) ? 'Overdue' : 'Active'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => setViewRental(rental)}
                                  className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                  title="View details"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setEditRental(rental)}
                                  className="p-1 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors"
                                  title="Edit rental"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                {!rental.returned_at && (
                                  <button
                                    onClick={() => handleAction(rental.id, 'return')}
                                    disabled={!!actionLoading[rental.id]}
                                    className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors disabled:bg-emerald-900 disabled:cursor-not-allowed"
                                    title="Mark as returned"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleAction(rental.id, 'delete')}
                                  disabled={!!actionLoading[rental.id]}
                                  className="p-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:bg-red-900 disabled:cursor-not-allowed"
                                  title="Delete rental"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Enhanced Pagination */}
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  onPerPageChange={handlePerPageChange}
                  totalItems={totalRentals}
                  perPage={perPage}
                  itemsPerPageOptions={[5, 10, 20, 50]}
                  itemLabel="rentals"
                  colorScheme="blue"
                />
              </>
            )}
          </motion.div>
        </div>

        {/* View Rental Modal */}
        {viewRental && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <motion.div
              className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-lg overflow-hidden"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="border-b border-gray-700 px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white">Rental Details</h2>
                <button
                  onClick={() => setViewRental(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">ID</h3>
                      <p className="text-white mt-1">{viewRental.id}</p>
                    </div>
                    <div>
                      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Status</h3>
                      <span
                        className={`inline-flex mt-2 px-2 py-1 rounded-full text-xs font-medium ${
                          viewRental.returned_at
                            ? 'bg-gray-700 text-gray-300 border border-gray-600'
                            : isOverdue(viewRental.rented_at)
                            ? 'bg-red-900/50 text-red-200 border border-red-700'
                            : 'bg-green-900/50 text-green-200 border border-green-700'
                        }`}
                      >
                        {viewRental.returned_at
                          ? 'Returned'
                          : isOverdue(viewRental.rented_at)
                          ? 'Overdue'
                          : 'Active'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Rented At</h3>
                      <p className="text-white mt-1 flex items-center">
                        <Calendar className="h-3 w-3 mr-2 text-amber-400" />
                        {formatDate(viewRental.rented_at)}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Returned At</h3>
                      <p className="text-white mt-1 flex items-center">
                        <Calendar className="h-3 w-3 mr-2 text-gray-500" />
                        {viewRental.returned_at ? formatDate(viewRental.returned_at) : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">User</h3>
                      <p className="text-white mt-1">{viewRental.user?.name || 'Unknown'}</p>
                      <p className="text-gray-400 text-sm">{viewRental.user?.email || '—'}</p>
                    </div>
                    <div>
                      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Book</h3>
                      <p className="text-white mt-1">{viewRental.book?.title || 'Unknown'}</p>
                      <p className="text-gray-400 text-sm">
                        {viewRental.book?.authors.join(', ') || '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Edit Rental Modal */}
        {editRental && (
          <EditRentalModal
            rental={editRental}
            onClose={() => setEditRental(null)}
            onSave={handleEditSave}
          />
        )}
      </div>
    </Layout>
  );
};

export default AdminRentalsPage;