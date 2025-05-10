import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, User, Trash2, ChevronUp, ChevronDown, 
  Users as UsersIcon, Filter, ArrowUpDown, Shield, UserCheck, 
  BookOpen, Calendar, Mail, RefreshCw, X
} from 'lucide-react';
import Layout from '@/components/layout/layout';
import axios from 'axios';
import { toast } from 'react-toastify';
import Pagination from '@/components/common/Pagination';

interface Rental {
  id: number;
  book_id: number;
  rented_at: string;
  returned_at: string | null;
  book: {
    id: number;
    title: string;
    authors: string[];
    categories: string[];
    cover_url: string;
  };
}

interface RentalRequest {
  id: number;
  book_id: number;
  requested_at: string;
  status: string;
  book: {
    id: number;
    title: string;
    authors: string[];
    categories: string[];
    cover_url: string;
  };
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  date_joined: string;
  rentals: Rental[];
  rental_requests: RentalRequest[];
}

interface PaginationData {
  users: User[];
  total_count: number;
  total_pages: number;
}


const UsersTable: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof User>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [roleDropdownVisible, setRoleDropdownVisible] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('search') || '');
  const [filterRole, setFilterRole] = useState<string | null>(searchParams.get('role') || null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(parseInt(searchParams.get('page') || '1', 10));
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [perPage, setPerPage] = useState<number>(parseInt(searchParams.get('per_page') || '10', 10));

  // Update URL when pagination params change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (currentPage !== 1) params.set('page', currentPage.toString());
    if (perPage !== 10) params.set('per_page', perPage.toString());
    if (filterRole) params.set('role', filterRole);
    setSearchParams(params);
  }, [currentPage, perPage, searchQuery, filterRole, setSearchParams]);

  // Fetch users when parameters change
  useEffect(() => {
    fetchUsers(searchQuery, currentPage, perPage, filterRole);
  }, [currentPage, perPage, filterRole]);

  // Apply filters when users, searchQuery, or filterRole changes
  useEffect(() => {
    // If we're not fetching data based on filters (like for local filtering),
    // we would do it here, but we're handling this server-side now
  }, []);

  const fetchUsers = async (query: string = '', page: number = 1, itemsPerPage: number = 10, role: string | null = null) => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');
      
      // Build query parameters
      const params = new URLSearchParams();
      if (query) params.append('search', query);
      params.append('page', page.toString());
      params.append('per_page', itemsPerPage.toString());
      if (role) params.append('role', role);

      const url = `/api/users?${params.toString()}`;
      
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      // Assuming the backend returns { users: User[], total_count: number, total_pages: number }
      const data: PaginationData = response.data;
      
      setUsers(data.users);
      setTotalUsers(data.total_count);
      setTotalPages(data.total_pages);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : 'Failed to fetch users. Please try again later.';
      setError(errorMessage);
      console.error('Error fetching users:', err);
      setUsers([]);
      setTotalUsers(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on new search
    fetchUsers(searchQuery, 1, perPage, filterRole);
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');
      
      await axios.put(`/api/users/${userId}`, 
        { role: newRole },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Update the user in the current list
      setUsers(users.map(user =>
        user.id === userId ? { ...user, role: newRole } : user
      ));
      
      setRoleDropdownVisible(null);
      toast.success(`User role updated to ${newRole}`);
    } catch (err) {
      console.error('Error updating user role:', err);
      toast.error('Failed to update user role');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    // Find the user to be deleted
    const userToDelete = users.find(user => user.id === userId);
    
    // Check if the user is an admin
    if (userToDelete?.role.toLowerCase() === 'admin') {
      toast.error('Admins cannot be deleted for security reasons.');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No authentication token found');
        
        await axios.delete(`/api/users/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        // After successful deletion, refresh the current page
        toast.success('User deleted successfully');
        fetchUsers(searchQuery, currentPage, perPage, filterRole);
      } catch (err) {
        console.error('Error deleting user:', err);
        toast.error('Failed to delete user');
      }
    }
  };

  const handleSort = (field: keyof User) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleRoleDropdown = (userId: number | null) => {
    setRoleDropdownVisible(roleDropdownVisible === userId ? null : userId);
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  const handleRoleFilterChange = (role: string | null) => {
    setFilterRole(role);
    setCurrentPage(1); // Reset to first page when role filter changes
  };
  
  const handlePageChange = (pageNumber: number) => {
    // Ensure page number is within valid range
    const page = Math.max(1, Math.min(pageNumber, totalPages));
    setCurrentPage(page);
  };


  const handlePerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPerPage = parseInt(e.target.value, 10);
    setPerPage(newPerPage);
    setCurrentPage(1); // Reset to first page when items per page changes
  };
  
  const clearFilters = () => {
    setSearchQuery('');
    setFilterRole(null);
    setCurrentPage(1);
    fetchUsers('', 1, perPage, null);
  };

  // Get active rentals count (books currently borrowed)
  const getActiveRentals = (user: User) => {
    return user.rentals.filter(rental => rental.returned_at === null).length;
  };

  // Format date to a readable format
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const getSortIcon = (field: keyof User) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="opacity-50" />;
    return sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };


  const refreshCurrentPage = () => {
    fetchUsers(searchQuery, currentPage, perPage, filterRole);
  };

  // Sort users based on selected field
  const sortedUsers = [...users].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue) 
        : bValue.localeCompare(aValue);
    } else if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    return 0;
  });

  return (
    <Layout>
      <div className="w-full p-6">
        <div className="bg-gray-900 rounded-xl shadow-md border border-gray-800 overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-800">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center">
                <div className="mr-4 bg-indigo-900/30 p-2 rounded-lg">
                  <UsersIcon className="text-indigo-400" size={20} />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Users</h1>
                  <p className="text-sm text-gray-400">
                    Manage library system users and their roles
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleSort('name')}
                  className="px-3 py-1.5 text-sm rounded-lg flex items-center bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  A-Z <span className="ml-1">{getSortIcon('name')}</span>
                </button>
                
                <button 
                  onClick={refreshCurrentPage} 
                  className="px-3 py-1.5 text-sm rounded-lg flex items-center bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
                  title="Refresh users"
                >
                  <RefreshCw size={14} className="mr-1" /> Refresh
                </button>
              </div>
            </div>
            
            {/* Search and Filter Area */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search Form */}
              <div className="md:col-span-2">
                <form onSubmit={handleSearch} className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-2 border border-gray-700 rounded-lg bg-gray-800 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Search users by name or email..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-md bg-indigo-900/50 text-indigo-300 hover:bg-indigo-800 transition-colors"
                  >
                    <Search size={16} />
                  </button>
                </form>
              </div>

              {/* Role Filter */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter size={16} className="text-gray-400" />
                </div>
                <select
                  value={filterRole || ''}
                  onChange={(e) => handleRoleFilterChange(e.target.value || null)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-700 rounded-lg bg-gray-800 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none"
                  style={{ backgroundImage: "none" }} // Remove default arrow
                >
                  <option value="">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="user">User</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <ChevronDown size={16} className="text-gray-400" />
                </div>
              </div>
            </div>
            
            {/* Active filters display */}
            {(searchQuery || filterRole) && (
              <div className="mt-3 flex items-center flex-wrap gap-2">
                <span className="text-xs text-gray-400">Active filters:</span>
                {searchQuery && (
                  <span className="inline-flex items-center px-2 py-1 bg-indigo-900/30 text-indigo-300 text-xs rounded">
                    Search: {searchQuery}
                    <button 
                      onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                      className="ml-1.5 hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {filterRole && (
                  <span className="inline-flex items-center px-2 py-1 bg-indigo-900/30 text-indigo-300 text-xs rounded">
                    Role: {filterRole}
                    <button 
                      onClick={() => { setFilterRole(null); setCurrentPage(1); }}
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
          
          {/* Error message */}
          {error && (
            <div className="m-6 bg-red-900/20 border border-red-800 text-red-400 px-4 py-3 rounded-lg flex items-start">
              <div className="mr-2 mt-0.5">⚠️</div>
              <div>{error}</div>
            </div>
          )}
          
          {/* Table */}
          {loading ? (
            <div className="flex justify-center items-center p-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-400"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-800/50">
                    <th className="text-left py-3 px-4 font-medium text-sm text-gray-300">
                      <button 
                        className="flex items-center font-medium focus:outline-none"
                        onClick={() => handleSort('name')}
                      >
                        <User size={14} className="mr-2" />
                        User Information
                        <span className="ml-1">{getSortIcon('name')}</span>
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-gray-300">
                      <button 
                        className="flex items-center font-medium focus:outline-none"
                        onClick={() => handleSort('date_joined')}
                      >
                        <Calendar size={14} className="mr-2" />
                        Date Joined
                        <span className="ml-1">{getSortIcon('date_joined')}</span>
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-gray-300">
                      <button 
                        className="flex items-center font-medium focus:outline-none"
                        onClick={() => handleSort('role')}
                      >
                        <Shield size={14} className="mr-2" />
                        Role
                        <span className="ml-1">{getSortIcon('role')}</span>
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-gray-300">
                      <div className="flex items-center font-medium">
                        <BookOpen size={14} className="mr-2" />
                        Books Borrowed
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-sm text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 px-4 text-center text-gray-400">
                        <div className="flex flex-col items-center justify-center">
                          <UsersIcon size={40} className="text-gray-600 mb-3" strokeWidth={1} />
                          <p className="text-gray-400 mb-1">No users found</p>
                          <p className="text-sm text-gray-500">
                            {searchQuery || filterRole ? 'Try clearing your filters' : 'Add users to get started'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedUsers.map((user) => (
                      <tr 
                        key={user.id} 
                        className="border-b border-gray-800 hover:bg-gray-800/60 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                              user.id % 4 === 0 ? 'bg-indigo-900/30 text-indigo-400' :
                              user.id % 4 === 1 ? 'bg-purple-900/30 text-purple-400' :
                              user.id % 4 === 2 ? 'bg-blue-900/30 text-blue-400' :
                              'bg-green-900/30 text-green-400'
                            }`}>
                              {user.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <div className="font-medium text-white">{user.name}</div>
                              <div className="text-sm text-gray-400 flex items-center">
                                <Mail size={12} className="mr-1" />
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-300">
                          {formatDate(user.date_joined)}
                        </td>
                        <td className="py-4 px-4 relative">
                          <div 
                            className={`px-3 py-1.5 rounded-full text-sm inline-flex items-center gap-1 cursor-pointer border ${
                              user.role.toLowerCase() === 'admin' 
                                ? 'bg-green-900/30 text-green-400 border-green-800' 
                                : 'bg-indigo-900/30 text-indigo-400 border-indigo-800'
                            }`}
                            onClick={() => toggleRoleDropdown(user.id)}
                          >
                            {user.role.toLowerCase() === 'admin' 
                              ? <Shield size={14} className="mr-1" /> 
                              : <UserCheck size={14} className="mr-1" />}
                            {user.role}
                            <ChevronDown size={14} className="ml-1" />
                          </div>
                          
                          {roleDropdownVisible === user.id && (
                            <div className="absolute z-10 mt-1 w-36 bg-gray-800 border border-gray-700 rounded-lg shadow-lg">
                              <div 
                                className={`px-4 py-2 hover:bg-gray-700 cursor-pointer flex items-center ${
                                  user.role.toLowerCase() === 'user' 
                                    ? 'text-indigo-400 font-medium' 
                                    : 'text-gray-300'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRoleChange(user.id, 'user');
                                }}
                              >
                                <UserCheck size={14} className="mr-2" />
                                User
                                {user.role.toLowerCase() === 'user' && (
                                  <CheckIcon className="ml-auto" />
                                )}
                              </div>
                              <div 
                                className={`px-4 py-2 hover:bg-gray-700 cursor-pointer flex items-center ${
                                  user.role.toLowerCase() === 'admin' 
                                    ? 'text-green-400 font-medium' 
                                    : 'text-gray-300'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRoleChange(user.id, 'admin');
                                }}
                              >
                                <Shield size={14} className="mr-2" />
                                Admin
                                {user.role.toLowerCase() === 'admin' && (
                                  <CheckIcon className="ml-auto" />
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-300">
                          <div className="flex items-center">
                            <BookOpen size={14} className="mr-2 text-indigo-400" />
                            {getActiveRentals(user)}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {user.role.toLowerCase() === 'admin' ? (
                            <button 
                              className="inline-flex items-center justify-center w-8 h-8 rounded-full text-gray-500 cursor-not-allowed"
                              title="Admins cannot be deleted"
                              disabled
                            >
                              <Trash2 size={16} />
                            </button>
                          ) : (
                            <button 
                              className="inline-flex items-center justify-center w-8 h-8 rounded-full text-red-400 hover:bg-red-900/20 transition-colors"
                              onClick={() => handleDeleteUser(user.id)}
                              title="Delete user"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onPerPageChange={handlePerPageChange}
            totalItems={totalUsers}
            perPage={perPage}
            itemsPerPageOptions={[5, 10, 20, 50]}
            colorScheme="green"
            itemLabel="users"
          />

        </div>
      </div>
    </Layout>
  );
};

// Small check icon component
const CheckIcon = ({ className = "" }: { className?: string }) => (
  <svg 
    className={className} 
    width="16" 
    height="16" 
    viewBox="0 0 16 16" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path 
      d="M13.3334 4L6.00008 11.3333L2.66675 8" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

export default UsersTable;